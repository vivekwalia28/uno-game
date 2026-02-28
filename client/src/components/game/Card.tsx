import { motion } from 'framer-motion';
import type { Card as CardType } from 'shared/types';
import './Card.css';

interface CardProps {
  card: CardType;
  playable?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
  small?: boolean;
}

function getCardColor(card: CardType): string {
  if (card.type === 'wild') return card.chosenColor || 'black';
  return card.color;
}

function getCardDisplay(card: CardType): { value: string; symbol: string } {
  if (card.type === 'number') {
    return { value: String(card.value), symbol: String(card.value) };
  }
  if (card.type === 'action') {
    switch (card.action) {
      case 'skip': return { value: '⊘', symbol: 'SKIP' };
      case 'reverse': return { value: '⟲', symbol: 'REV' };
      case 'draw_two': return { value: '+2', symbol: '+2' };
    }
  }
  if (card.type === 'wild') {
    return card.wildType === 'wild_draw_four'
      ? { value: '+4', symbol: 'WILD +4' }
      : { value: 'W', symbol: 'WILD' };
  }
  return { value: '?', symbol: '?' };
}

export default function Card({ card, playable, faceDown, onClick, small }: CardProps) {
  if (faceDown) {
    return (
      <motion.div
        className={`card card-back ${small ? 'card-small' : ''}`}
        whileHover={onClick ? { y: -4 } : undefined}
        onClick={onClick}
      >
        <div className="card-back-design">
          <span>UNO</span>
        </div>
      </motion.div>
    );
  }

  const color = getCardColor(card);
  const { value, symbol } = getCardDisplay(card);
  const isWild = card.type === 'wild';

  return (
    <motion.div
      className={`card card-${color} ${playable ? 'card-playable' : ''} ${small ? 'card-small' : ''} ${isWild && !card.chosenColor ? 'card-wild-rainbow' : ''}`}
      whileHover={playable ? { y: -20, scale: 1.05 } : undefined}
      whileTap={playable ? { scale: 0.95 } : undefined}
      onClick={playable ? onClick : undefined}
      layout
    >
      <span className="card-corner card-corner-top">{value}</span>
      <div className="card-center">
        <div className="card-oval">
          <span className="card-symbol">{symbol}</span>
        </div>
      </div>
      <span className="card-corner card-corner-bottom">{value}</span>
    </motion.div>
  );
}
