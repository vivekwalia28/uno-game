import { useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGame as useGameContext } from '../context/GameContext';
import type { Color } from 'shared/types';

export function useGameActions() {
  const { socket } = useSocket();
  const { addToast } = useGameContext();

  const playCard = useCallback((cardId: string, chosenColor?: Color) => {
    if (!socket) return;
    socket.emit('game:play_card', { cardId, chosenColor }, (res) => {
      if (!res.success) {
        addToast(res.error || 'Cannot play that card');
      }
    });
  }, [socket, addToast]);

  const drawCard = useCallback(() => {
    if (!socket) return;
    socket.emit('game:draw_card', (res) => {
      if (!res.success) {
        addToast(res.error || 'Cannot draw');
      }
    });
  }, [socket, addToast]);

  const callUno = useCallback(() => {
    if (!socket) return;
    socket.emit('game:call_uno', (res) => {
      if (!res.success) {
        // silent fail for UNO calls
      }
    });
  }, [socket]);

  const catchUno = useCallback((targetId: string) => {
    if (!socket) return;
    socket.emit('game:catch_uno', { targetId }, (res) => {
      if (!res.success) {
        addToast(res.error || 'Cannot catch');
      }
    });
  }, [socket, addToast]);

  return { playCard, drawCard, callUno, catchUno };
}
