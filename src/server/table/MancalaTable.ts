import { BaseTable } from './BaseTable';
import type { Client } from '../client';

enum TurnCommand {
  FreeTurn = 'f',
  Capture = 'c'
}

export class MancalaTable extends BaseTable {
  private map: number[] = [];

  constructor(id: number, room: any) {
    super(id, room);
    this.initializeBoard();
  }

  private initializeBoard(): void {
    this.map = [
      4, 4, 4, 4, 4, 4, 0,  // Player 0's side + mancala
      4, 4, 4, 4, 4, 4, 0   // Player 1's side + mancala
    ];
  }

  /** Handle z#zm - Send move */
  handleSendMove(user: Client, hole: number): void {
    if (!this.started) {
      return;
    }

    if (!this.isValidMove(user, hole)) {
      return;
    }

    const move = this.makeMove(hole);
    this.send('zm', this.currentTurn, hole, move);

    if (this.isGameOver()) {
      this.sendGameOver();
      return;
    }

    if (move !== TurnCommand.FreeTurn) {
      this.currentTurn = this.currentTurn === 0 ? 1 : 0;
    }
  }

  private isValidMove(user: Client, hole: number): boolean {
    if (this.map[hole] <= 0) {
      return false;
    }

    const turn = this.users.indexOf(user);
    if (turn !== this.currentTurn) {
      return false;
    }

    if (this.currentTurn === 0 && this.isTurn0Side(hole)) {
      return true;
    }

    if (this.currentTurn === 1 && this.isTurn1Side(hole)) {
      return true;
    }

    return false;
  }

  private makeMove(hole: number): string {
    let stones = this.map[hole];
    this.map[hole] = 0;

    while (stones > 0) {
      hole = this.getNextHole(hole);
      this.map[hole]++;
      stones--;
    }

    return this.checkLastHole(hole);
  }

  private getNextHole(hole: number): number {
    hole++;
    const opponentMancala = this.currentTurn === 0 ? 13 : 6;

    if (hole === opponentMancala) {
      hole++;
    }

    if (hole > this.map.length - 1) {
      hole = 0;
    }

    return hole;
  }

  private checkLastHole(hole: number): string {
    // Capture
    const oppositeHole = 12 - hole;
    const myMancala = this.currentTurn === 0 ? 6 : 13;

    if (this.map[hole] === 1 && this.map[oppositeHole] > 0) {
      // Only if on your side
      if ((this.currentTurn === 0 && this.isTurn0Side(hole)) || 
          (this.currentTurn === 1 && this.isTurn1Side(hole))) {
        this.map[myMancala] += this.map[oppositeHole] + 1;
        this.map[hole] = 0;
        this.map[oppositeHole] = 0;
        return TurnCommand.Capture;
      }
    }

    // Free turn
    if (hole === myMancala) {
      return TurnCommand.FreeTurn;
    }

    return '';
  }

  private isGameOver(): boolean {
    const player0Sum = this.sum(this.map.slice(0, 6));
    const player1Sum = this.sum(this.map.slice(7, 13));
    return player0Sum === 0 || player1Sum === 0;
  }

  private sendGameOver(): void {
    const player0Sum = this.sum(this.map.slice(0, 7));
    const player1Sum = this.sum(this.map.slice(7, 14));

    // Award coins
    if (this.users[0]) {
      this.users[0].penguin.addCoins(player0Sum);
    }
    if (this.users[1]) {
      this.users[1].penguin.addCoins(player1Sum);
    }

    this.send('zo');
    this.reset();
  }

  private isTurn0Side(hole: number): boolean {
    return hole >= 0 && hole <= 5;
  }

  private isTurn1Side(hole: number): boolean {
    return hole >= 7 && hole <= 12;
  }

  private sum(array: number[]): number {
    return array.reduce((prev, curr) => prev + curr, 0);
  }

  get gameString(): string {
    const usernames = new Array(2).fill('');

    for (let i = 0; i < this.playingUsers.length; i++) {
      usernames[i] = this.playingUsers[i].penguin.name;
    }

    const map = this.map.join(',');
    const strings = [...usernames, map];

    if (this.started) {
      strings.push(String(this.currentTurn));
    }

    return strings.join('%');
  }

  reset(quittingUser: Client | null = null): void {
    super.reset(quittingUser);
    this.initializeBoard();
  }
}
