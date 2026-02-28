import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';
import { createRoom, joinRoom, leaveRoom, toPublicRoom } from '../room/room-manager';
import { roomStore } from '../room/room-store';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerRoomHandlers(io: IO, socket: ClientSocket): void {
  socket.on('room:create', (data, cb) => {
    const { playerName } = data;
    if (!playerName || playerName.trim().length === 0) {
      return cb({ success: false, error: 'Name is required' });
    }

    const room = createRoom(socket.id, playerName.trim());
    socket.join(room.code);
    cb({ success: true, room: toPublicRoom(room) });
  });

  socket.on('room:join', (data, cb) => {
    const { roomCode, playerName } = data;
    if (!playerName || playerName.trim().length === 0) {
      return cb({ success: false, error: 'Name is required' });
    }
    if (!roomCode || roomCode.trim().length === 0) {
      return cb({ success: false, error: 'Room code is required' });
    }

    const result = joinRoom(roomCode.toUpperCase().trim(), socket.id, playerName.trim());
    if (!result.success || !result.room) {
      return cb({ success: false, error: result.error });
    }

    socket.join(result.room.code);
    const publicRoom = toPublicRoom(result.room);

    // Notify others in the room
    socket.to(result.room.code).emit('room:player_joined', publicRoom.players[publicRoom.players.length - 1]);
    io.to(result.room.code).emit('room:updated', publicRoom);

    cb({ success: true, room: publicRoom });
  });

  socket.on('room:leave', () => {
    const { room, removedPlayer, newHost } = leaveRoom(socket.id);
    const roomCode = room?.code;

    if (roomCode) {
      socket.leave(roomCode);

      if (removedPlayer) {
        io.to(roomCode).emit('room:player_left', removedPlayer.id);
      }
      if (newHost) {
        io.to(roomCode).emit('room:host_changed', newHost);
      }
      if (room) {
        io.to(roomCode).emit('room:updated', toPublicRoom(room));
      }
    }
  });

  socket.on('room:start', (cb) => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) return cb({ success: false, error: 'Not in a room' });

    const room = roomStore.get(roomCode);
    if (!room) return cb({ success: false, error: 'Room not found' });
    if (room.hostId !== socket.id) return cb({ success: false, error: 'Only host can start' });
    if (room.players.length < 2) return cb({ success: false, error: 'Need at least 2 players' });
    if (room.status !== 'waiting') return cb({ success: false, error: 'Game already started' });

    // Import and start game engine
    const { UnoEngine } = require('../engine/uno-engine');
    const engine = new UnoEngine(
      room.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost }))
    );
    engine.startGame();
    room.engine = engine;
    room.status = 'playing';

    // Send personalized game state to each player
    for (const player of room.players) {
      const clientState = engine.getClientState(player.id);
      io.to(player.id).emit('game:started', clientState);
    }

    cb({ success: true });
  });
}
