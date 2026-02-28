import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';
import { roomStore } from '../room/room-store';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerSignalingHandlers(io: IO, socket: ClientSocket): void {
  socket.on('voice:join', () => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) return;

    // Notify all other peers in the room
    socket.to(roomCode).emit('voice:peer_joined', socket.id);
  });

  socket.on('voice:signal', (data) => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) return;

    // Relay the signal to the target peer
    io.to(data.targetId).emit('voice:signal', {
      fromId: socket.id,
      signal: data.signal,
    });
  });

  socket.on('voice:leave', () => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) return;

    socket.to(roomCode).emit('voice:peer_left', socket.id);
  });
}
