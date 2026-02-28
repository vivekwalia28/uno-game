import type { Player, RoomStatus } from '../../../shared/types';
import { UnoEngine } from '../engine/uno-engine';

export interface ServerRoom {
  code: string;
  players: Player[];
  status: RoomStatus;
  hostId: string;
  maxPlayers: number;
  createdAt: number;
  engine: UnoEngine | null;
  // Track player name → socket id mapping for reconnection
  playerNames: Map<string, string>;
}

class RoomStore {
  private rooms = new Map<string, ServerRoom>();
  // socket id → room code for quick lookup
  private socketToRoom = new Map<string, string>();

  create(room: ServerRoom): void {
    this.rooms.set(room.code, room);
  }

  get(code: string): ServerRoom | undefined {
    return this.rooms.get(code);
  }

  delete(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      for (const player of room.players) {
        this.socketToRoom.delete(player.id);
      }
    }
    this.rooms.delete(code);
  }

  size(): number {
    return this.rooms.size;
  }

  setSocketRoom(socketId: string, roomCode: string): void {
    this.socketToRoom.set(socketId, roomCode);
  }

  getSocketRoom(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }

  removeSocket(socketId: string): void {
    this.socketToRoom.delete(socketId);
  }

  getAllRooms(): ServerRoom[] {
    return Array.from(this.rooms.values());
  }
}

export const roomStore = new RoomStore();
