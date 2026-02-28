import type { Card, Color } from '../../../shared/types';

/** Check if a card can be played on top of the current discard */
export function isValidPlay(card: Card, topCard: Card): boolean {
  // Wild cards can always be played
  if (card.type === 'wild') return true;

  // Get the effective color of the top card (considering wild chosen color)
  const topColor = getEffectiveColor(topCard);

  // Match by color
  if (card.color === topColor) return true;

  // Match by value (number cards)
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
    return true;
  }

  // Match by action type (action cards)
  if (card.type === 'action' && topCard.type === 'action' && card.action === topCard.action) {
    return true;
  }

  return false;
}

/** Get the effective color of a card (resolves wild chosen color) */
export function getEffectiveColor(card: Card): Color | null {
  if (card.type === 'wild') return card.chosenColor;
  return card.color;
}

/** Determine if a card is a special card that affects gameplay */
export function isSpecialCard(card: Card): boolean {
  return card.type === 'action' || card.type === 'wild';
}

/** Get how many cards the next player must draw (0 for normal cards) */
export function getDrawPenalty(card: Card): number {
  if (card.type === 'action' && card.action === 'draw_two') return 2;
  if (card.type === 'wild' && card.wildType === 'wild_draw_four') return 4;
  return 0;
}

/** Check if the card skips the next player's turn */
export function skipsNextPlayer(card: Card, playerCount: number): boolean {
  if (card.type === 'action' && card.action === 'skip') return true;
  if (card.type === 'action' && card.action === 'draw_two') return true;
  if (card.type === 'wild' && card.wildType === 'wild_draw_four') return true;
  // Reverse in 2-player acts as skip
  if (card.type === 'action' && card.action === 'reverse' && playerCount === 2) return true;
  return false;
}

/** Check if the card reverses direction */
export function reversesDirection(card: Card): boolean {
  return card.type === 'action' && card.action === 'reverse';
}

/** Check if a card requires a color choice */
export function requiresColorChoice(card: Card): boolean {
  return card.type === 'wild';
}

/** Get card display value for logging */
export function cardToString(card: Card): string {
  if (card.type === 'number') return `${card.color} ${card.value}`;
  if (card.type === 'action') return `${card.color} ${card.action}`;
  return card.wildType;
}
