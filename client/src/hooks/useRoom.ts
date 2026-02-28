import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

export function useRoom() {
  const { socket } = useSocket();
  const { dispatch, addToast } = useGame();
  const navigate = useNavigate();

  const createRoom = useCallback((playerName: string) => {
    if (!socket) return;
    dispatch({ type: 'SET_PLAYER_NAME', name: playerName });
    socket.emit('room:create', { playerName }, (res) => {
      if (res.success && res.room) {
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
        dispatch({ type: 'SET_ROOM', room: res.room });
        navigate('/lobby');
      } else {
        addToast(res.error || 'Failed to join room');
      }
    });
  }, [socket, dispatch, navigate, addToast]);

  const leaveRoom = useCallback(() => {
    if (!socket) return;
    socket.emit('room:leave');
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

  return { createRoom, joinRoom, leaveRoom, startGame };
}
