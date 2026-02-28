import type { Player, Room } from '../../../shared/types';
import { roomStore, ServerRoom } from './room-store';
import { MAX_PLAYERS, ROOM_CODE_LENGTH } from '../config';

// Characters that avoid confusion (no I/1/O/0)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code: string;
  do {
    code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (roomStore.get(code)); // Ensure uniqueness
  return code;
}

export function createRoom(socketId: string, playerName: string): ServerRoom {
  const code = generateRoomCode();
  const player: Player = {
    id: socketId,
    name: playerName,
    isHost: true,
    isConnected: true,
    cardCount: 0,
  };

  const room: ServerRoom = {
    code,
    players: [player],
    status: 'waiting',
    hostId: socketId,
    maxPlayers: MAX_PLAYERS,
    createdAt: Date.now(),
    engine: null,
    playerNames: new Map([[playerName, socketId]]),
  };

  roomStore.create(room);
  roomStore.setSocketRoom(socketId, code);
  return room;
}

export function joinRoom(roomCode: string, socketId: string, playerName: string): { success: boolean; room?: ServerRoom; error?: string } {
  const room = roomStore.get(roomCode);
  if (!room) return { success: false, error: 'Room not found' };
  if (room.status !== 'waiting') return { success: false, error: 'Game already in progress' };
  if (room.players.length >= room.maxPlayers) return { success: false, error: 'Room is full' };
  if (room.players.some(p => p.name === playerName)) return { success: false, error: 'Name already taken' };

  const player: Player = {
    id: socketId,
    name: playerName,
    isHost: false,
    isConnected: true,
    cardCount: 0,
  };

  room.players.push(player);
  room.playerNames.set(playerName, socketId);
  roomStore.setSocketRoom(socketId, roomCode);
  return { success: true, room };
}

export function leaveRoom(socketId: string): { room?: ServerRoom; removedPlayer?: Player; newHost?: string } {
  const roomCode = roomStore.getSocketRoom(socketId);
  if (!roomCode) return {};

  const room = roomStore.get(roomCode);
  if (!room) return {};

  const playerIndex = room.players.findIndex(p => p.id === socketId);
  if (playerIndex === -1) return {};

  const removedPlayer = room.players[playerIndex];
  room.players.splice(playerIndex, 1);
  room.playerNames.delete(removedPlayer.name);
  roomStore.removeSocket(socketId);

  // If room is empty, delete it
  if (room.players.length === 0) {
    roomStore.delete(roomCode);
    return { removedPlayer };
  }

  // Transfer host if needed
  let newHost: string | undefined;
  if (room.hostId === socketId) {
    const nextHost = room.players.find(p => p.isConnected) || room.players[0];
    room.hostId = nextHost.id;
    nextHost.isHost = true;
    removedPlayer.isHost = false;
    newHost = nextHost.id;
  }

  return { room, removedPlayer, newHost };
}

export function toPublicRoom(room: ServerRoom): Room {
  return {
    code: room.code,
    players: room.players,
    status: room.status,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    createdAt: room.createdAt,
  };
}
