import express, { Express } from 'express';
import net from 'net';
// @ts-ignore
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';

import { Handler } from './handlers';
import { WORLD_PORT } from './servers';
import worldHandler from './handlers/world'
import oldHandler from './handlers/old'
import loginHandler from './handlers/login'
import { Client, Server } from './client';
import { SettingsManager } from './settings';
import { createHttpServer } from './routes/game';
import db from './database';
import { getModRouter } from './settings';
import { setApiServer } from './settings-api';
import { HTTP_PORT } from '../common/constants';

const createServer = async (type: string, port: number, handler: Handler, settingsManager: SettingsManager, server: Express): Promise<Server> => {
  handler.useEndpoints(server);

  const gameServer = new Server(settingsManager);

  handler.bootServer(gameServer);

  // Create WebSocket server on port + 1000 for Ruffle/browser support
  const wsPort = port + 1000;
  const httpServer = http.createServer();
  const wss = new WebSocketServer({ server: httpServer });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log(`A WebSocket client has connected to ${type}`);
    
    // Create a fake socket interface that mimics net.Socket
    const fakeSocket: any = {
      write: (data: string) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      },
      end: () => {
        ws.close();
      },
      destroy: () => {
        ws.terminate();
      },
      setEncoding: () => {},
      on: (event: string, callback: Function) => {
        if (event === 'data') {
          ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
            callback(Buffer.from(data as any));
          });
        } else if (event === 'close') {
          ws.on('close', callback as any);
        } else if (event === 'error') {
          ws.on('error', callback as any);
        }
      },
      removeAllListeners: () => {
        ws.removeAllListeners();
      },
      address: () => ({
        address: (ws as any)._socket?.remoteAddress || '',
        port: (ws as any)._socket?.remotePort || 0
      })
    };
    
    const client = new Client(
      gameServer,
      fakeSocket,
      type === 'Login' ? 'Login' : 'World'
    );
    
    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const dataStr = data.toString().split('\0')[0];
        handler.handle(client, dataStr);
      } catch (error) {
        console.error('Error processing WebSocket client data:', error);
      }
    });
    
    ws.on('close', () => {
      for (const method of handler.disconnectListeners) {
        method(client);
      }
      console.log('A WebSocket client has disconnected');
    });
    
    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  httpServer.listen(wsPort, () => {
    console.log(`${type} WebSocket server listening on port ${wsPort}`);
  });

  // Keep existing TCP server for native Flash clients
  await new Promise<void>((resolve, reject) => {
    net.createServer((socket) => {
      socket.setEncoding('utf8');
  
      console.log(`A client has connected to ${type}`);

      const client = new Client(
        gameServer,
        socket,
        type === 'Login' ? 'Login' : 'World'
      );
      socket.on('data', (data: Buffer) => {
        try {
          const dataStr = data.toString().split('\0')[0];
          handler.handle(client, dataStr);
        } catch (error) {
          console.error('Error processing client data:', error);
        }
      });
  
      socket.on('close', () => {
        for (const method of handler.disconnectListeners) {
          method(client);
        }
        console.log('A client has disconnected');
      });
  
      socket.on('error', (error) => {
        console.error(error);
      });
    }).listen(port, () => {
      console.log(`${type} server listening on port ${port}`);
      resolve();
    }).on('error', (err) => {
      reject(err)
    });
  })

  return gameServer;
};

const startServer = async (settingsManager: SettingsManager): Promise<void> => {
  db.loadDatabase();

  const server = express();

  server.use(getModRouter(settingsManager));

  const httpServer = createHttpServer(settingsManager);

  server.use(httpServer.router);

  
  // TODO in the future, "world" and "old" should be merged somewhat
  await createServer('Login', 6112, loginHandler, settingsManager, server);
  const world = await createServer('World', WORLD_PORT, worldHandler, settingsManager, server);
  const oldWorld = await createServer('Old', 6114, oldHandler, settingsManager, server);
  
  setApiServer(settingsManager, server, [world, oldWorld]);

  await new Promise<void>((resolve, reject) => {
    server.listen(HTTP_PORT, () => {
      console.log(`HTTP server listening on port ${HTTP_PORT}`);
      resolve();
    }).on('error', (err: Error) => {
      reject(err)
    })
  })
};

export default startServer;