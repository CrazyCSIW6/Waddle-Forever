import { Client } from '../../client';
import { Handler } from '..';
import { Room } from '../../game-logic/rooms';
import { getDateString } from '../../../common/utils';
import { commandsHandler } from '../commands';
import { Handle } from '../handles';
import { getServerPopulation } from '../../servers';
import { randomInt } from '../../../common/utils';
import { isGreaterOrEqual, Version } from '../../routes/versions';

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

type BotPersonality = 'dancer' | 'wanderer';

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

  const isDanceClub = room.id === 120;
  const danceChance = isDanceClub ? 0.8 : 0.5;
  const personality: BotPersonality = Math.random() < danceChance ? 'dancer' : 'wanderer';

  const { x, y } = pickSpawnCoordinates(room, bot);
  bot.setPosition(x, y);
  broadcastBotAppearance(room, bot, x, y);

  if (personality === 'dancer') {
    const danceX = randomInt(300, 500);
    const danceY = randomInt(200, 400);
    bot.setPosition(danceX, danceY);
    bot.setFrame(26);
  } else {
    const walkInterval = setInterval(() => {
      if (bot.room === room) {
        const newX = randomInt(100, 700);
        const newY = randomInt(100, 500);
        bot.setPosition(newX, newY);
      } else {
        clearInterval(walkInterval);
      }
    }, randomInt(3000, 8000));
  }

  const leaveInterval = setInterval(() => {
    if (bot.room === room) {
      if (Math.random() < 0.2) {
        bot.leaveRoom();
        clearInterval(leaveInterval);
      }
    } else {
      clearInterval(leaveInterval);
    }
  }, randomInt(15000, 45000));
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
});

handler.xt(Handle.SendMessageOld, commandsHandler);

handler.xt(Handle.SetPositionOld, (client, ...args) => {
  client.setPosition(...args);
});

handler.xt(Handle.SendEmoteOld, (client, emote) => {
  client.sendEmote(emote);
});

handler.xt(Handle.SnowballOld, (client, ...args) => {
  client.throwSnowball(...args);
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
