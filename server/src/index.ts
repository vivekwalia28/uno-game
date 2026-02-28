import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { PORT, CORS_ORIGIN } from './config';
import { registerRoomHandlers } from './socket/room-handler';
import { registerGameHandlers } from './socket/game-handler';
import { registerSignalingHandlers } from './socket/signaling-handler';
import { handleDisconnect, handleReconnect } from './socket/connection-handler';
import { roomStore } from './room/room-store';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Serve static client build in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomStore.size() });
});

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerSignalingHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    handleDisconnect(io, socket);
  });

  // Check for reconnection
  handleReconnect(io, socket);
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`UNO server running on port ${PORT}`);
});

export { io };
