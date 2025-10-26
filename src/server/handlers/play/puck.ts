import { Handler } from "..";
import { Handle } from "../handles";

const handler = new Handler();

// Handle puck movement in ice rink (room 802)
handler.xt(Handle.PuckMove, (client, x, y) => {
  // Broadcast puck movement to all players in the room
  client.sendRoomXt('zm', x, y);
});

export default handler;
