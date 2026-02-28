import { describe, it, expect } from 'vitest';
import { isValidPlay, getDrawPenalty, skipsNextPlayer, reversesDirection, requiresColorChoice } from '../rules';
import type { Card } from '../../../../shared/types';

const red5: Card = { id: '1', type: 'number', color: 'red', value: 5 };
const blue5: Card = { id: '2', type: 'number', color: 'blue', value: 5 };
const red3: Card = { id: '3', type: 'number', color: 'red', value: 3 };
const blueSkip: Card = { id: '4', type: 'action', color: 'blue', action: 'skip' };
const redSkip: Card = { id: '5', type: 'action', color: 'red', action: 'skip' };
const redReverse: Card = { id: '6', type: 'action', color: 'red', action: 'reverse' };
const redDrawTwo: Card = { id: '7', type: 'action', color: 'red', action: 'draw_two' };
const wild: Card = { id: '8', type: 'wild', color: null, wildType: 'wild', chosenColor: null };
const wildBlue: Card = { id: '9', type: 'wild', color: null, wildType: 'wild', chosenColor: 'blue' };
const wildDraw4: Card = { id: '10', type: 'wild', color: null, wildType: 'wild_draw_four', chosenColor: null };

describe('isValidPlay', () => {
  it('allows matching by color', () => {
    expect(isValidPlay(red3, red5)).toBe(true);
  });

  it('allows matching by number', () => {
    expect(isValidPlay(blue5, red5)).toBe(true);
  });

  it('rejects different color and number', () => {
    expect(isValidPlay({ id: '11', type: 'number', color: 'green', value: 7 }, red5)).toBe(false);
  });

  it('allows wild cards on anything', () => {
    expect(isValidPlay(wild, red5)).toBe(true);
    expect(isValidPlay(wildDraw4, blueSkip)).toBe(true);
  });

  it('allows matching action type', () => {
    expect(isValidPlay(redSkip, blueSkip)).toBe(true);
  });

  it('allows same color action', () => {
    expect(isValidPlay(redReverse, red5)).toBe(true);
  });

  it('uses chosen color for wild top card', () => {
    expect(isValidPlay(blue5, wildBlue)).toBe(true);
    expect(isValidPlay(red5, wildBlue)).toBe(false);
  });
});

describe('getDrawPenalty', () => {
  it('returns 0 for normal cards', () => {
    expect(getDrawPenalty(red5)).toBe(0);
  });

  it('returns 2 for draw two', () => {
    expect(getDrawPenalty(redDrawTwo)).toBe(2);
  });

  it('returns 4 for wild draw four', () => {
    expect(getDrawPenalty(wildDraw4)).toBe(4);
  });
});

describe('skipsNextPlayer', () => {
  it('returns true for skip cards', () => {
    expect(skipsNextPlayer(blueSkip, 3)).toBe(true);
  });

  it('returns true for draw two', () => {
    expect(skipsNextPlayer(redDrawTwo, 3)).toBe(true);
  });

  it('returns true for wild draw four', () => {
    expect(skipsNextPlayer(wildDraw4, 3)).toBe(true);
  });

  it('returns true for reverse in 2-player', () => {
    expect(skipsNextPlayer(redReverse, 2)).toBe(true);
  });

  it('returns false for reverse in 3+ player', () => {
    expect(skipsNextPlayer(redReverse, 3)).toBe(false);
  });

  it('returns false for number cards', () => {
    expect(skipsNextPlayer(red5, 3)).toBe(false);
  });
});

describe('reversesDirection', () => {
  it('returns true for reverse', () => {
    expect(reversesDirection(redReverse)).toBe(true);
  });

  it('returns false for others', () => {
    expect(reversesDirection(red5)).toBe(false);
    expect(reversesDirection(blueSkip)).toBe(false);
  });
});

describe('requiresColorChoice', () => {
  it('returns true for wild cards', () => {
    expect(requiresColorChoice(wild)).toBe(true);
    expect(requiresColorChoice(wildDraw4)).toBe(true);
  });

  it('returns false for non-wild', () => {
    expect(requiresColorChoice(red5)).toBe(false);
    expect(requiresColorChoice(blueSkip)).toBe(false);
  });
});
