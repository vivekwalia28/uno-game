import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import Card from './Card';
import './DiscardPile.css';

export default function DiscardPile() {
  const { gameState } = useGame();

  if (!gameState) return null;

  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  if (!topCard) return null;

  return (
    <div className="discard-pile">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={topCard.id}
          initial={{ scale: 0.5, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: Math.random() * 20 - 10, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <Card card={topCard} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
