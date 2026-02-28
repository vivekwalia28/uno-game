import { v4 as uuidv4 } from 'uuid';
import type { Card, Color, NumberValue, ActionType } from '../../../shared/types';

const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];
const NUMBERS: NumberValue[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const ACTIONS: ActionType[] = ['skip', 'reverse', 'draw_two'];

export function createDeck(): Card[] {
  const cards: Card[] = [];

  for (const color of COLORS) {
    // One 0 per color
    cards.push({ id: uuidv4(), type: 'number', color, value: 0 });

    // Two of each 1-9 per color
    for (const num of NUMBERS) {
      if (num === 0) continue;
      cards.push({ id: uuidv4(), type: 'number', color, value: num });
      cards.push({ id: uuidv4(), type: 'number', color, value: num });
    }

    // Two of each action per color
    for (const action of ACTIONS) {
      cards.push({ id: uuidv4(), type: 'action', color, action });
      cards.push({ id: uuidv4(), type: 'action', color, action });
    }
  }

  // 4 Wild cards
  for (let i = 0; i < 4; i++) {
    cards.push({ id: uuidv4(), type: 'wild', color: null, wildType: 'wild', chosenColor: null });
  }

  // 4 Wild Draw Four cards
  for (let i = 0; i < 4; i++) {
    cards.push({ id: uuidv4(), type: 'wild', color: null, wildType: 'wild_draw_four', chosenColor: null });
  }

  return cards;
}

/** Fisher-Yates shuffle (in-place) */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function createShuffledDeck(): Card[] {
  return shuffle(createDeck());
}
