import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';
import { roomStore } from '../room/room-store';
import { toPublicRoom } from '../room/room-manager';
import { RECONNECT_TIMEOUT_MS } from '../config';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function handleDisconnect(io: IO, socket: ClientSocket): void {
  const roomCode = roomStore.getSocketRoom(socket.id);
  if (!roomCode) return;

  const room = roomStore.get(roomCode);
  if (!room) return;

  const player = room.players.find(p => p.id === socket.id);
  if (!player) return;

  if (room.status === 'waiting') {
    // In lobby, just remove the player
    room.players = room.players.filter(p => p.id !== socket.id);
    room.playerNames.delete(player.name);
    roomStore.removeSocket(socket.id);

    if (room.players.length === 0) {
      roomStore.delete(roomCode);
      return;
    }

    // Transfer host if needed
    if (room.hostId === socket.id) {
      const nextHost = room.players[0];
      room.hostId = nextHost.id;
      nextHost.isHost = true;
      io.to(roomCode).emit('room:host_changed', nextHost.id);
    }

    io.to(roomCode).emit('room:player_left', socket.id);
    io.to(roomCode).emit('room:updated', toPublicRoom(room));
  } else if (room.status === 'playing') {
    // In game, mark as disconnected for reconnection
    player.isConnected = false;
    player.disconnectedAt = Date.now();
    io.to(roomCode).emit('player:disconnected', socket.id);

    // Notify game engine
    if (room.engine) {
      room.engine.disconnectPlayer(socket.id);

      // Broadcast updated state
      for (const p of room.players) {
        if (p.isConnected) {
          io.to(p.id).emit('game:state_updated', room.engine.getClientState(p.id));
        }
      }
    }

    // Set timeout to remove if they don't reconnect
    setTimeout(() => {
      const currentRoom = roomStore.get(roomCode);
      if (!currentRoom) return;
      const currentPlayer = currentRoom.players.find(p => p.name === player.name);
      if (currentPlayer && !currentPlayer.isConnected) {
        currentRoom.players = currentRoom.players.filter(p => p.name !== player.name);
        currentRoom.playerNames.delete(player.name);
        if (currentRoom.players.length === 0) {
          roomStore.delete(roomCode);
        }
      }
    }, RECONNECT_TIMEOUT_MS);
  }
}

export function handleReconnect(io: IO, socket: ClientSocket): void {
  // Reconnection is handled via room:join with same name
  // The room-handler checks for existing disconnected players
}
