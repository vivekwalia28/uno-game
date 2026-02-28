import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

export function useUnoCall() {
  const { socket } = useSocket();
  const { gameState } = useGame();
  const [canCallUno, setCanCallUno] = useState(false);
  const [canCatchUno, setCanCatchUno] = useState(false);

  useEffect(() => {
    if (!gameState || !socket) {
      setCanCallUno(false);
      setCanCatchUno(false);
      return;
    }

    const myId = socket.id;
    if (gameState.mustCallUno === myId) {
      setCanCallUno(true);
      setCanCatchUno(false);
    } else if (gameState.mustCallUno && gameState.mustCallUno !== myId) {
      setCanCallUno(false);
      setCanCatchUno(true);
    } else {
      setCanCallUno(false);
      setCanCatchUno(false);
    }
  }, [gameState, socket]);

  return { canCallUno, canCatchUno, targetId: gameState?.mustCallUno ?? null };
}
