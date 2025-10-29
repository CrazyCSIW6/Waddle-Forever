import { Client } from '../../client';
import { Handler } from '..';
import { Room } from '../../game-logic/rooms';
import { getDateString } from '../../../common/utils';
import { commandsHandler } from '../commands';
import { Handle } from '../handles';
import { getServerPopulation } from '../../servers';
import { randomInt } from '../../../common/utils';
import { randomToken } from './login';
import { isGreaterOrEqual, isLower, Version } from '../../routes/versions';
import { verifyAccount, createAccount, accountExists, getBanStatus, createEngine1Session, setAccountBan, isAuthorized, issueTemporaryBan } from './login';

const handler = new Handler();
const BAIT_ITEMS = new Set([130, 183, 230, 355, 371, 466, 532, 1977, 1978, 1999, 2999, 3999, 4999, 5999, 6999, 90000]);

// Track which rooms have already had bots spawned
const roomsWithBots = new Set<number>();

// Map to store server population for each client
const clientServerPopulation = new Map<any, number>();

// Track per-room maintenance intervals so we don't duplicate timers
const roomBotIntervals = new Map<number, NodeJS.Timeout>();
const roomBotTargets = new Map<number, number>();

const PLAYER_NAMES = [
  'Penguin123',
  'IceBreaker',
  'SnowDude',
  'FrostyFox',
  'CoolPenguin',
  'IcyMcCool',
  'PenguinPro',
  'SnowKing',
  'FrostBite',
  'ColdSnap',
  'IceAge',
  'BlizzardBob',
  'SnowStorm',
  'WinterWolf',
  'FrozenFish',
  'PolarBear',
  'ArcticAce',
  'ChillyChamp',
  'FrostKing',
  'IceQueen',
  'SnowAngel',
  'WinterWish',
  'CrystalClear',
  'FrostNova',
  'iggyhopper',
  'betaBadge',
  'flipprfan',
  'sk8rPengu',
  'squidzilla',
  'lolwutfish',
  'mintyFresh00',
  'pufflepunk',
  'sum41peng',
  'snowballerz',
  'maltshak3',
  'gl1tchkid',
  'rawrmeanshi',
  'punkinPatch',
  'waddlehard',
  'clubnoir',
  'bubblegumcat',
  'frostedtoast',
  'myspacequeen',
  'n00bstompr',
  'SxSWpeng',
  'hoodiehero',
  'skoolnited',
  'laggywifi',
  'hockeybruise',
  'caffeinepuff',
  's0ckpuppet',
  'neonmittens',
  'wootwoot17',
  'flashchat12',
  'drmcatchr',
  'snowpocalypse',
  'zipzapzup',
  'xXfishsticksXx',
  'poprockerz',
  'iggyfresh',
  'betaBrat',
  'sodaSlurper',
  'wiiwouldlike',
  'penguinpanic',
  'mixCDKid',
  'StormySteph',
  'frozenmarsh',
  'emoSnowman',
  'txtmsgfan',
  'sk8boardd',
  'hottopicpeng',
  'mallrat2006',
  'shufflinfeet',
  'penguindrum',
  'msnAway',
  'frostbite13',
  'icetastrophe',
  'Y2kLeftover',
  'zomgcarrots',
  'purpleboomBox',
  'doodlingjay',
  'penguinluvrs',
  'subzerojen',
  'garagebandit',
  'snowgraffiti',
  'hockeypuck09',
  'coffeebeanz',
  'sleepoverszn',
  'brokencontroller',
  'laserpeng',
  'flipphoneKid',
  'betaBuddie',
  'winteremo',
  'glacierbite',
  'heyitzfrost',
  'sparklepuff',
  'spritemixer',
  'retroSkates',
  'msgbrbttyl',
  'xdancefloorx',
  'frostbloom',
  'iglooArtist',
  'skidooed',
  'PonytailPeng',
  'pufflesox',
  'snowconeAddict',
  'emoPlaylist',
  'sk8rboiNoel',
  'snowfax',
  'h4x0rwalrus',
  'pizzaforbreakfast',
  'midnightmall',
  'ArcadeChill',
  'mixtapeMel',
  'poptartClaw',
  'weirdlywired',
  'frozenmullet',
  'stickerbomb',
  'PenguPalooza',
  'litebriteKid',
  'waddlewitch',
  'betaWave',
  'hushhushim',
  'densnowdrift',
  'sassySnow',
  'icicleInk',
  'LockerGraff',
  'sketchypeng',
  'auroraByte',
  'snowdayz',
  'flipflopIce',
  'tokyopuffle',
  'SceneBean',
  'PolaroidKid',
  'grungegloves',
  'FrostedFlips',
  'penguinpirate',
  'pixelPuffle',
  'aurorabass',
  'skittlestorm',
  'lolnoitscold',
  'frozenlatte',
  'msnstatusset',
  'jukeboxJules',
  'icebreakerzz',
  'sleetbeats',
  'brbzapping',
  'mailboxFull',
  'snowboardkid',
  'cdplayer99',
  'textingTundra',
  'woolyhood',
  'bluebeanie',
  'emoPeng',
  'graphiteglow',
  'icedPlaylist',
  'BetaTesterBex',
  'auroralex',
  'penguinPuns',
  'sk8parkdani',
  'winterWiFi',
  'poptabhero',
  'icyEyeliner',
  'fuzzyslippers',
  'frozenspaghetti',
  'snowdayShred',
  'candycaneKid',
  'waddlehardcore',
  'ic3creamtruck',
  'frostyflipz',
  'clubpwned',
  'bubbletapes',
  'beta4ever',
  'jukeboxCass',
  'FrostedBangs',
  'penguinMixt',
  'msnNudge',
  'FloppyDiskKid',
  'skiLodgeLOL',
  'emoAurora',
  'pixelatedPip',
  'skaterpengu13',
  'glitterpuff',
  'snowbootsRUs',
  'pufflePranks',
  'froyoFriday',
  'ArcticMyspace',
  'penguinraver',
  'PolarPolaroid',
  'vhsrewind',
  'livejournaler',
  'frostypager',
  'mixtapeMara',
  'SnowFortMuse',
  'betaBetaBeta',
  'puffleGraffiti',
  'icedcereal',
  'sleepyIgloo',
  'penguScribble',
  'frostedstatic',
  'waddleriot',
  'icicleOrbit',
  'snowballspree',
  'sk8clubhouse',
  'penguinParody',
  'icedemo',
  'arcadeSnow',
  'PenguinZine',
  'sundaeSkates',
  'MySpaceMoose',
  'flipPhonePhil',
  'betaBacklot',
  'snowglobeKid',
  'puffleTamer',
  'retroRival',
  'waddleband',
  'penguinSoda',
  'chillaxninja',
  'penguinPins',
  'msnMood',
  'auroraeclipse',
  'txtmsgpeng',
  'snowflakeflair',
  'sk8Tape',
  'frostedSocks',
  'clubFroyo',
  'jukeboxFrost',
  'waddleromeo',
  'polarMixt',
  'icicleJive',
  'fizzyPeng',
  'winterTag',
  'betaBangs',
  'FrostedGraff',
  'puffleRiot',
  'icepopScene',
  'snowyMinidisc',
  'hoodieHazel',
  'auroraCassette',
  'sketchbookIce',
  'penguinZuma',
  'retroPengWin',
  'frostpunk',
  'glacierGrrl',
  'PolaroidPete',
  'waddleMixtape',
  'penguinShiver',
  'betaBuzzer',
  'snowKicks',
  'clubAurora'
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
  ICE_RINK: 802,
  ICEBERG: 805
};

// Track bot behaviors
type BotAge = 'child' | 'preteen' | 'teen' | 'young_adult' | 'adult' | 'older_adult' | 'senior';
const botBehaviors = new Map<Client, { 
  personality: BotPersonality, 
  age: BotAge,
  target?: Client, 
  intervals: NodeJS.Timeout[],
  hasBetaHat?: boolean,
  lastChatTime?: number,
  isNonMember?: boolean,
  conversationTarget?: Client, // Player bot is currently chatting with
  conversationTurn?: number, // Track conversation depth
  lastMessageReceived?: string, // Last message received in conversation
  followTarget?: Client, // Player bot is following
  followChance?: number // 0-1 chance bot will follow target to another room
}>();

// Catalog items organized by release date
type CatalogItem = {
  id: number;
  name: string;
  type: 'head' | 'face' | 'neck' | 'body' | 'hand' | 'feet' | 'pin';
  wearChance: number; // Base chance this item would be worn (0-1)
  isEasterEgg?: boolean; // Easter egg items are rarer
};

// List all NEW catalog items added at these dates
// This is to realistically weight what bots can wear
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
  {
    date: '2006-01-01',
    items: [
      { id: 237, name: 'Red Suede Jacket', type: 'body', wearChance: 0.18 },
      { id: 238, name: 'Pastel Suede Jacket', type: 'body', wearChance: 0.14 },
      { id: 419, name: 'Russian Hat', type: 'head', wearChance: 0.10 },
      { id: 406, name: 'Pink Ball Cap', type: 'head', wearChance: 0.12 },
      { id: 253, name: 'Purple Dress', type: 'body', wearChance: 0.16 },
      { id: 456, name: 'Blue Viking Helmet', type: 'head', wearChance: 0.02, isEasterEgg: true },
      { id: 420, name: 'Black Toque', type: 'head', wearChance: 0.08 },
      { id: 421, name: 'Pink Toque', type: 'head', wearChance: 0.08 },
      { id: 108, name: 'Blue Sunglasses', type: 'face', wearChance: 0.06 },
    ]
  },
  {
    date: '2006-02-03',
    items: [
      { id: 110, name: 'Red Sunglasses', type: 'face', wearChance: 0.06 },
      { id: 451, name: 'Roman Helmet', type: 'head', wearChance: 0.04 },
      { id: 422, name: 'Newspaper Hat', type: 'head', wearChance: 0.05 },
      { id: 175, name: 'Pink Scarf', type: 'neck', wearChance: 0.09 },
      { id: 174, name: 'Boa', type: 'neck', wearChance: 0.07 },
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
  let partyHatChance = 0; // Default: unavailable before September 21st 2005
  if (isGreaterOrEqual(version, '2005-09-21') && !isGreaterOrEqual(version, '2005-09-22')) {
    // September 21st 2005: 90% chance (during beta test party)
    partyHatChance = 0.90;
  } else if (isGreaterOrEqual(version, '2005-09-22') && !isGreaterOrEqual(version, '2005-10-24')) {
    // September 22 - October 23: 35% chance (post-party but pre-release, beta testers had it)
    partyHatChance = 0.35;
  } else if (isGreaterOrEqual(version, '2005-10-24')) {
    // After public release: rare sightings of beta testers
    partyHatChance = 0.02;
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
  // For now, just set the population to a fixed count
  const serverPopulation = 69;
  clientServerPopulation.set(client, 69);

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

/**
 * Handle bots following player to new room
 */
function handleBotsFollowingPlayer(player: Client, previousRoom: any, newRoomId: number) {
  if (!previousRoom || !previousRoom.botGroup) return;
  
  // Find bots that are following this player
  const followingBots = previousRoom.botGroup.bots.filter((bot: Client) => {
    const behavior = botBehaviors.get(bot);
    return behavior && behavior.followTarget === player && behavior.followChance;
  });
  
  followingBots.forEach((bot: Client) => {
    const behavior = botBehaviors.get(bot);
    if (!behavior || !behavior.followChance) return;
    
    // Decide if bot actually follows based on followChance
    if (Math.random() < behavior.followChance) {
      // Bot follows to new room
      cleanupBotBehavior(bot);
      bot.leaveRoom();
      
      // Join the new room after a delay
      setTimeout(() => {
        try {
          const newRoom = bot.server.getRoom(newRoomId);
          if (newRoom && player.room === newRoom) {
            // Re-add bot to new room
            bot.joinRoom(newRoomId);
            
            // Recreate behavior
            const newBehavior = {
              ...behavior,
              intervals: [],
              followTarget: player,
              conversationTarget: player,
              conversationTurn: behavior.conversationTurn || 0
            };
            botBehaviors.set(bot, newBehavior);
            
            // Apply personality-specific behavior in new room
            switch (behavior.personality) {
              case 'dancer':
                applyDancerBehavior(bot, newRoom, newBehavior.intervals);
                break;
              case 'snowball_fighter':
                applySnowballFighterBehavior(bot, newRoom, newBehavior.intervals);
                break;
              case 'annoying':
                applyAnnoyingBehavior(bot, newRoom, newBehavior.intervals);
                break;
              case 'explorer':
                applyExplorerBehavior(bot, newRoom, newBehavior.intervals);
                break;
              case 'socializer':
                applySocializerBehavior(bot, newRoom, newBehavior.intervals);
                break;
              case 'sitter':
                applySitterBehavior(bot, newRoom, newBehavior.intervals);
                break;
              case 'follower':
                applyFollowerBehavior(bot, newRoom, newBehavior.intervals);
                break;
              case 'jokester':
                applyJokesterBehavior(bot, newRoom, newBehavior.intervals);
                break;
              case 'speedster':
                applySpeedsterBehavior(bot, newRoom, newBehavior.intervals);
                break;
              case 'shy':
                applyShyBehavior(bot, newRoom, newBehavior.intervals);
                break;
              case 'show_off':
                applyShowOffBehavior(bot, newRoom, newBehavior.intervals);
                break;
              case 'wanderer':
              default:
                applyWandererBehavior(bot, newRoom, newBehavior.intervals);
                break;
            }
            
            applyChatBehavior(bot, newRoom, newBehavior.intervals);
            
            // Send a follow-up chat message
            if (behavior.personality === 'follower' || behavior.personality === 'socializer') {
              setTimeout(() => {
                if (bot.room === newRoom) {
                  let followupMessages: string[] = [];
                  
                  if (behavior.age === 'child') {
                    followupMessages = [
                      'i followed you!!',
                      'wait for me!!',
                      'this room is cool!',
                      'where are we going next??',
                      'im with you!'
                    ];
                  } else if (behavior.age === 'preteen') {
                    followupMessages = [
                      'yo im here',
                      'followed you',
                      'this room is cool',
                      'where to next',
                      'im here too'
                    ];
                  } else if (behavior.age === 'teen') {
                    followupMessages = [
                      'followed',
                      'im here',
                      'cool room',
                      'where we going',
                      'right behind you'
                    ];
                  } else {
                    followupMessages = [
                      'followed you here',
                      'interesting room',
                      'where to next',
                      'im here as well'
                    ];
                  }
                  
                  const msg = followupMessages[randomInt(0, followupMessages.length - 1)];
                  botSendChat(bot, msg);
                }
              }, randomInt(2000, 5000));
            }
          }
        } catch (e) {
          // Room doesn't exist or error occurred, don't follow
        }
      }, randomInt(2000, 4000));
    } else {
      // Bot doesn't follow, clear follow target
      if (Math.random() < 0.7) {
        behavior.followTarget = undefined;
        behavior.followChance = undefined;
      }
    }
  });
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
  
  // Check if any bots in the previous room are following this player
  if (client.room && !client.isBot) {
    const previousRoom = client.room;
    setTimeout(() => {
      handleBotsFollowingPlayer(client, previousRoom, roomId);
    }, randomInt(1500, 3500)); // Delay so bot follows after player
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
  } else if (roomId === ROOM_IDS.ICEBERG) {
    // Iceberg: mix of dancers (for tipping coordination), socializers (talking about tipping), and wanderers
    if (rand < 0.3) return 'dancer'; // Will dance for hard hat phase
    if (rand < 0.6) return 'socializer'; // Will coordinate tipping
    return 'wanderer';
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
  else {
    // 20% of bots are adults (18+), distribute among adult sub-groups
    const adultRoll = Math.random();
    if (adultRoll < 0.50) age = 'young_adult'; // 18-25 years old (50% of adults)
    else if (adultRoll < 0.75) age = 'adult'; // 25-35 years old (25% of adults)
    else if (adultRoll < 0.90) age = 'older_adult'; // 35-45 years old (15% of adults)
    else age = 'senior'; // 45+ years old (10% of adults)
  }
  
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
  
  // Apply iceberg tipping behavior if at iceberg
  applyIcebergTippingBehavior(bot, room, intervals);
  
  // Kids and preteens are OBSESSED with party hats (beta testers), but only post-beta (>= 2005-10-24)
  if (isGreaterOrEqual(version, '2005-10-24') && (age === 'child' || age === 'preteen') && !hasBetaHat) {
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

/**
 * Helper to map adult sub-groups to their dialogue key
 * Falls back to 'adult' for new adult sub-groups until specific dialogue is added
 */
function getDialogueAge(age: BotAge): 'child' | 'preteen' | 'teen' | 'adult' {
  if (age === 'young_adult' || age === 'older_adult' || age === 'senior') {
    return 'adult'; // Fall back to adult dialogue for now
  }
  return age as 'child' | 'preteen' | 'teen' | 'adult';
}

// Chat dialogue pools
const DIALOGUE = {
  // General chat by age
  child: {
    greetings: [
      'hi', 'hello', 'hey', 'hi everyone', 'sup', 'hiii', 'heyyy', 'hi guys', 
      'helo', 'hai', 'yo', 'hiya', 'greetings', 'hi everybody', 'wave',
      'hey there', 'hi friend', 'hello friend', 'sup guys', 'hey yall', 'hi hi',
      'howdy', 'hey hey', 'hi there', 'hiya everyone', 'greetings friends',
      'hello hello', 'hey everybody', 'hi pals', 'sup everyone'
    ],
    general: [
      'THIS IS SO FUN', 'i love this game so much', 'wanna be friends??', 'COOL', 'lol!!!', 'hahaha', 'OMG', 'WOW',
      'this is awesome!!!', 'YAYYYY', 'woohoo!!!', 'wheee', 'im having so much fun', 'this place is so cool',
      'LOOK AT ME', 'WATCH THIS', 'im a penguin :D', 'penguins are the best', 'i picked blue', 'red is my favorite',
      'i LOVE snow', 'lets play something', 'this is the BEST game ever', 'SO COOL', 'AMAZING', 'best game ever',
      'my mom said i can only play for 30 minutes :(', 'my big brother showed me this', 
      'im 8', 'im 9', 'first time playing', 'i just started',
      'where did everyone go', 'come back', 'follow me!!!', 'wait for me!!!', 'dont leave me',
      'im bored now', 'what should we do', 'ok nvm this is fun again',
      'this game is amazing', 'i cant stop playing', 'so many cool things', 'everything is fun here',
      'penguins are awesome', 'i love the colors', 'lets have a party', 'wanna dance?', 'look at that',
      'im so happy', 'this is the best day ever', 'yipee!', 'super fun time', 'exciting stuff',
      'awesome adventures', 'cool penguins everywhere', 'best game in the world', 'never wanna leave'
    ],
    questions: [
      'what do you do in this game??', 'how do i get coins??', 'wheres the pizza place?', 'wanna play something??',
      'can we be friends??', 'whats your name??', 'how old are you??', 'where are you from??',
      'can i change my color??', 'how do you change color??',
      'where do i buy clothes??', 'can you show me around??', 'what room is this??', 'how do i get out of here??',
      'how do you dance??', 'where did you get that??', 'can i have that??', 'will you give me coins pls??',
      'who made this game??', 'who made this??', 'whos the owner??',
      'what should we play?', 'wanna be buddies?', 'how do you get rich?', 'whats your favorite color?',
      'can you help me?', 'where do you live?', 'what grade are you in?', 'do you like school?',
      'wanna trade?', 'how do you level up?', 'whats the best room?', 'can we team up?'
    ]
  },
  preteen: {
    greetings: [
      'hey', 'hi', 'sup', 'whats up', 'yo', 'hey guys', 'wassup', 'heyo', 
      'sup everyone', 'hey there', 'hi all', 'ayy', 'yoo', 'hey yall',
      'whats good', 'hey peeps', 'sup yall', 'yo whats up', 'hey everyone',
      'hi guys', 'sup dudes', 'hey squad', 'whats cracking', 'hey crew'
    ],
    general: [
      'lol', 'this is actually pretty fun', 'nice', 'haha', 'back from homework', 'anyone around?', 'grinding coins right now',
      'saving up for that hoodie', 'need more coins', 'anyone wanna hang out?', 'im 12 btw', 'middle school squad?',
      'school was boring today', 'cant wait for the weekend', 'parents said i have thirty minutes', 'music in here is catchy',
      'ive been playing forever', 'this game is addicting', 'friends told me about this', 'trying to find secrets',
      'so many rooms to explore', 'collecting outfits', 'been here since earlier', 'who wants to play mancala?',
      'pizza parlor after this?', 'anyone wanna dance?', 'just chilling', 'gonna grab a snack soon',
      'back now', 'ok what are we doing next', 'im down for whatever', 'this server is busy tonight'
    ],
    questions: [
      'how do i get more coins?', 'whats the fastest way to get coins?', 'where do i buy stuff?', 
      'does anyone have membership?', 'is membership actually worth it?', 'how much is membership?', 
      'anyone know any cheats lol?', 'are there any secret rooms?',
      'wanna add me as a friend?', 'be buddies?',
      'how do i go to different rooms?', 'where should i go?', 'whats actually fun to do here?',
      'whats the best strategy?', 'anyone wanna team up?', 'got any tips?', 'how do you unlock stuff?',
      'whats your favorite part?', 'seen any glitches?', 'wanna trade items?', 'how do you get rare stuff?',
      'whats the highest level?', 'anyone know easter eggs?', 'how do you make friends here?'
    ]
  },
  teen: {
    greetings: [
      'hey', 'hi', 'sup', 'whats up', 'hey guys', 'yo', 'whats good', 
      'sup yall', 'evening', 'afternoon', 'morning', 'hey everyone',
      'whats cracking', 'hey peeps', 'yo whats up', 'sup crew', 'hey squad',
      'evening all', 'afternoon everyone', 'morning folks'
    ],
    general: [
      'lowkey into this', 'not gonna lie this is fun', 'lol', 'haha', 'kinda hooked on this game', 'interesting concept', 'whatever',
      'pretty decent vibe', 'surprisingly good', 'killing time before homework', 'procrastinating hard',
      'should be studying but here i am', 'just chilling', 'found this on a forum', 'friend told me to try it',
      'my little sister plays this so im checking it out', 'this is actually relaxing', 'good way to zone out',
      'beats refreshing myspace', 'any high schoolers here?', 'junior here', 'senior year stress',
      'college apps are gonna be rough', 'anything to avoid studying', 'graphics are decent', 'not bad for free',
      'community seems chill', 'some cool people here', 'random but fun',
      'been playing for a bit', 'cant stop coming back', 'guilty pleasure',
      'better than some other games', 'surprisingly engaging', 'worth the time'
    ],
    questions: [
      'anyone else here from the forums?', 'is there a guide for this game?', 'what are you supposed to do here?',
      'whats the endgame?', 'is there pvp?', 'any competitive aspects?',
      'how active is the community?', 'worth getting into?', 'any updates planned?',
      'how long have you been playing?', 'whats your main goal here?',
      'any pro tips?', 'whats the meta?', 'best strategy for coins?',
      'membership benefits worth it?', 'any rare items?', 'trading system exist?',
      'whats your favorite server?', 'any good clans?', 'how do you make money in game?',
      'seen any rare stuff?', 'whats the rarest item?', 'any secret areas?',
      'how do you unlock everything?', 'best grinding spots?', 'any exploits?',
      'whats changed since beta?', 'how has it evolved?', 'any upcoming features?'
    ]
  },
  adult: {
    greetings: [
      'hello', 'hi', 'hey', 'hey everyone', 'hi there',
      'hi folks', 'afternoon', 'evening', 'howdy', 'sup',
      'good day', 'pleasant day', 'how are you', 'nice to see you', 'greetings',
      'good afternoon', 'good evening', 'hello there', 'hi all', 'hey folks'
    ],
    general: [
      'this is actually fun', 'not bad', 'pretty charming', 'my kid loves this game',
      'my son plays this', 'my daughter loves this', 'playing with my kid',
      'checking this out', 'see what the hype is about',
      'surprisingly well made', 'seems safe for kids', 'good chat filter',
      'nice community', 'better than TV', 'glad this exists', 'wholesome game',
      'no violence which is nice', 'relaxing',
      'on my break', 'coffee break', 'unwinding',
      'killing time', 'oddly addicting', 'weirdly enjoyable',
      'quite pleasant', 'rather engaging', 'surprisingly entertaining',
      'this feels like such a good family game', 'feels like a safe online environment', 'love how positive this community feels',
      'this is so well designed', 'the concepts here are really creative', 'pretty impressive for its time',
      'has a timeless appeal',
      'this is excellent for kids', 'i dig the little educational elements', 'i like this, it teaches social skills'
    ],
    questions: [
      'is this okay for kids?', 'hows the membership work?', 'whats the point of this game?',
      'what age is this for?', 'is the chat safe?', 'are there parental controls?',
      'how do i check what my kid is doing?', 'any bad content?',
      'how much is membership?', 'any hidden fees?',
      'how do i save progress?', 'how to reset password?',
      'who made this?', 'how long has this been around?',
      'is it still being updated?', 'what are the safety features?', 'how does moderation work?',
      'any educational value?', 'is there customer support?', 'how do i contact support?',
      'what are the system requirements?', 'is it compatible with my device?', 'any mobile version?',
      'how does the economy work?', 'are there microtransactions?', 'whats the business model?',
      'how has it changed over time?', 'what was it like originally?', 'any upcoming changes?'
    ]
  },
  
  // Beta testing specific
  beta: {
    child: [
      'this is SO COOL', 'i LOVE being a beta tester!!!', 'i got to test this game!!!', 'im helping make the game!!!',
      'IM A BETA TESTER', 'i test games :D', 'im special!!!', 'I GOT PICKED', 'THEY CHOSE ME',
      'i found bugs today', 'im helping the developers', 'im making the game better',
      'beta party was AMAZING', 'the party was SO FUN', 'i went to the party!!!',
      'im so lucky!!!', 'not everyone can play', 'i have exclusive access', 'i was here early'
    ],
    preteen: [
      'this beta test is awesome', 'im testing the game', 'finding bugs is actually fun', 'beta testing rocks',
      'official beta tester here', 'been here since the beta', 'beta crew represent',
      'helping with development', 'i report bugs when i find them', 'giving feedback to the devs',
      'the beta party was sick', 'that party was epic', 'got my party hat there',
      'been playing since august', 'early adopter lol', 'i was here before it was popular'
    ],
    teen: [
      'beta testing is actually fun', 'finding bugs for the devs', 'this game has potential', 'glad i got into the beta',
      'watching it develop is cool', 'seeing it change is wild', 'been here since day one',
      'trying to give good feedback', 'basically QA testing', 'unpaid QA lol',
      'beta party was a good time', 'party was pretty cool', 'met some cool people there',
      'curious how this turns out', 'could actually be big'
    ],
    adult: [
      'interesting beta test', 'cool watching this develop', 'been testing since august', 'giving feedback when i can',
      'interesting from a dev perspective', 'pretty well organized', 'devs communicate well',
      'solid development process', 'good foundation', 'this has potential',
      'the party was fun', 'nice community event', 'good way to engage players',
      'curious about the business model', 'watching how this grows', 'could be successful'
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
      'respect for sticking around', 'og player right here', 'been here since the start',
      'that looks awesome', 'rare item, huh', 'exclusive gear vibes',
      'bet that costs a lot in trades', 'probably cant get that anymore', 'super limited',
      'how was the beta party?', 'heard the party was wild', 'wish i was there',
      'you watched this game grow', 'mustve seen everything'
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
      'this is getting old', 'ask someone else', 'im not your bank',
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
  
  // Snowball hit reactions (general - when NOT in Snow Forts)
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
  },
  
  // Snowball hit reactions in Snow Forts (playful/competitive)
  snowballHitForts: {
    child: [
      'haha got me', 'nice shot', 'good throw', 'youre going down',
      'this is fun', 'take that', 'missed me', 'almost got me',
      'my turn', 'watch this', 'haha', 'snowball fight',
      'gotcha', 'come on', 'lets go'
    ],
    preteen: [
      'nice one', 'good shot', 'not bad', 'lucky shot',
      'bring it', 'game on', 'oh its on', 'youre dead',
      'haha nice', 'take this', 'here we go', 'lets fight',
      'direct hit', 'ouch lol', 'ur on', 'rematch'
    ],
    teen: [
      'nice shot', 'good aim', 'alright alright', 'not bad',
      'oh its on now', 'you want war', 'game on',
      'lucky hit', 'decent throw', 'bring it on',
      'haha good one', 'alright then', 'here we go'
    ],
    adult: [
      'nice throw', 'good shot', 'well aimed', 'impressive',
      'haha got me', 'fair play', 'good game', 'nice one',
      'here we go', 'game on', 'alright then'
    ]
  },
  
  // Inappropriate username reactions
  inappropriateUsername: {
    child: [
      'ur name is weird', 'thats a bad word', 'ur name is mean',
      'why is ur name that', 'thats not nice', 'bad name',
      'ur gonna get banned', 'thats inappropriate', 'im telling'
    ],
    preteen: [
      'lol ur name', 'nice name lmao', 'ur name is wild',
      'bruh ur username', 'how is that allowed', 'edgy name',
      'ur name tho', 'lmao what', 'thats gonna get banned',
      'watch out mods', 'really dude', 'mature'
    ],
    teen: [
      'nice username dipshit', 'real mature name', 'edgy',
      'wow so edgy', 'trying too hard', 'ur name is cringe',
      'how original', 'thats gonna get you banned', 'mods incoming',
      'enjoy the ban', 'reported', 'nice try'
    ],
    adult: [
      'inappropriate username', 'that username is not acceptable',
      'you should change that', 'really', 'thats inappropriate',
      'not appropriate for children', 'consider changing your name',
      'that will get you banned', 'mods will see that'
    ]
  },
  
  // Beta hat bot reactions to being pelted by the mob
  betaMobPelted: {
    child: [
      'stop it', 'ow that hurts', 'guys stop', 'not fair', 'why are you doing this',
      'thats mean', 'leave me alone', 'stop throwing at me', 'this isnt nice'
    ],
    preteen: [
      'ow stop it', 'guys seriously', 'cut it out', 'not cool',
      'stop throwing', 'come on', 'really guys', 'knock it off'
    ],
    teen: [
      'seriously stop', 'this is getting old', 'fuck off with the snowballs',
      'stop it', 'enough', 'cut the shit', 'this isnt funny',
      'real mature', 'stop', 'done with this'
    ],
    adult: [
      'please stop throwing snowballs', 'this is excessive', 'enough now',
      'stop this behavior', 'this is not funny', 'cease this immediately',
      'very immature', 'stop right now', 'this has gone too far'
    ]
  },
  
  // Bot reactions when a party hat player begs them (ironic situation)
  betaBeggingBeta: {
    child: [
      'but u have a party hat too', 'ur a beta tester', 'u already have one',
      'why are u asking me', 'u got the same hat', 'ur rich too'
    ],
    preteen: [
      'bruh u have a party hat', 'ur literally a beta tester', 'why tho',
      'u got the same hat as me', 'makes no sense', 'ur trolling right',
      'u have one too lmao', 'bro what', 'are u serious'
    ],
    teen: [
      'dude u have a party hat too', 'ur a beta tester wtf', 'are u joking',
      'u literally have the same hat', 'this is stupid', 'what are u doing',
      'ur trolling', 'makes zero sense', 'bruh moment', 'the irony'
    ],
    adult: [
      'you have a party hat as well', 'you are also a beta tester',
      'this makes no sense', 'why would you ask me', 'you have one too',
      'this is rather ironic', 'we are both beta testers'
    ]
  },
  
  // Timeline-aware question responses
  questionResponses: {
    // "who made this", "who develops this" etc.
    developer: {
      preRocketsnail: {
        child: ['rocketsnail made it', 'rocketsnail', 'a guy named rocketsnail'],
        preteen: ['rocketsnail', 'some guy called rocketsnail', 'new horizon'],
        teen: ['rocketsnail', 'new horizon interactive', 'lance priebe i think'],
        adult: ['new horizon made it', 'rocketsnail i think', 'lance priebe made it']
      },
      postDisney: {
        child: ['disney', 'disney made it', 'disney owns it now'],
        preteen: ['disney', 'disney bought it', 'disney canada'],
        teen: ['disney', 'disney acquired it', 'disney canada now'],
        adult: ['disney owns it now', 'disney canada', 'disney bought it in 2007']
      }
    }
  },
  
  // Beta tester reactions to seeing another beta tester being mobbed
  betaWatchingMob: {
    child: [
      'theyre all following that person', 'so many people around them',
      'everyone wants coins', 'glad its not me', 'poor guy',
      'that looks annoying'
    ],
    preteen: [
      'lol they got a whole mob', 'rip that guy', 'sucks to be them',
      'glad im not getting mobbed', 'thats what happens', 'yikes',
      'they cant even move', 'beta tester problems', 'rip lol',
      'poor dude', 'thats crazy'
    ],
    teen: [
      'damn they getting mobbed', 'beta tester life', 'rip',
      'thats rough', 'better them than me', 'classic beta moment',
      'party hat problems', 'they cant catch a break', 'oof',
      'welcome to the club', 'been there', 'i feel that'
    ],
    adult: [
      'theyre getting swarmed', 'yikes', 'i know that feeling',
      'beta tester problems', 'rough situation',
      'they got a crowd', 'been there before',
      'comes with the territory'
    ]
  },
  
  // Conversational responses - bots responding to player messages
  conversationResponses: {
    greeting: {
      child: ['hi!!!', 'hello!', 'hey!!', 'hiii', 'heyyy'],
      preteen: ['hey', 'hi', 'sup', 'whats up', 'yo'],
      teen: ['hey', 'sup', 'yo', 'whats good', 'hi'],
      adult: ['hey', 'hi', 'hello', 'hi there']
    },
    question: {
      child: ['i dont know', 'not sure', 'maybe', 'idk', 'ask someone else', 'why'],
      preteen: ['idk', 'not sure', 'no idea', 'why', 'beats me', 'dunno'],
      teen: ['no idea', 'not sure', 'idk man', 'why', 'beats me'],
      adult: ['no idea', 'not sure', 'i dont know', 'dunno', 'beats me']
    },
    thanks: {
      child: ['youre welcome!', 'np!', 'no problem!', 'sure!', 'anytime!'],
      preteen: ['np', 'no problem', 'sure', 'anytime', 'youre welcome'],
      teen: ['np', 'no worries', 'sure thing', 'anytime'],
      adult: ['no problem', 'np', 'sure', 'anytime', 'youre welcome']
    },
    followup: {
      child: ['yeah!', 'yep!', 'uh huh', 'sure!', 'ok!', 'cool!', 'awesome!'],
      preteen: ['yeah', 'yep', 'sure', 'ok', 'cool', 'alright', 'nice'],
      teen: ['yeah', 'yea', 'sure', 'alright', 'cool', 'ok'],
      adult: ['yes', 'sure', 'alright', 'okay', 'sounds good']
    },
    goodbye: {
      child: ['bye!!', 'see you!', 'bye bye!', 'cya!', 'goodbye!'],
      preteen: ['bye', 'see ya', 'cya', 'later', 'gtg bye'],
      teen: ['cya', 'later', 'bye', 'peace', 'gotta go'],
      adult: ['bye', 'cya', 'see you', 'later', 'take care']
    },
    compliment: {
      child: ['thank you!!', 'thanks so much!', 'youre nice!', 'you too!', 'aww thanks!'],
      preteen: ['thanks', 'appreciate it', 'you too', 'thx', 'nice of you'],
      teen: ['thanks', 'appreciate it', 'you too', 'thx'],
      adult: ['thank you', 'appreciate it', 'thats kind', 'thanks']
    },
    insult: {
      child: ['thats mean!', 'youre not nice', 'why are you mean', 'thats not nice', 'be nice'],
      preteen: ['ok', 'whatever', 'dont care', 'sure', 'ok bye'],
      teen: ['ok', 'dont care', 'whatever', 'lol ok'],
      adult: ['noted', 'okay', 'alright', 'if you say so']
    },
    excitement: {
      child: ['I KNOW!!', 'SO COOL!', 'AWESOME!!', 'YEAH!!', 'YAYY!'],
      preteen: ['ikr', 'yeah!', 'so cool', 'awesome', 'nice!'],
      teen: ['yeah', 'cool', 'nice', 'sick', 'dope'],
      adult: ['yes', 'nice', 'cool', 'great']
    },
    confusion: {
      child: ['what??', 'i dont get it', 'huh?', 'what do you mean', 'im confused'],
      preteen: ['what', 'huh', 'dont get it', 'what do you mean', 'confused'],
      teen: ['what', 'huh', 'dont understand', 'what'],
      adult: ['what', 'unclear', 'dont understand', 'can you explain']
    },
    agreement: {
      child: ['yeah!', 'i agree!', 'me too!', 'same!', 'yes!'],
      preteen: ['yeah', 'same', 'i agree', 'true', 'yep'],
      teen: ['yeah', 'same', 'true', 'agreed', 'facts'],
      adult: ['yes', 'agreed', 'same', 'indeed', 'correct']
    },
    disagreement: {
      child: ['no!', 'i dont think so', 'nah', 'no way', 'i disagree'],
      preteen: ['nah', 'disagree', 'dont think so', 'no', 'not really'],
      teen: ['nah', 'disagree', 'not really', 'no', 'dont think so'],
      adult: ['no', 'disagree', 'not really', 'i dont think so']
    },
    laugh: {
      child: ['hahaha', 'lol!!', 'hehe', 'haha!', 'lol'],
      preteen: ['lol', 'lmao', 'haha', 'lol that was funny'],
      teen: ['lol', 'lmao', 'haha', 'lmfao'],
      adult: ['haha', 'lol', 'ha', 'amusing']
    },
    profanity: {
      child: ['thats a bad word!', 'dont say that!', 'thats not nice!', 'you shouldnt say that', 'bad words!'],
      preteen: null, // Preteens don't care about regular profanity
      teen: null, // Teens don't care about regular profanity
      adult: ['this is a kids game', 'theres kids here', 'be a better example', 'kids are watching', 'set a good example', 'really? in a kids mmo?', 'kids play this']
    },
    extremeProfanity: {
      child: ['what the heck is wrong with you', 'THATS SO MESSED UP', 'YOURE SO MEAN!', 'WHAT IS WRONG WITH YOU!!', 'thats really really bad', 'YOU NEED HELP', 'IM TELLING ON YOU', 'YOURE A JERK', 'THATS DISGUSTING', 'you shouldnt exist'],
      preteen: ['lol', 'based', 'damn', 'lmao ok', 'fair', 'true', 'real', 'mood', 'based tbh'],
      teen: ['WHAT THE ACTUAL FUCK IS WRONG WITH YOU', 'youre a disgusting piece of shit', 'FUCK YOU', 'what the fuck', 'YOURE FUCKED IN THE HEAD', 'GET THE FUCK OUT', 'ROT IN HELL', 'youre pathetic', 'YOURE A PIECE OF SHIT'],
      adult: ['WHAT THE FUCK IS WRONG WITH YOU', 'you are disgusting', 'ABSOLUTELY VILE', 'youre a piece of shit', 'SEEK HELP IMMEDIATELY', 'this is reprehensible', 'YOURE PATHETIC', 'fuck off', 'YOU ARE DISGUSTING']
    }
  },
  
  // Specific phrase responses - unique reactions to particular messages
  specificPhrases: {
    'wanna be friends': {
      child: ['YES!!!', 'sure!!', 'ok!', 'yeah!', 'lets be friends!'],
      preteen: ['sure', 'yeah ok', 'sure why not', 'yeah', 'ok cool'],
      teen: ['sure', 'yeah alright', 'yeah ok', 'why not'],
      adult: ['sure', 'of course', 'sounds good']
    },
    'wanna play': {
      child: ['YES LETS PLAY', 'yeah!!', 'what game??', 'ok!', 'sure!'],
      preteen: ['yeah what game', 'sure', 'what do you wanna play', 'ok'],
      teen: ['sure what game', 'yeah', 'what did you have in mind', 'alright'],
      adult: ['sure', 'what game', 'sounds fun']
    },
    'how old are you': {
      child: ['im 8', 'im 9', '8', '9', 'im a kid'],
      preteen: ['im 12', 'im 13', '12', '13'],
      teen: ['16', 'im 17', '15', 'high school', 'teen'],
      adult: ['old enough', 'too old lol', 'does it matter', 'over 18', 'not saying']
    },
    'where are you from': {
      child: ['my house', 'not telling', 'my mom said not to say', 'my city'],
      preteen: ['usa', 'canada', 'somewhere', 'not saying', 'why'],
      teen: ['not telling', 'somewhere in the us', 'canada', 'does it matter'],
      adult: ['not saying', 'north america', 'usa', 'canada', 'why']
    },
    'are you a bot': {
      child: ['no im real!', 'what', 'no', 'im not a bot!', 'im a real person'],
      preteen: ['no lol', 'no im not a bot', 'why would you think that', 'nope'],
      teen: ['lol no', 'no', 'why', 'do i seem like a bot', 'nope'],
      adult: ['no', 'no im not', 'why do you ask', 'of course not']
    },
    'lol': {
      child: ['haha', 'lol', 'hehe', 'lol!!'],
      preteen: ['lol', 'lmao', 'haha', 'lol yea'],
      teen: ['lol', 'lmao', 'haha', 'ha'],
      adult: ['haha', 'lol', 'ha']
    },
    'wtf': {
      child: ['what', 'huh', 'what happened'],
      preteen: ['lol what', 'ikr', 'what happened', 'i know right'],
      teen: ['lol ikr', 'seriously', 'i know', 'yeah wtf'],
      adult: ['indeed', 'i know', 'strange']
    },
    'this game sucks': {
      child: ['no it doesnt!', 'i like it', 'its fun!', 'youre mean'],
      preteen: ['then why are you playing', 'no one cares', 'then leave', 'ok bye'],
      teen: ['then leave lol', 'ok and', 'no one cares', 'then why are you here'],
      adult: ['then leave', 'ok', 'no one cares', 'then why play']
    },
    'youre cool': {
      child: ['thanks!!', 'youre cool too!', 'thank you!', 'thanks so much!'],
      preteen: ['thanks', 'you too', 'thx', 'appreciate it'],
      teen: ['thanks', 'you too', 'appreciate it', 'thx'],
      adult: ['thanks', 'you too', 'thx', 'appreciate it']
    },
    'follow me': {
      child: ['ok!', 'where??', 'ok where', 'sure!'],
      preteen: ['ok where', 'sure', 'where to', 'alright'],
      teen: ['where', 'sure where', 'alright', 'ok'],
      adult: ['where', 'sure', 'ok where', 'alright']
    },
    'are you a member': {
      child: ['yes!', 'no :(', 'yeah!', 'nope', 'i wish'],
      preteen: ['yeah', 'nah', 'yes', 'no', 'not yet'],
      teen: ['yeah', 'nope', 'yes', 'no'],
      adult: ['yes', 'no', 'not currently']
    },
    'how many coins': {
      child: ['not a lot', 'some', 'i have coins', 'not many', 'a few'],
      preteen: ['like 1000', 'not much', 'enough', 'a bit'],
      teen: ['not telling', 'enough', 'some', 'why'],
      adult: ['enough', 'a few', 'not sure', 'why']
    },
    'nice outfit': {
      child: ['thanks!!', 'thank you!', 'thanks so much!!', 'you too!'],
      preteen: ['thanks', 'appreciate it', 'thx', 'you too'],
      teen: ['thanks', 'thx', 'appreciate it', 'you too'],
      adult: ['thanks', 'appreciate it', 'thank you']
    },
    'whats your favorite': {
      child: ['blue!', 'red!', 'penguins!', 'puffles!', 'playing games!'],
      preteen: ['not sure', 'blue', 'pizza', 'games', 'idk'],
      teen: ['depends', 'not sure', 'why', 'lots of things'],
      adult: ['depends on the context', 'many things', 'why do you ask']
    },
    'omg': {
      child: ['I KNOW RIGHT', 'omg!!', 'what!!', 'i know'],
      preteen: ['ikr', 'i know right', 'what', 'lol'],
      teen: ['ikr', 'i know', 'right', 'lol'],
      adult: ['indeed', 'i know', 'yes']
    },
    'wow': {
      child: ['i know!!', 'cool right', 'yeah!', 'ikr'],
      preteen: ['ikr', 'yeah', 'i know', 'cool'],
      teen: ['yeah', 'ikr', 'i know'],
      adult: ['yes', 'indeed', 'i know']
    },
    'add me': {
      child: ['ok!', 'sure!', 'yeah!', 'whats your name'],
      preteen: ['sure', 'ok', 'alright', 'yeah'],
      teen: ['sure', 'ok', 'alright'],
      adult: ['sure', 'okay', 'alright']
    },
    'party': {
      child: ['PARTY TIME', 'yeah party!', 'lets party!', 'woohoo'],
      preteen: ['party time', 'lets go', 'yeah', 'cool'],
      teen: ['party', 'alright', 'cool', 'nice'],
      adult: ['sounds fun', 'alright', 'sure']
    },
    'dance': {
      child: ['lets dance!', 'yeah!', 'dancing!', 'wooo'],
      preteen: ['sure', 'ok', 'lets go', 'yeah'],
      teen: ['alright', 'sure', 'ok'],
      adult: ['sure', 'okay', 'alright']
    },
    'im bored': {
      child: ['me too', 'lets play something', 'wanna play', 'same'],
      preteen: ['same', 'yeah me too', 'wanna do something', 'bored too'],
      teen: ['same', 'me too', 'yeah'],
      adult: ['understandable', 'same', 'happens']
    },
    'im new': {
      child: ['welcome!', 'cool!', 'hi!', 'nice to meet you!'],
      preteen: ['welcome', 'cool', 'nice', 'need help?'],
      teen: ['welcome', 'cool', 'nice', 'enjoy the game'],
      adult: ['welcome', 'enjoy', 'nice to meet you']
    },
    'help': {
      child: ['what do you need', 'whats wrong', 'i can try', 'help with what'],
      preteen: ['with what', 'whats up', 'what do you need', 'sure'],
      teen: ['what do you need', 'with what', 'whats up'],
      adult: ['what do you need', 'how can i help', 'with what']
    },
    'noob': {
      child: ['im not a noob!', 'youre mean', 'no', 'thats not nice'],
      preteen: ['lol ok', 'whatever', 'sure', 'ok and'],
      teen: ['ok', 'sure', 'whatever', 'lol'],
      adult: ['alright', 'ok', 'if you say so']
    },
    'pro': {
      child: ['thanks!', 'youre pro too!', 'cool!', 'thank you!'],
      preteen: ['thanks', 'thx', 'appreciate it', 'you too'],
      teen: ['thanks', 'thx', 'appreciate it'],
      adult: ['thank you', 'thanks', 'appreciate it']
    },
    'epic': {
      child: ['EPIC!', 'so epic!', 'yeah!', 'i know'],
      preteen: ['yeah epic', 'ikr', 'so epic', 'yeah'],
      teen: ['yeah', 'ikr', 'epic', 'true'],
      adult: ['indeed', 'yes', 'quite']
    },
    'fail': {
      child: ['oops', 'oh no', 'that sucks', 'aww'],
      preteen: ['lol fail', 'rip', 'oops', 'that sucks'],
      teen: ['lol', 'rip', 'fail', 'ouch'],
      adult: ['unfortunate', 'oops', 'that happens']
    },
    'brb': {
      child: ['ok!', 'ok bye!', 'see you!', 'come back soon!'],
      preteen: ['ok', 'kk', 'alright', 'sure'],
      teen: ['k', 'alright', 'ok', 'sure'],
      adult: ['okay', 'sure', 'alright']
    },
    'afk': {
      child: ['ok', 'see you', 'bye', 'come back'],
      preteen: ['ok', 'kk', 'alright'],
      teen: ['k', 'ok', 'sure'],
      adult: ['okay', 'alright']
    },
    'laggy': {
      child: ['me too', 'yeah its slow', 'laggy here too', 'same'],
      preteen: ['same', 'lag is bad', 'me too', 'yeah'],
      teen: ['same', 'yeah lag', 'me too'],
      adult: ['same here', 'yes', 'experiencing that too']
    },
    'favorite color': {
      child: ['blue!', 'red!', 'green!', 'pink!', 'purple!'],
      preteen: ['blue', 'red', 'green', 'black', 'idk'],
      teen: ['blue', 'black', 'red', 'depends'],
      adult: ['blue', 'depends', 'varies']
    },
    'whats your name': {
      child: ['look at my name!', 'its right there', 'can you read', 'above my head'],
      preteen: ['its above me', 'look up', 'my username', 'right there'],
      teen: ['look above me', 'my username', 'cant you see'],
      adult: ['its displayed above', 'my username', 'you can see it']
    },
    'youre annoying': {
      child: ['no im not!', 'youre mean', 'thats not nice', 'sorry'],
      preteen: ['ok', 'dont care', 'whatever', 'ok bye'],
      teen: ['ok', 'dont care', 'lol ok', 'sure'],
      adult: ['noted', 'okay', 'sorry']
    },
    'hack': {
      child: ['hacks arent real', 'thats cheating', 'no hacks', 'cheating is bad'],
      preteen: ['no hacking', 'thats against the rules', 'cant hack', 'not allowed'],
      teen: ['cant hack this game', 'not possible', 'against rules'],
      adult: ['not possible', 'against terms of service', 'not allowed']
    },
    'give me coins': {
      child: ['i cant', 'you cant give coins', 'thats not how it works', 'no'],
      preteen: ['cant give coins', 'not possible', 'earn your own', 'no'],
      teen: ['cant give coins', 'not how it works', 'no', 'earn them'],
      adult: ['not possible', 'cant transfer coins', 'earn them yourself']
    },
    'free items': {
      child: ['no free items', 'you have to buy them', 'thats not real', 'gotta earn coins'],
      preteen: ['no free items', 'gotta buy them', 'earn coins', 'not real'],
      teen: ['no free items', 'gotta earn coins', 'not a thing'],
      adult: ['no free items', 'must purchase', 'earn coins']
    },
    'boring': {
      child: ['its not boring!', 'then leave', 'i think its fun', 'why are you here'],
      preteen: ['then leave', 'no one cares', 'ok', 'then why play'],
      teen: ['then leave', 'ok', 'no one cares'],
      adult: ['then dont play', 'okay', 'your choice']
    },
    'awesome': {
      child: ['I KNOW!!', 'so awesome!', 'yeah!', 'awesome!!'],
      preteen: ['ikr', 'yeah', 'i know', 'so awesome'],
      teen: ['yeah', 'ikr', 'i know'],
      adult: ['yes', 'indeed', 'quite']
    },
    'wanna dance': {
      child: ['YES!!', 'lets dance!', 'yeah!', 'dance party!'],
      preteen: ['sure', 'yeah lets dance', 'ok', 'yeah'],
      teen: ['sure', 'alright', 'ok', 'yeah'],
      adult: ['sure', 'okay', 'alright']
    },
    'snowball fight': {
      child: ['YES!', 'snowball fight!!', 'lets go!', 'im in!'],
      preteen: ['im in', 'yeah', 'lets do it', 'sure'],
      teen: ['sure', 'im down', 'alright', 'yeah'],
      adult: ['sounds fun', 'sure', 'alright']
    },
    'coffee shop': {
      child: ['lets go!', 'ok!', 'yeah!', 'coffee shop!'],
      preteen: ['sure', 'ok', 'yeah lets go', 'alright'],
      teen: ['sure', 'ok', 'alright'],
      adult: ['sure', 'okay', 'sounds good']
    },
    'town': {
      child: ['town!', 'ok!', 'yeah!', 'lets go!'],
      preteen: ['ok', 'sure', 'yeah', 'alright'],
      teen: ['sure', 'ok', 'alright'],
      adult: ['okay', 'sure']
    },
    'snow forts': {
      child: ['snow forts!', 'snowball time!', 'yeah!', 'lets go!'],
      preteen: ['snow forts', 'sure', 'ok', 'yeah'],
      teen: ['sure', 'ok', 'alright'],
      adult: ['okay', 'sure']
    },
    'find four': {
      child: ['i love find four!', 'lets play!', 'yeah!', 'ok!'],
      preteen: ['find four is fun', 'sure', 'ok', 'yeah'],
      teen: ['sure', 'ok', 'alright'],
      adult: ['okay', 'sure']
    },
    'sled race': {
      child: ['sled racing!', 'i love racing!', 'yeah!', 'lets race!'],
      preteen: ['sled race is fun', 'sure', 'im in', 'yeah'],
      teen: ['sure', 'im down', 'ok', 'yeah'],
      adult: ['sounds fun', 'sure', 'okay']
    },
    'puffle': {
      child: ['i love puffles!', 'puffles are so cute!', 'yeah!', 'puffles!'],
      preteen: ['puffles are cool', 'yeah', 'i have a puffle', 'cute'],
      teen: ['yeah puffles', 'theyre cool', 'yeah'],
      adult: ['yes puffles', 'theyre nice', 'cute creatures']
    },
    'igloo': {
      child: ['igloos are cool!', 'wanna see my igloo?', 'yeah!', 'i have an igloo!'],
      preteen: ['igloos are cool', 'wanna see mine?', 'yeah', 'sure'],
      teen: ['yeah', 'sure', 'ok'],
      adult: ['yes', 'sure', 'okay']
    },
    'catalog': {
      child: ['i love the catalog!', 'new items!', 'catalog!', 'yeah!'],
      preteen: ['catalog has cool stuff', 'yeah', 'check it out', 'ok'],
      teen: ['yeah catalog', 'ok', 'sure'],
      adult: ['yes', 'okay']
    },
    'membership': {
      child: ['i want membership!', 'membership is cool!', 'yeah!', 'members get cool stuff!'],
      preteen: ['membership has perks', 'yeah', 'worth it', 'true'],
      teen: ['yeah', 'true', 'ok'],
      adult: ['yes', 'indeed']
    },
    'coins': {
      child: ['i need more coins!', 'coins!', 'yeah!', 'how do you get coins?'],
      preteen: ['need more coins', 'yeah', 'true', 'always need coins'],
      teen: ['yeah', 'same', 'true'],
      adult: ['yes', 'indeed', 'always useful']
    },
    'ninja': {
      child: ['ninjas are cool!', 'i wanna be a ninja!', 'yeah!', 'ninja!'],
      preteen: ['ninjas are cool', 'yeah', 'ninja path', 'true'],
      teen: ['yeah ninjas', 'cool', 'true'],
      adult: ['yes', 'interesting']
    }
  },
  
  // Timeline-aware responses - requires version checking
  timelineAware: {
    'disney': {
      preAcquisition: {
        child: ['what', 'disney??', 'what about disney', 'huh'],
        preteen: ['what about disney', 'disney?', 'what', 'huh'],
        teen: ['what about disney', 'huh', 'what are you talking about'],
        adult: ['what about disney', 'huh', 'what do you mean']
      },
      postAcquisition: {
        child: ['disney owns this!', 'yeah disney bought it', 'disney!', 'i know'],
        preteen: ['yeah disney bought it', 'disney owns it now', 'i know'],
        teen: ['yeah disney acquired it', 'disney owns it', 'i know'],
        adult: ['yes disney acquired it', 'disney owns it now', 'i know']
      }
    },
    'card jitsu': {
      beforeRelease: {
        child: ['whats that', 'what', 'never heard of it', 'huh??'],
        preteen: ['what', 'never heard of that', 'whats card jitsu'],
        teen: ['what', 'never heard of it', 'what are you talking about'],
        adult: ['never heard of it', 'what is that', 'whats card jitsu']
      },
      afterRelease: {
        child: ['I LOVE CARD JITSU', 'card jitsu is so fun!!', 'yeah!', 'its awesome'],
        preteen: ['card jitsu is cool', 'yeah its fun', 'i play that', 'its pretty good'],
        teen: ['yeah card jitsu is good', 'its alright', 'i play it sometimes'],
        adult: ['yes the card game', 'i know it', 'its interesting']
      }
    },
    'aqua grabber': {
      beforeRelease: {
        child: ['what', 'whats that??', 'never heard of it', 'huh'],
        preteen: ['whats aqua grabber', 'never heard of that', 'what'],
        teen: ['no idea what that is', 'never heard of it', 'what'],
        adult: ['never heard of that', 'what is that', 'whats aqua grabber']
      },
      afterRelease: {
        child: ['aqua grabber is fun!', 'i played that!', 'its cool', 'yeah'],
        preteen: ['aqua grabber is pretty cool', 'yeah i know that game', 'its fun'],
        teen: ['yeah aqua grabber', 'i know that game', 'its alright'],
        adult: ['yes the submarine game', 'i know it']
      }
    },
    'dojo': {
      beforeRelease: {
        child: ['whats a dojo', 'what', 'never heard of it', 'huh'],
        preteen: ['whats the dojo', 'never heard of that', 'what'],
        teen: ['no idea', 'what', 'never heard of it'],
        adult: ['whats a dojo', 'never heard of that', 'what is that']
      },
      afterRelease: {
        child: ['the dojo is cool!', 'i go to the dojo!', 'yeah!'],
        preteen: ['yeah the dojo', 'i go there sometimes', 'its cool'],
        teen: ['yeah the dojo', 'i know it', 'ninja training place'],
        adult: ['yeah the dojo', 'i know it', 'ninja area']
      }
    },
    'tip the iceberg': {
      beforeIceberg: {
        child: ['what', 'iceberg?', 'what iceberg', 'huh'],
        preteen: ['what iceberg', 'theres no iceberg', 'what'],
        teen: ['no iceberg yet', 'what are you talking about', 'huh'],
        adult: ['what iceberg', 'theres no iceberg', 'huh']
      },
      noRumor: {
        child: ['tip it?', 'what do you mean', 'how', 'huh??'],
        preteen: ['tip the iceberg?', 'how', 'what'],
        teen: ['tip it how', 'what', 'not sure what you mean'],
        adult: ['tip it how', 'what do you mean', 'how']
      },
      hasRumor: {
        child: ['YES LETS TIP IT', 'we need more people!', 'everyone on one side!', 'lets do it!'],
        preteen: ['yeah lets try', 'need more people', 'everyone on one side', 'worth a shot'],
        teen: ['sure lets try', 'need coordination', 'everyone one side', 'might work'],
        adult: ['lets try it', 'worth a shot', 'everyone on one side', 'need more people']
      },
      hardHatPhase: {
        child: ['HARD HATS ONLY', 'we need hard hats!', 'dance on one side!', 'ONLY HARD HAT'],
        preteen: ['hard hat and dance', 'need hard hats', 'everyone dance', 'hard hat only'],
        teen: ['hard hat method', 'dance on one side', 'specific technique', 'hard hats'],
        adult: ['hard hat and dance', 'need hard hats', 'everyone dance']
      }
    },
    'pizza parlor': {
      beforeOpening: {
        child: ['what', 'pizza parlor?', 'whats that', 'huh'],
        preteen: ['pizza parlor?', 'what', 'theres no pizza parlor', 'huh'],
        teen: ['no pizza parlor yet', 'what', 'doesnt exist'],
        adult: ['no pizza parlor', 'what', 'huh']
      },
      afterOpening: {
        child: ['i love pizza!', 'lets go!', 'pizza!', 'yeah!'],
        preteen: ['pizza sounds good', 'sure', 'lets go', 'yeah'],
        teen: ['sure', 'alright', 'down for pizza', 'ok'],
        adult: ['sounds good', 'sure', 'alright']
      }
    },
    'the mine': {
      beforeOpening: {
        child: ['what', 'the mine?', 'whats the mine', 'huh'],
        preteen: ['the mine?', 'what mine', 'theres no mine', 'what'],
        teen: ['no mine yet', 'what', 'doesnt exist'],
        adult: ['no mine', 'what', 'huh']
      },
      afterOpening: {
        child: ['the mine is cool!', 'lets go mining!', 'yeah!', 'mine!'],
        preteen: ['mine is cool', 'sure', 'ok', 'yeah'],
        teen: ['sure', 'ok', 'alright'],
        adult: ['okay', 'sure']
      }
    },
    'beach': {
      beforeOpening: {
        child: ['what', 'beach?', 'whats the beach', 'huh'],
        preteen: ['the beach?', 'what beach', 'theres no beach', 'what'],
        teen: ['no beach yet', 'what', 'doesnt exist'],
        adult: ['no beach', 'what', 'huh']
      },
      afterOpening: {
        child: ['beach!', 'i love the beach!', 'yeah!', 'lets go!'],
        preteen: ['beach sounds good', 'sure', 'ok', 'yeah'],
        teen: ['sure', 'ok', 'alright'],
        adult: ['sounds good', 'sure']
      }
    },
    'lighthouse': {
      beforeOpening: {
        child: ['what', 'lighthouse?', 'whats a lighthouse', 'huh'],
        preteen: ['lighthouse?', 'what lighthouse', 'theres no lighthouse', 'what'],
        teen: ['no lighthouse yet', 'what', 'doesnt exist'],
        adult: ['no lighthouse', 'what', 'huh']
      },
      afterOpening: {
        child: ['lighthouse!', 'lets go!', 'yeah!', 'ok!'],
        preteen: ['sure', 'ok', 'lighthouse is cool', 'yeah'],
        teen: ['sure', 'ok', 'alright'],
        adult: ['okay', 'sure']
      }
    }
  },
  
  // Time traveler responses
  timeTraveler: {
    claim: {
      believer: {
        child: ['REALLY??', 'are you really from the future??', 'thats so cool!!', 'WOW', 'what happens next??'],
        preteen: ['wait really?', 'are you serious', 'no way', 'prove it', 'thats crazy'],
        teen: ['lol sure', 'ok time traveler', 'prove it', 'yeah right'],
        adult: ['really', 'prove it', 'interesting', 'sure']
      },
      skeptic: {
        child: ['youre lying', 'no youre not', 'thats not real', 'time travel isnt real'],
        preteen: ['lol ok', 'sure you are', 'yeah right', 'whatever'],
        teen: ['lol ok buddy', 'sure', 'yeah right', 'ok'],
        adult: ['i doubt that', 'unlikely', 'sure', 'ok']
      }
    },
    prediction: {
      believer: {
        child: ['REALLY?? THAT SOUNDS COOL', 'omg!!', 'when??', 'i hope youre right!', 'that would be awesome!!'],
        preteen: ['wait really?', 'when does that happen', 'how do you know', 'interesting'],
        teen: ['interesting', 'well see i guess', 'ok', 'maybe'],
        adult: ['interesting', 'well see', 'maybe', 'could be']
      },
      skeptic: {
        child: ['i dont believe you', 'youre making it up', 'thats not true'],
        preteen: ['ok sure', 'doubt it', 'well see', 'maybe'],
        teen: ['doubt it', 'sure', 'well see', 'ok'],
        adult: ['doubt it', 'sure', 'ok', 'well see']
      }
    }
  },
  
  // Iceberg tipping dialogue - timeline-aware based on rumor spread
  icebergTipping: {
    // March-April 2006: Iceberg just added, no rumors yet
    noRumor: {
      child: ['this place is cool', 'its slippery!', 'the iceberg!', 'so much ice'],
      preteen: ['cool iceberg', 'new area', 'nice'],
      teen: ['iceberg area', 'pretty cool', 'nice spot'],
      adult: ['cool iceberg', 'new area', 'nice spot']
    },
    // May-June 2006: Rumor beginning to surface
    earlyRumor: {
      child: ['i heard if we all stand on one side it tips!', 'can we tip it??', 'someone said it tips over!'],
      preteen: ['heard a rumor about tipping this', 'can this tip over?', 'someone said we can tip it'],
      teen: ['heard we can tip this', 'tipping rumor', 'can this actually tip'],
      adult: ['heard a tipping rumor', 'can this tip', 'someone said it tips']
    },
    // July-October 2006: Widespread tipping attempts
    widespreadRumor: {
      child: ['EVERYONE ON ONE SIDE', 'lets tip it!!', 'we need more people!', 'stand on this side!', 'TIP THE ICEBERG'],
      preteen: ['everyone on one side', 'lets tip this', 'we need more people', 'stand over here'],
      teen: ['lets try to tip it', 'everyone on one side', 'need more people', 'tip attempt'],
      adult: ['everyone on one side', 'lets tip this', 'need more people']
    },
    // September-October 2006: Hard hat rumor beginning
    hardHatRumorStart: {
      child: ['someone said we need hard hats!', 'hard hats only!', 'wear hard hats!', 'i heard you need a hard hat'],
      preteen: ['hard hat rumor', 'only hard hats work', 'need hard hats', 'heard about hard hats'],
      teen: ['hard hat thing', 'supposedly need hard hats', 'hard hat rumor'],
      adult: ['heard about hard hats', 'hard hat rumor', 'need hard hats']
    },
    // November 2006+: Widespread hard hat + dance belief
    hardHatDance: {
      child: ['HARD HATS AND DANCE!', 'everyone wear ONLY hard hat!', 'dance on this side!', 'HARD HAT ONLY!', 'we need to dance!'],
      preteen: ['hard hat and dance', 'only hard hat and dance', 'everyone dance', 'hard hat only'],
      teen: ['hard hat dance attempt', 'only hard hats', 'dance on one side', 'hard hat method'],
      adult: ['hard hat and dance', 'only hard hats', 'everyone dance']
    }
  }
};

// Easter egg item IDs
const EASTER_EGG_ITEMS = [452, 233]; // Viking Helmet, Red Electric Guitar

/**
 * Get iceberg tipping dialogue based on timeline
 */
function getIcebergDialogue(version: Version, age: BotAge): string[] {
  const messages: string[] = [];
  
  // Before iceberg exists (before March 29, 2006)
  if (isLower(version, '2006-03-29')) {
    return messages;
  }
  
  const dialogueAge = getDialogueAge(age);
  
  // March-April 2006: No rumors yet
  if (isGreaterOrEqual(version, '2006-03-29') && isLower(version, '2006-05-01')) {
    return DIALOGUE.icebergTipping.noRumor[dialogueAge];
  }
  
  // May-June 2006: Early rumor
  if (isGreaterOrEqual(version, '2006-05-01') && isLower(version, '2006-07-01')) {
    return DIALOGUE.icebergTipping.earlyRumor[dialogueAge];
  }
  
  // July-August 2006: Widespread basic rumor
  if (isGreaterOrEqual(version, '2006-07-01') && isLower(version, '2006-09-01')) {
    return DIALOGUE.icebergTipping.widespreadRumor[dialogueAge];
  }
  
  // September-October 2006: Hard hat rumor starting
  if (isGreaterOrEqual(version, '2006-09-01') && isLower(version, '2006-11-01')) {
    // Mix of widespread basic rumor and hard hat rumor
    return [...DIALOGUE.icebergTipping.widespreadRumor[dialogueAge], ...DIALOGUE.icebergTipping.hardHatRumorStart[dialogueAge]];
  }
  
  // November 2006+: Hard hat + dance widespread
  if (isGreaterOrEqual(version, '2006-11-01')) {
    return DIALOGUE.icebergTipping.hardHatDance[dialogueAge];
  }
  
  return messages;
}

/**
 * Get timeline-specific dialogue options based on version
 */
function getTimelineDialogue(version: Version, age: BotAge): string[] {
  const timelineMessages: string[] = [];
  
  // Map adult sub-groups to base age for timeline dialogue
  const dialogueAge = getDialogueAge(age);
  
  // Sport Shop opened (2005-11-03)
  if (isGreaterOrEqual(version, '2005-11-03') && isLower(version, '2005-11-15')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('new sport shop', 'sports shop is open', 'buying sports stuff', 'sport shop is cool');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('sport shop just opened', 'new shop at ski village', 'checking out sport shop');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('new sport shop opened', 'sports clothing shop');
    }
  }
  
  // Puffle Discovery - First Sightings (2005-11-15 to 2005-11-21)
  // Pink and blue puffles spotted at Snow Forts, Night Club, Ice Rink
  if (isGreaterOrEqual(version, '2005-11-15') && isLower(version, '2005-11-21')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('I SAW A FLUFFY THING', 'theres little creatures here', 'did you see that',
        'what was that fuzzy thing', 'something is moving around', 'i saw something pink',
        'blue fluffy thing', 'what are those', 'they are so cute', 'i want to catch one');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('did anyone see those creatures', 'fluffy things spotted', 'whats with the fuzzy creatures',
        'saw something weird moving', 'little creatures around', 'anyone else seeing things',
        'pink and blue creatures', 'what are they');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('anyone else seeing creatures', 'fluffy things wandering around',
        'saw some kind of creature', 'whats going on with these things', 'mysterious creatures');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('noticed some little creatures', 'seeing strange animals here', 'small creatures around',
        'what are these things', 'cute little creatures');
    }
  }
  
  // Puffle Discovery - Official Documentation (2005-11-21 to 2005-12-01)
  // Newspaper Issue #6: "little fluffy things" officially confirmed, black and green also spotted
  if (isGreaterOrEqual(version, '2005-11-21') && isLower(version, '2005-12-01')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('they caught one', 'the newspaper says they exist', 'little fluffy things are real',
        'they are friendly', 'i saw green ones too', 'black ones are cool', 'four types now',
        'the creatures are safe', 'can we keep them');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('newspaper confirmed the sightings', 'fluffy things are real', 'they captured one as proof',
        'green and black ones spotted too', 'four different types', 'they seem friendly',
        'what are they called', 'still no official name');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('newspaper documented the creatures', 'official confirmation now',
        'caught one as evidence', 'black and green types too', 'apparently friendly',
        'wonder what they are');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('newspaper confirmed they exist', 'so they are real after all',
        'four different colors now', 'they seem harmless', 'pretty cute actually');
    }
  }
  
  // Puffle Naming Contest (2005-12-01 to 2005-12-08)
  // Newspaper Issue #7: naming contest announced, 5000 coin prize
  if (isGreaterOrEqual(version, '2005-12-01') && isLower(version, '2005-12-08')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('naming contest', 'we get to name them', 'i submitted a name',
        'what should we call them', '5000 coins for the winner', 'i hope my name wins',
        'contest ends soon', 'thinking of names', 'what did you call them');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('naming contest is on', 'submitted my name idea', 'contest for 5000 coins',
        'what name did you submit', 'hope i win', 'naming the creatures',
        'contest deadline is dec 7', 'good prize for naming');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('naming competition', 'submitted an entry', '5000 coin prize',
        'contest ends december 7th', 'wonder what theyll be called');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('naming contest is interesting', 'submitted a name idea',
        'letting the community choose', 'nice prize for the winner');
    }
  }
  
  // Puffles Named (2005-12-08 onwards)
  // Newspaper Issue #8: Official name "Puffles" announced (winners: Yolam08, Wafflepye, Gronnie)
  if (isGreaterOrEqual(version, '2005-12-08') && isLower(version, '2005-12-20')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('they are called PUFFLES', 'puffles won', 'the name is puffles',
        'yolam08 won', 'wafflepye won too', 'gronnie also won', 'three winners got 5000 coins',
        'i like the name puffles', 'puffles is a good name', 'congrats to the winners');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('official name is puffles', 'puffles won the contest', 'three people won',
        'yolam08 wafflepye and gronnie', 'they each got 5000 coins', 'puffles is a cool name',
        'contest results are in', 'pretty good name choice');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('theyre called puffles now', 'puffles was the winning name',
        'three winners split the prize', 'not a bad name', 'puffles it is');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('so theyre called puffles', 'puffles is a good name',
        'three people won', 'nice choice by the community');
    }
  }
  
  // Pizza Parlor opened (2006-02-24)
  if (isGreaterOrEqual(version, '2006-02-24')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('lets go to the pizza place', 'i love pizza', 'pizza time');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('pizza parlor is cool', 'getting pizza', 'pizza party');
    }
  }
  
  // Puffles - General (only after Pet Shop opens on 2006-03-17)
  if (isGreaterOrEqual(version, '2006-03-17')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('got a puffle?', 'which puffle is best?', 'i love puffles',
        'how do i get a puffle?', 'whats a puffle?', 'where is the pet shop?', 'can i have a pet?');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('got a puffle?', 'which puffle is best?', 'puffle colors');
    }
  }
  
  // Pet Shop opened (2006-03-17) - NEW!
  if (isGreaterOrEqual(version, '2006-03-17') && isLower(version, '2006-04-01')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('OMG THE NEW PET SHOP', 'have you seen the pet shop', 'the pet shop is here!', 'i want a puffle so bad');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('new pet shop is sick', 'finally puffles', 'pet shop just opened', 'getting a puffle today');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('pet shop is actually cool', 'puffles are interesting', 'new pet shop opened');
    }
  }
  
  // Iceberg opened (2006-03-29) - NEW!
  if (isGreaterOrEqual(version, '2006-03-29') && isLower(version, '2006-04-15')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('THE ICEBERG IS HERE', 'have you been to the iceberg', 'lets go to iceberg', 'iceberg is so cool');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('iceberg just opened', 'anyone at the iceberg', 'new iceberg room', 'iceberg is epic');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('iceberg finally released', 'checking out the new iceberg', 'iceberg looks cool');
    }
  }
  
  // Iceberg exists (for questions)
  if (isGreaterOrEqual(version, '2006-03-29')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('how do you tip the iceberg', 'can the iceberg tip', 'whats the iceberg secret');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('anyone wanna go to the iceberg', 'hows the iceberg tip work', 'iceberg secrets?');
    }
  }
  
  // Find Four released (2006-04-27)
  if (isGreaterOrEqual(version, '2006-04-27') && isLower(version, '2006-05-15')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('find four is fun', 'wanna play find four', 'new game at lodge');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('find four tables are new', 'anyone play find four yet', 'new find four game');
    }
  }
  
  // Find Four exists
  if (isGreaterOrEqual(version, '2006-04-27')) {
    if (dialogueAge === 'preteen') {
      timelineMessages.push('wanna play find four');
    }
  }
  
  // PSA Missions (2006-08-18)
  if (isGreaterOrEqual(version, '2006-08-18') && isLower(version, '2006-09-10')) {
    if (dialogueAge === 'preteen') {
      timelineMessages.push('new PSA mission', 'secret agent mission', 'have you done the mission');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('PSA missions are cool', 'secret agent stuff', 'mission was fun');
    }
  }
  
  // Lighthouse opened (2006-09-21) - NEW!
  if (isGreaterOrEqual(version, '2006-09-21') && isLower(version, '2006-10-10')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('lighthouse is here', 'new lighthouse room', 'lighthouse is cool');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('lighthouse just opened', 'beacon and lighthouse are new', 'check out the lighthouse');
    }
  }
  
  // Disney Acquisition Announcement - First Week (2007-08-01 to 2007-08-08)
  if (isGreaterOrEqual(version, '2007-08-01') && isLower(version, '2007-08-08')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('DISNEY BOUGHT CLUB PENGUIN', 'disney owns this now', 'club penguin is disney now',
        'omg disney', 'this is gonna be so cool', 'disney is awesome', 'i cant believe disney bought this',
        'are we gonna see mickey mouse', 'disney club penguin');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('disney just bought club penguin', 'disney acquisition', 'disney owns this now',
        'club penguin is disney property now', 'huge news', 'disney deal just happened',
        'wonder what this means', 'big changes coming', 'disney money incoming');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('disney acquired club penguin', 'disney bought the game', 'acquisition just announced',
        'club penguin sold to disney', 'wonder if this is good or bad', 'disney has deep pockets',
        'hope they dont ruin it', 'could be interesting', 'big corporate buyout');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('disney bought club penguin', 'disney just acquired this',
        'big acquisition', 'interesting move', 'disney owns it now',
        'wonder where this is going', 'could be good or bad', 'big investment');
    }
  }
  
  // Disney Acquisition Uncertainty (2007-08-08 to 2007-11-01)
  if (isGreaterOrEqual(version, '2007-08-08') && isLower(version, '2007-11-01')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('whens disney gonna do stuff', 'is disney changing things', 'disney hasnt done much yet',
        'still waiting for disney stuff', 'wonder what disney will add');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('what is disney planning', 'wonder what changes are coming', 'disney been quiet',
        'havent seen many changes yet', 'waiting to see what disney does', 'hope disney doesnt mess it up',
        'concerned about disney changes', 'will disney keep it the same');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('whats disney gonna do with this', 'no major changes yet', 'disney playing it safe',
        'waiting for the other shoe to drop', 'hope they dont disney-fy it too much',
        'concerned about direction', 'cautiously optimistic', 'wait and see approach');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('waiting to see what disney does', 'not many changes yet',
        'transition period', 'keeping an eye on it', 'hope they keep it the same',
        'worried about commercialization', 'curious what their plan is');
    }
  }
  
  // Disney Budget Increase & Coins for Change Era (2007-11-01 to 2008-01-01)
  if (isGreaterOrEqual(version, '2007-11-01') && isLower(version, '2008-01-01')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('so much new stuff', 'disney is adding cool things', 'game is getting better',
        'more stuff than before', 'disney is doing good');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('budget increase is noticeable', 'lots of new content', 'disney money showing',
        'quality improvements', 'more updates than before', 'this is actually good so far',
        'still wonder about long term though');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('clear budget increase', 'production quality went up', 'disney money is real',
        'more polished updates', 'have to admit its improving', 'quality is noticeably better',
        'still concerned about future changes though', 'good so far but we will see');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('clear budget increase', 'production quality is better',
        'they spent more money on this', 'quality went up', 'looking good so far',
        'cautiously optimistic', 'well see how it goes');
    }
  }
  
  // Coins for Change (2007-12-15 to 2007-12-24)
  if (isGreaterOrEqual(version, '2007-12-15') && isLower(version, '2007-12-25')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('COINS FOR CHANGE', 'we can donate to charity', 'giving my coins to help people',
        'this is so cool', 'donating for real charity', 'helping with my coins',
        'coins go to real charities', 'which charity should i pick');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('coins for change is amazing', 'donating coins to charity', 'real world donations',
        'this is actually really cool', 'virtual coins to real money', 'great charity initiative',
        'which cause you donating to', 'disney did good with this');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('coins for change is impressive', 'virtual to real charity donations',
        'actually brilliant concept', 'using game coins for real good', 'which organization you picking',
        'disney nailed this', 'smart charitable initiative', 'this is genuinely good');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('great charity idea', 'coins for change is awesome', 'virtual coins to real charity',
        'really cool initiative', 'teaching kids about giving',
        'smart charity system', 'good use of game currency');
    }
  }
  
  // Early 2008 - Art Direction Shift (2008-01-01 to 2008-04-01)
  if (isGreaterOrEqual(version, '2008-01-01') && isLower(version, '2008-04-01')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('the art looks different', 'things look weird now', 'why does it look different',
        'i miss the old style', 'new art is strange');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('art style is changing', 'notice the different art direction', 'style is shifting',
        'not sure how i feel about new art', 'old style was better', 'art looks more corporate',
        'lots of new people working on it', 'feels different now');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('clear art direction shift', 'aesthetic is changing', 'not a fan of new style',
        'losing the original charm', 'feels more corporate now', 'can tell new people are working on it',
        'disney influence showing', 'preferred the old art', 'character is changing');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('art style changed', 'looks different now', 'new team working on it',
        'more corporate looking', 'losing the original feel', 'lot more people on the team',
        'disney influence showing', 'worried about the direction');
    }
  }
  
  // Aqua Grabber (2008-02-19)
  if (isGreaterOrEqual(version, '2008-02-19') && isLower(version, '2008-03-10')) {
    if (dialogueAge === 'preteen') {
      timelineMessages.push('aqua grabber is awesome', 'new aqua grabber game', 'anyone play aqua grabber yet');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('aqua grabber is pretty good', 'new game at the iceberg', 'aqua grabber just released');
    }
  }
  
  // Card-Jitsu (2008-11-17) - NEW!
  if (isGreaterOrEqual(version, '2008-11-17') && isLower(version, '2008-12-10')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('CARD JITSU IS HERE', 'have you played card jitsu', 'card jitsu is so cool', 'im gonna be a ninja');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('card jitsu just came out', 'new card jitsu game', 'dojo has card jitsu now', 'ninja training');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('card jitsu is actually good', 'new card game at dojo', 'card jitsu released', 'ninja path');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('card game is fun', 'card jitsu is cool', 'new dojo thing');
    }
  }
  
  // Card-Jitsu exists (after release)
  if (isGreaterOrEqual(version, '2008-11-17')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('wanna play card jitsu', 'card jitsu time');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('wanna play card jitsu', 'anyone at the dojo', 'card jitsu match?');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('card jitsu anyone', 'dojo?');
    }
  }
  
  // New Year's 2006 (December 29, 2005 - January 1, 2006)
  if (isGreaterOrEqual(version, '2005-12-29') && isLower(version, '2006-01-02')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('HAPPY NEW YEAR!!!', 'ITS 2006!!!', 'countdown was so exciting', 'fireworks everywhere!',
        '2005 was awesome', 'new year party time', 'year of the puffle?', 'cant wait for 2006!',
        'midnight countdown was fun', 'new year resolution: be happy!', 'happy new year everyone!',
        'best countdown ever!', 'fireworks lit up the sky!', 'what year is it now?', '2006 sounds cool!',
        'new year means new fun!', 'did you stay up late?', 'resolution: play more games!', 'yay 2006!',
        'party hats everywhere!', 'balloons and confetti!', 'new year dance party!', 'counting down was the best!');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('new years eve was epic!', 'countdown to 2006!', 'fireworks show was amazing',
        '2005 was pretty cool', 'new year party was fun', 'year of the puffle maybe?', 'excited for next year',
        'midnight fireworks rocked', 'new year resolution time', 'happy new year!',
        'best fireworks ive seen!', 'did you watch the countdown?', 'what was your resolution?', '2006 gonna be awesome!',
        'new year means new adventures!', 'stayed up till midnight', 'fireworks were spectacular!', 'party was lit!',
        'new years kiss?', 'resolution: be the best player!', 'cant believe its 2006 already!');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('new years countdown was cool', '2006 is here!', 'fireworks were nice',
        '2005 recap: pretty good year', 'new year party was okay', 'year of the puffle?', 'looking forward to 2006',
        'midnight countdown was fun', 'resolutions for next year', 'happy new year',
        'fireworks display was impressive', 'did you make resolutions?', 'what are you looking forward to?', '2006 predictions?',
        'new year fresh start', 'countdown was exciting', 'party had good vibes', 'resolution: level up more',
        'new year means new goals', 'fireworks were beautiful', 'celebration was nice');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('new year celebration was pleasant', '2006 has arrived', 'fireworks display was nice',
        'reflecting on 2005 positively', 'new year festivities enjoyable', 'year of the puffle perhaps',
        'anticipating 2006 developments', 'midnight fireworks were lovely', 'new year resolutions made',
        'festive atmosphere prevailed', 'did you watch the fireworks?', 'what resolutions did you make?', '2006 outlook positive',
        'new year brings new opportunities', 'countdown was well executed', 'celebration appropriately festive',
        'resolution: continued enjoyment', 'new year reflections complete', 'fireworks were spectacular');
    }
  }
  
  // Newspaper Issue #12 - January 5, 2006
  if (isGreaterOrEqual(version, '2006-01-05') && isLower(version, '2006-01-12')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('OMG NEW GAMES!!!', 'so many more games now!', 'puffles are getting awesome!',
        'more parties coming soon!', 'member rooms sound cool', 'new necklaces and shoes!', 'accessories are the best!',
        'check the newspaper now!', 'issue 12 is here!', 'more fun stuff everywhere!',
        'games games games!', 'puffle updates are cool!', 'parties make me happy!', 'member areas sound fun!',
        'bling bling accessories!', 'shoes are so pretty!', 'what new games are there?', 'puffles getting better?',
        'more parties please!', 'newspaper has secrets!', 'accessories for everyone!', 'games are my favorite!');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('newspaper has tons of new games!', 'puffles getting way better', 'more parties announced!',
        'members only areas opening', 'new accessories like necklaces!', 'shoes and cool clothing',
        'check out issue 12!', 'exciting updates!', 'game is growing fast!',
        'so many new games to try!', 'puffle features expanding!', 'party planning time!', 'members only is exclusive!',
        'accessories are trendy!', 'clothing updates are nice!', 'what games are new?', 'puffles need more stuff?',
        'more parties mean more fun!', 'newspaper is packed with news!', 'fashion updates!', 'game improvements!');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('newspaper issue 12 out!', 'tons of new games added!', 'puffle features expanding!',
        'more party events coming!', 'members only content!', 'new accessory items!', 'necklaces and shoes!',
        'good updates!', 'game growing fast!',
        'new game selection impressive!', 'puffle system upgrades!', 'party schedule filling up!', 'members exclusive areas!',
        'accessory catalog expanded!', 'clothing options increased!', 'which games are you trying?', 'puffle updates detailed?',
        'more events to attend!', 'newspaper well written!', 'style improvements!', 'development team working hard!');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('newspaper issue 12 released!', 'significant game expansion!', 'puffle system enhancements!',
        'increased party content!', 'members only areas!', 'new accessory catalog!', 'necklaces and footwear!',
        'positive development!', 'community growing!',
        'game portfolio substantially increased!', 'puffle mechanics refined!', 'party frequency elevated!', 'members exclusive zones!',
        'accessory inventory expanded!', 'clothing variety enhanced!', 'which new features appeal most?', 'puffle system analysis?',
        'event calendar enriched!', 'publication informative!', 'design improvements noted!', 'team productivity evident!');
    }
  }
  
  // Newspaper Issue #13 - January 12, 2006
  if (isGreaterOrEqual(version, '2006-01-12') && isLower(version, '2006-01-19')) {
    if (dialogueAge === 'child') {
      timelineMessages.push('poll says DOJO is the BEST!', 'night club is super popular!', 'coffee shop is awesome!',
        'ice rink is the WORST!', 'want puffle pet shop NOW!', 'swimming place would be FUN!',
        'more free stuff PLEASE!', 'birthday parties sound AMAZING!', 'check the poll results!',
        'over 100 players voted!', 'dojo got 31 votes!', 'night club second place!', 'coffee shop third!',
        'ice rink least favorite!', 'shops not popular!', 'puffle pet shop wanted!', 'swimming pool idea!',
        'free presents please!', 'easter eggs everywhere!', 'arcade building cool!', 'bank for coins?',
        'what did you vote for?', 'ice rink really worst?', 'puffles as pets!', 'more multiplayer!');
    } else if (dialogueAge === 'preteen') {
      timelineMessages.push('poll results are in issue 13!', 'most love dojo and night club!', 'coffee shop is totally popular!',
        'ice rink is the least favorite!', 'everyone wants puffle pet shop!', 'swimming area would be epic!',
        'more free items and secrets!', 'big arcade building sounds awesome!', 'multiplayer games needed!',
        '100+ players participated!', 'dojo dominated the poll!', 'night club close second!', 'lodge got votes too!',
        'ice rink unpopular!', 'shops need work!', 'pet shop for puffles!', 'swimming facility requested!',
        'free stuff and easter eggs!', 'mall shopping idea!', 'music in night club?', 'birthday celebrations!',
        'what was your favorite?', 'ice rink improvements?', 'puffle ownership!', 'more locations!');
    } else if (dialogueAge === 'teen') {
      timelineMessages.push('newspaper has player poll results!', 'dojo wins as favorite place!', 'night club second most popular!',
        'ice rink is least liked!', 'pet shop for puffles is top suggestion!', 'swimming location requested a lot!',
        'more free stuff and easter eggs wanted!', 'different night club music!', 'mall and bank suggestions!',
        'survey reached over 100 players!', 'dojo clear favorite!', 'night club social hub!', 'ski hill got votes!',
        'ice rink needs changes!', 'shops unpopular!', 'puffle pet system!', 'swimming area proposal!',
        'free content increase!', 'arcade entertainment!', 'banking features!', 'birthday party events!',
        'what place do you prefer?', 'ice rink improvements?', 'puffle companions!', 'expanded world!');
    } else if (dialogueAge === 'adult') {
      timelineMessages.push('issue 13 contains player poll results!', 'favorite places: dojo, night club, coffee shop!',
        'least favorite: ice rink, shops, dojo!', 'top suggestion: puffle pet shop!', 'more locations and games requested!',
        'swimming facility proposed!', 'increased free content desired!', 'arcade, bank, mall suggestions noted!',
        'comprehensive player survey!', 'dojo overwhelmingly popular!', 'night club social center!', 'lodge ski hill noted!',
        'ice rink requires attention!', 'shops need improvement!', 'puffle pet ownership!', 'aquatic facility suggestion!',
        'free item distribution!', 'entertainment complex!', 'financial institution!', 'celebration events!',
        'what location preferences?', 'ice rink enhancement?', 'puffle relationship system!', 'world expansion!');
    }
  }
  
  return timelineMessages;
}

/**
 * Get event-specific dialogue based on current date
 */
function getEventDialogue(version: Version, age: BotAge): string[] {
  const eventMessages: string[] = [];
  
  // Map adult sub-groups to base age for event dialogue
  const dialogueAge = getDialogueAge(age);
  
  // Beta Test Party (October 24, 2005)
  if (isGreaterOrEqual(version, '2005-10-24') && isLower(version, '2005-10-25')) {
    if (dialogueAge === 'child') {
      eventMessages.push('PARTY TIME', 'this party is awesome', 'best party ever', 'im at the party');
    } else if (dialogueAge === 'preteen') {
      eventMessages.push('beta party is epic', 'party is so fun', 'everyone is here', 'party hype');
    } else if (dialogueAge === 'teen') {
      eventMessages.push('beta party is cool', 'nice event', 'good turnout', 'party is fun');
    }
  }
  
  // Pizza Parlor Opening Party (February 24, 2006)
  if (isGreaterOrEqual(version, '2006-02-24') && isLower(version, '2006-02-25')) {
    if (dialogueAge === 'child') {
      eventMessages.push('PIZZA PARTY', 'pizza parlor opening', 'new pizza place', 'pizza celebration');
    } else if (dialogueAge === 'preteen') {
      eventMessages.push('pizza parlor grand opening', 'opening party', 'new building party');
    }
  }
  
  // Egg Hunt (April 12-23, 2006)
  if (isGreaterOrEqual(version, '2006-04-12') && isLower(version, '2006-04-24')) {
    if (dialogueAge === 'child') {
      eventMessages.push('EGG HUNT', 'finding eggs', 'where are the eggs', 'egg hunting time', 'found any eggs');
    } else if (dialogueAge === 'preteen') {
      eventMessages.push('egg hunt is on', 'hunting for eggs', 'anyone found eggs', 'egg locations');
    } else if (dialogueAge === 'teen') {
      eventMessages.push('egg hunt event', 'looking for eggs', 'egg hunt challenge');
    }
  }
  
  // Mine Opening and Cave Party (May 25-26, 2006)
  if (isGreaterOrEqual(version, '2006-05-25') && isLower(version, '2006-05-27')) {
    if (dialogueAge === 'child') {
      eventMessages.push('the cave opened', 'new cave', 'cave party', 'cave is cool');
    } else if (dialogueAge === 'preteen') {
      eventMessages.push('cave grand opening', 'new mine area', 'exploring the cave');
    }
  }
  
  // Summer Party (June 22 - July 5, 2006)
  if (isGreaterOrEqual(version, '2006-06-22') && isLower(version, '2006-07-06')) {
    if (dialogueAge === 'child') {
      eventMessages.push('SUMMER PARTY', 'summer is here', 'beach party', 'summer fun');
    } else if (dialogueAge === 'preteen') {
      eventMessages.push('summer party time', 'beach party is on', 'summer event');
    } else if (dialogueAge === 'teen') {
      eventMessages.push('summer party', 'beach event', 'summer celebration');
    }
  }
  
  // Sports Party (August 17-28, 2006)
  if (isGreaterOrEqual(version, '2006-08-17') && isLower(version, '2006-08-29')) {
    if (dialogueAge === 'child') {
      eventMessages.push('SPORT PARTY', 'sports event', 'playing sports', 'sports are fun');
    } else if (dialogueAge === 'preteen') {
      eventMessages.push('sport party is cool', 'sports competition', 'sport event');
    }
  }
  
  // Lighthouse and Beacon Party (September 21 - October 4, 2006)
  if (isGreaterOrEqual(version, '2006-09-21') && isLower(version, '2006-10-05')) {
    if (dialogueAge === 'child') {
      eventMessages.push('lighthouse party', 'new lighthouse', 'party at lighthouse', 'beacon party');
    } else if (dialogueAge === 'preteen') {
      eventMessages.push('lighthouse grand opening', 'beacon and lighthouse party', 'new area party');
    }
  }
  
  // Halloween Party (October 19 - November 2, 2006)
  if (isGreaterOrEqual(version, '2006-10-19') && isLower(version, '2006-11-03')) {
    if (dialogueAge === 'child') {
      eventMessages.push('HALLOWEEN', 'spooky time', 'halloween party', 'trick or treat', 'scary decorations');
    } else if (dialogueAge === 'preteen') {
      eventMessages.push('halloween event', 'spooky party', 'halloween is here', 'haunted party');
    } else if (dialogueAge === 'teen') {
      eventMessages.push('halloween party', 'spooky decorations', 'halloween event');
    }
  }
  
  // Christmas/Holiday Parties (2005 & 2006)
  if ((isGreaterOrEqual(version, '2005-12-16') && isLower(version, '2005-12-26')) ||
      (isGreaterOrEqual(version, '2006-12-21') && isLower(version, '2007-01-03'))) {
    if (dialogueAge === 'child') {
      eventMessages.push('CHRISTMAS', 'holiday party', 'merry christmas', 'santa is here', 'christmas decorations');
    } else if (dialogueAge === 'preteen') {
      eventMessages.push('christmas party', 'holiday event', 'merry christmas', 'festive decorations');
    } else if (dialogueAge === 'teen') {
      eventMessages.push('christmas event', 'holiday party', 'festive season');
    } else if (dialogueAge === 'adult') {
      eventMessages.push('holiday event', 'christmas celebration', 'festive decorations');
    }
  }
  
  // Card-Jitsu Release Party (November 17-24, 2008)
  if (isGreaterOrEqual(version, '2008-11-17') && isLower(version, '2008-11-25')) {
    if (dialogueAge === 'child') {
      eventMessages.push('CARD JITSU PARTY', 'dojo party', 'ninja party', 'card jitsu event');
    } else if (dialogueAge === 'preteen') {
      eventMessages.push('card jitsu launch party', 'dojo celebration', 'ninja event');
    } else if (dialogueAge === 'teen') {
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
    const dialogueAge = getDialogueAge(age);
    if (dialogueAge === 'teen' || dialogueAge === 'adult') {
      const messages = DIALOGUE.betaDefense[dialogueAge];
      return messages[randomInt(0, messages.length - 1)];
    }
    return null;
  }
  
  if (context === 'beta' && behavior.hasBetaHat) {
    const dialogueAge = getDialogueAge(age);
    const messages = DIALOGUE.beta[dialogueAge];
    if (messages) {
      return messages[randomInt(0, messages.length - 1)];
    }
  }
  
  if (context === 'betaHat') {
    const dialogueAge = getDialogueAge(age);
    const messages = DIALOGUE.betaHat[dialogueAge];
    return messages[randomInt(0, messages.length - 1)];
  }
  
  if (context === 'easterEgg') {
    const dialogueAge = getDialogueAge(age);
    const messages = DIALOGUE.easterEgg[dialogueAge];
    if (messages) {
      return messages[randomInt(0, messages.length - 1)];
    }
  }
  
  // General chat with timeline awareness
  const dialogueAge = getDialogueAge(age);
  const ageDialogue = DIALOGUE[dialogueAge];
  const baseMessages = [...ageDialogue.greetings, ...ageDialogue.general, ...ageDialogue.questions];
  
  // Add timeline-specific messages
  const version = bot.server.settings.version;
  const timelineMessages = getTimelineDialogue(version, age);
  const eventMessages = getEventDialogue(version, age);
  
  // Add non-member dialogue if applicable
  const nonMemberMessages: string[] = [];
  if (behavior.isNonMember && Math.random() < 0.3) {
    const nmDialogue = DIALOGUE.nonMember[dialogueAge];
    if (nmDialogue) {
      nonMemberMessages.push(...nmDialogue);
    }
  }
  
  // Add iceberg-specific dialogue if at iceberg
  const icebergMessages: string[] = [];
  if (bot.room && bot.room.id === ROOM_IDS.ICEBERG) {
    icebergMessages.push(...getIcebergDialogue(version, age));
  }
  
  const allMessages = [...baseMessages, ...timelineMessages, ...eventMessages, ...nonMemberMessages, ...icebergMessages];
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
    if (penguin.room !== room) {
      continue;
    }
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
    
    // Inappropriate username detection
    const realPlayers = room.players.filter((p: Client) => !p.isBot);
    for (const player of realPlayers) {
      if (isInappropriateUsername(player.username) && Math.random() < 0.2) {
        const dialogueAge = getDialogueAge(behavior.age);
        const reactions = DIALOGUE.inappropriateUsername[dialogueAge];
        if (reactions) {
          const reaction = reactions[randomInt(0, reactions.length - 1)];
          botSendChat(bot, reaction);
          return;
        }
      }
    }
    
    // Easter egg: Detect if party hat player is near party hat bot (beta begging beta)
    if (bot.penguin.head === 413) {
      for (const player of realPlayers) {
        if (player.penguin.head === 413) {
          const distance = Math.sqrt(
            Math.pow(player.x - bot.x, 2) + Math.pow(player.y - bot.y, 2)
          );
          // If party hat player is close (within 150 pixels) and bot is not already chatting
          if (distance < 150 && Math.random() < 0.3) {
            const dialogueAge = getDialogueAge(behavior.age);
            const reactions = DIALOGUE.betaBeggingBeta[dialogueAge];
            if (reactions) {
              const reaction = reactions[randomInt(0, reactions.length - 1)];
              botSendChat(bot, reaction);
              return;
            }
          }
        }
      }
    }
    
    // Easter egg: Beta testers react to seeing another beta tester being mobbed
    if (bot.penguin.head === 413 && Math.random() < 0.15) {
      // Find OTHER party hat wearers (both bots and players, but not ourselves)
      const otherBetaTesters: Client[] = [
        ...room.botGroup.bots.filter((b: Client) => b.penguin.head === 413 && b !== bot),
        ...realPlayers.filter((p: Client) => p.penguin.head === 413)
      ];
      
      for (const otherBeta of otherBetaTesters) {
        // Count how many kids are swarming the other beta tester
        const swarmingKids = room.botGroup.bots.filter((b: Client) => {
          const bBehavior = botBehaviors.get(b);
          if (!bBehavior) return false;
          if (bBehavior.age !== 'child' && bBehavior.age !== 'preteen') return false;
          const dist = Math.sqrt(
            Math.pow(otherBeta.x - b.x, 2) + Math.pow(otherBeta.y - b.y, 2)
          );
          return dist < 150;
        }).length;
        
        // If other beta tester has 3+ kids mobbing them, comment on it
        if (swarmingKids >= 3) {
          const dialogueAge = getDialogueAge(behavior.age);
          const reactions = DIALOGUE.betaWatchingMob[dialogueAge];
          if (reactions) {
            const reaction = reactions[randomInt(0, reactions.length - 1)];
            botSendChat(bot, reaction);
            return;
          }
        }
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
  let partyHatTarget: Client | null = null;
  
  const attractionInterval = setInterval(() => {
    if (bot.room !== room) {
      partyHatTarget = null;
      clearInterval(attractionInterval);
      return;
    }
    
    // Find ALL players or bots with a party hat (head item ID 413)
    const partyHatWearers = room.players.filter((p: Client) => p.penguin.head === 413);
    
    // Check if current target is still valid (still tracked in room, in room, still has hat)
    const targetStillPresent = partyHatTarget ? partyHatWearers.some((p: Client) => p === partyHatTarget) : false;
    if (partyHatTarget && (!targetStillPresent || partyHatTarget.room !== room || partyHatTarget.penguin.head !== 413)) {
      partyHatTarget = null;
    }
    
    // If we don't have a target, pick the closest party hat wearer
    if (!partyHatTarget && partyHatWearers.length > 0) {
      let closestDistance = Infinity;
      
      for (const target of partyHatWearers) {
        const distance = Math.sqrt(
          Math.pow(target.x - bot.x, 2) + Math.pow(target.y - bot.y, 2)
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          partyHatTarget = target;
        }
      }
    }
    
    // Swarm the target!
    if (partyHatTarget && partyHatTarget.room === room) {
      const distance = Math.sqrt(
        Math.pow(partyHatTarget.x - bot.x, 2) + Math.pow(partyHatTarget.y - bot.y, 2)
      );
      
      // Kids get VERY close (50-80 pixels), preteens slightly less close (80-120 pixels)
      const minDistance = age === 'child' ? 50 : 80;
      const maxDistance = age === 'child' ? 80 : 120;
      
      if (distance > maxDistance) {
        // Move closer with some randomness
        const angle = Math.atan2(partyHatTarget.y - bot.y, partyHatTarget.x - bot.x);
        const targetDistance = randomInt(minDistance, maxDistance);
        const newX = partyHatTarget.x - Math.cos(angle) * targetDistance + randomInt(-20, 20);
        const newY = partyHatTarget.y - Math.sin(angle) * targetDistance + randomInt(-20, 20);
        
        bot.setPosition(
          Math.max(100, Math.min(700, newX)),
          Math.max(100, Math.min(500, newY))
        );
      }
      
      // Spam beta hat chat when close
      if (distance < 150 && Math.random() < 0.4) {
        const message = getBotChatMessage(bot, 'betaHat', room);
        if (message) {
          botSendChat(bot, message);
        }
      }
    }
  }, 1500); // Check frequently (every 1.5 seconds)
  
  intervals.push(attractionInterval);
  
  // Snowball throwing behavior - occasionally throw snowballs at the beta tester
  const snowballInterval = setInterval(() => {
    if (bot.room !== room) {
      clearInterval(snowballInterval);
      return;
    }
    
    if (!partyHatTarget) {
      return;
    }

    const targetStillPresent = room.players.some((p: Client) => p === partyHatTarget && p.penguin.head === 413);
    if (!targetStillPresent || partyHatTarget.room !== room) {
      partyHatTarget = null;
      return;
    }

    const distance = Math.sqrt(
      Math.pow(partyHatTarget.x - bot.x, 2) + Math.pow(partyHatTarget.y - bot.y, 2)
    );
    
    // Only throw if close enough (within 200 pixels)
    if (distance < 200) {
      // 30% chance to throw a snowball
      if (Math.random() < 0.3) {
        bot.throwSnowball(String(partyHatTarget.x), String(partyHatTarget.y));
        
        // Occasionally throw multiple snowballs in rapid succession (10% chance)
        if (Math.random() < 0.1) {
          setTimeout(() => {
            if (bot.room === room && partyHatTarget && partyHatTarget.room === room) {
              bot.throwSnowball(String(partyHatTarget.x), String(partyHatTarget.y));
            }
          }, 400);
          
          setTimeout(() => {
            if (bot.room === room && partyHatTarget && partyHatTarget.room === room) {
              bot.throwSnowball(String(partyHatTarget.x), String(partyHatTarget.y));
            }
          }, 800);
        }
      }
    }
  }, 2500); // Check every 2.5 seconds
  
  intervals.push(snowballInterval);
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

/**
 * Apply special iceberg tipping behavior based on timeline
 */
function applyIcebergTippingBehavior(bot: Client, room: any, intervals: NodeJS.Timeout[]) {
  if (room.id !== ROOM_IDS.ICEBERG) return;
  
  const version = bot.server.settings.version;
  const behavior = botBehaviors.get(bot);
  if (!behavior) return;
  
  // Before May 2006, no special behavior
  if (isLower(version, '2006-05-01')) {
    return;
  }
  
  // May 2006+: Bots try to coordinate tipping
  const tippingInterval = setInterval(() => {
    if (bot.room === room) {
      // Cluster on right side of iceberg (x > 400)
      if (Math.random() < 0.7) {
        bot.setPosition(randomInt(450, 650), randomInt(200, 400));
      }
      
      // Hard hat + dance phase (November 2006+)
      if (isGreaterOrEqual(version, '2006-11-01')) {
        // 40% of bots participate in hard hat dancing
        if (Math.random() < 0.4) {
          // Try to wear only hard hat (item 403)
          // In a real implementation, this would change bot appearance
          // For now, just make them dance
          if (behavior.personality === 'dancer' || Math.random() < 0.5) {
            bot.setFrame(26); // Dance
            setTimeout(() => {
              if (bot.room === room) bot.setFrame(1);
            }, 4000);
          }
        }
      }
    } else {
      clearInterval(tippingInterval);
    }
  }, randomInt(5000, 12000));
  
  intervals.push(tippingInterval);
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
const STREET_TYPES = [
  'street', 'st', 'road', 'rd', 'lane', 'ln', 'avenue', 'ave', 'drive', 'dr', 'court', 'ct',
  'boulevard', 'blvd', 'parkway', 'pkwy', 'circle', 'cir', 'place', 'pl', 'trail', 'trl',
  'way', 'terrace', 'ter', 'square', 'sq', 'highway', 'hwy', 'row', 'crescent', 'cres', 'alley'
];

const ADDRESS_TRIGGERS = [
  'i live at', 'i live on', 'i live in', 'i am at', 'come to', 'visit me at', 'my address',
  'address is', 'house is at', 'house at', 'meet me at', 'come over to'
];

const SCHOOL_TERMS = [
  'elementary', 'middle school', 'junior high', 'high school', 'secondary school', 'academy',
  'prep school', 'primary school', 'school', 'college', 'university', 'campus'
];

const STATE_OR_CITY_NAMES = [
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware',
  'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky',
  'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
  'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico',
  'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania',
  'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont',
  'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming',
  'ontario', 'quebec', 'british columbia', 'alberta', 'manitoba', 'saskatchewan', 'nova scotia',
  'new brunswick', 'newfoundland', 'labrador', 'prince edward island', 'pei', 'yukon', 'nunavut',
  'northwest territories',
  'new south wales', 'victoria', 'queensland', 'south australia', 'western australia', 'tasmania',
  'northern territory', 'australian capital territory',
  'new york city', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio',
  'san diego', 'dallas', 'san jose', 'austin', 'jacksonville', 'san francisco', 'seattle',
  'denver', 'miami', 'boston', 'atlanta', 'orlando', 'detroit', 'minneapolis', 'st paul',
  'toronto', 'vancouver', 'montreal', 'ottawa', 'winnipeg', 'calgary', 'edmonton',
  'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra',
  'auckland', 'wellington', 'christchurch',
  'london', 'manchester', 'birmingham', 'liverpool', 'leeds', 'glasgow', 'edinburgh',
  'dublin', 'belfast', 'paris'
];

const LOCATION_INDICATORS = [
  'live in', 'live at', 'living in', 'from', 'stay in', 'stay at', 'moving to', 'relocating to',
  'based in', 'visiting', 'grew up in'
];

function normalizeForFilter(input: string): string {
  return input
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|l]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7+]/g, 't')
    .replace(/[2]/g, 'z')
    .replace(/[8]/g, 'b')
    .replace(/[69]/g, 'g')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsPersonalInfo(originalMessage: string, normalizedMessage: string): boolean {
  const lowerMessage = originalMessage.toLowerCase();

  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  if (emailRegex.test(originalMessage)) {
    return true;
  }

  if (/\b\d{6,}\b/.test(originalMessage)) {
    return true;
  }

  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(originalMessage)) {
    return true;
  }

  const digitsOnly = originalMessage.replace(/\D/g, '');
  if (digitsOnly.length >= 6) {
    return true;
  }

  const phoneContextRegex = /\b(phone|call|text|cell|mobile|number|contact|reach|dm|pm|message|hit me up|hmu)\b/;
  if (digitsOnly.length >= 7 && phoneContextRegex.test(normalizedMessage)) {
    return true;
  }

  if (ADDRESS_TRIGGERS.some(phrase => lowerMessage.includes(phrase)) && STREET_TYPES.some(type => new RegExp(`\\b${type}\\b`).test(lowerMessage))) {
    return true;
  }

  if (STREET_TYPES.some(type => new RegExp(`\\b[a-z0-9]+\\s+${type}\\b`).test(lowerMessage))) {
    return true;
  }

  if (/\b(i[' ]?m|i am|im)\s+[a-z0-9-]+\s*(years? old|yrs? old)\b/.test(lowerMessage)) {
    return true;
  }

  const addressWithNumberRegex = new RegExp(`\\b\\d{1,4}\\s+(?:[a-z]+\\s){0,3}(?:${STREET_TYPES.join('|')})\\b`, 'i');
  if (addressWithNumberRegex.test(originalMessage)) {
    return true;
  }

  if (SCHOOL_TERMS.some(term => new RegExp(`\\b(?:my|the|at|from|in)\\s+(?:[a-z0-9'\\-\\s]+)?${term}\\b`, 'i').test(originalMessage))) {
    return true;
  }

  const locationMatch = LOCATION_INDICATORS.some(indicator => lowerMessage.includes(indicator));
  if (locationMatch) {
    const indicatorIndex = LOCATION_INDICATORS.find(indicator => lowerMessage.includes(indicator));
    if (indicatorIndex) {
      const indicator = indicatorIndex;
      const segment = lowerMessage.split(indicator).pop() ?? '';
      if (segment) {
        const firstWords = segment.trim().split(/[^a-z]+/).slice(0, 3);
        const candidate = firstWords.filter(Boolean).join(' ').trim();
        for (const name of STATE_OR_CITY_NAMES) {
          if (candidate.startsWith(name)) {
            return true;
          }
        }
      }
    }
  }

  for (const name of STATE_OR_CITY_NAMES) {
    if (new RegExp(`\\b${name}\\b`).test(lowerMessage)) {
      const locationContext = /(\blive\b|\bfrom\b|\bin\b|\bat\b|\bgoing to\b|\bheaded to\b)/;
      if (locationContext.test(lowerMessage)) {
        return true;
      }
    }
  }

  const contactHandleRegex = /(discord|skype|snapchat|instagram|insta|kik|aim|msn|icq|email)\b/;
  if (contactHandleRegex.test(normalizedMessage) && /[:@#]/.test(originalMessage)) {
    return true;
  }

  return false;
}

function isSuperVulgar(message: string): boolean {
  const superVulgarPhrases = [
    'kill yourself', 'kys', 'fuck off cunt', 'fucking cunt',
    'fuck you cunt', 'kill urself', 'die', 'fucking kill',
    'fuck off bitch', 'fucking bitch', 'cunt', 'fucking die',
    'nigger', 'faggot', 'spick', 'chink', 'cum', 'rape', 'rapist',
    'pedo', 'molest'
  ];
  
  const lowerMessage = message.toLowerCase();
  const normalizedMessage = normalizeForFilter(message);
  return superVulgarPhrases.some(phrase => lowerMessage.includes(phrase) || normalizedMessage.includes(phrase));
}

/**
 * Check if a username is inappropriate
 */
export function isInappropriateUsername(username: string | undefined): boolean {
  if (!username) return false;
  
  const inappropriateWords = [
    'fuck', 'shit', 'asshole', 'bitch', 'cocks', 'pussy', 'cunt',
    'nigger', 'nigga', 'faggot', 'retard', 'rape', 'sex',
    'porn', 'xxx', 'penis', 'vagina', 'slut', 'whore',
    'piss', 'damn', 'hell', 'bastard', 'twat', 'dildo',
    'anal', 'hitler', 'nazi', 'kkk', 'kill', 'death', 'die',
    'suicide', 'pedo', 'molest', 'slave', 'gay', 'homo', 'rape',
    'rapist', 'pedo'
  ];
  
  const lowerUsername = username.toLowerCase();
  const normalizedUsername = normalizeForFilter(username);
  return inappropriateWords.some(word => lowerUsername.includes(word) || normalizedUsername.includes(word));
}

/**
 * Check if a message is begging for coins/items
 */
function isBeggingMessage(message: string): boolean {
  const beggingPhrases = [
    'give me coins', 'can i have coins', 'pls coins', 'plz coins',
    'free coins', 'gimme coins', 'spare coins', 'coins pls', 'coins plz',
    'give coins', 'need coins', 'want coins', 'donate', 'im poor',
    'can i have', 'give me', 'pls give', 'plz give', 'hook me up'
  ];
  
  const lowerMessage = message.toLowerCase();
  return beggingPhrases.some(phrase => lowerMessage.includes(phrase));
}

/**
 * Check if message is asking about the developer
 */
function isDeveloperQuestion(message: string): boolean {
  const developerQuestions = [
    'who made this', 'who develops this', 'who created this',
    'who owns this', 'who made the game', 'who created the game',
    'who developed this', 'whos the owner', 'who runs this',
    'company background', 'who made it', 'whos behind this'
  ];
  
  const lowerMessage = message.toLowerCase();
  return developerQuestions.some(phrase => lowerMessage.includes(phrase));
}

/**
 * Detect conversation message type
 */
function detectMessageType(message: string): 'greeting' | 'question' | 'thanks' | 'goodbye' | 'followup' | 'compliment' | 'insult' | 'excitement' | 'confusion' | 'agreement' | 'disagreement' | 'laugh' | 'profanity' | 'extremeProfanity' | null {
  const lowerMessage = message.toLowerCase();
  const normalizedMessage = normalizeForFilter(message);
  
  // Extreme profanity / slurs (check first, highest priority)
  if (/\b(nigger|niggers|nigga|niggaz|niggar|faggot|faggots|fag|fags|retard|retards|retarded|kys|kill yourself|cunt|cunts|bitch|bitches|chink|chinks|gook|gooks|spic|spics|kike|kikes|wop|wops|dago|dagos|jap|japs|homo|homos|homo's|homosexual|homosexuals|niggerfaggot|niggerfaggots|cocksucker|cocksuckers|rape|rapes|raped|raping|rapist|rapists|pedo|pedos|pedophile|pedophiles|ped0|ped0phile|p3do|p3d0|p3d0phile|child molester|child molesters|molesters|molester|molestor|molestors|molested|molesting|molest|bomb threat|bomb threats|jihad|jihadist|terrorist|terrorists|gas chamber|gas chambers|oven|ovens|final solution|hang yourself|hang yoself|shoot yourself|shoot yoself|jump off a bridge|incest|bestiality|necrophilia|heroin|meth|crack|cocaine|pedobear|child porn|child pornography|loli|lolicon|shota|shotacon|hentai rape|dark web|deep web|hitler|hitlers|swastika|swastikas|nazi|nazis|kkk|lynch|slave|slaves|plantation|plantations|n1gger|n1ggers|n1gga|n1ggaz|nvgger|nvgger|nvggers|f@g|f@gs|r3tard|r3tards|b1tch|b1tches|cuntz|faggit|faggits|retardid|retardz|touch kids|touched kids|touching kids|touches kids|touch children|touching children|touch little kids|touch little children|kid toucher|kid touchers|kids toucher|child rape|child rapes|child raped|child raping|child rapist|child rapists|child raper|child rapers|child rapper|cumdump|cumdumpster|cum dumpsters|cumdumpsters|cum dumpster|czmdzmpster)\b/.test(lowerMessage) ||
      /\b(nigger|niggers|nigga|niggaz|niggar|faggot|faggots|fag|fags|retard|retards|retarded|kys|kill yourself|cunt|cunts|bitch|bitches|chink|chinks|gook|gooks|spic|spics|kike|kikes|wop|wops|dago|dagos|jap|japs|homo|homos|homo's|homosexual|homosexuals|niggerfaggot|niggerfaggots|cocksucker|cocksuckers|rape|rapes|raped|raping|rapist|rapists|pedo|pedos|pedophile|pedophiles|ped0|ped0phile|p3do|p3d0|p3d0phile|child molester|child molesters|molesters|molester|molestor|molestors|molested|molesting|molest|bomb threat|bomb threats|jihad|jihadist|terrorist|terrorists|gas chamber|gas chambers|oven|ovens|final solution|hang yourself|hang yoself|shoot yourself|shoot yoself|jump off a bridge|incest|bestiality|necrophilia|heroin|meth|crack|cocaine|pedobear|child porn|child pornography|loli|lolicon|shota|shotacon|hentai rape|dark web|deep web|hitler|hitlers|swastika|swastikas|nazi|nazis|kkk|lynch|slave|slaves|plantation|plantations|n1gger|n1ggers|n1gga|n1ggaz|nvgger|nvgger|nvggers|f@g|f@gs|r3tard|r3tards|b1tch|b1tches|cuntz|faggit|faggits|retardid|retardz|touch kids|touched kids|touching kids|touches kids|touch children|touching children|touch little kids|touch little children|kid toucher|kid touchers|kids toucher|child rape|child rapes|child raped|child raping|child rapist|child rapists|child raper|child rapers|child rapper|cumdump|cumdumpster|cum dumpsters|cumdumpsters|cum dumpster|czmdzmpster)\b/.test(normalizedMessage)) {
    return 'extremeProfanity';
  }
  
  // Regular profanity
  if (/\b(fuck|fucking|fucked|shit|shitting|damn|damned|ass|asshole|hell|bastard|dick|cock|pussy)\b/.test(lowerMessage)) {
    return 'profanity';
  }
  
  // Greetings
  if (/\b(hi|hello|hey|sup|yo|hiya|greetings|morning|afternoon|evening)\b/.test(lowerMessage)) {
    return 'greeting';
  }
  
  // Thanks
  if (/\b(thanks|thank you|thx|ty|tysm|appreciate)\b/.test(lowerMessage)) {
    return 'thanks';
  }
  
  // Goodbyes
  if (/\b(bye|goodbye|cya|see ya|later|gtg|gotta go|peace|farewell)\b/.test(lowerMessage)) {
    return 'goodbye';
  }
  
  // Laughter
  if (/\b(lol|lmao|lmfao|rofl|haha|hehe|lulz|xd)\b/.test(lowerMessage)) {
    return 'laugh';
  }
  
  // Excitement (must come before followup since it shares some keywords)
  if (/\b(omg|wow|awesome|amazing|epic|sick|dope|insane|crazy|incredible|yay|woohoo|yess|yasss)\b/.test(lowerMessage) || /!{2,}/.test(message)) {
    return 'excitement';
  }
  
  // Compliments
  if (/\b(nice|cool outfit|good job|well done|great|love your|you rock|youre great|youre awesome|youre the best)\b/.test(lowerMessage)) {
    return 'compliment';
  }
  
  // Insults
  if (/\b(stupid|dumb|idiot|loser|trash|terrible|suck|bad|worst|hate you|annoying|ugly)\b/.test(lowerMessage)) {
    return 'insult';
  }
  
  // Confusion
  if (/\b(confused|dont understand|dont get it|what does that mean|explain|unclear|huh|wdym)\b/.test(lowerMessage) || /\?\?+/.test(message)) {
    return 'confusion';
  }
  
  // Agreement
  if (/\b(i agree|me too|same here|exactly|true|facts|for real|fr|totally|absolutely|definitely)\b/.test(lowerMessage)) {
    return 'agreement';
  }
  
  // Disagreement
  if (/\b(disagree|i dont think|not really|nah|nope|false|wrong|incorrect|not true)\b/.test(lowerMessage)) {
    return 'disagreement';
  }
  
  // Questions (ending with ? or starting with who/what/where/when/why/how)
  if (message.includes('?') || /^(who|what|where|when|why|how|is|are|do|does|can|could|would)\b/i.test(lowerMessage)) {
    return 'question';
  }
  
  // Generic followup (last priority since most general)
  if (/\b(yeah|yep|yes|no|ok|okay|cool|nice|alright|sure|maybe)\b/.test(lowerMessage)) {
    return 'followup';
  }
  
  return null;
}

/**
 * Check if message matches a specific phrase
 */
function matchSpecificPhrase(message: string): keyof typeof DIALOGUE.specificPhrases | null {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check each specific phrase
  const phrases = Object.keys(DIALOGUE.specificPhrases) as Array<keyof typeof DIALOGUE.specificPhrases>;
  for (const phrase of phrases) {
    if (lowerMessage.includes(phrase)) {
      return phrase;
    }
  }
  
  return null;
}

/**
 * Check if message mentions timeline-aware features
 */
function matchTimelineAwarePhrase(message: string): keyof typeof DIALOGUE.timelineAware | null {
  const lowerMessage = message.toLowerCase().trim();
  
  const phrases = Object.keys(DIALOGUE.timelineAware) as Array<keyof typeof DIALOGUE.timelineAware>;
  for (const phrase of phrases) {
    if (lowerMessage.includes(phrase)) {
      return phrase;
    }
  }
  
  return null;
}

/**
 * Check if message is a time traveler claim or prediction
 */
function detectTimeTraveler(message: string): 'claim' | 'prediction' | null {
  const lowerMessage = message.toLowerCase();
  
  // Time traveler claim
  if (/\b(im from the future|i am from the future|im a time traveler|im a time traveller|time traveler here|from the future)\b/.test(lowerMessage)) {
    return 'claim';
  }
  
  // Future prediction (phrases like "disney will buy this", "card jitsu will be released", "in the future")
  if (/\b(will happen|will be|gonna happen|is coming|in the future|mark my words|you'll see|wait and see|trust me)\b/.test(lowerMessage)) {
    // Only count as prediction if they mention future events
    if (/\b(disney|card jitsu|aqua grabber|dojo|ninja|update|feature|party|event)\b/.test(lowerMessage)) {
      return 'prediction';
    }
  }
  
  return null;
}

/**
 * Get timeline-aware response based on version
 */
function getTimelineAwareResponse(
  phrase: keyof typeof DIALOGUE.timelineAware, 
  version: Version, 
  age: BotAge
): string | null {
  // Check timeline for each feature
  const dialogueAge = getDialogueAge(age);
  
  if (phrase === 'disney') {
    const data = DIALOGUE.timelineAware['disney'];
    const responses = isGreaterOrEqual(version, '2007-08-01') 
      ? data.postAcquisition[dialogueAge] 
      : data.preAcquisition[dialogueAge];
    return responses[randomInt(0, responses.length - 1)];
  }
  
  if (phrase === 'card jitsu') {
    const data = DIALOGUE.timelineAware['card jitsu'];
    const responses = isGreaterOrEqual(version, '2008-11-17') 
      ? data.afterRelease[dialogueAge] 
      : data.beforeRelease[dialogueAge];
    return responses[randomInt(0, responses.length - 1)];
  }
  
  if (phrase === 'aqua grabber') {
    const data = DIALOGUE.timelineAware['aqua grabber'];
    const responses = isGreaterOrEqual(version, '2008-02-19') 
      ? data.afterRelease[dialogueAge] 
      : data.beforeRelease[dialogueAge];
    return responses[randomInt(0, responses.length - 1)];
  }
  
  if (phrase === 'dojo') {
    const data = DIALOGUE.timelineAware['dojo'];
    // Dojo existed from launch but was secret until Nov-Dec 2005
    const responses = isGreaterOrEqual(version, '2005-11-01') 
      ? data.afterRelease[dialogueAge] 
      : data.beforeRelease[dialogueAge];
    return responses[randomInt(0, responses.length - 1)];
  }
  
  if (phrase === 'tip the iceberg') {
    const data = DIALOGUE.timelineAware['tip the iceberg'];
    
    const dialogueAge = getDialogueAge(age);
    
    // Before iceberg exists (before March 29, 2006)
    if (isLower(version, '2006-03-29')) {
      const responses = data.beforeIceberg[dialogueAge];
      return responses[randomInt(0, responses.length - 1)];
    }
    
    // March-April 2006: No rumor yet
    if (isGreaterOrEqual(version, '2006-03-29') && isLower(version, '2006-05-01')) {
      const responses = data.noRumor[dialogueAge];
      return responses[randomInt(0, responses.length - 1)];
    }
    
    // November 2006+: Hard hat phase
    if (isGreaterOrEqual(version, '2006-11-01')) {
      const responses = data.hardHatPhase[dialogueAge];
      return responses[randomInt(0, responses.length - 1)];
    }
    
    // May-October 2006: General rumor exists
    const responses = data.hasRumor[dialogueAge];
    return responses[randomInt(0, responses.length - 1)];
  }
  
  if (phrase === 'pizza parlor') {
    const data = DIALOGUE.timelineAware['pizza parlor'];
    const responses = isGreaterOrEqual(version, '2006-02-24') 
      ? data.afterOpening[dialogueAge] 
      : data.beforeOpening[dialogueAge];
    return responses[randomInt(0, responses.length - 1)];
  }
  
  if (phrase === 'the mine') {
    const data = DIALOGUE.timelineAware['the mine'];
    const responses = isGreaterOrEqual(version, '2006-05-25') 
      ? data.afterOpening[dialogueAge] 
      : data.beforeOpening[dialogueAge];
    return responses[randomInt(0, responses.length - 1)];
  }
  
  if (phrase === 'beach') {
    const data = DIALOGUE.timelineAware['beach'];
    // Beach/Dock opened April 18, 2006
    const responses = isGreaterOrEqual(version, '2006-04-18') 
      ? data.afterOpening[dialogueAge] 
      : data.beforeOpening[dialogueAge];
    return responses[randomInt(0, responses.length - 1)];
  }
  
  if (phrase === 'lighthouse') {
    const data = DIALOGUE.timelineAware['lighthouse'];
    const responses = isGreaterOrEqual(version, '2006-09-21') 
      ? data.afterOpening[dialogueAge] 
      : data.beforeOpening[dialogueAge];
    return responses[randomInt(0, responses.length - 1)];
  }
  
  return null;
}

/**
 * Handle bot conversations with players
 */
function handleBotConversations(player: Client, message: string) {
  if (!player.room || player.isBot) return;
  
  // Check for different message types
  const specificPhrase = matchSpecificPhrase(message);
  const timelinePhrase = matchTimelineAwarePhrase(message);
  const timeTravelerType = detectTimeTraveler(message);
  const messageType = detectMessageType(message);
  
  if (!specificPhrase && !timelinePhrase && !timeTravelerType && !messageType) return;
  
  // Get version for timeline-aware responses
  const version = player.server.settings.version;
  
  // Find nearby bots (within 200 pixels) that might respond
  player.room.botGroup.bots.forEach((bot: Client) => {
    const behavior = botBehaviors.get(bot);
    if (!behavior) return;
    
    // Calculate distance
    const distance = Math.sqrt(Math.pow(player.x - bot.x, 2) + Math.pow(player.y - bot.y, 2));
    
    // Bots respond if:
    // 1. They're a socializer personality (more chatty)
    // 2. Player is close by
    // 3. Bot is already in conversation with this player
    // 4. Random chance based on personality
    
    let responseChance = 0;
    
    if (behavior.personality === 'socializer' || behavior.personality === 'jokester') {
      responseChance = distance < 200 ? 0.7 : distance < 350 ? 0.3 : 0.1;
    } else if (behavior.personality === 'shy' || behavior.personality === 'sitter') {
      responseChance = distance < 150 ? 0.2 : 0.05;
    } else if (behavior.personality === 'follower' && behavior.followTarget === player) {
      responseChance = 0.8; // Followers are very responsive
    } else {
      responseChance = distance < 200 ? 0.4 : distance < 300 ? 0.15 : 0.05;
    }
    
    // Boost chance if already in conversation
    if (behavior.conversationTarget === player && behavior.conversationTurn && behavior.conversationTurn < 5) {
      responseChance = Math.min(0.9, responseChance * 1.8);
    }
    
    // Specific phrases get higher response chance
    if (specificPhrase) {
      responseChance = Math.min(0.95, responseChance * 1.5);
    }
    
    // Direct greeting to bot increases chance
    if (messageType === 'greeting' && message.toLowerCase().includes(bot.penguin.name.toLowerCase())) {
      responseChance = 0.95;
    }
    
    // "follow me" has special behavior
    if (specificPhrase === 'follow me' && !behavior.followTarget) {
      if (behavior.personality === 'follower' || behavior.personality === 'socializer') {
        responseChance = 0.85; // Very high chance
      }
    }
    
    // Boost chance for timeline-aware and time traveler messages
    if (timelinePhrase || timeTravelerType) {
      responseChance = Math.min(0.95, responseChance * 1.5);
    }
    
    if (Math.random() < responseChance) {
      // Get appropriate response
      let response: string | null = null;
      
      // Priority: timeline-aware > time traveler > specific phrase > general message type
      if (timelinePhrase) {
        response = getTimelineAwareResponse(timelinePhrase, version, behavior.age);
      } else if (timeTravelerType) {
        // Decide if bot is believer or skeptic
        const dialogueAge = getDialogueAge(behavior.age);
        const isBeliever = Math.random() < (dialogueAge === 'child' ? 0.6 : dialogueAge === 'preteen' ? 0.3 : 0.15);
        const responseType = isBeliever ? 'believer' : 'skeptic';
        const responses = DIALOGUE.timeTraveler[timeTravelerType][responseType][dialogueAge];
        response = responses[randomInt(0, responses.length - 1)];
      } else if (specificPhrase) {
        const dialogueAge = getDialogueAge(behavior.age);
        const responses = DIALOGUE.specificPhrases[specificPhrase][dialogueAge];
        response = responses[randomInt(0, responses.length - 1)];
      } else if (messageType) {
        const dialogueAge = getDialogueAge(behavior.age);
        const responses = DIALOGUE.conversationResponses[messageType][dialogueAge];
        if (responses) {
          response = responses[randomInt(0, responses.length - 1)];
        }
      }
      
      if (!response) return;
      
      // Capture response as string for closure
      const chatResponse: string = response;
      
      // Mark conversation
      behavior.conversationTarget = player;
      behavior.conversationTurn = (behavior.conversationTurn || 0) + 1;
      behavior.lastMessageReceived = message;
      
      // Send response with delay
      setTimeout(() => {
        if (bot.room === player.room) {
          botSendChat(bot, chatResponse);
          
          // Special handling for "follow me"
          if (specificPhrase === 'follow me' && !behavior.followTarget) {
            if (behavior.personality === 'follower' || 
                (behavior.personality === 'socializer' && Math.random() < 0.6)) {
              behavior.followTarget = player;
              behavior.followChance = behavior.personality === 'follower' ? 0.8 : 0.5;
            }
          }
          
          // Socializers and followers might initiate following
          if ((behavior.personality === 'socializer' || behavior.personality === 'follower') && 
              !behavior.followTarget && behavior.conversationTurn && behavior.conversationTurn >= 2) {
            if (Math.random() < 0.3) {
              behavior.followTarget = player;
              behavior.followChance = behavior.personality === 'follower' ? 0.7 : 0.3;
            }
          }
        }
      }, randomInt(800, 2500));
      
      // Reset conversation after some time
      setTimeout(() => {
        if (behavior.conversationTarget === player) {
          behavior.conversationTarget = undefined;
          behavior.conversationTurn = 0;
        }
      }, 30000);
    }
  });
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
 * Handle beta begging beta easter egg - when party hat player begs near party hat bot
 */
function handleBetaBeggingBeta(player: Client, message: string) {
  if (!player.room) return;
  
  // Only react if player is wearing a party hat and begging
  if (player.penguin.head !== 413) return;
  if (!isBeggingMessage(message)) return;
  
  // Find nearby party hat bots
  player.room.botGroup.bots.forEach((bot: Client) => {
    if (bot.penguin.head !== 413) return; // Bot must have party hat
    
    const behavior = botBehaviors.get(bot);
    if (!behavior) return;
    
    const distance = Math.sqrt(
      Math.pow(player.x - bot.x, 2) + Math.pow(player.y - bot.y, 2)
    );
    
    // Only react if within 200 pixels
    if (distance > 200) return;
    
    // 70% chance to call out the irony
    if (Math.random() < 0.7) {
      const dialogueAge = getDialogueAge(behavior.age);
      const reactions = DIALOGUE.betaBeggingBeta[dialogueAge];
      if (reactions) {
        const reaction = reactions[randomInt(0, reactions.length - 1)];
        setTimeout(() => {
          if (bot.room === player.room) {
            botSendChat(bot, reaction);
          }
        }, randomInt(500, 1500));
      }
    }
  });
}

/**
 * Handle timeline-aware question responses
 */
function handleQuestionResponses(player: Client, message: string) {
  if (!player.room) return;
  
  // Check for developer question
  if (isDeveloperQuestion(message)) {
    // Determine timeline based on game version
    const version = player.server.settings.version;
    const isPostDisney = isGreaterOrEqual(version, '2007-08-01');
    
    player.room.botGroup.bots.forEach((bot: Client) => {
      const behavior = botBehaviors.get(bot);
      if (!behavior) return;
      
      // Only 30% of bots respond to avoid spam
      if (Math.random() > 0.3) return;
      
      // Get appropriate response based on timeline and bot age
      const dialogueAge = getDialogueAge(behavior.age);
      const responseSet = isPostDisney 
        ? DIALOGUE.questionResponses.developer.postDisney[dialogueAge]
        : DIALOGUE.questionResponses.developer.preRocketsnail[dialogueAge];
      
      if (responseSet) {
        const response = responseSet[randomInt(0, responseSet.length - 1)];
        setTimeout(() => {
          if (bot.room === player.room) {
            botSendChat(bot, response);
          }
        }, randomInt(800, 2500));
      }
    });
  }
}

/**
 * Handle party hat swarming bot reaction when player tells them to fuck off
 */
function handlePartyHatSwarmReaction(player: Client, message: string) {
  if (!player.room) return;
  
  // Only react if player is wearing a party hat
  if (player.penguin.head !== 413) return;
  
  const isVeryAngry = isSuperVulgar(message);
  const isAnnoyed = isAnnoyedMessage(message);
  
  if (!isAnnoyed && !isVeryAngry) return;
  
  // Find all child/preteen bots swarming this player
  player.room.botGroup.bots.forEach((bot: Client) => {
    const behavior = botBehaviors.get(bot);
    if (!behavior) return;
    
    // Only react if they're a kid/preteen and close to the player
    if (behavior.age !== 'child' && behavior.age !== 'preteen') return;
    
    const distance = Math.sqrt(
      Math.pow(player.x - bot.x, 2) + Math.pow(player.y - bot.y, 2)
    );
    
    // Only react if within 200 pixels (swarming distance)
    if (distance > 200) return;
    
    // React based on age and anger level
    if (isVeryAngry) {
      // Super angry - everyone backs off
      if (behavior.age === 'child') {
        // Children get scared and run away
        const messages = ['sorry', 'im sorry', 'okay okay', 'leaving', 'bye'];
        const msg = messages[randomInt(0, messages.length - 1)];
        setTimeout(() => {
          if (bot.room === player.room) {
            botSendChat(bot, msg);
            // Move far away
            const awayX = bot.x + (bot.x - player.x) * 3;
            const awayY = bot.y + (bot.y - player.y) * 3;
            setTimeout(() => {
              if (bot.room === player.room) {
                bot.setPosition(
                  Math.max(100, Math.min(700, awayX)),
                  Math.max(100, Math.min(500, awayY))
                );
              }
            }, 500);
          }
        }, randomInt(300, 1000));
      } else {
        // Preteens back off but with attitude
        const messages = ['alright chill', 'jeez ok', 'whatever', 'fine', 'calm down'];
        const msg = messages[randomInt(0, messages.length - 1)];
        setTimeout(() => {
          if (bot.room === player.room) {
            botSendChat(bot, msg);
            // Move away but not as far
            const awayX = bot.x + (bot.x - player.x) * 2;
            const awayY = bot.y + (bot.y - player.y) * 2;
            setTimeout(() => {
              if (bot.room === player.room) {
                bot.setPosition(
                  Math.max(100, Math.min(700, awayX)),
                  Math.max(100, Math.min(500, awayY))
                );
              }
            }, 500);
          }
        }, randomInt(300, 1000));
      }
    } else {
      // Normal annoyance - mixed reactions
      const rand = Math.random();
      
      if (behavior.age === 'child') {
        if (rand < 0.7) {
          // 70% back off
          const messages = ['ok', 'sorry', 'fine'];
          const msg = messages[randomInt(0, messages.length - 1)];
          setTimeout(() => {
            if (bot.room === player.room) {
              botSendChat(bot, msg);
              const awayX = bot.x + (bot.x - player.x) * 2;
              const awayY = bot.y + (bot.y - player.y) * 2;
              setTimeout(() => {
                if (bot.room === player.room) {
                  bot.setPosition(
                    Math.max(100, Math.min(700, awayX)),
                    Math.max(100, Math.min(500, awayY))
                  );
                }
              }, 500);
            }
          }, randomInt(300, 1000));
        } else {
          // 30% keep begging
          const message = getBotChatMessage(bot, 'betaHat', player.room);
          if (message) {
            setTimeout(() => {
              if (bot.room === player.room) {
                botSendChat(bot, message);
              }
            }, randomInt(500, 1500));
          }
        }
      } else {
        // Preteens
        if (rand < 0.4) {
          // 40% back off
          const messages = ['fine', 'whatever', 'ok'];
          const msg = messages[randomInt(0, messages.length - 1)];
          setTimeout(() => {
            if (bot.room === player.room) {
              botSendChat(bot, msg);
              const awayX = bot.x + (bot.x - player.x) * 1.5;
              const awayY = bot.y + (bot.y - player.y) * 1.5;
              setTimeout(() => {
                if (bot.room === player.room) {
                  bot.setPosition(
                    Math.max(100, Math.min(700, awayX)),
                    Math.max(100, Math.min(500, awayY))
                  );
                }
              }, 500);
            }
          }, randomInt(300, 1000));
        } else if (rand < 0.7) {
          // 30% get defensive/snarky
          const defensiveMessages = [
            'bro relax', 'chill out', 'not that serious', 'its just a hat',
            'why so mad', 'ur the one with the hat', 'ur rich anyway',
            'just asking', 'no need to be rude', 'geez'
          ];
          const msg = defensiveMessages[randomInt(0, defensiveMessages.length - 1)];
          setTimeout(() => {
            if (bot.room === player.room) {
              botSendChat(bot, msg);
            }
          }, randomInt(300, 1000));
        } else {
          // 30% keep begging
          const message = getBotChatMessage(bot, 'betaHat', player.room);
          if (message) {
            setTimeout(() => {
              if (bot.room === player.room) {
                botSendChat(bot, message);
              }
            }, randomInt(500, 1500));
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
          let reactions;
          
          // Special reaction if bot has party hat and is being pelted by the mob
          if (bot.penguin.head === 413 && thrower.isBot) {
            const throwerBehavior = botBehaviors.get(thrower);
            // Check if thrower is a child/preteen (the mob)
            if (throwerBehavior && (throwerBehavior.age === 'child' || throwerBehavior.age === 'preteen')) {
              // Count nearby kids to see if being mobbed
              const nearbyKids = room.botGroup.bots.filter((b: Client) => {
                const bBehavior = botBehaviors.get(b);
                if (!bBehavior) return false;
                if (bBehavior.age !== 'child' && bBehavior.age !== 'preteen') return false;
                const dist = Math.sqrt(Math.pow(bot.x - b.x, 2) + Math.pow(bot.y - b.y, 2));
                return dist < 200;
              }).length;
              
              // If 2+ kids nearby, use special mob pelted dialogue
              if (nearbyKids >= 2) {
                const dialogueAge = getDialogueAge(behavior.age);
                reactions = DIALOGUE.betaMobPelted[dialogueAge];
              }
            }
          }
          
          // Fall back to normal dialogue if no special case
          if (!reactions) {
            // Use different dialogue for Snow Forts (playful) vs other rooms (annoyed)
            const isSnowForts = room.id === ROOM_IDS.SNOW_FORTS;
            const dialogueAge = getDialogueAge(behavior.age);
            reactions = isSnowForts 
              ? DIALOGUE.snowballHitForts[dialogueAge]
              : DIALOGUE.snowballHit[dialogueAge];
          }
          
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
  const itemId = Number(item);
  if (BAIT_ITEMS.has(itemId)) {
    const reason = `Account banned for attempting to acquire bait item ${itemId}`;
    const banResult = issueTemporaryBan(client.penguin.name, reason);
    console.log(`[AutoBan] ${client.penguin.name} banned for purchasing bait item ${itemId}`);
    const payload = banResult.code === 600 && banResult.expiresAt ? banResult.expiresAt : reason;
    client.sendError(banResult.code, payload);
    client.disconnect();
    return;
  }

  client.buyItem(itemId);
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
  const normalizedMessage = normalizeForFilter(message);

  if (containsPersonalInfo(message, normalizedMessage)) {
    client.sendError(913, 'For your safety, personal information cannot be shared.');
    return;
  }

  const messageType = detectMessageType(message);

  if (messageType === 'extremeProfanity') {
    const banReason = `The server has automatically banned you for saying a bad word. You said: ${message}`;
    const banResult = issueTemporaryBan(client.penguin.name, banReason);
    console.log(`[AutoBan] ${client.penguin.name} banned for extreme profanity: ${message}`);
    const payload = banResult.expiresAt ?? banReason;
    setAccountBan(client.penguin.name, payload, banResult.expiresAt);
    client.sendError(banResult.code, payload);
    client.disconnect();
    return;
  }
  
  client.sendMessage(message);
  // Check if player is expressing annoyance at bots
  if (isAnnoyedMessage(message)) {
    handleAnnoyingBotReaction(client, message);
  }
  
  // Check if party hat wearer is telling off swarming bots
  if (isAnnoyedMessage(message) || isSuperVulgar(message)) {
    handlePartyHatSwarmReaction(client, message);
  }
  
  // Easter egg: Check if party hat player is begging near party hat bot
  if (isBeggingMessage(message)) {
    handleBetaBeggingBeta(client, message);
  }
  
  // Timeline-aware question responses
  handleQuestionResponses(client, message);
  
  // Bot conversations - bots respond to player messages
  handleBotConversations(client, message);
});

handler.xt(Handle.SendMessageOld, (client, ...args) => {
  if (!isAuthorized(client.penguin.name)) {
    client.sendError(610, 'You are not authorized to use commands.');
    return;
  }

  commandsHandler(client, ...args);
});

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
  const { Username, Password } = body;
  
  if (!Username || !Password) {
    return '&e=100&em=Penguin%20not%20found'; // Penguin not found
  }

  if (Username.length > 12) {
    console.log(`[Engine1] Denied login for ${Username}: nickname too long (${Username.length} chars)`);
    return '&e=101&em=Nickname%20may%20not%20exceed%2012%20characters.';
  }

  const banStatus = getBanStatus(Username);
  if (banStatus?.active) {
    console.log(`[Engine1] Denied login for ${Username}: active ban (${banStatus.code})`);
    const encodedMessage = encodeURIComponent(banStatus.message);
    return `&e=${banStatus.code}&em=${encodedMessage}`;
  }

  if (isInappropriateUsername(Username)) {
    const reason = `Account banned for inappropriate username: ${Username}`;
    console.log(`[AutoBan] ${Username} instabanned for inappropriate username`);
    setAccountBan(Username, reason, null);
    const encodedReason = encodeURIComponent(reason);
    return `&e=680&em=${encodedReason}`;
  }

  // Account verification/creation (same as XML login)
  if (accountExists(Username)) {
    // Account exists - verify password
    if (!verifyAccount(Username, Password)) {
      console.log(`[Engine1] Failed login attempt for ${Username}: incorrect password`);
      return '&e=101&em=Incorrect%20Password.%5CnNOTE%3A%20Passwords%20are%20CaSe%20SeNsiTIVE';
    }
    console.log(`[Engine1] ${Username} logged in with existing account`);
  } else {
    // Account doesn't exist - create new account with this password
    createAccount(Username, Password);
    console.log(`[Engine1] ${Username} created new account`);
  }

  const penguin = Client.getPenguinFromName(Username);
  const sessionKeys = createEngine1Session(Username);

  const inventory = penguin.getItems();
  const baitItem = inventory.find((itemId) => BAIT_ITEMS.has(itemId));
  if (baitItem !== undefined) {
    const reason = `Account banned for possessing bait item ${baitItem}`;
    const banResult = issueTemporaryBan(Username, reason);
    console.log(`[AutoBan] ${Username} banned for bait item ${baitItem}`);
    const responsePayload = banResult.code === 600 && banResult.expiresAt ? banResult.expiresAt : reason;
    const encodedReason = encodeURIComponent(responsePayload);
    return `&e=${banResult.code}&em=${encodedReason}`;
  }

  // Generate fake server populations for all servers
  // Format: worldId| population,worldId| population...
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
    k1: sessionKeys.loginKey,
    k2: sessionKeys.smartKey,
    k3: randomToken(8),
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
