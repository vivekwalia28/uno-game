import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

const CLIENT_UNO_TIMEOUT_MS = 4000;

export function useUnoCall() {
  const { socket } = useSocket();
  const { gameState } = useGame();
  const [canCallUno, setCanCallUno] = useState(false);
  const [canCatchUno, setCanCatchUno] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

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
      return; // No timeout needed
    }

    // Defensive client-side timeout to auto-clear UNO buttons
    timeoutRef.current = setTimeout(() => {
      setCanCallUno(false);
      setCanCatchUno(false);
      timeoutRef.current = null;
    }, CLIENT_UNO_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [gameState?.mustCallUno, socket]);

  return { canCallUno, canCatchUno, targetId: gameState?.mustCallUno ?? null };
}
