import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';
import { roomStore } from '../room/room-store';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Track which sockets are in voice per room
const voiceMembers = new Map<string, Set<string>>();

export function registerSignalingHandlers(io: IO, socket: ClientSocket): void {
  socket.on('voice:join', () => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) {
      console.log(`[voice] ${socket.id} tried to join voice but not in a room`);
      return;
    }

    console.log(`[voice] ${socket.id} joining voice in room ${roomCode}`);

    // Get or create voice member set for this room
    if (!voiceMembers.has(roomCode)) {
      voiceMembers.set(roomCode, new Set());
    }
    const members = voiceMembers.get(roomCode)!;

    // Tell the new joiner about ALL existing voice members so they can initiate connections
    for (const existingMemberId of members) {
      console.log(`[voice] Telling ${socket.id} about existing voice member ${existingMemberId}`);
      io.to(socket.id).emit('voice:peer_joined', existingMemberId);
    }

    // Add this socket to voice members
    members.add(socket.id);

    // Notify all existing voice members about the new joiner
    socket.to(roomCode).emit('voice:peer_joined', socket.id);
    console.log(`[voice] Broadcast peer_joined for ${socket.id} to room ${roomCode} (${members.size} total voice members)`);
  });

  socket.on('voice:signal', (data) => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) return;

    console.log(`[voice] Signal relay: ${socket.id} -> ${data.targetId}`);

    // Relay the signal to the target peer
    io.to(data.targetId).emit('voice:signal', {
      fromId: socket.id,
      signal: data.signal,
    });
  });

  socket.on('voice:leave', () => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) return;

    console.log(`[voice] ${socket.id} leaving voice in room ${roomCode}`);

    // Remove from voice members
    const members = voiceMembers.get(roomCode);
    if (members) {
      members.delete(socket.id);
      if (members.size === 0) voiceMembers.delete(roomCode);
    }

    socket.to(roomCode).emit('voice:peer_left', socket.id);
  });

  // Clean up voice membership on disconnect
  socket.on('disconnect', () => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (roomCode) {
      const members = voiceMembers.get(roomCode);
      if (members) {
        members.delete(socket.id);
        if (members.size === 0) voiceMembers.delete(roomCode);
      }
    }
  });
}
