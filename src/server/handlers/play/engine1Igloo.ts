import { Handler } from "..";
import { Client } from "../../../server/client";
import { IglooFurniture } from "../../../server/database";
import { Handle } from "../handles";
import { getIglooCost } from "../../game-logic/iglooItems";
import { FURNITURE } from "../../game-logic/furniture";

const handler = new Handler();

// Join player room (igloo) - Engine 1
handler.xt(Handle.JoinPlayerRoomOld, (client, playerId) => {
  const id = Number(playerId);
  
  // If joining own igloo, automatically open it
  if (id === client.penguin.id) {
    // Open the player's own igloo
    const igloo = client.penguin.activeIgloo;
    client.server.openIgloo(id, igloo);
    
    const iglooType = igloo.type || 1;
    
    // Build furniture string for Engine 1
    let furnitureString = '';
    if (igloo.furniture && igloo.furniture.length > 0) {
      const furnitureItems = igloo.furniture.map((item: any) => {
        return `${item.id}|${item.x}|${item.y}|${item.rotation || 1}|${item.frame || 1}`;
      });
      furnitureString = ',' + furnitureItems.join(',');
    }
    
    // Send jp response in Engine 1 format
    client.sendXt('jp', id, iglooType, furnitureString);
    
    // Join the igloo room (room ID is player ID + 1000)
    const iglooRoomId = id + 1000;
    client.joinRoom(iglooRoomId);
  } else {
    // Try to get another player's igloo
    try {
      const igloo = client.server.getIgloo(id);
      const iglooType = igloo.type || 1;
      
      // Build furniture string for Engine 1
      let furnitureString = '';
      if (igloo.furniture && igloo.furniture.length > 0) {
        const furnitureItems = igloo.furniture.map((item: any) => {
          return `${item.id}|${item.x}|${item.y}|${item.rotation || 1}|${item.frame || 1}`;
        });
        furnitureString = ',' + furnitureItems.join(',');
      }
      
      // Send jp response in Engine 1 format
      client.sendXt('jp', id, iglooType, furnitureString);
      
      // Join the igloo room (room ID is player ID + 1000)
      const iglooRoomId = id + 1000;
      client.joinRoom(iglooRoomId);
    } catch (error) {
      // Igloo not open - don't send an error, just don't join
      // The client will handle this gracefully
      return;
    }
  }
});

// Get open igloos list - Engine 1
handler.xt(Handle.GetOpenIgloosOld, (client) => {
  const openIgloos = client.server.getOpenIglooPlayers();
  const iglooList = openIgloos.map(p => `${p.penguin.id}|${p.penguin.name}`);
  client.sendXt('gr', ...iglooList);
});

// Open igloo - Engine 1
handler.xt(Handle.OpenIglooOld, (client, playerId, name) => {
  const id = Number(playerId) || client.penguin.id;
  if (id === client.penguin.id) {
    client.server.openIgloo(id, client.penguin.activeIgloo);
  }
  client.sendXt('or');
});

// Close igloo - Engine 1  
handler.xt(Handle.CloseIglooOld, (client, playerId) => {
  const id = Number(playerId) || client.penguin.id;
  client.server.closeIgloo(id);
  client.sendXt('cr');
});

// Get furniture list - Engine 1
handler.xt(Handle.GetFurnitureOld, (client) => {
  const furniture = client.penguin.getAllFurniture();
  const furnitureIds: number[] = [];
  furniture.forEach(([id, amount]) => {
    for (let i = 0; i < amount; i++) {
      furnitureIds.push(id);
    }
  });
  client.sendXt('gf', ...furnitureIds);
});

// Add furniture - Engine 1
handler.xt(Handle.AddFurnitureOld, (client, furnitureId) => {
  const id = Number(furnitureId);
  const item = FURNITURE.get(id);
  
  if (!item) {
    client.sendError(402);
    return;
  }
  
  if (client.penguin.coins < item.cost) {
    client.sendError(401);
    return;
  }
  
  client.buyFurniture(id, { cost: item.cost });
  client.sendXt('af', id, client.penguin.coins);
  client.update();
});

// Add igloo upgrade - Engine 1
handler.xt(Handle.AddIglooUpgradeOld, (client, iglooId) => {
  const igloo = Number(iglooId);
  const cost = getIglooCost(igloo);
  
  if (cost === undefined) {
    client.sendError(402);
    return;
  }
  
  if (client.penguin.coins < cost) {
    client.sendError(401);
    return;
  }
  
  client.penguin.removeCoins(cost);
  client.penguin.updateIgloo({ type: igloo, furniture: [] }); // Clear furniture on upgrade
  client.sendXt('au', igloo, client.penguin.coins);
  client.update();
});

// Update room (save furniture) - Engine 1
handler.xt(Handle.UpdateRoomOld, (client, ...args) => {
  // First arg is igloo type
  const iglooType = Number(args[0]);
  
  // Process furniture items
  const furnitureItems: IglooFurniture = [];
  for (let i = 1; i < args.length; i++) {
    const furnitureString = args[i];
    if (typeof furnitureString === 'string' && furnitureString.includes('|')) {
      const [id, x, y, rotation, frame] = furnitureString.split('|').map(Number);
      furnitureItems.push({
        id,
        x: x || 0,
        y: y || 0,
        rotation: rotation || 1,
        frame: frame || 1
      });
    }
  }
  
  // Limit to 100 items
  if (furnitureItems.length > 100) {
    client.sendError(450);
    return;
  }
  
  client.penguin.updateIgloo({ 
    type: iglooType,
    furniture: furnitureItems 
  });
  
  client.sendXt('ur');
  client.update();
});

export default handler;
