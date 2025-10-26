import type { GameRoom } from '../client';
import type { Client } from '../client';

export abstract class BaseTable {
  users: Client[] = [];
  started: boolean = false;
  currentTurn: number = 0;

  constructor(
    public id: number,
    public room: GameRoom
  ) {
    // Randomly determine starting turn
    this.currentTurn = Math.random() < 0.5 ? 0 : 1;
  }

  get playingUsers(): Client[] {
    return this.users.slice(0, 2);
  }

  isPlayingUser(user: Client): boolean {
    return this.playingUsers.includes(user);
  }

  abstract get gameString(): string;

  /** Handle z#gz - Get game state */
  handleGetGame(user: Client): void {
    user.sendXt('gz', this.gameString);
  }

  /** Handle z#jz - Join game */
  handleJoinGame(user: Client): void {
    if (this.started) {
      return;
    }

    const seat = this.users.indexOf(user);
    user.sendXt('jz', seat);
    this.send('uz', seat, user.penguin.name);

    if (this.users.length === 2) {
      this.started = true;
      this.send('sz', this.currentTurn);
    }
  }

  /** Handle z#lz - Leave game */
  handleLeaveGame(user: Client): void {
    user.sendXt('lz');
  }

  /** Handle s#lt - Leave table */
  handleLeaveTable(user: Client): void {
    if (this.started && this.isPlayingUser(user)) {
      this.reset(user);
    } else {
      this.remove(user);
    }
  }

  /** Add user to table */
  add(user: Client): void {
    this.users.push(user);
    user.table = this;

    const seat = this.users.length - 1;
    user.sendXt('jt', this.id, seat);
    this.room.sendXt('ut', this.id, this.users.length);
  }

  /** Remove user from table */
  remove(user: Client): void {
    this.users = this.users.filter(u => u !== user);
    user.table = null;
    this.room.sendXt('ut', this.id, this.users.length);
  }

  /** Reset table */
  reset(quittingUser: Client | null = null): void {
    if (quittingUser) {
      this.send('cz', quittingUser.penguin.name);
    }

    for (const user of this.users) {
      this.remove(user);
    }

    this.started = false;
    this.currentTurn = Math.random() < 0.5 ? 0 : 1;
  }

  /** Send message to all users at table */
  send(code: string, ...args: Array<number | string>): void {
    this.users.forEach(user => user.sendXt(code, ...args));
  }

  /** String representation for s#gt response */
  toString(): string {
    return `${this.id}|${this.playingUsers.length}`;
  }
}
