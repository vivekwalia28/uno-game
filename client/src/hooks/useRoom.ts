import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

const SESSION_KEY = 'uno_session';

interface SessionData {
  roomCode: string;
  playerName: string;
}

function saveSession(data: SessionData) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function loadSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.roomCode && data.playerName) return data;
    return null;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function useRoom() {
  const { socket, isConnected } = useSocket();
  const { dispatch, addToast } = useGame();
  const navigate = useNavigate();

  const createRoom = useCallback((playerName: string) => {
    if (!socket) return;
    dispatch({ type: 'SET_PLAYER_NAME', name: playerName });
    socket.emit('room:create', { playerName }, (res) => {
      if (res.success && res.room) {
        saveSession({ roomCode: res.room.code, playerName });
        dispatch({ type: 'SET_ROOM', room: res.room });
        navigate('/lobby');
      } else {
        addToast(res.error || 'Failed to create room');
      }
    });
  }, [socket, dispatch, navigate, addToast]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    if (!socket) return;
    dispatch({ type: 'SET_PLAYER_NAME', name: playerName });
    socket.emit('room:join', { roomCode, playerName }, (res) => {
      if (res.success && res.room) {
        saveSession({ roomCode: res.room.code, playerName });
        dispatch({ type: 'SET_ROOM', room: res.room });
        navigate('/lobby');
      } else if (res.error === 'Game already in progress') {
        // Try rejoin instead — player may be reconnecting mid-game
        socket.emit('room:rejoin', { roomCode, playerName }, (rejoinRes) => {
          if (rejoinRes.success && rejoinRes.room) {
            saveSession({ roomCode: rejoinRes.room.code, playerName });
            dispatch({ type: 'SET_ROOM', room: rejoinRes.room });
            navigate('/game');
          } else {
            addToast(rejoinRes.error || 'Failed to join room');
          }
        });
      } else {
        addToast(res.error || 'Failed to join room');
      }
    });
  }, [socket, dispatch, navigate, addToast]);

  const rejoinRoom = useCallback((roomCode: string, playerName: string) => {
    if (!socket) return;
    dispatch({ type: 'SET_PLAYER_NAME', name: playerName });
    socket.emit('room:rejoin', { roomCode, playerName }, (res) => {
      if (res.success && res.room) {
        saveSession({ roomCode: res.room.code, playerName });
        dispatch({ type: 'SET_ROOM', room: res.room });
        // Navigate to game if engine is active (game:started will have set gameState)
        if (res.room.status === 'playing' || res.room.status === 'finished') {
          navigate('/game');
        } else {
          navigate('/lobby');
        }
      } else {
        // Rejoin failed — clear stale session and notify
        clearSession();
        addToast(res.error || 'Failed to rejoin room');
      }
    });
  }, [socket, dispatch, navigate, addToast]);

  const leaveRoom = useCallback(() => {
    if (!socket) return;
    socket.emit('room:leave');
    clearSession();
    dispatch({ type: 'RESET' });
    navigate('/');
  }, [socket, dispatch, navigate]);

  const startGame = useCallback(() => {
    if (!socket) return;
    socket.emit('room:start', (res) => {
      if (!res.success) {
        addToast(res.error || 'Failed to start game');
      }
    });
  }, [socket, addToast]);

  return { createRoom, joinRoom, rejoinRoom, leaveRoom, startGame };
}

export { loadSession, clearSession };
