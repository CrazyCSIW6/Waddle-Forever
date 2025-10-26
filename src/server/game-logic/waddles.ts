/** Identifies the type of game */
export type WaddleName = 'sled' | 'card' | 'fire' | 'mancala';

type WaddleRoomInfo = {
  waddleId: number;
  roomId: number;
  seats: number;
  game: WaddleName;
}

/** Engine 1 waddle rooms (uses different IDs for tables) */
export const ENGINE1_WADDLE_ROOMS: WaddleRoomInfo[] = [
  // Mancala tables in Book Room (111)
  {
    waddleId: 100,
    roomId: 111,
    seats: 2,
    game: 'mancala'
  },
  {
    waddleId: 101,
    roomId: 111,
    seats: 2,
    game: 'mancala'
  },
  {
    waddleId: 102,
    roomId: 111,
    seats: 2,
    game: 'mancala'
  },
  {
    waddleId: 103,
    roomId: 111,
    seats: 2,
    game: 'mancala'
  },
  {
    waddleId: 104,
    roomId: 111,
    seats: 2,
    game: 'mancala'
  },
  // Mancala table in PSA HQ (803)
  {
    waddleId: 105,
    roomId: 803,
    seats: 2,
    game: 'mancala'
  }
];

/** Modern client waddle rooms */
export const WADDLE_ROOMS: WaddleRoomInfo[] = [
  {
    waddleId: 100,
    roomId: 230,
    seats: 4,
    game: 'sled'
  },
  {
    waddleId: 101,
    roomId: 230,
    seats: 3,
    game: 'sled'
  },
  {
    waddleId: 102,
    roomId: 230,
    seats: 2,
    game: 'sled'
  },
  {
    waddleId: 103,
    roomId: 230,
    seats: 2,
    game: 'sled'
  },
  {
    waddleId: 200,
    roomId: 320,
    seats: 2,
    game: 'card'
  },
  {
    waddleId: 201,
    roomId: 320,
    seats: 2,
    game: 'card'
  },
  {
    waddleId: 202,
    roomId: 320,
    seats: 2,
    game: 'card'
  },
  {
    waddleId: 203,
    roomId: 320,
    seats: 2,
    game: 'card'
  },
  {
    waddleId: 200,
    roomId: 322,
    seats: 2,
    game: 'card'
  },
  {
    waddleId: 201,
    roomId: 322,
    seats: 2,
    game: 'card'
  },
  {
    waddleId: 202,
    roomId: 322,
    seats: 2,
    game: 'card'
  },
  {
    waddleId: 203,
    roomId: 322,
    seats: 2,
    game: 'card'
  },
  {
    waddleId: 300,
    roomId: 812,
    seats: 2,
    game: 'fire'
  },
  {
    waddleId: 301,
    roomId: 812,
    seats: 2,
    game: 'fire'
  },
  {
    waddleId: 302,
    roomId: 812,
    seats: 3,
    game: 'fire'
  },
  {
    waddleId: 303,
    roomId: 812,
    seats: 4,
    game: 'fire'
  },
  {
    waddleId: 400,
    roomId: 111,
    seats: 2,
    game: 'mancala'
  },
  {
    waddleId: 401,
    roomId: 111,
    seats: 2,
    game: 'mancala'
  },
  {
    waddleId: 402,
    roomId: 111,
    seats: 2,
    game: 'mancala'
  },
  {
    waddleId: 403,
    roomId: 111,
    seats: 2,
    game: 'mancala'
  }
];