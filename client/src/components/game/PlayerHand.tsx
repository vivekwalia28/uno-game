import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Card as CardType, Color } from 'shared/types';
import { useGame } from '../../context/GameContext';
import { useSocket } from '../../context/SocketContext';
import { useGameActions } from '../../hooks/useGame';
import { isValidPlay } from '../../utils/cardUtils';
import Card from './Card';
import ColorPicker from './ColorPicker';
import './PlayerHand.css';

export default function PlayerHand() {
  const { gameState } = useGame();
  const { socket } = useSocket();
  const { playCard } = useGameActions();
  const [colorPickerCard, setColorPickerCard] = useState<CardType | null>(null);

  if (!gameState || !socket) return null;

  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === socket.id;
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  const handleCardClick = (card: CardType) => {
    if (!isMyTurn) return;
    if (card.type === 'wild') {
      setColorPickerCard(card);
      return;
    }
    playCard(card.id);
  };

  const handleColorPick = (color: Color) => {
    if (colorPickerCard) {
      playCard(colorPickerCard.id, color);
      setColorPickerCard(null);
    }
  };

  // Sort hand: group by color, then by value
  const sortedHand = [...gameState.hand].sort((a, b) => {
    const colorOrder = { red: 0, blue: 1, green: 2, yellow: 3 };
    const aColor = a.type === 'wild' ? 4 : colorOrder[a.color];
    const bColor = b.type === 'wild' ? 4 : colorOrder[b.color];
    if (aColor !== bColor) return aColor - bColor;
    return 0;
  });

  return (
    <>
      <div className="player-hand-container">
        <div className="player-hand">
          <AnimatePresence>
            {sortedHand.map((card, i) => {
              const canPlay = isMyTurn && topCard && isValidPlay(card, topCard);
              return (
                <motion.div
                  key={card.id}
                  className="hand-card"
                  initial={{ y: 100, opacity: 0, rotate: 0 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    rotate: (i - (sortedHand.length - 1) / 2) * 3,
                  }}
                  exit={{ y: 100, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  style={{
                    marginLeft: i === 0 ? 0 : -20,
                    zIndex: i,
                  }}
                >
                  <Card
                    card={card}
                    playable={canPlay}
                    onClick={() => handleCardClick(card)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        {isMyTurn && <div className="turn-indicator">Your Turn!</div>}
      </div>
      {colorPickerCard && (
        <ColorPicker
          onPick={handleColorPick}
          onClose={() => setColorPickerCard(null)}
        />
      )}
    </>
  );
}
