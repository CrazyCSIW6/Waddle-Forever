import { Client } from '../../client';
import { Handler } from '..';
import { Room } from '../../game-logic/rooms';
import { getDateString } from '../../../common/utils';
import { commandsHandler } from '../commands';
import { Handle } from '../handles';
import { getServerPopulation } from '../../servers';
import { randomInt } from '../../../common/utils';
import { isGreaterOrEqual, isLower, Version } from '../../routes/versions';

const handler = new Handler();

// Track which rooms have already had bots spawned
const roomsWithBots = new Set<number>();

// Map to store server population for each client
const clientServerPopulation = new Map<any, number>();

// Track per-room maintenance intervals so we don't duplicate timers
const roomBotIntervals = new Map<number, NodeJS.Timeout>();
const roomBotTargets = new Map<number, number>();

const PLAYER_NAMES = [
  'Penguin123', 'IceBreaker', 'SnowDude', 'FrostyFox',
  'CoolPenguin', 'IcyMcCool', 'PenguinPro', 'SnowKing',
  'FrostBite', 'ColdSnap', 'IceAge', 'BlizzardBob',
  'SnowStorm', 'WinterWolf', 'FrozenFish', 'PolarBear',
  'ArcticAce', 'ChillyChamp', 'FrostKing', 'IceQueen',
  'SnowAngel', 'WinterWish', 'CrystalClear', 'FrostNova'
];

// Launch penguin palette only to avoid colour issues with older clients
const PENGUIN_COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

type BotPersonality = 'dancer' | 'wanderer' | 'snowball_fighter' | 'annoying' | 'explorer' | 'socializer' | 'sitter' | 'follower' | 'jokester' | 'speedster' | 'shy' | 'show_off';

// Room IDs for reference
const ROOM_IDS = {
  TOWN: 100,
  COFFEE_SHOP: 110,
  DANCE_CLUB: 120,
  SNOW_FORTS: 801,
  PLAZA: 300,
  PET_SHOP: 310,
  PIZZA_PARLOR: 330,
  DOCK: 800,
  BEACH: 400,
  LIGHTHOUSE: 410,
  SKI_VILLAGE: 200,
  SKI_LODGE: 220,
  ICE_RINK: 802
};

// Track bot behaviors
type BotAge = 'child' | 'preteen' | 'teen' | 'adult';
const botBehaviors = new Map<Client, { 
  personality: BotPersonality, 
  age: BotAge,
  target?: Client, 
  intervals: NodeJS.Timeout[],
  hasBetaHat?: boolean,
  lastChatTime?: number,
  isNonMember?: boolean
}>();

// Catalog items organized by release date
type CatalogItem = {
  id: number;
  name: string;
  type: 'head' | 'face' | 'neck' | 'body' | 'hand' | 'feet' | 'pin';
  wearChance: number; // Base chance this item would be worn (0-1)
  isEasterEgg?: boolean; // Easter egg items are rarer
};

const CATALOG_ITEMS: { date: string, items: CatalogItem[] }[] = [
  {
    date: '2005-08-01',
    items: [
      { id: 403, name: 'Hard Hat', type: 'head', wearChance: 0.15 },
      { id: 201, name: 'Red Shirt', type: 'body', wearChance: 0.25 },
      { id: 404, name: 'Tan Cowboy Hat', type: 'head', wearChance: 0.12 },
      { id: 405, name: 'Green Ball Cap', type: 'head', wearChance: 0.18 },
      { id: 401, name: 'Sombrero', type: 'head', wearChance: 0.10 },
      { id: 220, name: 'Hockey Stick', type: 'hand', wearChance: 0.15 },
      { id: 131, name: 'Green Snorkel', type: 'face', wearChance: 0.08 },
      { id: 103, name: '3D Glasses', type: 'face', wearChance: 0.12 },
      { id: 408, name: 'Flower Hat', type: 'head', wearChance: 0.10 },
      { id: 212, name: 'Grass Skirt', type: 'body', wearChance: 0.08 },
      { id: 481, name: 'Headphones', type: 'head', wearChance: 0.20 },
      { id: 219, name: 'Blue Duffle Coat', type: 'body', wearChance: 0.22 },
      { id: 221, name: 'Black Hoodie', type: 'body', wearChance: 0.25 },
      { id: 102, name: 'Dark Vision Goggles', type: 'face', wearChance: 0.10 },
      { id: 214, name: 'Black Bowtie', type: 'neck', wearChance: 0.08 },
      { id: 101, name: 'Black Sunglasses', type: 'face', wearChance: 0.20 },
    ]
  },
  {
    date: '2005-10-01',
    items: [
      { id: 452, name: 'Viking Helmet', type: 'head', wearChance: 0.05, isEasterEgg: true },
      { id: 106, name: 'Mask', type: 'face', wearChance: 0.15 },
      { id: 301, name: 'Red Cape', type: 'neck', wearChance: 0.12 },
      { id: 244, name: 'Ghost Costume', type: 'body', wearChance: 0.18 },
      { id: 412, name: 'Tiara', type: 'head', wearChance: 0.08 },
      { id: 252, name: 'Pink Dress', type: 'body', wearChance: 0.10 },
      // Country pins - lower wear chance as they're pins
      { id: 500, name: 'Canada Pin', type: 'pin', wearChance: 0.02 },
      { id: 504, name: 'Belgium Pin', type: 'pin', wearChance: 0.01 },
      { id: 508, name: 'Finland Pin', type: 'pin', wearChance: 0.01 },
      { id: 512, name: 'Japan Pin', type: 'pin', wearChance: 0.02 },
      { id: 516, name: 'Poland Pin', type: 'pin', wearChance: 0.01 },
      { id: 501, name: 'USA Pin', type: 'pin', wearChance: 0.02 },
      { id: 505, name: 'Brazil Pin', type: 'pin', wearChance: 0.01 },
      { id: 509, name: 'France Pin', type: 'pin', wearChance: 0.01 },
      { id: 513, name: 'Korea Pin', type: 'pin', wearChance: 0.01 },
      { id: 517, name: 'Russia Pin', type: 'pin', wearChance: 0.01 },
      { id: 502, name: 'Australia Pin', type: 'pin', wearChance: 0.01 },
      { id: 506, name: 'China Pin', type: 'pin', wearChance: 0.01 },
      { id: 510, name: 'Germany Pin', type: 'pin', wearChance: 0.01 },
      { id: 514, name: 'Netherlands Pin', type: 'pin', wearChance: 0.01 },
      { id: 518, name: 'Spain Pin', type: 'pin', wearChance: 0.01 },
      { id: 503, name: 'UK Pin', type: 'pin', wearChance: 0.01 },
      { id: 507, name: 'Denmark Pin', type: 'pin', wearChance: 0.01 },
      { id: 511, name: 'Israel Pin', type: 'pin', wearChance: 0.01 },
      { id: 515, name: 'Norway Pin', type: 'pin', wearChance: 0.01 },
      { id: 519, name: 'Sweden Pin', type: 'pin', wearChance: 0.01 },
    ]
  },
  {
    date: '2005-11-01',
    items: [
      { id: 484, name: 'Pink Earmuffs', type: 'head', wearChance: 0.12 },
      { id: 172, name: 'Yellow Scarf', type: 'neck', wearChance: 0.15 },
      { id: 410, name: "Queen's Crown", type: 'head', wearChance: 0.05 },
      { id: 222, name: 'Pink Hoodie', type: 'body', wearChance: 0.20 },
    ]
  },
  {
    date: '2005-12-01',
    items: [
      { id: 453, name: 'Football Helmet', type: 'head', wearChance: 0.10 },
      { id: 234, name: 'Acoustic Guitar', type: 'hand', wearChance: 0.08 },
      { id: 233, name: 'Red Electric Guitar', type: 'hand', wearChance: 0.04, isEasterEgg: true },
      { id: 235, name: 'Yellow Raincoat', type: 'body', wearChance: 0.15 },
      { id: 417, name: 'Brown Fedora', type: 'head', wearChance: 0.12 },
    ]
  },
];

// Special case: Party Hat
const PARTY_HAT = { id: 413, name: 'Party Hat', type: 'head' as const, wearChance: 0.05 };

/**
 * Get available clothing items based on the server timeline
 */
function getAvailableClothing(version: Version): CatalogItem[] {
  const availableItems: CatalogItem[] = [];
  
  // Add items from catalogs that have been released
  for (const catalog of CATALOG_ITEMS) {
    if (isGreaterOrEqual(version, catalog.date)) {
      availableItems.push(...catalog.items);
    }
  }
  
  return availableItems;
}

/**
 * Check if current date is during party hat availability period
 * Party hat was only available on September 21st 2005 during the 2-hour beta test party periods
 */
function isPartyHatPeriod(version: Version): boolean {
  return isGreaterOrEqual(version, '2005-09-21') && !isGreaterOrEqual(version, '2005-09-22');
}

/**
 * Select random clothing items for a bot based on timeline
 */
function selectBotClothing(version: Version): Partial<Record<string, number>> {
  const clothing: Partial<Record<string, number>> = {};
  const availableItems = getAvailableClothing(version);
  
  // Check for party hat special case
  let partyHatChance = 0.05; // Default: 5% (unobtainable item)
  if (isGreaterOrEqual(version, '2005-09-21') && !isGreaterOrEqual(version, '2005-09-22')) {
    // September 21st 2005: 50% chance (during beta test party)
    partyHatChance = 0.50;
  } else if (isGreaterOrEqual(version, '2005-09-22') && !isGreaterOrEqual(version, '2005-10-24')) {
    // September 22 - October 23: 25% chance (post-party but pre-release, beta testers had it)
    partyHatChance = 0.25;
  }
  
  if (Math.random() < partyHatChance) {
    clothing.head = PARTY_HAT.id;
  }
  
  // Group items by type
  const itemsByType: Record<string, CatalogItem[]> = {};
  for (const item of availableItems) {
    if (!itemsByType[item.type]) {
      itemsByType[item.type] = [];
    }
    itemsByType[item.type].push(item);
  }
  
  // For each clothing type, randomly decide if bot wears something
  for (const [type, items] of Object.entries(itemsByType)) {
    // Skip if we already have a head item (party hat)
    if (type === 'head' && clothing.head) continue;
    
    // Chance to wear any item of this type
    const wearAnythingChance = type === 'body' ? 0.7 : type === 'head' ? 0.5 : type === 'face' ? 0.3 : 0.2;
    
    if (Math.random() < wearAnythingChance) {
      // Select an item based on weighted chances
      const selectedItem = selectWeightedItem(items);
      if (selectedItem) {
        clothing[type] = selectedItem.id;
      }
    }
  }
  
  return clothing;
}

/**
 * Select an item based on weighted chances
 */
function selectWeightedItem(items: CatalogItem[]): CatalogItem | null {
  if (items.length === 0) return null;
  
  // Adjust weights for easter egg items
  const adjustedItems = items.map(item => ({
    ...item,
    wearChance: item.isEasterEgg ? item.wearChance * 0.3 : item.wearChance
  }));
  
  // Calculate total weight
  const totalWeight = adjustedItems.reduce((sum, item) => sum + item.wearChance, 0);
  
  // Random selection
  let random = Math.random() * totalWeight;
  for (const item of adjustedItems) {
    random -= item.wearChance;
    if (random <= 0) {
      return item;
    }
  }
  
  return adjustedItems[adjustedItems.length - 1];
}
// Joining server
handler.xt(Handle.JoinServerOld, (client) => {
  // This is supposed to get the server population of the server the player clicked on
  // For now, just set the population to 300
  const serverPopulation = 300;
  clientServerPopulation.set(client, 300);

  resetAllRoomBots(client.server);

  const townRoom = client.server.getRoom(Room.Town);
  const minimumTownBots = 3;
  const townTarget = Math.max(minimumTownBots, getTargetBotCount(serverPopulation));
  roomsWithBots.add(Room.Town);
  roomBotTargets.set(Room.Town, townTarget);
  spawnBotsForRoom(townRoom, serverPopulation, townTarget);
  maintainRoomBots(townRoom, serverPopulation);

  client.sendXt('js')
  client.joinRoom(Room.Town)
})

/**
 * Reset all bots in all rooms on the server
 * Generate fake server population for Engine 1
 */
function getEngine1Population(): number {
  const seed = Math.random();
  if (seed < 0.2) return Math.floor(Math.random() * 50); // Empty
  if (seed < 0.4) return Math.floor(Math.random() * 50) + 50; // Low
  if (seed < 0.6) return Math.floor(Math.random() * 100) + 100; // Medium
  if (seed < 0.8) return Math.floor(Math.random() * 200) + 200; // Busy
  if (seed < 0.95) return Math.floor(Math.random() * 100) + 400; // Very busy
  return Math.floor(Math.random() * 100) + 500; // Full
}

// Joining room
handler.xt(Handle.JoinRoomOld, (client, roomId) => {
  const serverPopulation = clientServerPopulation.get(client) ?? 300;

  // Spawn bots into the room before the player joins
  if (!roomsWithBots.has(roomId)) {
    const room = client.server.getRoom(roomId);
    roomsWithBots.add(roomId);
    spawnRandomNPCs(room, serverPopulation);
  } else {
    const room = client.server.getRoom(roomId);
    maintainRoomBots(room, serverPopulation);
  }

  // Now join the player to the room
  client.joinRoom(roomId);
})

function getTargetBotCount(serverPopulation: number): number {
  if (serverPopulation < 50) {
    return 3;
  } else if (serverPopulation < 100) {
    return 6;
  } else if (serverPopulation < 200) {
    return 12;
  } else if (serverPopulation < 400) {
    return 25;
  } else if (serverPopulation < 500) {
    return 40;
  }
  return 50;
}

/**
 * Choose a personality for a bot based on room and chance
 */
function chooseBotPersonality(room: any): BotPersonality {
  const roomId = room.id;
  const rand = Math.random();
  
  // Room-specific personalities
  if (roomId === ROOM_IDS.DANCE_CLUB) {
    // 80% dancers in Dance Club
    return rand < 0.8 ? 'dancer' : 'socializer';
  } else if (roomId === ROOM_IDS.SNOW_FORTS) {
    // 50% snowball fighters in Snow Forts
    if (rand < 0.5) return 'snowball_fighter';
    if (rand < 0.7) return 'wanderer';
    return 'speedster';
  } else if (roomId === ROOM_IDS.COFFEE_SHOP || roomId === ROOM_IDS.PIZZA_PARLOR) {
    // More sitters in food places
    if (rand < 0.4) return 'sitter';
    if (rand < 0.7) return 'socializer';
    return 'wanderer';
  } else if (roomId === ROOM_IDS.PET_SHOP) {
    // More show-offs in Pet Shop (showing off puffles)
    if (rand < 0.2) return 'show_off';
    return 'wanderer';
  }
  
  // General personality distribution
  if (rand < 0.05) return 'annoying';  // 5% annoying bots
  if (rand < 0.10) return 'shy';       // 5% shy bots
  if (rand < 0.15) return 'speedster'; // 5% speedsters
  if (rand < 0.20) return 'follower';  // 5% followers
  if (rand < 0.25) return 'jokester';  // 5% jokesters
  if (rand < 0.35) return 'explorer';  // 10% explorers
  if (rand < 0.50) return 'socializer'; // 15% socializers
  if (rand < 0.70) return 'wanderer';  // 20% wanderers
  return 'sitter'; // 30% sitters
}

/**
 * Spawn a single bot in a room
 */
function spawnSingleBot(room: any, serverPopulation: number) {
  if (!room) {
    return;
  }

  const npcName = getAvailableBotName(room);
  const bot = room.botGroup.spawnBot(npcName, room.id);

  bot.penguin.color = PENGUIN_COLORS[randomInt(0, PENGUIN_COLORS.length - 1)];
  
  // Apply random clothing based on timeline
  const version = bot.server.settings.version;
  const clothing = selectBotClothing(version);
  
  // Apply each clothing item
  if (clothing.head) bot.penguin.head = clothing.head;
  if (clothing.face) bot.penguin.face = clothing.face;
  if (clothing.neck) bot.penguin.neck = clothing.neck;
  if (clothing.body) bot.penguin.body = clothing.body;
  if (clothing.hand) bot.penguin.hand = clothing.hand;
  if (clothing.feet) bot.penguin.feet = clothing.feet;
  if (clothing.pin) bot.penguin.pin = clothing.pin;

  const personality = chooseBotPersonality(room);
  
  // Assign age (weighted towards younger players in 2005)
  const ageRoll = Math.random();
  let age: BotAge;
  if (ageRoll < 0.35) age = 'child'; // 8-11 years old
  else if (ageRoll < 0.55) age = 'preteen'; // 12-13 years old
  else if (ageRoll < 0.80) age = 'teen'; // 14-17 years old
  else age = 'adult'; // 18+ years old
  
  // 30% chance to be a non-member (no clothes)
  const isNonMember = Math.random() < 0.3;
  if (isNonMember) {
    bot.penguin.head = 0;
    bot.penguin.face = 0;
    bot.penguin.neck = 0;
    bot.penguin.body = 0;
    bot.penguin.hand = 0;
    bot.penguin.feet = 0;
    bot.penguin.pin = 0;
  }
  
  // Check if bot has party hat (beta tester)
  const hasBetaHat = !isNonMember && bot.penguin.head === 413;

  const { x, y } = pickSpawnCoordinates(room, bot);
  bot.setPosition(x, y);
  broadcastBotAppearance(room, bot, x, y);

  // Initialize bot behavior tracking
  const intervals: NodeJS.Timeout[] = [];
  botBehaviors.set(bot, { personality, age, intervals, hasBetaHat, lastChatTime: 0, isNonMember });

  // Apply personality-specific behavior
  switch (personality) {
    case 'dancer':
      applyDancerBehavior(bot, room, intervals);
      break;
    case 'snowball_fighter':
      applySnowballFighterBehavior(bot, room, intervals);
      break;
    case 'annoying':
      applyAnnoyingBehavior(bot, room, intervals);
      break;
    case 'explorer':
      applyExplorerBehavior(bot, room, intervals);
      break;
    case 'socializer':
      applySocializerBehavior(bot, room, intervals);
      break;
    case 'sitter':
      applySitterBehavior(bot, room, intervals);
      break;
    case 'follower':
      applyFollowerBehavior(bot, room, intervals);
      break;
    case 'jokester':
      applyJokesterBehavior(bot, room, intervals);
      break;
    case 'speedster':
      applySpeedsterBehavior(bot, room, intervals);
      break;
    case 'shy':
      applyShyBehavior(bot, room, intervals);
      break;
    case 'show_off':
      applyShowOffBehavior(bot, room, intervals);
      break;
    case 'wanderer':
    default:
      applyWandererBehavior(bot, room, intervals);
      break;
  }

  // Apply chat behavior to all bots
  applyChatBehavior(bot, room, intervals);
  
  // Kids and preteens are OBSESSED with party hats (beta testers)
  if ((age === 'child' || age === 'preteen') && !hasBetaHat) {
    applyPartyHatAttractionBehavior(bot, room, intervals, age);
  }
  
  // Common leave behavior for all bots
  const leaveInterval = setInterval(() => {
    if (bot.room === room) {
      if (Math.random() < 0.2) {
        cleanupBotBehavior(bot);
        bot.leaveRoom();
        clearInterval(leaveInterval);
      }
    } else {
      clearInterval(leaveInterval);
    }
  }, randomInt(15000, 45000));
  intervals.push(leaveInterval);
}

/**
 * Spawn random NPCs that walk around in a room
 * Bot count scales based on server population:
 * - 0-50 (empty): 0-1 bots
 * - 50-100 (low): 1-2 bots
 * - 100-200 (medium): 2-3 bots
 * - 200-400 (busy): 3-4 bots
 * - 400-500 (very busy): 4-5 bots
 * - 500+ (full): 5-6 bots
 */
function spawnRandomNPCs(room: any, serverPopulation: number = 300) {
  if (!room) return;

  const targetCount = getTargetBotCount(serverPopulation);
  roomBotTargets.set(room.id, targetCount);

  spawnBotsForRoom(room, serverPopulation, targetCount);
  maintainRoomBots(room, serverPopulation);
}

function spawnBotsForRoom(room: any, serverPopulation: number, targetCount: number) {
  if (!room) {
    return;
  }

  const currentCount = room.botGroup.bots.length;
  if (currentCount >= targetCount) {
    return;
  }

  const botsToSpawn = targetCount - currentCount;
  for (let i = 0; i < botsToSpawn; i++) {
    spawnSingleBot(room, serverPopulation);
  }
}

function maintainRoomBots(room: any, serverPopulation: number) {
  if (!room) {
    return;
  }

  const roomId = room.id;

  if (!roomBotTargets.has(roomId)) {
    roomBotTargets.set(roomId, getTargetBotCount(serverPopulation));
  }

  if (roomBotIntervals.has(roomId)) {
    return;
  }

  const interval = setInterval(() => {
    const currentRoom = room.server?.getRoom(roomId) ?? room;
    const players = currentRoom.players ?? [];
    if (players.length === 0) {
      currentRoom.botGroup.bots.forEach((bot: Client) => bot.leaveRoom());
      clearInterval(interval);
      roomBotIntervals.delete(roomId);
      roomBotTargets.delete(roomId);
      roomsWithBots.delete(roomId);
      return;
    }

    const targetCount = roomBotTargets.get(roomId) ?? getTargetBotCount(serverPopulation);
    const currentCount = currentRoom.botGroup.bots.length;

    if (currentCount >= targetCount) {
      return;
    }

    const botsToSpawn = Math.min(targetCount - currentCount, 2);
    for (let i = 0; i < botsToSpawn; i++) {
      spawnSingleBot(currentRoom, serverPopulation);
    }
  }, randomInt(15000, 25000));

  roomBotIntervals.set(roomId, interval);
}

function pickSpawnCoordinates(room: any, bot: Client) {
  let x = 0;
  let y = 0;
  let attempts = 0;
  let tooClose = true;
  const otherBots = room.botGroup.bots.filter((b: Client) => b !== bot);

  while (tooClose && attempts < 10) {
    x = randomInt(100, 700);
    y = randomInt(100, 500);

    tooClose = otherBots.some((existing: Client) => {
      const dx = existing.x - x;
      const dy = existing.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 100;
    });

    attempts++;
  }

  return { x, y };
}

function broadcastBotAppearance(room: any, bot: Client, x: number, y: number) {
  const penguinId = bot.penguin.id;
  const penguinString = bot.penguinString;

  room.players.forEach((player: Client) => {
    player.sendXt('ap', penguinString);
    player.sendXt('up', penguinString);
    player.sendXt('sp', penguinId, x, y);
  });
}

function getAvailableBotName(room: any): string {
  const existingNames = new Set(room.botGroup.bots.map((b: Client) => b.penguin.name));
  let attempts = 0;
  let name = PLAYER_NAMES[randomInt(0, PLAYER_NAMES.length - 1)];

  while (existingNames.has(name) && attempts < PLAYER_NAMES.length * 2) {
    name = PLAYER_NAMES[randomInt(0, PLAYER_NAMES.length - 1)];
    attempts++;
  }

  if (existingNames.has(name)) {
    name = `${name}${randomInt(1000, 9999)}`;
  }

  return name;
}

// Chat dialogue pools
const DIALOGUE = {
  // General chat by age
  child: {
    greetings: [
      'hi', 'hello', 'hey', 'hi everyone', 'sup', 'hiii', 'heyyy', 'hi guys', 
      'helo', 'hai', 'yo', 'hiya', 'greetings', 'hi everybody', 'wave'
    ],
    general: [
      'this is fun', 'i like this game', 'wanna be friends?', 'cool', 'lol', 'haha', 'omg', 'wow',
      'this is awesome', 'yay', 'woohoo', 'weee', 'im having fun', 'this place is cool',
      'look at me', 'watch this', 'im a penguin', 'penguins are cool', 'im blue', 'im red',
      'i love snow', 'lets play', 'this is the best', 'so cool', 'amazing', 'awesome game',
      'my mom said i can play for 30 minutes', 'my brother showed me this game', 
      'im only 8', 'im 9 years old', 'this is my first time', 'i just joined',
      'where is everyone', 'come here', 'follow me', 'wait for me', 'dont leave',
      'im bored', 'what now', 'this is boring', 'nvm this is fun again'
    ],
    questions: [
      'what do you do here?', 'how do i get coins?', 'where is the pizza place?', 'wanna play?',
      'can we be friends?', 'whats your name?', 'how old are you?', 'where are you from?',
      'is this game free?', 'do i need to pay?', 'can i change my color?',
      'where do i buy clothes?', 'can you show me around?', 'what room is this?', 'how do i leave?',
      'how do i dance?', 'where did you get that?', 'can i have that?', 'will you give me coins?'
    ]
  },
  preteen: {
    greetings: [
      'hey', 'hi', 'sup', 'whats up', 'yo', 'hey guys', 'wassup', 'heyo', 
      'sup everyone', 'hey there', 'hi all', 'ayy', 'yoo', 'hey yall'
    ],
    general: [
      'lol', 'cool', 'nice', 'awesome', 'this is cool', 'haha', 'rofl', 'lmao', 'brb',
      'gtg', 'bbl', 'back', 'im back', 'anyone here', 'anyone online',
      'this game is fun', 'bored', 'what to do', 'lmao this is funny',
      'rofl', 'kek', 'omg', 'wtf', 'lolol', 'hahaha', 'XD', 'xD',
      'getting coins', 'saving up', 'buying stuff soon', 'need more coins',
      'anyone wanna hang out', 'im 12', 'im 13', 'middle school gang',
      'school was boring today', 'homework sucks', 'cant wait for weekend',
      'my parents let me play after homework', 'dinner time soon', 'gotta go soon'
    ],
    questions: [
      'how do i get more coins?', 'whats the fastest way to get coins?', 'where can i buy stuff?', 
      'anyone got membership?', 'is membership worth it?', 'how much does membership cost?', 
      'anyone know any cheats?', 'are there any secrets?',
      'wanna add me?', 'can we be buddies?',
      'how do i change rooms?', 'where should i go?', 'whats fun to do?'
    ]
  },
  teen: {
    greetings: [
      'hey', 'hi', 'sup', 'whats up', 'hey guys', 'yo', 'whats good', 
      'sup yall', 'evening', 'afternoon', 'morning', 'hey everyone'
    ],
    general: [
      'cool', 'nice', 'lol', 'haha', 'this game is actually pretty fun', 'interesting', 'whatever',
      'not bad', 'decent game', 'surprisingly good', 'kinda addicting ngl',
      'bored so im here', 'killing time', 'procrastinating homework', 
      'should be studying', 'exam tomorrow but here i am', 'just chilling',
      'been playing this for a while now', 'found this on a forum', 'saw this online',
      'my younger sibling plays this', 'babysitting and got curious',
      'this is weirdly relaxing', 'good way to destress', 'better than myspace',
      'anyone else in high school?', 'junior year here', 'senior here',
      'applying to colleges soon', 'SATs are brutal', 'this beats studying'
    ],
    questions: [
      'anyone else here from the forums?', 'is there a guide for this game?', 'what are you supposed to do here?',
      'whats the endgame?', 'is there pvp?', 'any competitive aspects?',
      'how active is the community?', 'worth getting into?', 'any updates planned?',
      'how long have you been playing?', 'whats your main goal here?',
      'any pro tips?', 'whats the meta?', 'best strategy for coins?',
      'membership benefits worth it?', 'any rare items?', 'trading system exist?'
    ]
  },
  adult: {
    greetings: [
      'hello', 'hi', 'hey everyone', 'greetings', 'good day', 'hello there',
      'hi folks', 'afternoon everyone', 'evening all', 'howdy'
    ],
    general: [
      'interesting game', 'this is quite charming', 'not bad', 'clever design', 'my kid likes this game',
      'my son plays this', 'my daughter loves this', 'playing with my kid',
      'checking this out for my children', 'seeing what the fuss is about',
      'surprisingly well designed', 'good moderation system', 'safe environment for kids',
      'impressed by the chat filter', 'nice community features', 'well thought out',
      'good educational value', 'teaches social skills', 'nice creative outlet',
      'better than TV', 'glad this exists', 'wholesome content',
      'refreshing compared to other games', 'no violence which is great',
      'taking a break from work', 'coffee break', 'lunch break entertainment',
      'interesting business model', 'well monetized', 'good freemium approach'
    ],
    questions: [
      'is this game appropriate for children?', 'how does the membership work?', 'whats the goal of this game?',
      'what age range is this for?', 'how is moderation handled?', 'are there parental controls?',
      'how do i monitor my childs activity?', 'is the chat safe?', 'any concerning content?',
      'how much does membership cost?', 'are there hidden fees?', 'subscription or one-time?',
      'can progress be saved?', 'multi-device support?', 'how to reset password?',
      'who develops this?', 'company background?', 'how long has this been around?'
    ]
  },
  
  // Beta testing specific
  beta: {
    child: [
      'this is so cool', 'i love being a beta tester', 'i got to test this game!', 'im helping make the game!',
      'im a beta tester', 'i test games', 'im special', 'i got picked', 'they chose me',
      'found bugs today', 'helping the developers', 'making the game better',
      'beta party was amazing', 'the party was so fun', 'i went to the party',
      'im so lucky', 'not everyone can play', 'exclusive access', 'early player'
    ],
    preteen: [
      'this beta test is awesome', 'im testing the game', 'finding bugs is fun', 'beta testing rocks',
      'official beta tester here', 'been here since beta', 'beta crew',
      'helping with development', 'reporting bugs', 'giving feedback',
      'the beta party was sick', 'party was epic', 'got my hat at the party',
      'been playing since august', 'early adopter', 'before it was popular'
    ],
    teen: [
      'beta testing is pretty fun', 'finding bugs for the devs', 'this game has potential', 'glad i got into the beta',
      'interesting to see game development', 'watching this evolve', 'been here since day one',
      'providing constructive feedback', 'QA testing basically', 'unpaid QA lol',
      'beta party was a good time', 'party was cool', 'met some cool people at the party',
      'curious how this will turn out', 'has promise', 'could be big'
    ],
    adult: [
      'interesting beta test', 'good to see the game developing', 'been testing since august', 'providing feedback to the team',
      'professional perspective on the beta', 'well organized test', 'good communication from devs',
      'impressed with the development process', 'solid foundation', 'good potential here',
      'the party was well executed', 'nice community event', 'good engagement strategy',
      'interested in the business side', 'watching this company', 'could be successful'
    ]
  },
  
  // Party hat reactions (post Oct 24, 2005)
  betaHat: {
    child: [
      'BETA!!', 'OMG BETA TESTER', 'can i have coins pls', 'can u give me items', 'how did u get that hat', 'GIVE ME COINS',
      'BETA TESTER!!', 'ur a beta', 'BETA', 'omg ur so cool', 'can i be beta too',
      'HOW DO I GET THAT', 'I WANT THAT HAT', 'PLEASE GIVE ME COINS', 'PLEASE GIVE ME ITEMS',
      'can u help me', 'can u give me stuff', 'share coins pls', 'ur rich right',
      'teach me', 'show me secrets', 'tell me cheats', 'how do i get hat',
      'are you famous', 'are you special', 'how long have you played'
    ],
    preteen: [
      'whoa beta hat', 'beta tester!', 'can i have some coins?', 'thats so rare', 'lucky',
      'yo beta tester', 'og player', 'respect', 'thats sick', 'thats dope',
      'how much is that worth', 'thats gotta be rare', 'never seen that before',
      'can you spare some coins', 'hook me up', 'help a noob out',
      'how did you get in beta', 'how do i get beta access', 'teach me your ways',
      'youre like a veteran', 'youve been here forever'
    ],
    teen: [
      'nice beta hat', 'og beta tester', 'thats rare', 'cool hat',
      'respect for being there', 'og player right here', 'been here since the start',
      'thats actually pretty cool', 'rare item nice', 'exclusive gear',
      'must be worth a lot', 'probably cant get that anymore', 'limited edition',
      'how was the beta party', 'heard the party was cool', 'wish i was there',
      'youve seen this game evolve', 'watched it grow'
    ],
    adult: [
      'ah a beta tester', 'nice to see an og player', 'you were here for the party',
      'early adopter', 'original player', 'been here from the start',
      'interesting seeing early players', 'you helped test this',
      'your feedback helped shape this', 'thanks for testing',
      'how has the game changed', 'whats different from beta', 'hows it evolved'
    ]
  },
  
  // Easter egg item reactions
  easterEgg: {
    child: [
      'whoa cool item', 'how did u get that?', 'i want that', 'where did u find that',
      'COOL', 'OMG', 'AWESOME', 'how do i get that', 'where is that',
      'ive never seen that', 'thats so cool', 'i need that', 'gimme that',
      'teach me', 'show me', 'help me find it', 'is it in the shop',
      'how much is that', 'is it expensive', 'can i buy that'
    ],
    preteen: [
      'thats cool', 'nice item', 'how did u get that', 'where is that from',
      'yo thats sick', 'thats dope', 'never seen that', 'is that new',
      'rare item?', 'exclusive?', 'limited edition?', 'special item',
      'where do i find that', 'catalog item?', 'member only?',
      'thats unique', 'stand out item', 'pretty cool'
    ],
    teen: [
      'thats a rare item', 'never seen that before', 'how did you get that?', 'is that even in the catalog?',
      'that looks unique', 'unusual item', 'not standard gear',
      'special edition?', 'event exclusive?', 'promotional item?',
      'whats the story behind that', 'how rare is that', 'bet thats hard to get',
      'impressive collection', 'good find', 'nice piece'
    ],
    adult: [
      'interesting item', 'havent seen that before', 'unique piece',
      'unusual design', 'distinctive', 'stands out',
      'special edition i assume', 'limited availability?', 'exclusive item?',
      'good taste', 'nice choice', 'well selected'
    ]
  },
  
  // Beta tester defending themselves
  betaDefense: {
    teen: [
      'give me some space', 'stop begging', 'i cant give you anything', 'leave me alone',
      'dude seriously stop', 'youre being annoying', 'back off', 'personal space please',
      'i literally cant give you coins', 'thats not how it works', 'stop asking',
      'this is getting old', 'find someone else', 'im not your bank',
      'go earn your own coins', 'just play the game normally'
    ],
    adult: [
      'i dont have anything to give you', 'please stop following me', 'this is getting ridiculous',
      'i cannot transfer items', 'the game doesnt work that way', 'please understand',
      'this is becoming harassment', 'i need my personal space', 'kindly leave me alone',
      'ive asked politely', 'this needs to stop', 'respect my boundaries',
      'im here to enjoy the game', 'not a charity', 'earn items yourself'
    ]
  },
  
  // Beta tester complaints
  betaComplaint: [
    'this game is unplayable because of these kids',
    'cant even walk around without being swarmed',
    'maybe i should take off my hat',
    'this is why we cant have nice things',
    'the beta party was so much better',
    'getting mobbed every room i enter',
    'this hat is becoming a curse',
    'cant have a normal conversation anymore',
    'everyone just wants free stuff',
    'no one understands how the game works',
    'wish there was a private server',
    'the community has changed',
    'it was better when there were fewer players',
    'miss the early days'
  ],
  
  // Jokester beta lines
  jokesterBeta: [
    'lol im getting called a beta here too now',
    'beta tester? more like be-a pest-er',
    'i was beta testing before it was cool',
    'my hat brings all the noobs to the yard',
    'professionally annoyed since august 2005',
    'beta tester is just a fancy word for guinea pig',
    'i found bugs so you dont have to lol',
    'my hat is a noob magnet',
    'should have worn a disguise',
    'famous for a hat lmao'
  ],
  
  // Non-member dialogue
  nonMember: {
    child: [
      'i cant afford clothes', 'my parents wont buy membership', 'i want cool stuff', 
      'how do i get free items', 'i wish i had clothes', 'everyone has cool stuff except me',
      'can someone give me coins', 'i need membership', 'i want to buy things'
    ],
    preteen: [
      'saving up for membership', 'cant afford membership yet', 'non member life',
      'grinding for coins', 'wish i had membership', 'member items look cool',
      'how do non members get stuff', 'being broke sucks', 'need more coins'
    ],
    teen: [
      'non member grind', 'cant justify membership cost', 'free to play life',
      'membership is expensive', 'making do without membership', 'non member struggle',
      'anyone else non member', 'limited options as non member'
    ],
    adult: [
      'not purchasing membership', 'staying free to play', 'testing before buying membership',
      'evaluating if membership is worth it', 'free account for now'
    ]
  },
  
  // Snowball hit reactions
  snowballHit: {
    child: [
      'HEY', 'STOP IT', 'that hurt', 'why did you do that', 'stop throwing snowballs',
      'ur mean', 'thats not nice', 'dont throw at me', 'i didnt do anything',
      'stop', 'cut it out', 'leave me alone'
    ],
    preteen: [
      'wtf', 'the fuck', 'bro what', 'bruh', 'really', 'seriously',
      'what was that for', 'the fuck did i do', 'why', 'random much',
      'ok then', 'alright then', 'ur gonna regret that', 'wanna fight',
      'come at me', 'is that all you got'
    ],
    teen: [
      'bro fuck off', 'fuck off', 'the fuck did i do', 'what the fuck',
      'ur retarded', 'retard', 'alr then lets fight', 'wanna go',
      'really dude', 'thats how it is', 'ok asshole', 'nice one dipshit',
      'watch it', 'you asked for it', 'bring it'
    ],
    adult: [
      'really', 'was that necessary', 'very mature', 'grow up',
      'thats childish', 'please dont', 'come on now', 'not funny',
      'stop that', 'inappropriate', 'thats enough'
    ]
  }
};

// Easter egg item IDs
const EASTER_EGG_ITEMS = [452, 233]; // Viking Helmet, Red Electric Guitar

/**
 * Get timeline-specific dialogue options based on version
 */
function getTimelineDialogue(version: Version, age: BotAge): string[] {
  const timelineMessages: string[] = [];
  
  // Sport Shop opened (2005-11-03)
  if (isGreaterOrEqual(version, '2005-11-03') && isLower(version, '2005-11-15')) {
    if (age === 'child') {
      timelineMessages.push('new sport shop', 'sports shop is open', 'buying sports stuff', 'sport shop is cool');
    } else if (age === 'preteen') {
      timelineMessages.push('sport shop just opened', 'new shop at ski village', 'checking out sport shop');
    } else if (age === 'teen') {
      timelineMessages.push('new sport shop opened', 'sports clothing shop');
    }
  }
  
  // Puffle Discovery - First Sightings (2005-11-15 to 2005-11-21)
  // Pink and blue puffles spotted at Snow Forts, Night Club, Ice Rink
  if (isGreaterOrEqual(version, '2005-11-15') && isLower(version, '2005-11-21')) {
    if (age === 'child') {
      timelineMessages.push('I SAW A FLUFFY THING', 'theres little creatures here', 'did you see that',
        'what was that fuzzy thing', 'something is moving around', 'i saw something pink',
        'blue fluffy thing', 'what are those', 'they are so cute', 'i want to catch one');
    } else if (age === 'preteen') {
      timelineMessages.push('did anyone see those creatures', 'fluffy things spotted', 'whats with the fuzzy creatures',
        'saw something weird moving', 'little creatures around', 'anyone else seeing things',
        'pink and blue creatures', 'what are they');
    } else if (age === 'teen') {
      timelineMessages.push('anyone else seeing creatures', 'fluffy things wandering around',
        'saw some kind of creature', 'whats going on with these things', 'mysterious creatures');
    } else if (age === 'adult') {
      timelineMessages.push('noticed some little creatures', 'seeing strange animals here', 'small creatures around',
        'what are these things', 'cute little creatures');
    }
  }
  
  // Puffle Discovery - Official Documentation (2005-11-21 to 2005-12-01)
  // Newspaper Issue #6: "little fluffy things" officially confirmed, black and green also spotted
  if (isGreaterOrEqual(version, '2005-11-21') && isLower(version, '2005-12-01')) {
    if (age === 'child') {
      timelineMessages.push('they caught one', 'the newspaper says they exist', 'little fluffy things are real',
        'they are friendly', 'i saw green ones too', 'black ones are cool', 'four types now',
        'the creatures are safe', 'can we keep them');
    } else if (age === 'preteen') {
      timelineMessages.push('newspaper confirmed the sightings', 'fluffy things are real', 'they captured one as proof',
        'green and black ones spotted too', 'four different types', 'they seem friendly',
        'what are they called', 'still no official name');
    } else if (age === 'teen') {
      timelineMessages.push('newspaper documented the creatures', 'official confirmation now',
        'caught one as evidence', 'black and green types too', 'apparently friendly',
        'wonder what they are');
    } else if (age === 'adult') {
      timelineMessages.push('newspaper confirmed they exist', 'so they are real after all',
        'four different colors now', 'they seem harmless', 'pretty cute actually');
    }
  }
  
  // Puffle Naming Contest (2005-12-01 to 2005-12-08)
  // Newspaper Issue #7: naming contest announced, 5000 coin prize
  if (isGreaterOrEqual(version, '2005-12-01') && isLower(version, '2005-12-08')) {
    if (age === 'child') {
      timelineMessages.push('naming contest', 'we get to name them', 'i submitted a name',
        'what should we call them', '5000 coins for the winner', 'i hope my name wins',
        'contest ends soon', 'thinking of names', 'what did you call them');
    } else if (age === 'preteen') {
      timelineMessages.push('naming contest is on', 'submitted my name idea', 'contest for 5000 coins',
        'what name did you submit', 'hope i win', 'naming the creatures',
        'contest deadline is dec 7', 'good prize for naming');
    } else if (age === 'teen') {
      timelineMessages.push('naming competition', 'submitted an entry', '5000 coin prize',
        'contest ends december 7th', 'wonder what theyll be called');
    } else if (age === 'adult') {
      timelineMessages.push('naming contest is interesting', 'submitted a name idea',
        'letting the community choose', 'nice prize for the winner');
    }
  }
  
  // Puffles Named (2005-12-08 onwards)
  // Newspaper Issue #8: Official name "Puffles" announced (winners: Yolam08, Wafflepye, Gronnie)
  if (isGreaterOrEqual(version, '2005-12-08') && isLower(version, '2005-12-20')) {
    if (age === 'child') {
      timelineMessages.push('they are called PUFFLES', 'puffles won', 'the name is puffles',
        'yolam08 won', 'wafflepye won too', 'gronnie also won', 'three winners got 5000 coins',
        'i like the name puffles', 'puffles is a good name', 'congrats to the winners');
    } else if (age === 'preteen') {
      timelineMessages.push('official name is puffles', 'puffles won the contest', 'three people won',
        'yolam08 wafflepye and gronnie', 'they each got 5000 coins', 'puffles is a cool name',
        'contest results are in', 'pretty good name choice');
    } else if (age === 'teen') {
      timelineMessages.push('theyre called puffles now', 'puffles was the winning name',
        'three winners split the prize', 'not a bad name', 'puffles it is');
    } else if (age === 'adult') {
      timelineMessages.push('so theyre called puffles', 'puffles is a good name',
        'three people won', 'nice choice by the community');
    }
  }
  
  // Pizza Parlor opened (2006-02-24)
  if (isGreaterOrEqual(version, '2006-02-24')) {
    if (age === 'child') {
      timelineMessages.push('lets go to the pizza place', 'i love pizza', 'pizza time');
    } else if (age === 'preteen') {
      timelineMessages.push('pizza parlor is cool', 'getting pizza', 'pizza party');
    }
  }
  
  // Puffles - General (only after Pet Shop opens on 2006-03-17)
  if (isGreaterOrEqual(version, '2006-03-17')) {
    if (age === 'child') {
      timelineMessages.push('got a puffle?', 'which puffle is best?', 'i love puffles',
        'how do i get a puffle?', 'whats a puffle?', 'where is the pet shop?', 'can i have a pet?');
    } else if (age === 'preteen') {
      timelineMessages.push('got a puffle?', 'which puffle is best?', 'puffle colors');
    }
  }
  
  // Pet Shop opened (2006-03-17) - NEW!
  if (isGreaterOrEqual(version, '2006-03-17') && isLower(version, '2006-04-01')) {
    if (age === 'child') {
      timelineMessages.push('OMG THE NEW PET SHOP', 'have you seen the pet shop', 'the pet shop is here!', 'i want a puffle so bad');
    } else if (age === 'preteen') {
      timelineMessages.push('new pet shop is sick', 'finally puffles', 'pet shop just opened', 'getting a puffle today');
    } else if (age === 'teen') {
      timelineMessages.push('pet shop is actually cool', 'puffles are interesting', 'new pet shop opened');
    }
  }
  
  // Iceberg opened (2006-03-29) - NEW!
  if (isGreaterOrEqual(version, '2006-03-29') && isLower(version, '2006-04-15')) {
    if (age === 'child') {
      timelineMessages.push('THE ICEBERG IS HERE', 'have you been to the iceberg', 'lets go to iceberg', 'iceberg is so cool');
    } else if (age === 'preteen') {
      timelineMessages.push('iceberg just opened', 'anyone at the iceberg', 'new iceberg room', 'iceberg is epic');
    } else if (age === 'teen') {
      timelineMessages.push('iceberg finally released', 'checking out the new iceberg', 'iceberg looks cool');
    }
  }
  
  // Iceberg exists (for questions)
  if (isGreaterOrEqual(version, '2006-03-29')) {
    if (age === 'child') {
      timelineMessages.push('how do you tip the iceberg', 'can the iceberg tip', 'whats the iceberg secret');
    } else if (age === 'preteen') {
      timelineMessages.push('anyone wanna go to the iceberg', 'hows the iceberg tip work', 'iceberg secrets?');
    }
  }
  
  // Find Four released (2006-04-27)
  if (isGreaterOrEqual(version, '2006-04-27') && isLower(version, '2006-05-15')) {
    if (age === 'child') {
      timelineMessages.push('find four is fun', 'wanna play find four', 'new game at lodge');
    } else if (age === 'preteen') {
      timelineMessages.push('find four tables are new', 'anyone play find four yet', 'new find four game');
    }
  }
  
  // Find Four exists
  if (isGreaterOrEqual(version, '2006-04-27')) {
    if (age === 'preteen') {
      timelineMessages.push('wanna play find four');
    }
  }
  
  // PSA Missions (2006-08-18)
  if (isGreaterOrEqual(version, '2006-08-18') && isLower(version, '2006-09-10')) {
    if (age === 'preteen') {
      timelineMessages.push('new PSA mission', 'secret agent mission', 'have you done the mission');
    } else if (age === 'teen') {
      timelineMessages.push('PSA missions are cool', 'secret agent stuff', 'mission was fun');
    }
  }
  
  // Lighthouse opened (2006-09-21) - NEW!
  if (isGreaterOrEqual(version, '2006-09-21') && isLower(version, '2006-10-10')) {
    if (age === 'child') {
      timelineMessages.push('lighthouse is here', 'new lighthouse room', 'lighthouse is cool');
    } else if (age === 'preteen') {
      timelineMessages.push('lighthouse just opened', 'beacon and lighthouse are new', 'check out the lighthouse');
    }
  }
  
  // Aqua Grabber (2008-02-19)
  if (isGreaterOrEqual(version, '2008-02-19') && isLower(version, '2008-03-10')) {
    if (age === 'preteen') {
      timelineMessages.push('aqua grabber is awesome', 'new aqua grabber game', 'anyone play aqua grabber yet');
    } else if (age === 'teen') {
      timelineMessages.push('aqua grabber is pretty good', 'new game at the iceberg', 'aqua grabber just released');
    }
  }
  
  // Card-Jitsu (2008-11-17) - NEW!
  if (isGreaterOrEqual(version, '2008-11-17') && isLower(version, '2008-12-10')) {
    if (age === 'child') {
      timelineMessages.push('CARD JITSU IS HERE', 'have you played card jitsu', 'card jitsu is so cool', 'im gonna be a ninja');
    } else if (age === 'preteen') {
      timelineMessages.push('card jitsu just came out', 'new card jitsu game', 'dojo has card jitsu now', 'ninja training');
    } else if (age === 'teen') {
      timelineMessages.push('card jitsu is actually good', 'new card game at dojo', 'card jitsu released', 'ninja path');
    } else if (age === 'adult') {
      timelineMessages.push('interesting card game', 'card jitsu system', 'new dojo feature');
    }
  }
  
  // Card-Jitsu exists (after release)
  if (isGreaterOrEqual(version, '2008-11-17')) {
    if (age === 'child') {
      timelineMessages.push('wanna play card jitsu', 'card jitsu time');
    } else if (age === 'preteen') {
      timelineMessages.push('wanna play card jitsu', 'anyone at the dojo', 'card jitsu match?');
    } else if (age === 'teen') {
      timelineMessages.push('card jitsu anyone', 'dojo?');
    }
  }
  
  return timelineMessages;
}

/**
 * Get event-specific dialogue based on current date
 */
function getEventDialogue(version: Version, age: BotAge): string[] {
  const eventMessages: string[] = [];
  
  // Beta Test Party (Sep 21, 2005 - 2 hours only)
  if (isGreaterOrEqual(version, '2005-09-21') && isLower(version, '2005-09-22')) {
    if (age === 'child') {
      eventMessages.push('PARTY TIME', 'this party is awesome', 'best party ever', 'im at the party');
    } else if (age === 'preteen') {
      eventMessages.push('beta party is epic', 'party is so fun', 'everyone is here', 'party hype');
    } else if (age === 'teen') {
      eventMessages.push('beta party is cool', 'nice event', 'good turnout', 'party is fun');
    }
  }
  
  // Pizza Parlor Opening Party (Feb 2006)
  if (isGreaterOrEqual(version, '2006-02-24') && isLower(version, '2006-03-01')) {
    if (age === 'child') {
      eventMessages.push('PIZZA PARTY', 'pizza parlor opening', 'new pizza place', 'pizza celebration');
    } else if (age === 'preteen') {
      eventMessages.push('pizza parlor grand opening', 'opening party', 'new building party');
    }
  }
  
  // Egg Hunt (April 2006)
  if (isGreaterOrEqual(version, '2006-04-14') && isLower(version, '2006-04-17')) {
    if (age === 'child') {
      eventMessages.push('EGG HUNT', 'finding eggs', 'where are the eggs', 'egg hunting time', 'found any eggs');
    } else if (age === 'preteen') {
      eventMessages.push('egg hunt is on', 'hunting for eggs', 'anyone found eggs', 'egg locations');
    } else if (age === 'teen') {
      eventMessages.push('egg hunt event', 'looking for eggs', 'egg hunt challenge');
    }
  }
  
  // Cave Opening (May 2006)
  if (isGreaterOrEqual(version, '2006-05-26') && isLower(version, '2006-06-01')) {
    if (age === 'child') {
      eventMessages.push('the cave opened', 'new cave', 'cave party', 'cave is cool');
    } else if (age === 'preteen') {
      eventMessages.push('cave grand opening', 'new mine area', 'exploring the cave');
    }
  }
  
  // Summer Party (June 2006)
  if (isGreaterOrEqual(version, '2006-06-16') && isLower(version, '2006-06-26')) {
    if (age === 'child') {
      eventMessages.push('SUMMER PARTY', 'summer is here', 'beach party', 'summer fun');
    } else if (age === 'preteen') {
      eventMessages.push('summer party time', 'beach party is on', 'summer event');
    } else if (age === 'teen') {
      eventMessages.push('summer party', 'beach event', 'summer celebration');
    }
  }
  
  // Sport Party (Aug 2006)
  if (isGreaterOrEqual(version, '2006-08-11') && isLower(version, '2006-08-22')) {
    if (age === 'child') {
      eventMessages.push('SPORT PARTY', 'sports event', 'playing sports', 'sports are fun');
    } else if (age === 'preteen') {
      eventMessages.push('sport party is cool', 'sports competition', 'sport event');
    }
  }
  
  // Lighthouse Party (Sep 2006)
  if (isGreaterOrEqual(version, '2006-09-21') && isLower(version, '2006-10-05')) {
    if (age === 'child') {
      eventMessages.push('lighthouse party', 'new lighthouse', 'party at lighthouse', 'beacon party');
    } else if (age === 'preteen') {
      eventMessages.push('lighthouse grand opening', 'beacon and lighthouse party', 'new area party');
    }
  }
  
  // Halloween (Oct 2006)
  if (isGreaterOrEqual(version, '2006-10-20') && isLower(version, '2006-11-02')) {
    if (age === 'child') {
      eventMessages.push('HALLOWEEN', 'spooky time', 'halloween party', 'trick or treat', 'scary decorations');
    } else if (age === 'preteen') {
      eventMessages.push('halloween event', 'spooky party', 'halloween is here', 'haunted party');
    } else if (age === 'teen') {
      eventMessages.push('halloween party', 'spooky decorations', 'halloween event');
    }
  }
  
  // Christmas/Holiday (Dec 2005-2006)
  if ((isGreaterOrEqual(version, '2005-12-15') && isLower(version, '2005-12-27')) ||
      (isGreaterOrEqual(version, '2006-12-15') && isLower(version, '2006-12-27'))) {
    if (age === 'child') {
      eventMessages.push('CHRISTMAS', 'holiday party', 'merry christmas', 'santa is here', 'christmas decorations');
    } else if (age === 'preteen') {
      eventMessages.push('christmas party', 'holiday event', 'merry christmas', 'festive decorations');
    } else if (age === 'teen') {
      eventMessages.push('christmas event', 'holiday party', 'festive season');
    } else if (age === 'adult') {
      eventMessages.push('holiday event', 'christmas celebration', 'festive decorations');
    }
  }
  
  // Card-Jitsu Release Party (Nov 2008)
  if (isGreaterOrEqual(version, '2008-11-17') && isLower(version, '2008-11-25')) {
    if (age === 'child') {
      eventMessages.push('CARD JITSU PARTY', 'dojo party', 'ninja party', 'card jitsu event');
    } else if (age === 'preteen') {
      eventMessages.push('card jitsu launch party', 'dojo celebration', 'ninja event');
    } else if (age === 'teen') {
      eventMessages.push('card jitsu release event', 'dojo party', 'launch celebration');
    }
  }
  
  return eventMessages;
}

/**
 * Get a random chat message based on context
 */
function getBotChatMessage(bot: Client, context: 'general' | 'beta' | 'betaHat' | 'easterEgg' | 'betaDefense' | 'betaComplaint' | 'jokesterBeta', room: any): string | null {
  const behavior = botBehaviors.get(bot);
  if (!behavior) return null;
  
  const { age, personality } = behavior;
  
  // Context-specific messages
  if (context === 'betaComplaint') {
    return DIALOGUE.betaComplaint[randomInt(0, DIALOGUE.betaComplaint.length - 1)];
  }
  
  if (context === 'jokesterBeta') {
    return DIALOGUE.jokesterBeta[randomInt(0, DIALOGUE.jokesterBeta.length - 1)];
  }
  
  if (context === 'betaDefense') {
    if (age === 'teen' || age === 'adult') {
      const messages = DIALOGUE.betaDefense[age];
      return messages[randomInt(0, messages.length - 1)];
    }
    return null;
  }
  
  if (context === 'beta' && behavior.hasBetaHat) {
    const messages = DIALOGUE.beta[age as keyof typeof DIALOGUE.beta];
    if (messages) {
      return messages[randomInt(0, messages.length - 1)];
    }
  }
  
  if (context === 'betaHat') {
    const messages = DIALOGUE.betaHat[age];
    return messages[randomInt(0, messages.length - 1)];
  }
  
  if (context === 'easterEgg') {
    const messages = DIALOGUE.easterEgg[age as keyof typeof DIALOGUE.easterEgg];
    if (messages) {
      return messages[randomInt(0, messages.length - 1)];
    }
  }
  
  // General chat with timeline awareness
  const ageDialogue = DIALOGUE[age];
  const baseMessages = [...ageDialogue.greetings, ...ageDialogue.general, ...ageDialogue.questions];
  
  // Add timeline-specific messages
  const version = bot.server.settings.version;
  const timelineMessages = getTimelineDialogue(version, age);
  const eventMessages = getEventDialogue(version, age);
  
  // Add non-member dialogue if applicable
  const nonMemberMessages: string[] = [];
  if (behavior.isNonMember && Math.random() < 0.3) {
    const nmDialogue = DIALOGUE.nonMember[age];
    if (nmDialogue) {
      nonMemberMessages.push(...nmDialogue);
    }
  }
  
  const allMessages = [...baseMessages, ...timelineMessages, ...eventMessages, ...nonMemberMessages];
  return allMessages[randomInt(0, allMessages.length - 1)];
}

/**
 * Make bot send a chat message
 */
function botSendChat(bot: Client, message: string) {
  if (!bot.room) return;
  bot.sendRoomXt('sm', bot.penguin.id, message);
  const behavior = botBehaviors.get(bot);
  if (behavior) {
    behavior.lastChatTime = Date.now();
  }
}

/**
 * Check if any player has an easter egg item
 */
function detectEasterEggItems(room: any): Client | null {
  const allPenguins = [...room.players, ...room.botGroup.bots];
  for (const penguin of allPenguins) {
    if (EASTER_EGG_ITEMS.includes(penguin.penguin.head) || 
        EASTER_EGG_ITEMS.includes(penguin.penguin.hand)) {
      return penguin;
    }
  }
  return null;
}

/**
 * Check if any player has party hat (after Oct 24, 2005)
 */
function detectBetaHat(room: any, currentDate: Date): Client | null {
  const betaPartyEnd = new Date('2005-10-24');
  if (currentDate <= betaPartyEnd) return null;
  
  const allPenguins = [...room.players, ...room.botGroup.bots];
  for (const penguin of allPenguins) {
    if (penguin.penguin.head === 413 && !penguin.isBot) { // Party hat
      return penguin;
    }
  }
  return null;
}

/**
 * Apply chat behavior to bot based on personality and context
 */
function applyChatBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  const behavior = botBehaviors.get(bot);
  if (!behavior) return;
  
  // Different chat frequencies based on personality
  let minDelay = 15000;
  let maxDelay = 45000;
  
  if (behavior.personality === 'socializer' || behavior.personality === 'jokester') {
    minDelay = 10000;
    maxDelay = 30000;
  } else if (behavior.personality === 'shy' || behavior.personality === 'sitter') {
    minDelay = 30000;
    maxDelay = 90000;
  }
  
  const chatInterval = setInterval(() => {
    if (bot.room !== room) {
      clearInterval(chatInterval);
      return;
    }
    
    const now = Date.now();
    if (behavior.lastChatTime && now - behavior.lastChatTime < 10000) {
      return; // Don't spam chat
    }
    
    // Check for context-specific scenarios
    const currentDate = new Date(); // In real implementation, get from server
    
    // Beta hat detection (swarm behavior)
    const betaHatPlayer = detectBetaHat(room, currentDate);
    if (betaHatPlayer && Math.random() < 0.3) {
      // Young bots swarm beta testers
      if (behavior.age === 'child' || behavior.age === 'preteen') {
        const message = getBotChatMessage(bot, 'betaHat', room);
        if (message) {
          botSendChat(bot, message);
          // Move towards beta tester
          if (Math.random() < 0.6) {
            setTimeout(() => {
              if (bot.room === room && betaHatPlayer.room === room) {
                const offsetX = randomInt(-100, 100);
                const offsetY = randomInt(-100, 100);
                bot.setPosition(betaHatPlayer.x + offsetX, betaHatPlayer.y + offsetY);
              }
            }, 500);
          }
        }
        return;
      }
      
      // Beta tester bots defend themselves or complain
      if (behavior.hasBetaHat && (behavior.age === 'teen' || behavior.age === 'adult')) {
        // Count how many kids are swarming
        const nearbyKids = room.botGroup.bots.filter((b: Client) => {
          const bBehavior = botBehaviors.get(b);
          if (!bBehavior) return false;
          if (bBehavior.age !== 'child' && bBehavior.age !== 'preteen') return false;
          const distance = Math.sqrt(Math.pow(bot.x - b.x, 2) + Math.pow(bot.y - b.y, 2));
          return distance < 150;
        }).length;
        
        if (nearbyKids >= 2) {
          // Defend or complain
          if (Math.random() < 0.4) {
            // Defend
            const message = getBotChatMessage(bot, 'betaDefense', room);
            if (message) {
              botSendChat(bot, message);
            }
          } else if (Math.random() < 0.3) {
            // Complain
            if (behavior.personality === 'jokester') {
              const message = getBotChatMessage(bot, 'jokesterBeta', room);
              if (message) {
                botSendChat(bot, message);
              }
            } else {
              const message = getBotChatMessage(bot, 'betaComplaint', room);
              if (message) {
                botSendChat(bot, message);
              }
            }
            
            // Chance to take off hat or leave
            if (nearbyKids >= 4 && Math.random() < 0.15) {
              if (Math.random() < 0.6) {
                // Take off party hat
                bot.penguin.head = 0;
                behavior.hasBetaHat = false;
                // Broadcast update
                bot.sendRoomXt('uph', bot.penguin.id, 0);
                setTimeout(() => {
                  botSendChat(bot, 'there happy now');
                }, 1000);
              } else {
                // Leave room
                botSendChat(bot, 'im out');
                setTimeout(() => {
                  if (bot.room === room) {
                    bot.leaveRoom();
                    cleanupBotBehavior(bot);
                  }
                }, 1500);
              }
            }
          }
        }
        return;
      }
    }
    
    // Easter egg item detection
    const easterEggPlayer = detectEasterEggItems(room);
    if (easterEggPlayer && Math.random() < 0.15) {
      const message = getBotChatMessage(bot, 'easterEgg', room);
      if (message) {
        botSendChat(bot, message);
        return;
      }
    }
    
    // Beta tester specific chat
    if (behavior.hasBetaHat && currentDate <= new Date('2005-10-24')) {
      if (Math.random() < 0.2) {
        const message = getBotChatMessage(bot, 'beta', room);
        if (message) {
          botSendChat(bot, message);
          return;
        }
      }
    }
    
    // General chat
    if (Math.random() < 0.4) {
      const message = getBotChatMessage(bot, 'general', room);
      if (message) {
        botSendChat(bot, message);
      }
    }
  }, randomInt(minDelay, maxDelay));
  
  intervals.push(chatInterval);
}

// Personality behavior implementations
function applyDancerBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  const danceX = randomInt(300, 500);
  const danceY = randomInt(200, 400);
  bot.setPosition(danceX, danceY);
  bot.setFrame(26); // Dance frame - only animation we manually trigger
}

function applyWandererBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  const walkInterval = setInterval(() => {
    if (bot.room === room) {
      const newX = randomInt(100, 700);
      const newY = randomInt(100, 500);
      // Game handles walking animation automatically
      bot.setPosition(newX, newY);
    } else {
      clearInterval(walkInterval);
    }
  }, randomInt(5000, 10000));
  intervals.push(walkInterval);
}

function applySnowballFighterBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  // Aggressive snowball throwing behavior
  let isMoving = false;
  
  const fightInterval = setInterval(() => {
    if (bot.room === room) {
      const players = room.players.filter((p: Client) => p !== bot);
      const bots = room.botGroup.bots.filter((b: Client) => b !== bot);
      const targets = [...players, ...bots];
      
      if (targets.length > 0) {
        // Pick a target (prefer players and other snowball fighters)
        let target = targets[randomInt(0, targets.length - 1)];
        
        // Prioritize players and other snowball fighters
        const preferredTargets = targets.filter(t => {
          if (!t.isBot) return true; // Real players
          const b = botBehaviors.get(t);
          return b && b.personality === 'snowball_fighter';
        });
        
        if (preferredTargets.length > 0) {
          const index = randomInt(0, preferredTargets.length - 1);
          target = preferredTargets[index];
        }
        
        // Throw snowball only if not currently moving - game handles animation
        if (!isMoving && bot.room === room && target.room === room) {
          bot.throwSnowball(String(target.x), String(target.y));
          // Detect if the bot hit anyone
          detectSnowballHit(room, target.x, target.y, bot);
        }
        
        // Move towards target sometimes
        if (Math.random() < 0.3) {
          isMoving = true;
          setTimeout(() => {
            if (bot.room === room && target.room === room) {
              const moveX = target.x + randomInt(-150, 150);
              const moveY = target.y + randomInt(-150, 150);
              bot.setPosition(Math.max(100, Math.min(700, moveX)), Math.max(100, Math.min(500, moveY)));
            }
            isMoving = false;
          }, 500);
        }
      }
    } else {
      clearInterval(fightInterval);
    }
  }, randomInt(3000, 7000));
  intervals.push(fightInterval);
}

function applyAnnoyingBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  // Block doorways and get in front of players
  let currentTarget: Client | undefined = undefined;
  let backedOff = false; // Track if bot has backed off due to player annoyance
  let doubleDownMode = false; // Track if bot is doubling down on being annoying
  
  const annoyInterval = setInterval(() => {
    if (bot.room === room) {
      const players = room.players.filter((p: Client) => !p.isBot);
      
      // If backed off, stay away for a while
      if (backedOff) {
        if (Math.random() < 0.05) { // 5% chance per interval to start annoying again
          backedOff = false;
          currentTarget = undefined;
        }
        return;
      }
      
      if (players.length > 0 && Math.random() < 0.7) {
        // Pick a consistent target or choose a new one
        if (!currentTarget || currentTarget.room !== room || Math.random() < 0.1) {
          currentTarget = players[randomInt(0, players.length - 1)];
          const behavior = botBehaviors.get(bot);
          if (behavior) behavior.target = currentTarget;
        }
        
        // Follow and block the target
        if (currentTarget && currentTarget.room === room) {
          if (doubleDownMode) {
            // Extra annoying - get right on top of them
            bot.setPosition(currentTarget.x, currentTarget.y);
          } else {
            // Normal annoying - stay close
            const offsetX = randomInt(-50, 50);
            const offsetY = randomInt(-50, 50);
            bot.setPosition(currentTarget.x + offsetX, currentTarget.y + offsetY);
          }
        }
      } else {
        // Block common entrances (these are typical door positions)
        const doorways = [
          { x: 400, y: 100 }, // Top door
          { x: 100, y: 300 }, // Left door
          { x: 700, y: 300 }, // Right door
          { x: 400, y: 500 }, // Bottom door
        ];
        const door = doorways[randomInt(0, doorways.length - 1)];
        bot.setPosition(door.x, door.y);
      }
    } else {
      clearInterval(annoyInterval);
    }
  }, randomInt(3000, 6000));
  intervals.push(annoyInterval);
  
  // Store functions in behavior data for external access
  const behavior = botBehaviors.get(bot);
  if (behavior) {
    (behavior as any).backOff = () => {
      backedOff = true;
      doubleDownMode = false;
      // Move away from target
      if (currentTarget && bot.room === room) {
        const awayX = bot.x + (bot.x - currentTarget.x) * 2;
        const awayY = bot.y + (bot.y - currentTarget.y) * 2;
        bot.setPosition(
          Math.max(100, Math.min(700, awayX)),
          Math.max(100, Math.min(500, awayY))
        );
      }
    };
    (behavior as any).doubleDown = () => {
      doubleDownMode = true;
      backedOff = false;
    };
  }
}

function applyExplorerBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  // Move around the room systematically
  let explorationIndex = 0;
  const explorationPoints = [
    { x: 150, y: 150 }, { x: 650, y: 150 },
    { x: 650, y: 450 }, { x: 150, y: 450 },
    { x: 400, y: 300 }
  ];
  
  const exploreInterval = setInterval(() => {
    if (bot.room === room) {
      const point = explorationPoints[explorationIndex % explorationPoints.length];
      // Game handles walking animation automatically
      bot.setPosition(point.x, point.y);
      explorationIndex++;
    } else {
      clearInterval(exploreInterval);
    }
  }, randomInt(5000, 9000));
  intervals.push(exploreInterval);
}

function applySocializerBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  // Move towards other penguins to socialize and wave
  const socialInterval = setInterval(() => {
    if (bot.room === room) {
      // Move towards other penguins
      const others = [...room.players, ...room.botGroup.bots].filter((p: Client) => p !== bot);
      if (others.length > 0 && Math.random() < 0.5) {
        const target = others[randomInt(0, others.length - 1)];
        const moveX = target.x + randomInt(-150, 150);
        const moveY = target.y + randomInt(-150, 150);
        bot.setPosition(Math.max(100, Math.min(700, moveX)), Math.max(100, Math.min(500, moveY)));
      }
      
      // Wave at others sometimes
      if (Math.random() < 0.4) {
        bot.setFrame(25); // Wave
        setTimeout(() => {
          if (bot.room === room) bot.setFrame(1);
        }, 2000);
      }
    } else {
      clearInterval(socialInterval);
    }
  }, randomInt(5000, 10000));
  intervals.push(socialInterval);
}

function applySitterBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  // Find a spot and sit facing a random direction
  const sitX = randomInt(200, 600);
  const sitY = randomInt(200, 400);
  bot.setPosition(sitX, sitY);
  
  // Sit facing a random direction (frames 17-24)
  const sitDirections = [17, 18, 19, 20, 21, 22, 23, 24];
  const sitFrame = sitDirections[randomInt(0, sitDirections.length - 1)];
  bot.setFrame(sitFrame);
  
  // Occasionally change sitting direction
  const sitInterval = setInterval(() => {
    if (bot.room === room) {
      if (Math.random() < 0.15) {
        const newSitFrame = sitDirections[randomInt(0, sitDirections.length - 1)];
        bot.setFrame(newSitFrame);
      }
    } else {
      clearInterval(sitInterval);
    }
  }, randomInt(10000, 20000));
  intervals.push(sitInterval);
}

function applyFollowerBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  // Pick a target to follow
  let target: Client | undefined = undefined;
  
  const followInterval = setInterval(() => {
    if (bot.room === room) {
      // Pick a new target if we don't have one
      if (!target || target.room !== room) {
        const candidates = room.players.filter((p: Client) => !p.isBot);
        if (candidates.length > 0) {
          target = candidates[randomInt(0, candidates.length - 1)];
          const behavior = botBehaviors.get(bot);
          if (behavior) behavior.target = target;
        }
      }
      
      // Follow the target
      if (target && target.room === room) {
        const offsetX = randomInt(-100, 100);
        const offsetY = randomInt(-100, 100);
        bot.setPosition(
          Math.max(100, Math.min(700, target.x + offsetX)),
          Math.max(100, Math.min(500, target.y + offsetY))
        );
      }
    } else {
      clearInterval(followInterval);
    }
  }, randomInt(1000, 3000));
  intervals.push(followInterval);
}

/**
 * Party Hat Attraction Behavior - Kids/preteens DROP EVERYTHING to swarm beta testers
 * This overrides all other behaviors when a party hat is spotted
 */
function applyPartyHatAttractionBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[], age: BotAge) {
  const attractionInterval = setInterval(() => {
    if (bot.room !== room) {
      clearInterval(attractionInterval);
      return;
    }
    
    // Find ANY player or bot with a party hat (head item ID 413)
    const partyHatWearers = room.players.filter((p: Client) => p.penguin.head === 413);
    
    if (partyHatWearers.length > 0) {
      // Pick the closest party hat wearer
      let closestTarget: Client | null = null;
      let closestDistance = Infinity;
      
      for (const target of partyHatWearers) {
        const distance = Math.sqrt(
          Math.pow(target.x - bot.x, 2) + Math.pow(target.y - bot.y, 2)
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestTarget = target;
        }
      }
      
      if (closestTarget) {
        // IMMEDIATELY move towards the party hat wearer
        // Kids get VERY close (50-80 pixels), preteens slightly less close (80-120 pixels)
        const minDistance = age === 'child' ? 50 : 80;
        const maxDistance = age === 'child' ? 80 : 120;
        
        if (closestDistance > maxDistance) {
          // Move closer with some randomness
          const angle = Math.atan2(closestTarget.y - bot.y, closestTarget.x - bot.x);
          const targetDistance = randomInt(minDistance, maxDistance);
          const newX = closestTarget.x - Math.cos(angle) * targetDistance + randomInt(-20, 20);
          const newY = closestTarget.y - Math.sin(angle) * targetDistance + randomInt(-20, 20);
          
          bot.setPosition(
            Math.max(100, Math.min(700, newX)),
            Math.max(100, Math.min(500, newY))
          );
        }
        
        // Spam beta hat chat when close
        if (closestDistance < 150 && Math.random() < 0.4) {
          const message = getBotChatMessage(bot, 'betaHat', room);
          if (message) {
            botSendChat(bot, message);
          }
        }
      }
    }
  }, 1500); // Check frequently (every 1.5 seconds)
  
  intervals.push(attractionInterval);
}

function applyJokesterBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  // Move around to "perform" and do funny actions
  const jokeInterval = setInterval(() => {
    if (bot.room === room) {
      // Move around to perform
      if (Math.random() < 0.7) {
        bot.setPosition(randomInt(200, 600), randomInt(200, 400));
      }
      
      // Do funny actions (wave or dance)
      if (Math.random() < 0.5) {
        const funnyActions = [25, 26]; // Wave, dance
        const action = funnyActions[randomInt(0, funnyActions.length - 1)];
        bot.setFrame(action);
        setTimeout(() => {
          if (bot.room === room) bot.setFrame(1);
        }, 2500);
      }
    } else {
      clearInterval(jokeInterval);
    }
  }, randomInt(4000, 8000));
  intervals.push(jokeInterval);
}

function applySpeedsterBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  // Move very quickly between positions
  const speedInterval = setInterval(() => {
    if (bot.room === room) {
      // Rapid movement - game handles animation
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (bot.room === room) {
            const x = randomInt(100, 700);
            const y = randomInt(100, 500);
            bot.setPosition(x, y);
          }
        }, i * 800);
      }
    } else {
      clearInterval(speedInterval);
    }
  }, randomInt(3000, 6000));
  intervals.push(speedInterval);
}

function applyShyBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  // Move away from other penguins
  const shyInterval = setInterval(() => {
    if (bot.room === room) {
      const others = [...room.players, ...room.botGroup.bots].filter((p: Client) => p !== bot);
      
      if (others.length > 0) {
        // Find the closest penguin
        let closest = others[0];
        let minDist = Math.sqrt(Math.pow(bot.x - closest.x, 2) + Math.pow(bot.y - closest.y, 2));
        
        for (const other of others) {
          const dist = Math.sqrt(Math.pow(bot.x - other.x, 2) + Math.pow(bot.y - other.y, 2));
          if (dist < minDist) {
            minDist = dist;
            closest = other;
          }
        }
        
        // Run away if too close - game handles animation
        if (minDist < 200) {
          const awayX = bot.x + (bot.x - closest.x) * 2;
          const awayY = bot.y + (bot.y - closest.y) * 2;
          bot.setPosition(
            Math.max(100, Math.min(700, awayX)),
            Math.max(100, Math.min(500, awayY))
          );
        }
      }
    } else {
      clearInterval(shyInterval);
    }
  }, randomInt(1000, 2000));
  intervals.push(shyInterval);
}

function applyShowOffBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  // Move to center stage to show off and perform
  const showInterval = setInterval(() => {
    if (bot.room === room) {
      // Move to center stage
      if (Math.random() < 0.5) {
        bot.setPosition(randomInt(350, 450), randomInt(250, 350));
      }
      
      // Show off with wave or dance
      if (Math.random() < 0.6) {
        const showOffActions = [25, 26]; // Wave, dance
        const action = showOffActions[randomInt(0, showOffActions.length - 1)];
        bot.setFrame(action);
        setTimeout(() => {
          if (bot.room === room) bot.setFrame(1);
        }, 3000);
      }
    } else {
      clearInterval(showInterval);
    }
  }, randomInt(3000, 7000));
  intervals.push(showInterval);
}

function cleanupBotBehavior(bot: Client) {
  const behavior = botBehaviors.get(bot);
  if (behavior) {
    // Clear all intervals
    behavior.intervals.forEach(interval => clearInterval(interval));
    botBehaviors.delete(bot);
  }
}

/**
 * Check if a message contains annoyed phrases
 */
function isAnnoyedMessage(message: string): boolean {
  const annoyedPhrases = [
    'piss off', 'fuck off', 'go away', 'leave me alone', 'stop it',
    'stop following', 'stop', 'annoying', 'get away', 'leave',
    'move', 'gtfo', 'stfu', 'shut up', 'bugger off', 'screw off',
    'quit it', 'knock it off', 'cut it out'
  ];
  
  const lowerMessage = message.toLowerCase();
  return annoyedPhrases.some(phrase => lowerMessage.includes(phrase));
}

/**
 * Check if a message is super vulgar/aggressive
 */
function isSuperVulgar(message: string): boolean {
  const superVulgarPhrases = [
    'kill yourself', 'kys', 'fuck off cunt', 'fucking cunt',
    'fuck you cunt', 'kill urself', 'die', 'fucking kill',
    'fuck off bitch', 'fucking bitch', 'cunt', 'fucking die',
    'nigger', 'faggot', 'spick', 'chink', 'cum', 'rape', 'rapist',
    'pedo', 'molest'
  ];
  
  const lowerMessage = message.toLowerCase();
  return superVulgarPhrases.some(phrase => lowerMessage.includes(phrase));
}

/**
 * Handle annoying bot reaction to player annoyance
 */
function handleAnnoyingBotReaction(player: Client, message: string) {
  if (!player.room) return;
  
  const isVeryAngry = isSuperVulgar(message);
  
  // Find any annoying bots targeting this player
  player.room.botGroup.bots.forEach((bot: Client) => {
    const behavior = botBehaviors.get(bot);
    if (behavior && behavior.personality === 'annoying' && behavior.target === player) {
      // Always back off if player is super vulgar
      if (isVeryAngry) {
        if ((behavior as any).backOff) {
          (behavior as any).backOff();
        }
      } else {
        // 60% chance to back off, 40% chance to double down for normal annoyance
        if (Math.random() < 0.6) {
          // Back off
          if ((behavior as any).backOff) {
            (behavior as any).backOff();
          }
        } else {
          // Double down and get more annoying
          if ((behavior as any).doubleDown) {
            (behavior as any).doubleDown();
          }
        }
      }
    }
  });
}

/**
 * Detect if a snowball hit any bots and have them react
 */
function detectSnowballHit(room: any, targetX: number, targetY: number, thrower: Client) {
  const hitRadius = 100; // Distance within which a bot is considered "hit"
  
  room.botGroup.bots.forEach((bot: Client) => {
    const distance = Math.sqrt(Math.pow(bot.x - targetX, 2) + Math.pow(bot.y - targetY, 2));
    
    if (distance < hitRadius) {
      // Bot was hit! Make them react
      const behavior = botBehaviors.get(bot);
      
      if (behavior) {
        // Chat reaction to being hit (70% chance)
        if (Math.random() < 0.7) {
          const reactions = DIALOGUE.snowballHit[behavior.age];
          if (reactions) {
            const reaction = reactions[randomInt(0, reactions.length - 1)];
            setTimeout(() => {
              if (bot.room === room) {
                botSendChat(bot, reaction);
              }
            }, randomInt(200, 800));
          }
        }
        
        switch (behavior.personality) {
          case 'snowball_fighter':
            // Snowball fighters throw back immediately
            if (!thrower.isBot && thrower.room === room) {
              setTimeout(() => {
                if (bot.room === room && thrower.room === room) {
                  bot.throwSnowball(String(thrower.x), String(thrower.y));
                  // Detect if the counter-attack hit anyone
                  detectSnowballHit(room, thrower.x, thrower.y, bot);
                }
              }, randomInt(500, 1500));
            }
            break;
            
          case 'shy':
            // Shy bots run away when hit
            const awayX = bot.x + (bot.x - targetX) * 3;
            const awayY = bot.y + (bot.y - targetY) * 3;
            setTimeout(() => {
              if (bot.room === room) {
                bot.setPosition(
                  Math.max(100, Math.min(700, awayX)),
                  Math.max(100, Math.min(500, awayY))
                );
              }
            }, randomInt(200, 500));
            break;
            
          case 'annoying':
            // Annoying bots move towards the thrower
            if (!thrower.isBot && thrower.room === room) {
              setTimeout(() => {
                if (bot.room === room && thrower.room === room) {
                  bot.setPosition(thrower.x, thrower.y);
                }
              }, randomInt(300, 800));
            }
            break;
            
          case 'jokester':
            // Jokesters dance when hit
            setTimeout(() => {
              if (bot.room === room) {
                bot.setFrame(26); // Dance
                setTimeout(() => {
                  if (bot.room === room) bot.setFrame(1);
                }, 2000);
              }
            }, randomInt(200, 600));
            break;
            
          case 'wanderer':
          case 'explorer':
          case 'speedster':
            // These bots move to a random new position when hit
            setTimeout(() => {
              if (bot.room === room) {
                bot.setPosition(randomInt(100, 700), randomInt(100, 500));
              }
            }, randomInt(300, 700));
            break;
            
          // Socializers, sitters, followers, dancers, show-offs don't react much
          default:
            // Might throw back occasionally (30% chance) or just move
            if (Math.random() < 0.3 && !thrower.isBot && thrower.room === room) {
              setTimeout(() => {
                if (bot.room === room && thrower.room === room) {
                  bot.throwSnowball(String(thrower.x), String(thrower.y));
                }
              }, randomInt(1000, 2500));
            } else if (Math.random() < 0.3) {
              // Just a small random movement
              setTimeout(() => {
                if (bot.room === room) {
                  const newX = bot.x + randomInt(-50, 50);
                  const newY = bot.y + randomInt(-50, 50);
                  bot.setPosition(
                    Math.max(100, Math.min(700, newX)),
                    Math.max(100, Math.min(500, newY))
                  );
                }
              }, randomInt(200, 500));
            }
            break;
        }
      }
    }
  });
}

function resetAllRoomBots(server: any) {
  const activeRooms = Array.from(roomsWithBots);

  activeRooms.forEach((roomId) => {
    const room = server.getRoom(roomId);

    room.botGroup.bots.forEach((bot: Client) => bot.leaveRoom());

    const interval = roomBotIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
    }

    roomBotIntervals.delete(roomId);
    roomBotTargets.delete(roomId);
    roomsWithBots.delete(roomId);
  });
}

// Paying after minigame
handler.xt(Handle.LeaveGame, (client, score) => {
  const coins = client.getCoinsFromScore(score);
  client.penguin.addCoins(coins);
  
  client.sendXt('zo');
  client.update();
})

// update client's coins
handler.xt(Handle.GetCoins, (client) => {
  client.sendEngine1Coins();
})

handler.xt(Handle.AddItemOld, (client, item) => {
  // TODO remove coins logic
  client.buyItem(item);
  client.update();
})

// updating penguin
handler.xt(Handle.UpdatePenguinOld, (client, color, head, face, neck, body, hand, feet, pin, background) => {
  client.penguin.color = color
  client.penguin.head = head;
  client.penguin.face = face;
  client.penguin.neck = neck;
  client.penguin.body = body;
  client.penguin.hand = hand;
  client.penguin.feet = feet;
  client.penguin.pin = pin;
  client.penguin.background = background;
  client.sendRoomXt('up', client.penguinString)
  client.update();
})

handler.xt(Handle.BecomeAgent, (client) => {
  client.buyItem(800);
  client.update();
})

handler.xt(Handle.GetInventoryOld, (client) => {
  client.sendInventory();
}, { once: true });

handler.xt(Handle.SendMessageOld, (client, id, message) => {
  client.sendMessage(message);
  
  // Check if player is expressing annoyance at bots
  if (isAnnoyedMessage(message)) {
    handleAnnoyingBotReaction(client, message);
  }
});

handler.xt(Handle.SendMessageOld, commandsHandler);

handler.xt(Handle.SetPositionOld, (client, ...args) => {
  client.setPosition(...args);
});

handler.xt(Handle.SendEmoteOld, (client, emote) => {
  client.sendEmote(emote);
});

handler.xt(Handle.SnowballOld, (client, x: string, y: string) => {
  client.throwSnowball(x, y);
  
  // Detect if any bots are hit by the snowball
  if (client.room) {
    detectSnowballHit(client.room, parseInt(x), parseInt(y), client);
  }
})

handler.xt(Handle.SendJokeOld, (client, joke) => {
  client.sendJoke(joke);
});

handler.xt(Handle.SendSafeMessageOld, (client, id) => {
  client.sendSafeMessage(id);
});

handler.xt(Handle.SendActionOld, (client, id) => {
  client.sendAction(id);
});

// handler for 2007 client
handler.xt(Handle.GetInventory2007, (client) => {
  client.sendInventory();
});

handler.xt(Handle.SetFrameOld, (client, frame) => {
  client.setFrame(frame);
});

// Send teleport (positioning at table) for Engine 1
// Note: Registered manually because 's#st' conflicts with top-level 'st' stamp handler
const stCallbacks = handler.listeners.get('s%st') || [];
handler.listeners.set('s%st', [...stCallbacks, (client: Client, x: string, y: string, frame: string) => {
  const xNum = parseInt(x);
  const yNum = parseInt(y);
  const frameNum = parseInt(frame);
  
  if (!isNaN(xNum) && !isNaN(yNum) && !isNaN(frameNum)) {
    // Update client position and frame
    client.setPosition(xNum, yNum);
    client.setFrame(frameNum);
    
    // Broadcast to other players
    client.sendRoomXt('st', client.penguin.id, xNum, yNum, frameNum);
  }
  
  return true;
}]);

// Logging in
handler.post('/php/login.php', (body) => {
  const { Username } = body;
  const penguin = Client.getPenguinFromName(Username);
  
  // Generate fake server populations for all servers
  // Format: worldId|population,worldId|population,...
  // Population ranges: 0-50 (empty), 50-100 (low), 100-200 (medium), 200-400 (busy), 400-500 (very busy), 500+ (full)
  const getEngine1Population = () => {
    const seed = Math.random();
    if (seed < 0.2) return Math.floor(Math.random() * 50); // Empty
    if (seed < 0.4) return Math.floor(Math.random() * 50) + 50; // Low
    if (seed < 0.6) return Math.floor(Math.random() * 100) + 100; // Medium
    if (seed < 0.8) return Math.floor(Math.random() * 200) + 200; // Busy
    if (seed < 0.95) return Math.floor(Math.random() * 100) + 400; // Very busy
    return Math.floor(Math.random() * 100) + 500; // Full
  };
  
  // Blizzard has a 25% chance of being full, otherwise very busy
  const blizzardPopulation = Math.random() < 0.25 ? Math.floor(Math.random() * 100) + 500 : 499;
  
  const serverList = [
    '100|' + blizzardPopulation, // Blizzard (25% full, 75% very busy)
    '101|' + getEngine1Population(), // IceBerg
    '102|' + getEngine1Population(), // WhiteOut
    '103|' + getEngine1Population(), // Slushy
    '104|' + getEngine1Population(), // Flurry
    '105|' + getEngine1Population(), // SnowAngel
    '106|' + getEngine1Population(), // SnowDay
    '107|' + getEngine1Population(), // Frostbite
    '108|' + getEngine1Population(), // Icicle
    '109|' + getEngine1Population(), // Tundra
    '110|' + getEngine1Population(), // SnowCone
    '111|' + getEngine1Population(), // Alpine
    '200|' + getEngine1Population(), // NorthPole
    '201|' + getEngine1Population(), // Glacier
    '202|' + getEngine1Population(), // Aurora
    '300|' + getEngine1Population(), // DeepFreeze
    '301|' + getEngine1Population(), // ColdFront
    '302|' + getEngine1Population(), // Frozen
    '303|' + getEngine1Population(), // SnowFlake
    '304|' + getEngine1Population(), // Frosty
    '400|' + getEngine1Population(), // SouthPole
    '401|' + getEngine1Population(), // BigSurf
  ];
  
  const worldPopulations = serverList.join(',');
  
  const params: Record<string, number | string> = {
    crumb: Client.engine1Crumb(penguin),
    k1: 'a',
    c: penguin.coins,
    s: 0, // SAFE MODE TODO in future?
    jd: getDateString(penguin.registrationTimestamp),
    ed: '10000-1-1', // EXPIRACY DATE TODO what is it for?
    h: '', // TODO what is?
    w: worldPopulations, // World populations: worldId|population,worldId|population,...
    m: '', // TODO what is
    il: penguin.getItems().join('|') // item list
  }

  let response = ''
  for (const key in params) {
    response += `&${key}=${encodeURIComponent(params[key])}`
  }
  
  console.log('[Engine1 Login] World populations:', worldPopulations);
  
  return response 
})

handler.disconnect((client) => {
  client.disconnect();
});

export default handler;
