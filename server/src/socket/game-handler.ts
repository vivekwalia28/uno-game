import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';
import { roomStore } from '../room/room-store';
import { UNO_CALL_WINDOW_MS } from '../config';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Track auto-clear timeouts per room so we can cancel them
const unoClearTimeouts = new Map<string, NodeJS.Timeout>();

function broadcastGameState(io: IO, roomCode: string): void {
  const room = roomStore.get(roomCode);
  if (!room || !room.engine) return;

  for (const player of room.players) {
    if (player.isConnected) {
      const clientState = room.engine.getClientState(player.id);
      io.to(player.id).emit('game:state_updated', clientState);
    }
  }
}

export function registerGameHandlers(io: IO, socket: ClientSocket): void {
  socket.on('game:play_card', (data, cb) => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) return cb({ success: false, error: 'Not in a room' });

    const room = roomStore.get(roomCode);
    if (!room || !room.engine) return cb({ success: false, error: 'No game in progress' });

    const result = room.engine.playCard(socket.id, data.cardId, data.chosenColor);
    if (!result.success) return cb({ success: false, error: result.error });

    // Broadcast actions
    for (const action of result.actions) {
      io.to(roomCode).emit('game:action', action);
    }

    // Broadcast updated state
    broadcastGameState(io, roomCode);

    // Schedule auto-clear of mustCallUno after the call window expires
    if (room.engine.state.mustCallUno) {
      const targetId = room.engine.state.mustCallUno;
      // Clear any existing timeout for this room
      const existingTimeout = unoClearTimeouts.get(roomCode);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(() => {
        unoClearTimeouts.delete(roomCode);
        const currentRoom = roomStore.get(roomCode);
        if (!currentRoom || !currentRoom.engine) return;
        if (currentRoom.engine.clearMustCallUno(targetId)) {
          broadcastGameState(io, roomCode);
        }
      }, UNO_CALL_WINDOW_MS);
      unoClearTimeouts.set(roomCode, timeout);
    }

    // Check if game over
    if (room.engine.state.status === 'finished' && room.engine.state.winnerId) {
      io.to(roomCode).emit('game:over', room.engine.state.winnerId);
      room.status = 'finished';
    }

    cb({ success: true });
  });

  socket.on('game:draw_card', (cb) => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) return cb({ success: false, error: 'Not in a room' });

    const room = roomStore.get(roomCode);
    if (!room || !room.engine) return cb({ success: false, error: 'No game in progress' });

    const result = room.engine.drawCard(socket.id);
    if (!result.success) return cb({ success: false, error: result.error });

    // Broadcast actions
    for (const action of result.actions) {
      io.to(roomCode).emit('game:action', action);
    }

    // Send drawn card to the player
    if (result.card) {
      const player = room.engine.state.players.find(p => p.id === socket.id);
      if (player) {
        io.to(socket.id).emit('game:hand_updated', player.hand);
      }
    }

    // Broadcast updated state
    broadcastGameState(io, roomCode);

    cb({ success: true });
  });

  socket.on('game:call_uno', (cb) => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) return cb({ success: false, error: 'Not in a room' });

    const room = roomStore.get(roomCode);
    if (!room || !room.engine) return cb({ success: false, error: 'No game in progress' });

    const result = room.engine.callUno(socket.id);
    if (!result.success) return cb({ success: false, error: result.error });

    // Clear auto-clear timeout since UNO was called
    const callTimeout = unoClearTimeouts.get(roomCode);
    if (callTimeout) {
      clearTimeout(callTimeout);
      unoClearTimeouts.delete(roomCode);
    }

    for (const action of result.actions) {
      io.to(roomCode).emit('game:action', action);
    }

    io.to(roomCode).emit('toast', `${room.players.find(p => p.id === socket.id)?.name} called UNO!`);

    broadcastGameState(io, roomCode);

    cb({ success: true });
  });

  socket.on('game:catch_uno', (data, cb) => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) return cb({ success: false, error: 'Not in a room' });

    const room = roomStore.get(roomCode);
    if (!room || !room.engine) return cb({ success: false, error: 'No game in progress' });

    const result = room.engine.catchUno(socket.id, data.targetId);
    if (!result.success) return cb({ success: false, error: result.error });

    // Clear auto-clear timeout since player was caught
    const catchTimeout = unoClearTimeouts.get(roomCode);
    if (catchTimeout) {
      clearTimeout(catchTimeout);
      unoClearTimeouts.delete(roomCode);
    }

    for (const action of result.actions) {
      io.to(roomCode).emit('game:action', action);
    }

    const catcher = room.players.find(p => p.id === socket.id)?.name;
    const target = room.players.find(p => p.id === data.targetId)?.name;
    io.to(roomCode).emit('toast', `${catcher} caught ${target} not calling UNO! +2 cards`);

    broadcastGameState(io, roomCode);

    cb({ success: true });
  });
}
