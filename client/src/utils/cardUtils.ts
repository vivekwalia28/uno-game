import type { Card, Color } from 'shared/types';

/** Client-side card validation (mirrors server rules.ts) */
export function isValidPlay(card: Card, topCard: Card): boolean {
  if (card.type === 'wild') return true;

  const topColor = getEffectiveColor(topCard);
  if (card.color === topColor) return true;

  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
  if (card.type === 'action' && topCard.type === 'action' && card.action === topCard.action) return true;

  return false;
}

export function getEffectiveColor(card: Card): Color | null {
  if (card.type === 'wild') return card.chosenColor;
  return card.color;
}

export function getCardColorCSS(card: Card): string {
  if (card.type === 'wild') {
    return card.chosenColor || 'wild';
  }
  return card.color;
}
