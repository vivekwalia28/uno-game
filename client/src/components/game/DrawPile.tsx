import { motion } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import { useSocket } from '../../context/SocketContext';
import { useGameActions } from '../../hooks/useGame';
import Card from './Card';
import './DrawPile.css';

export default function DrawPile() {
  const { gameState } = useGame();
  const { socket } = useSocket();
  const { drawCard } = useGameActions();

  if (!gameState || !socket) return null;

  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === socket.id;

  return (
    <motion.div
      className={`draw-pile ${isMyTurn ? 'draw-pile-active' : ''}`}
      whileHover={isMyTurn ? { scale: 1.05 } : undefined}
      whileTap={isMyTurn ? { scale: 0.95 } : undefined}
      onClick={isMyTurn ? drawCard : undefined}
    >
      <Card card={{ id: '', type: 'number', color: 'red', value: 0 }} faceDown />
      <div className="draw-pile-count">{gameState.drawPileCount}</div>
      {isMyTurn && <div className="draw-pile-hint">Draw</div>}
    </motion.div>
  );
}
