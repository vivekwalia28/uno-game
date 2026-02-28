import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';
import { roomStore } from '../room/room-store';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

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

    for (const action of result.actions) {
      io.to(roomCode).emit('game:action', action);
    }

    io.to(roomCode).emit('toast', `${room.players.find(p => p.id === socket.id)?.name} called UNO!`);

    cb({ success: true });
  });

  socket.on('game:catch_uno', (data, cb) => {
    const roomCode = roomStore.getSocketRoom(socket.id);
    if (!roomCode) return cb({ success: false, error: 'Not in a room' });

    const room = roomStore.get(roomCode);
    if (!room || !room.engine) return cb({ success: false, error: 'No game in progress' });

    const result = room.engine.catchUno(socket.id, data.targetId);
    if (!result.success) return cb({ success: false, error: result.error });

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
