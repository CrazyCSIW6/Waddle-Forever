import { WaddleName } from "../../../server/game-logic/waddles";
import { Client, WaddleGame } from "../../../server/client";
import { WaddleHandler } from "./waddle";
import { Handle } from "../handles";

export class Mancala extends WaddleGame {
  public roomId: number = 111;  // Book Room
  public name: WaddleName = 'mancala';

  private _board: number[] = [];  // 14 cups with stone counts
  private _currentTurn: number = 0;  // 0 or 1 for player index
  private _gameStarted: boolean = false;

  constructor(players: Client[]) {
    super(players);
    this.initializeBoard();
    // Randomly determine who goes first
    this._currentTurn = Math.random() < 0.5 ? 0 : 1;
  }

  private initializeBoard(): void {
    // Initialize board: cups 0-12 get 4 stones each, mancalas (6, 13) get 0
    for (let i = 0; i < 14; i++) {
      if (i === 6 || i === 13) {
        this._board[i] = 0;  // Mancalas start empty
      } else {
        this._board[i] = 4;  // Regular cups start with 4 stones
      }
    }
  }

  /** Returns board state as comma-separated string */
  get boardState(): string {
    return this._board.join(',');
  }

  /** Check if the move is valid for the current player */
  private isValidMove(cup: number): boolean {
    // Player 0 can only pick from cups 0-5
    // Player 1 can only pick from cups 7-12
    if (this._currentTurn === 0) {
      return cup >= 0 && cup <= 5 && this._board[cup] > 0;
    } else {
      return cup >= 7 && cup <= 12 && this._board[cup] > 0;
    }
  }

  /** Process a move and return the result command */
  makeMove(cup: number): string {
    if (!this.isValidMove(cup)) {
      return '';  // Invalid move
    }

    // Pick up stones from the cup
    let stones = this._board[cup];
    this._board[cup] = 0;

    // Distribute stones counter-clockwise
    let currentCup = cup;
    let lastCup = cup;
    const opponentMancala = this._currentTurn === 0 ? 13 : 6;

    while (stones > 0) {
      currentCup = (currentCup + 1) % 14;
      
      // Skip opponent's mancala
      if (currentCup === opponentMancala) {
        continue;
      }

      this._board[currentCup]++;
      stones--;
      lastCup = currentCup;
    }

    // Determine the result
    const playerMancala = this._currentTurn === 0 ? 6 : 13;
    
    // Check for free turn (last stone lands in player's mancala)
    if (lastCup === playerMancala) {
      return 'f';  // Free turn
    }

    // Check for capture (last stone lands in empty cup on player's side)
    const onPlayerSide = this._currentTurn === 0 ? (lastCup >= 0 && lastCup <= 5) : (lastCup >= 7 && lastCup <= 12);
    
    if (onPlayerSide && this._board[lastCup] === 1) {
      const oppositeCup = 12 - lastCup;
      if (this._board[oppositeCup] > 0) {
        // Capture stones from opposite cup and the landing stone
        const capturedStones = this._board[oppositeCup] + this._board[lastCup];
        this._board[oppositeCup] = 0;
        this._board[lastCup] = 0;
        this._board[playerMancala] += capturedStones;
        return 'c';  // Capture
      }
    }

    // Normal turn - switch players
    this._currentTurn = this._currentTurn === 0 ? 1 : 0;
    return '';  // Regular turn
  }

  /** Check if the game is over */
  isGameOver(): boolean {
    // Game is over when one side has no stones
    const player0Stones = this._board.slice(0, 6).reduce((sum, val) => sum + val, 0);
    const player1Stones = this._board.slice(7, 13).reduce((sum, val) => sum + val, 0);
    
    return player0Stones === 0 || player1Stones === 0;
  }

  start(): void {
    this._gameStarted = true;
    // Notify all players that the game has started
    this.sendXt('sz', this._currentTurn);
  }
}

const handler = new WaddleHandler<Mancala>('mancala');

// Get game state when entering
handler.waddleXt(Handle.EnterWaddleGame, (game, client) => {
  const player1Name = game.players[0]?.penguin.name ?? '';
  const player2Name = game.players[1]?.penguin.name ?? '';
  
  if (game['_gameStarted']) {
    // Game already started, send full state including current turn
    client.sendXt('gz', player1Name, player2Name, game.boardState, game['_currentTurn']);
  } else {
    // Game not started yet, just send player names and board
    client.sendXt('gz', player1Name, player2Name, game.boardState);
  }
});

// Join a seat
handler.waddleXt(Handle.JoinWaddle, (game, client) => {
  // Find an empty seat
  let seatId = -1;
  for (let i = 0; i < game.seats; i++) {
    if (game.players[i] === undefined) {
      seatId = i;
      break;
    }
  }

  if (seatId !== -1) {
    client.sendXt('jz', seatId);
    
    // Notify all players of the update
    game.players.forEach(player => {
      if (player) {
        player.sendXt('uz', seatId, client.penguin.name);
      }
    });

    // If both seats are filled, start the game
    if (game.players.filter(p => p !== undefined).length === 2) {
      game.start();
    }
  }
});

// Make a move - Mancala uses zm with just one parameter (cup index)
handler.waddleXt(Handle.SledRaceAction, (game, client, cupStr) => {
  // In mancala, zm sends only the cup index (first parameter)
  const cup = parseInt(cupStr);
  
  if (isNaN(cup)) {
    return;
  }

  const result = game.makeMove(cup);
  
  // Broadcast the move to all players
  client.sendWaddleXt('zm', game['_currentTurn'], cup, result);

  // Check if game is over
  if (game.isGameOver()) {
    // Notify clients after a short delay
    setTimeout(() => {
      client.sendWaddleXt('zo');
    }, 3000);
  }
});

// Leave game
handler.waddleXt(Handle.LeaveWaddleGame, (game, client) => {
  client.sendXt('lz');
  // TODO: Notify other players and handle cleanup
});

export default handler;
