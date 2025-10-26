import { Handler } from "..";
import { Handle } from "../handles";

const handler = new Handler();

const ICE_RINK_ROOM_ID = 802;
type PuckState = {
  x: number;
  y: number;
};

// Default puck position at center of rink bounds (xMin:-200 to xMax:240, yMin:-90 to yMax:140)
const DEFAULT_PUCK_STATE: PuckState = { x: 20, y: 25 };

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
handler.xt(Handle.PuckMove, (client, x, y) => {
  // Only handle if the client is in the ice rink
  if (client.room?.id !== ICE_RINK_ROOM_ID) {
    return false; // Not in ice rink, let other handlers try
  }
  
  puckState = { x, y };

  // Broadcast puck movement to all players in the room
  client.sendRoomXt('zm', x, y);
  return true;
});

export default handler;
