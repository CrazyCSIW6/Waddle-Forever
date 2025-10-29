import { Handler } from '..';
import { Handle } from '../handles';
import { MancalaTable } from '../../table/MancalaTable';
import { Client } from '../../client';

const handler = new Handler();

// Register manual handlers for table packets (no Handle enum exists yet)
const registerTableHandlers = (handler: Handler) => {
  // s#gt - Get tables in room
  const gtCallbacks = handler.listeners.get('s%gt') || [];
  handler.listeners.set('s%gt', [...gtCallbacks, (client: Client) => {
    const tables = client.room.getTables();
    if (tables.length > 0) {
      client.sendXt('gt', ...tables.map((t: any) => t.toString()));
    }
    return true;
  }]);

  // s#jt - Join table
  const jtCallbacks = handler.listeners.get('s%jt') || [];
  handler.listeners.set('s%jt', [...jtCallbacks, (client: Client, tableIdStr: string) => {
    const tableId = parseInt(tableIdStr);
    const table = client.room.getTable(tableId);
    if (table) {
      table.add(client);
    }
    return true;
  }]);

  // s#lt - Leave table
  const ltCallbacks = handler.listeners.get('s%lt') || [];
  handler.listeners.set('s%lt', [...ltCallbacks, (client: Client) => {
    if (client.table) {
      client.table.handleLeaveTable(client);
    }
    return true;
  }]);

  // z#gz - Get game state
  const gzCallbacks = handler.listeners.get('z%gz') || [];
  handler.listeners.set('z%gz', [...gzCallbacks, (client: Client) => {
    if (client.table) {
      client.table.handleGetGame(client);
    }
    return true;
  }]);

  // z#jz - Join game
  const jzCallbacks = handler.listeners.get('z%jz') || [];
  handler.listeners.set('z%jz', [...jzCallbacks, (client: Client) => {
    if (client.table) {
      client.table.handleJoinGame(client);
    }
    return true;
  }]);

  // z#lz - Leave game
  const lzCallbacks = handler.listeners.get('z%lz') || [];
  handler.listeners.set('z%lz', [...lzCallbacks, (client: Client) => {
    if (client.table) {
      client.table.handleLeaveGame(client);
    }
    return true;
  }]);

  // z#zm - Send move (Mancala specific)
  const zmCallbacks = handler.listeners.get('z%zm') || [];
  handler.listeners.set('z%zm', [...zmCallbacks, (client: Client, holeStr: string) => {
    if (client.table && client.table instanceof MancalaTable) {
      const hole = parseInt(holeStr);
      client.table.handleSendMove(client, hole);
    }
    return true;
  }]);
};

registerTableHandlers(handler);

// Initialize tables when room is loaded
handler.boot((server) => {
  // Book Room (111) - 5 Mancala tables
  const bookRoom = server.getRoom(111);
  for (let i = 100; i <= 104; i++) {
    bookRoom.addTable(new MancalaTable(i, bookRoom));
  }

  // PSA HQ (803) - 1 Mancala table
  const psaRoom = server.getRoom(803);
  psaRoom.addTable(new MancalaTable(105, psaRoom));

  server.onReset(() => {
    const resetBookRoom = server.getRoom(111);
    for (let i = 100; i <= 104; i++) {
      if (!resetBookRoom.getTable(i)) {
        resetBookRoom.addTable(new MancalaTable(i, resetBookRoom));
      }
    }

    const resetPsaRoom = server.getRoom(803);
    if (!resetPsaRoom.getTable(105)) {
      resetPsaRoom.addTable(new MancalaTable(105, resetPsaRoom));
    }
  });
});

export default handler;
