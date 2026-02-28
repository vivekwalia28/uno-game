import { motion } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import { useRoom } from '../../hooks/useRoom';
import './GameOverModal.css';

export default function GameOverModal() {
  const { gameState } = useGame();
  const { leaveRoom } = useRoom();

  if (!gameState || !gameState.winnerId) return null;

  const winner = gameState.players.find(p => p.id === gameState.winnerId);

  return (
    <motion.div
      className="game-over-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="game-over-modal"
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <h2 className="game-over-title">Game Over!</h2>
        <div className="winner-display">
          <div className="winner-avatar">
            {winner?.name[0].toUpperCase()}
          </div>
          <p className="winner-name">{winner?.name} wins!</p>
        </div>
        <div className="game-over-actions">
          <button className="btn btn-primary" onClick={leaveRoom}>
            Back to Home
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
