import { Handler } from "..";
import { Handle } from "../handles";

const handler = new Handler();

const ICE_RINK_ROOM_ID = 802;

// Get puck position when entering ice rink
handler.xt(Handle.GetPuckPosition, (client) => {
  // Only handle if the client is in the ice rink
  if (client.room?.id !== ICE_RINK_ROOM_ID) {
    return false; // Not in ice rink, let other handlers try
  }
  
  // Send puck position (reset to center: 0, 0)
  client.sendXt('gz', 0, 0);
  return true;
});

// Handle puck movement in ice rink (room 802)
handler.xt(Handle.PuckMove, (client, x, y) => {
  // Only handle if the client is in the ice rink
  if (client.room?.id !== ICE_RINK_ROOM_ID) {
    return false; // Not in ice rink, let other handlers try
  }
  
  // Broadcast puck movement to all players in the room
  client.sendRoomXt('zm', x, y);
  return true;
});

export default handler;
