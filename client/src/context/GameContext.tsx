import { createContext, useContext, useReducer, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Room, ClientGameState, GameAction, Card } from 'shared/types';
import { useSocket } from './SocketContext';

interface GameContextState {
  room: Room | null;
  gameState: ClientGameState | null;
  playerName: string;
  toasts: Array<{ id: number; message: string }>;
}

type GameActionType =
  | { type: 'SET_ROOM'; room: Room | null }
  | { type: 'SET_PLAYER_NAME'; name: string }
  | { type: 'SET_GAME_STATE'; state: ClientGameState }
  | { type: 'UPDATE_HAND'; hand: Card[] }
  | { type: 'GAME_ACTION'; action: GameAction }
  | { type: 'ADD_TOAST'; message: string }
  | { type: 'REMOVE_TOAST'; id: number }
  | { type: 'RESET' };

let toastId = 0;

function gameReducer(state: GameContextState, action: GameActionType): GameContextState {
  switch (action.type) {
    case 'SET_ROOM':
      return { ...state, room: action.room };
    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.name };
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.state };
    case 'UPDATE_HAND':
      if (!state.gameState) return state;
      return { ...state, gameState: { ...state.gameState, hand: action.hand } };
    case 'GAME_ACTION':
      if (!state.gameState) return state;
      return { ...state, gameState: { ...state.gameState, lastAction: action.action } };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, { id: ++toastId, message: action.message }] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };
    case 'RESET':
      return { ...state, room: null, gameState: null };
    default:
      return state;
  }
}

interface GameContextType extends GameContextState {
  dispatch: React.Dispatch<GameActionType>;
  addToast: (message: string) => void;
}

const GameContext = createContext<GameContextType>({
  room: null,
  gameState: null,
  playerName: '',
  toasts: [],
  dispatch: () => {},
  addToast: () => {},
});

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, {
    room: null,
    gameState: null,
    playerName: '',
    toasts: [],
  });
  const { socket } = useSocket();
  const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const addToast = useCallback((message: string) => {
    const id = ++toastId;
    dispatch({ type: 'ADD_TOAST', message });
    const timeout = setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', id });
      timeoutsRef.current.delete(id);
    }, 4000);
    timeoutsRef.current.set(id, timeout);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('room:updated', (room) => {
      dispatch({ type: 'SET_ROOM', room });
    });

    socket.on('game:started', (state) => {
      dispatch({ type: 'SET_GAME_STATE', state });
    });

    socket.on('game:state_updated', (state) => {
      dispatch({ type: 'SET_GAME_STATE', state });
    });

    socket.on('game:hand_updated', (hand) => {
      dispatch({ type: 'UPDATE_HAND', hand });
    });

    socket.on('game:action', (action) => {
      dispatch({ type: 'GAME_ACTION', action });
    });

    socket.on('toast', (message) => {
      addToast(message);
    });

    socket.on('game:error', (error) => {
      addToast(error);
    });

    return () => {
      socket.off('room:updated');
      socket.off('game:started');
      socket.off('game:state_updated');
      socket.off('game:hand_updated');
      socket.off('game:action');
      socket.off('toast');
      socket.off('game:error');
    };
  }, [socket, addToast]);

  return (
    <GameContext.Provider value={{ ...state, dispatch, addToast }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
