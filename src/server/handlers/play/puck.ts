import { Handler } from "..";
import { Handle } from "../handles";

const handler = new Handler();

const ICE_RINK_ROOM_ID = 802;
type PuckState = {
  x: number;
  y: number;
};

// Default puck position at center of rink bounds
const DEFAULT_PUCK_STATE: PuckState = { x: 390, y: 170 };

let puckState: PuckState = { ...DEFAULT_PUCK_STATE };

// Get puck position when entering ice rink
handler.xt(Handle.GetPuckPosition, (client) => {
  if (client.room?.id !== ICE_RINK_ROOM_ID) {
    return false; // Not in ice rink, let other handlers try
  }
  
  // Send last known puck position
  client.sendXt('gz', puckState.x, puckState.y);
  return true;
});

// Handle puck movement in ice rink (room 802)
handler.xt(Handle.PuckMove, (client, ...rawArgs: Array<number | string>) => {
  if (client.room?.id !== ICE_RINK_ROOM_ID) {
    return false;
  }

  // Engine 1 sends two numbers, Engine 2/3 send five values (including angles/velocity)
  const [rawX, rawY] = rawArgs;
  const x = typeof rawX === 'number' ? rawX : Number(rawX);
  const y = typeof rawY === 'number' ? rawY : Number(rawY);

  if (Number.isNaN(x) || Number.isNaN(y)) {
    return false;
  }

  puckState = { x, y };

  // Broadcast retaining original payload so modern clients stay in sync
  if (rawArgs.length >= 5) {
    client.sendRoomXt('zm', ...rawArgs);
  } else {
    client.sendRoomXt('zm', x, y);
  }
  return true;
});

export default handler;
