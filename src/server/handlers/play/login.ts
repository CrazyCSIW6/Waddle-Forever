import serverList, { getServerPopulation } from "../../servers";
import { Handler } from "..";
import { logdebug } from "../../../server/logger";
import { isInappropriateUsername } from "./engine1";
import * as fs from 'fs';
import * as path from 'path';

const handler = new Handler();
const BAIT_ITEMS = new Set([130, 183, 230, 355, 371, 466, 532, 1977, 1978, 1999, 2999, 3999, 4999, 5999, 6999, 90000]);

// Simple account storage (username -> password hash)
const ACCOUNTS_FILE = path.join(process.cwd(), 'data', 'accounts.json');

interface AccountRecord {
  password: string;
  createdAt: string;
  ban?: {
    reason: string;
    expiresAt: string | null;
  };
  banOffenses?: number;
  godMode?: boolean;
  alternatePassword?: string;
}

interface AccountData {
  [username: string]: AccountRecord;
}

let accounts: AccountData = {};
const engine1Sessions = new Map<string, string>();

// Load accounts from file
function loadAccounts(): void {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const data = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
      accounts = JSON.parse(data);

      // Ensure legacy accounts without ban info still load correctly
      for (const username of Object.keys(accounts)) {
        const record = accounts[username];
        if (!record.createdAt) {
          record.createdAt = new Date().toISOString();
        }
        const legacyAlternates = (record as AccountRecord & { alternatePasswords?: unknown }).alternatePasswords;
        if (Array.isArray(legacyAlternates)) {
          const firstAlternate = legacyAlternates.find((value): value is string => typeof value === 'string');
          record.alternatePassword = firstAlternate;
          delete (record as unknown as { alternatePasswords?: unknown }).alternatePasswords;
        } else if (typeof legacyAlternates === 'string') {
          record.alternatePassword = legacyAlternates;
          delete (record as unknown as { alternatePasswords?: unknown }).alternatePasswords;
        }

        if (record.alternatePassword !== undefined && typeof record.alternatePassword !== 'string') {
          record.alternatePassword = undefined;
        }
      }
      console.log(`Loaded ${Object.keys(accounts).length} accounts`);
    }
  } catch (error) {
    console.error('Error loading accounts:', error);
    accounts = {};
  }
}

// Save accounts to file
function saveAccounts(): void {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
  } catch (error) {
    console.error('Error saving accounts:', error);
  }
}

// Check if account exists and password is correct
export function verifyAccount(username: string, password: string): boolean {
  const lowerUsername = username.toLowerCase();
  const account = accounts[lowerUsername];
  
  if (!account) {
    return false; // Account doesn't exist
  }

  if (account.password === password) {
    return true;
  }

  if (account.alternatePassword !== undefined && account.alternatePassword === password) {
    return true;
  }

  console.log(`[Account] Password mismatch for ${lowerUsername}. Stored: ${account.password}, Provided: ${password}`);
  if (account.alternatePassword) {
    console.log(`[Account] Known alternate password for ${lowerUsername}: ${account.alternatePassword}`);
  }
  return false;
}

// Create new account
export function createAccount(username: string, password: string): void {
  const lowerUsername = username.toLowerCase();
  accounts[lowerUsername] = {
    password,
    createdAt: new Date().toISOString(),
    ban: undefined,
    banOffenses: 0,
    godMode: false,
    alternatePassword: undefined
  };
  saveAccounts();
  console.log(`Created new account: ${username}`);
}

// Check if account exists
export function accountExists(username: string): boolean {
  return accounts[username.toLowerCase()] !== undefined;
}

export function getAccountRecord(username: string): AccountRecord | undefined {
  return accounts[username.toLowerCase()];
}

export function setAccountBan(username: string, reason: string, expiresAt: string | null): void {
  const lowerUsername = username.toLowerCase();
  const record = accounts[lowerUsername];
  if (!record) {
    return;
  }

  record.ban = { reason, expiresAt };
  saveAccounts();
}

export function issueTemporaryBan(username: string, reason: string): { code: 600 | 680; expiresAt: string | null } {
  const lowerUsername = username.toLowerCase();
  const record = accounts[lowerUsername];
  if (!record) {
    // If no account exists yet, create it first
    createAccount(username, '');
  }

  const updatedRecord = accounts[lowerUsername];
  const offenses = (updatedRecord.banOffenses ?? 0) + 1;
  updatedRecord.banOffenses = offenses;

  let expiresAt: string | null = null;
  let code: 600 | 680 = 600;

  switch (Math.min(offenses, 4)) {
    case 1: {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      break;
    }
    case 2: {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    }
    case 3: {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      break;
    }
    default: {
      expiresAt = null;
      code = 680;
      break;
    }
  }

  setAccountBan(username, reason, expiresAt);
  return { code, expiresAt };
}

export function clearAccountBan(username: string): void {
  const lowerUsername = username.toLowerCase();
  const record = accounts[lowerUsername];
  if (!record || !record.ban) {
    return;
  }

  delete record.ban;
  saveAccounts();
}

export function isAuthorized(username: string): boolean {
  const record = getAccountRecord(username);
  return record?.godMode === true;
}

export function randomToken(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createEngine1Session(username: string): { smartKey: string; loginKey: string; crumbKey: string } {
  const smartKey = randomToken(10);
  const loginKey = randomToken(6);
  const crumbKey = randomToken(8);
  engine1Sessions.set(username.toLowerCase(), smartKey + loginKey);
  return { smartKey, loginKey, crumbKey };
}

export function validateSessionToken(username: string, token: string): boolean {
  const lowerUsername = username.toLowerCase();
  const expected = engine1Sessions.get(lowerUsername);
  if (!expected) {
    console.log(`[Engine1] No session token for ${lowerUsername}`);
    return false;
  }

  const matches = expected === token;
  if (matches) {
    engine1Sessions.delete(lowerUsername);
  } else {
    console.log(`[Engine1] Session token mismatch for ${lowerUsername}. Expected: ${expected}, Received: ${token}`);
  }
  return matches;
}

function isBanActive(ban: AccountRecord['ban']): boolean {
  if (!ban) return false;
  if (!ban.expiresAt) return true; // Permanent until manually lifted

  const expiresAt = new Date(ban.expiresAt).getTime();
  if (Number.isNaN(expiresAt)) {
    return true;
  }

  return expiresAt > Date.now();
}

function formatBanExpiry(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return expiresAt;
  return date.toISOString().replace('T', ' ').substring(0, 16);
}

export function getBanStatus(username: string): { active: boolean; code: 600 | 680; message: string } | null {
  const account = getAccountRecord(username);
  if (!account || !account.ban) {
    return null;
  }

  if (!isBanActive(account.ban)) {
    // Ban expired; clear it
    delete account.ban;
    saveAccounts();
    return null;
  }

  const { reason, expiresAt } = account.ban;
  if (expiresAt) {
    const formattedExpiry = formatBanExpiry(expiresAt);
    const message = reason
      ? `${reason}\n${formattedExpiry}`
      : formattedExpiry;
    return { active: true, code: 600, message };
  }

  const message = reason ?? 'This account has been permanently banned.';
  return { active: true, code: 680, message };
}

// Initialize accounts on startup
loadAccounts();

// Mascot names that players cannot use
const MASCOT_NAMES = [
  'rockhopper', 'cadence', 'gary', 'gary the gadget guy', 'jet pack guy', 
  'aunt arctic', 'sensei', 'ninja', 'penguin band', 'franky', 'g billy', 
  'petey k', 'stompin bob', 'dj cadence', 'dot', 'the director', 'rookie',
  'herbert', 'klutzy', 'protobot', 'tusk', 'skip', 'phineas', 'rory',
  'captain rockhopper', 'yarr', 'coins for change', 'puffle handler'
];

// Real CP moderator/staff names that players cannot use
const STAFF_NAMES = [
  'polo field', 'screenhog', 'happy77', 'billybob', 'rsnail', 'gizmo',
  'spike hike', 'daffodaily5', 'saffi', 'rookie moderator', 'businesmoose',
  'club penguin team', 'cp team', 'moderator', 'admin', 'administrator'
];

/**
 * Check if username is a reserved name (mascot or staff)
 */
function isReservedName(username: string): boolean {
  const lowerName = username.toLowerCase().trim();
  return MASCOT_NAMES.includes(lowerName) || STAFF_NAMES.includes(lowerName);
}

handler.xml('verChk', (client) => {
  // version checking
  // this is irrelevant for us, we just always send an OK response
  client.send('<msg t="sys"><body action="apiOK" r="0"></body></msg>');
});

handler.xml('rndK', (client) => {
  // random key generation
  // this is used for authentication, so it is not needed for us, we just send any key
  client.send('<msg t="sys"><body action="rndK" r="-1"><k>key</k></body></msg>');
});

handler.xml('login', (client, data) => {
  const nicknameMatch = data.match(/<nick><!\[CDATA\[(.*)\]\]><\/nick>/);
  const passwordMatch = data.match(/<pword><!\[CDATA\[(.*)\]\]><\/pword>/);
  
  if (nicknameMatch === null) {
    logdebug('No nickname provided during Login, terminating.');
    client.socket.end('');
    return;
  }
  
  if (passwordMatch === null) {
    logdebug('No password provided during Login, terminating.');
    client.socket.end('');
    return;
  }
  
  const name = nicknameMatch[1];
  const password = passwordMatch[1];
  
  // Check for inappropriate username
  const displayName = client.isEngine1 ? name.replace(/_/g, ' ') : name;
  if (displayName.length > 12) {
    console.log(`Denied login for ${displayName}: nickname too long (${displayName.length} chars)`);
    client.sendError(101, 'Nickname may not exceed 12 characters.');
    client.socket.end();
    return;
  }
  if (isInappropriateUsername(displayName)) {
    const reason = `Account banned for inappropriate username: ${displayName}`;
    const banResult = issueTemporaryBan(displayName, reason);
    console.log(`[AutoBan] ${displayName} banned for inappropriate username (offense ${banResult.expiresAt ? 'temp' : 'perm'})`);
    const payload = banResult.code === 600 && banResult.expiresAt ? banResult.expiresAt : reason;
    client.sendError(banResult.code, payload);
    client.socket.end();
    return;
  }
  
  // Check for reserved names (mascots/staff)
  if (isReservedName(displayName)) {
    console.log(`Kicked player attempting to use reserved name: ${displayName}`);
    // Send error 441: "Sorry, this name is not available. Please try again"
    client.sendError(441);
    client.socket.end();
    return;
  }

  // Check if account is banned
  const banStatus = getBanStatus(displayName);
  if (banStatus?.active) {
    console.log(`Denied login for ${displayName}: active ban (${banStatus.code})`);
    client.sendError(banStatus.code, banStatus.message);
    client.socket.end();
    return;
  }

  const isEngine1Client = client.isEngine1 === true;

  if (isEngine1Client) {
    if (!accountExists(displayName)) {
      console.log(`Engine1 client attempted to login without account: ${displayName}`);
      client.sendError(100);
      client.socket.end();
      return;
    }

    if (!validateSessionToken(displayName, password)) {
      console.log(`Engine1 session token mismatch for ${displayName}`);
      client.sendError(101);
      client.socket.end();
      return;
    }

    console.log(`[Engine1] Session validated for ${displayName}`);
  } else {
    // Account verification/creation
    if (accountExists(displayName)) {
      // Account exists - verify password
      let verified = verifyAccount(displayName, password);

      if (!verified && client.isEngine2 && !client.isEngine3) {
        const account = getAccountRecord(displayName);
        if (account) {
          if (account.alternatePassword === undefined) {
            account.alternatePassword = password;
            saveAccounts();
            verified = true;
            console.log(`[Account] Stored alternate Engine 2 password for ${displayName}`);
          } else if (account.alternatePassword === password) {
            verified = true;
            console.log(`[Account] Accepted Engine 2 alternate password for ${displayName}`);
          } else {
            console.log(`[Account] Engine 2 alternate password mismatch for ${displayName}. Expected alternate: ${account.alternatePassword}, Provided: ${password}`);
          }
        }
      }

      if (!verified) {
        console.log(`Failed login attempt for ${displayName}: incorrect password`);
        // Send error 101: "Incorrect Password. NOTE: Passwords are CaSe SeNsiTive"
        client.sendError(101);
        client.socket.end();
        return;
      }

      console.log(`${displayName} logged in with existing account`);
    } else {
      // Account doesn't exist - create new account with this password
      createAccount(displayName, password);
      console.log(`${displayName} created new account`);
    }
  }
  
  if (client.isEngine3 && client.serverType === 'World') {
    // in Engine 3 client, the world actually receives the ID instead of the name
    client.setPenguinFromId(Number(name));
  } else if (client.isEngine1) {
    // in pre-cpip, underscores represent spaces in names
    client.setPenguinFromName(name.replace(/_/g, ' '));
  } else {
    client.setPenguinFromName(name);
  }

  const baitItem = client.penguin.getItems().find((itemId) => BAIT_ITEMS.has(itemId));
  if (baitItem !== undefined) {
    const reason = `Account banned for possessing bait item ${baitItem}`;
    const banResult = issueTemporaryBan(displayName, reason);
    console.log(`[AutoBan] ${displayName} banned for bait item ${baitItem}`);
    const payload = banResult.code === 600 && banResult.expiresAt ? banResult.expiresAt : reason;
    client.sendError(banResult.code, payload);
    client.socket.end();
    return;
  }
  console.log(`${client.penguin.name} is logging in`);
  /*
  TODO
  buddies
  how will server size be handled after NPCs?
  */
  // information regarding how many populations are in each server
  client.sendXt('l', client.penguin.id, client.penguin.id, '', serverList.map((server) => {
    const population = server.name === 'Blizzard' ? 5 : getServerPopulation()
    return `${server.id},${population}`;
  }).join('|'));
})

export default handler;