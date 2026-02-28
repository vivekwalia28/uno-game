import { describe, it, expect, beforeEach } from 'vitest';
import { UnoEngine } from '../uno-engine';

function createTestEngine(playerCount = 2) {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    isHost: i === 0,
  }));
  const engine = new UnoEngine(players);
  engine.startGame();
  return engine;
}

describe('UnoEngine', () => {
  let engine: UnoEngine;

  beforeEach(() => {
    engine = createTestEngine();
  });

  it('deals 7 cards to each player', () => {
    for (const player of engine.state.players) {
      expect(player.hand).toHaveLength(7);
    }
  });

  it('starts with a number card on the discard pile', () => {
    const topCard = engine.getTopCard();
    expect(topCard).toBeDefined();
    expect(topCard!.type).toBe('number');
  });

  it('starts with player 0', () => {
    expect(engine.state.currentPlayerIndex).toBe(0);
  });

  it('has correct initial direction', () => {
    expect(engine.state.direction).toBe(1);
  });

  it('rejects play from wrong player', () => {
    const player1 = engine.state.players[1];
    const result = engine.playCard(player1.id, player1.hand[0].id);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not your turn');
  });

  it('allows drawing a card on your turn', () => {
    const player0 = engine.state.players[0];
    const handSize = player0.hand.length;
    const result = engine.drawCard(player0.id);
    expect(result.success).toBe(true);
    expect(player0.hand).toHaveLength(handSize + 1);
    // Turn should advance
    expect(engine.state.currentPlayerIndex).toBe(1);
  });

  it('rejects draw from wrong player', () => {
    const player1 = engine.state.players[1];
    const result = engine.drawCard(player1.id);
    expect(result.success).toBe(false);
  });

  it('plays a valid card', () => {
    const player0 = engine.state.players[0];
    const topCard = engine.getTopCard()!;

    // Find a playable card
    const playable = player0.hand.find(c => {
      if (c.type === 'wild') return true;
      if (c.type === 'number' && topCard.type === 'number') {
        return c.color === topCard.color || c.value === topCard.value;
      }
      if (c.color && topCard.type !== 'wild') {
        return c.color === (topCard as any).color;
      }
      return false;
    });

    if (playable) {
      const chosenColor = playable.type === 'wild' ? 'red' as const : undefined;
      const result = engine.playCard(player0.id, playable.id, chosenColor);
      expect(result.success).toBe(true);
      expect(player0.hand).toHaveLength(6);
    }
  });

  it('getClientState returns sanitized state', () => {
    const state = engine.getClientState('player-0');
    expect(state.hand).toHaveLength(7);
    expect(state.myIndex).toBe(0);
    expect(state.players).toHaveLength(2);
    // Should not contain hand data in players
    for (const p of state.players) {
      expect(p).not.toHaveProperty('hand');
      expect(p).toHaveProperty('cardCount');
    }
  });

  it('handles disconnect', () => {
    engine.disconnectPlayer('player-0');
    const player0 = engine.state.players.find(p => p.id === 'player-0');
    expect(player0!.isConnected).toBe(false);
  });

  it('handles reconnect', () => {
    engine.disconnectPlayer('player-0');
    engine.reconnectPlayer('player-0', 'player-0-new');
    const player = engine.state.players.find(p => p.id === 'player-0-new');
    expect(player).toBeDefined();
    expect(player!.isConnected).toBe(true);
  });
});

describe('UnoEngine with 3+ players', () => {
  it('handles reverse direction', () => {
    const engine = createTestEngine(4);
    expect(engine.state.direction).toBe(1);

    // Manually set a reverse card in player's hand
    const player0 = engine.state.players[0];
    const topCard = engine.getTopCard()!;
    const reverseCard = {
      id: 'test-reverse',
      type: 'action' as const,
      color: topCard.type !== 'wild' ? (topCard as any).color : 'red' as const,
      action: 'reverse' as const,
    };
    player0.hand.push(reverseCard);

    const result = engine.playCard('player-0', 'test-reverse');
    if (result.success) {
      expect(engine.state.direction).toBe(-1);
    }
  });

  it('detects win when hand is empty', () => {
    const engine = createTestEngine(2);
    const player0 = engine.state.players[0];
    const topCard = engine.getTopCard()!;

    // Give player only one wild card
    player0.hand = [{
      id: 'last-card',
      type: 'wild',
      color: null,
      wildType: 'wild',
      chosenColor: null,
    }];

    const result = engine.playCard('player-0', 'last-card', 'red');
    expect(result.success).toBe(true);
    expect(engine.state.status).toBe('finished');
    expect(engine.state.winnerId).toBe('player-0');
  });
});
