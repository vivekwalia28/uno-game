import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, createShuffledDeck } from '../deck';

describe('deck', () => {
  it('creates a standard 108-card UNO deck', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(108);
  });

  it('has correct number of each card type', () => {
    const deck = createDeck();

    const numberCards = deck.filter(c => c.type === 'number');
    // 4 zeros + 4 colors × 9 numbers × 2 = 76
    expect(numberCards).toHaveLength(76);

    const actionCards = deck.filter(c => c.type === 'action');
    // 4 colors × 3 actions × 2 = 24
    expect(actionCards).toHaveLength(24);

    const wildCards = deck.filter(c => c.type === 'wild');
    // 4 wild + 4 wild draw four = 8
    expect(wildCards).toHaveLength(8);
  });

  it('has unique IDs for all cards', () => {
    const deck = createDeck();
    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(108);
  });

  it('shuffle produces a different order', () => {
    const deck1 = createDeck();
    const deck2 = [...deck1];
    shuffle(deck2);

    // Very unlikely to be in the same order
    const sameOrder = deck1.every((c, i) => c.id === deck2[i].id);
    expect(sameOrder).toBe(false);
  });

  it('shuffle preserves all cards', () => {
    const deck = createDeck();
    const shuffled = shuffle([...deck]);
    expect(shuffled).toHaveLength(108);

    const originalIds = new Set(deck.map(c => c.id));
    const shuffledIds = new Set(shuffled.map(c => c.id));
    expect(shuffledIds).toEqual(originalIds);
  });

  it('createShuffledDeck returns 108 shuffled cards', () => {
    const deck = createShuffledDeck();
    expect(deck).toHaveLength(108);
  });
});
