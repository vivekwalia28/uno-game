import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, leaveRoom, generateRoomCode } from '../room-manager';
import { roomStore } from '../room-store';

// Reset store between tests
beforeEach(() => {
  // Clear all rooms
  for (const room of roomStore.getAllRooms()) {
    roomStore.delete(room.code);
  }
});

describe('generateRoomCode', () => {
  it('generates a 6-character code', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it('only uses non-confusable characters', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateRoomCode()));
    expect(codes.size).toBe(100);
  });
});

describe('createRoom', () => {
  it('creates a room with the player as host', () => {
    const room = createRoom('socket-1', 'Alice');
    expect(room.players).toHaveLength(1);
    expect(room.players[0].name).toBe('Alice');
    expect(room.players[0].isHost).toBe(true);
    expect(room.hostId).toBe('socket-1');
    expect(room.status).toBe('waiting');
  });

  it('stores the room', () => {
    const room = createRoom('socket-1', 'Alice');
    expect(roomStore.get(room.code)).toBeDefined();
  });
});

describe('joinRoom', () => {
  it('allows joining an existing room', () => {
    const room = createRoom('socket-1', 'Alice');
    const result = joinRoom(room.code, 'socket-2', 'Bob');
    expect(result.success).toBe(true);
    expect(result.room!.players).toHaveLength(2);
  });

  it('rejects joining non-existent room', () => {
    const result = joinRoom('XXXXXX', 'socket-2', 'Bob');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Room not found');
  });

  it('rejects duplicate names', () => {
    const room = createRoom('socket-1', 'Alice');
    const result = joinRoom(room.code, 'socket-2', 'Alice');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Name already taken');
  });
});

describe('leaveRoom', () => {
  it('removes player from room', () => {
    const room = createRoom('socket-1', 'Alice');
    joinRoom(room.code, 'socket-2', 'Bob');

    const result = leaveRoom('socket-2');
    expect(result.room!.players).toHaveLength(1);
    expect(result.removedPlayer!.name).toBe('Bob');
  });

  it('transfers host when host leaves', () => {
    const room = createRoom('socket-1', 'Alice');
    joinRoom(room.code, 'socket-2', 'Bob');

    const result = leaveRoom('socket-1');
    expect(result.newHost).toBe('socket-2');
  });

  it('deletes room when last player leaves', () => {
    const room = createRoom('socket-1', 'Alice');
    leaveRoom('socket-1');
    expect(roomStore.get(room.code)).toBeUndefined();
  });
});
