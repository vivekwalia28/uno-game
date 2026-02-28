import { v4 as uuidv4 } from 'uuid';
import type { Card, Color, ClientGameState, GameAction } from '../../../shared/types';
import { createShuffledDeck } from './deck';
import { isValidPlay, getDrawPenalty, skipsNextPlayer, reversesDirection, requiresColorChoice } from './rules';
import { InternalGameState, InternalPlayer, createInitialGameState, toPublicPlayer, getNextPlayerIndex } from './game-state';
import { CARDS_PER_PLAYER, UNO_CALL_WINDOW_MS } from '../config';

export class UnoEngine {
  state: InternalGameState;

  constructor(players: Array<{ id: string; name: string; isHost: boolean }>) {
    const internalPlayers: InternalPlayer[] = players.map(p => ({
      ...p,
      hand: [],
      isConnected: true,
    }));
    this.state = createInitialGameState(internalPlayers);
  }

  /** Initialize the game: shuffle deck, deal cards, flip first card */
  startGame(): void {
    this.state.drawPile = createShuffledDeck();
    this.state.status = 'playing';

    // Deal cards
    for (const player of this.state.players) {
      player.hand = this.drawCards(CARDS_PER_PLAYER);
    }

    // Flip the first card (must be a number card)
    let firstCard: Card | undefined;
    do {
      firstCard = this.state.drawPile.pop();
      if (!firstCard) break;
      if (firstCard.type === 'number') {
        this.state.discardPile.push(firstCard);
      } else {
        // Put non-number cards back in draw pile and reshuffle
        this.state.drawPile.unshift(firstCard);
      }
    } while (this.state.discardPile.length === 0);

    this.state.currentPlayerIndex = 0;
    this.state.direction = 1;
  }

  /** Draw cards from the draw pile, reshuffling discard if needed */
  private drawCards(count: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (this.state.drawPile.length === 0) {
        this.reshuffleDiscard();
      }
      if (this.state.drawPile.length === 0) break;
      drawn.push(this.state.drawPile.pop()!);
    }
    return drawn;
  }

  /** Reshuffle discard pile into draw pile, keeping top card */
  private reshuffleDiscard(): void {
    if (this.state.discardPile.length <= 1) return;
    const topCard = this.state.discardPile.pop()!;
    const cardsToShuffle = this.state.discardPile.splice(0);

    // Reset wild cards' chosen color
    for (const card of cardsToShuffle) {
      if (card.type === 'wild') {
        card.chosenColor = null;
      }
    }

    // Fisher-Yates shuffle
    for (let i = cardsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardsToShuffle[i], cardsToShuffle[j]] = [cardsToShuffle[j], cardsToShuffle[i]];
    }

    this.state.drawPile = cardsToShuffle;
    this.state.discardPile = [topCard];
  }

  /** Play a card from a player's hand */
  playCard(playerId: string, cardId: string, chosenColor?: Color): { success: boolean; error?: string; actions: GameAction[] } {
    const actions: GameAction[] = [];
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { success: false, error: 'Player not found', actions };
    if (playerIndex !== this.state.currentPlayerIndex) return { success: false, error: 'Not your turn', actions };
    if (this.state.status !== 'playing') return { success: false, error: 'Game not in progress', actions };

    const player = this.state.players[playerIndex];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { success: false, error: 'Card not in hand', actions };

    const card = player.hand[cardIndex];
    const topCard = this.getTopCard();
    if (!topCard) return { success: false, error: 'No top card', actions };

    if (!isValidPlay(card, topCard)) {
      return { success: false, error: 'Invalid play', actions };
    }

    // Set chosen color for wild cards
    if (requiresColorChoice(card) && card.type === 'wild') {
      if (!chosenColor) return { success: false, error: 'Must choose a color for wild card', actions };
      card.chosenColor = chosenColor;
      actions.push({ type: 'color_chosen', playerId, color: chosenColor });
    }

    // Remove card from hand
    player.hand.splice(cardIndex, 1);
    this.state.discardPile.push(card);

    actions.push({ type: 'play_card', playerId, card });

    // Check for UNO requirement
    this.state.mustCallUno = null;
    this.state.unoCallDeadline = null;
    if (player.hand.length === 1) {
      this.state.mustCallUno = playerId;
      this.state.unoCallDeadline = Date.now() + UNO_CALL_WINDOW_MS;
    }

    // Check for win
    if (player.hand.length === 0) {
      this.state.status = 'finished';
      this.state.winnerId = playerId;
      actions.push({ type: 'game_over', winnerId: playerId });
      return { success: true, actions };
    }

    // Apply card effects
    if (reversesDirection(card)) {
      this.state.direction = (this.state.direction * -1) as 1 | -1;
      actions.push({ type: 'reverse', playerId });
    }

    const drawAmount = getDrawPenalty(card);
    const shouldSkip = skipsNextPlayer(card, this.state.players.length);

    // Move to next player
    const nextIndex = getNextPlayerIndex(
      this.state.currentPlayerIndex,
      this.state.direction,
      this.state.players.length,
      shouldSkip
    );

    // Apply draw penalty to the skipped player
    if (drawAmount > 0) {
      const penaltyPlayerIndex = (this.state.currentPlayerIndex + this.state.direction + this.state.players.length) % this.state.players.length;
      const penaltyPlayer = this.state.players[penaltyPlayerIndex];
      const drawnCards = this.drawCards(drawAmount);
      penaltyPlayer.hand.push(...drawnCards);
      actions.push({ type: 'draw_card', playerId: penaltyPlayer.id, count: drawAmount });
      if (shouldSkip) {
        actions.push({ type: 'skip_turn', playerId: penaltyPlayer.id });
      }
    } else if (shouldSkip) {
      const skippedIndex = (this.state.currentPlayerIndex + this.state.direction + this.state.players.length) % this.state.players.length;
      actions.push({ type: 'skip_turn', playerId: this.state.players[skippedIndex].id });
    }

    this.state.currentPlayerIndex = nextIndex;

    // Skip disconnected players
    this.skipDisconnectedPlayers();

    return { success: true, actions };
  }

  /** Player draws a card */
  drawCard(playerId: string): { success: boolean; error?: string; card?: Card; actions: GameAction[] } {
    const actions: GameAction[] = [];
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { success: false, error: 'Player not found', actions };
    if (playerIndex !== this.state.currentPlayerIndex) return { success: false, error: 'Not your turn', actions };
    if (this.state.status !== 'playing') return { success: false, error: 'Game not in progress', actions };

    const drawn = this.drawCards(1);
    if (drawn.length === 0) return { success: false, error: 'No cards to draw', actions };

    const player = this.state.players[playerIndex];
    player.hand.push(...drawn);
    actions.push({ type: 'draw_card', playerId, count: 1 });

    // Advance turn
    this.state.currentPlayerIndex = getNextPlayerIndex(
      this.state.currentPlayerIndex,
      this.state.direction,
      this.state.players.length
    );

    this.skipDisconnectedPlayers();

    return { success: true, card: drawn[0], actions };
  }

  /** Player calls UNO */
  callUno(playerId: string): { success: boolean; error?: string; actions: GameAction[] } {
    const actions: GameAction[] = [];
    if (this.state.mustCallUno !== playerId) {
      return { success: false, error: 'No UNO to call', actions };
    }

    this.state.mustCallUno = null;
    this.state.unoCallDeadline = null;
    actions.push({ type: 'uno_call', playerId });
    return { success: true, actions };
  }

  /** Another player catches someone who didn't call UNO */
  catchUno(catcherId: string, targetId: string): { success: boolean; error?: string; actions: GameAction[] } {
    const actions: GameAction[] = [];
    if (this.state.mustCallUno !== targetId) {
      return { success: false, error: 'Target doesn\'t need to call UNO', actions };
    }

    if (this.state.unoCallDeadline && Date.now() < this.state.unoCallDeadline) {
      return { success: false, error: 'UNO call window not expired', actions };
    }

    // Penalty: draw 2 cards
    const targetPlayer = this.state.players.find(p => p.id === targetId);
    if (!targetPlayer) return { success: false, error: 'Target not found', actions };

    const drawnCards = this.drawCards(2);
    targetPlayer.hand.push(...drawnCards);

    this.state.mustCallUno = null;
    this.state.unoCallDeadline = null;

    actions.push({ type: 'uno_catch', catcherId, targetId });
    actions.push({ type: 'draw_card', playerId: targetId, count: 2 });

    return { success: true, actions };
  }

  /** Skip disconnected players */
  private skipDisconnectedPlayers(): void {
    let attempts = 0;
    while (attempts < this.state.players.length) {
      const current = this.state.players[this.state.currentPlayerIndex];
      if (current.isConnected) break;
      this.state.currentPlayerIndex = getNextPlayerIndex(
        this.state.currentPlayerIndex,
        this.state.direction,
        this.state.players.length
      );
      attempts++;
    }
  }

  /** Handle player disconnect */
  disconnectPlayer(playerId: string): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      player.isConnected = false;
      player.disconnectedAt = Date.now();
    }

    // If it was this player's turn, advance
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (currentPlayer && currentPlayer.id === playerId) {
      this.state.currentPlayerIndex = getNextPlayerIndex(
        this.state.currentPlayerIndex,
        this.state.direction,
        this.state.players.length
      );
      this.skipDisconnectedPlayers();
    }

    // Check if all players disconnected
    const connectedCount = this.state.players.filter(p => p.isConnected).length;
    if (connectedCount <= 1 && this.state.status === 'playing') {
      const winner = this.state.players.find(p => p.isConnected);
      if (winner) {
        this.state.status = 'finished';
        this.state.winnerId = winner.id;
      }
    }
  }

  /** Handle player reconnect with new socket ID */
  reconnectPlayer(oldId: string, newId: string): void {
    const player = this.state.players.find(p => p.id === oldId);
    if (player) {
      player.id = newId;
      player.isConnected = true;
      player.disconnectedAt = undefined;
    }
  }

  /** Get top card of discard pile */
  getTopCard(): Card | undefined {
    return this.state.discardPile[this.state.discardPile.length - 1];
  }

  /** Get sanitized game state for a specific player */
  getClientState(playerId: string): ClientGameState {
    const myIndex = this.state.players.findIndex(p => p.id === playerId);
    const myHand = myIndex >= 0 ? this.state.players[myIndex].hand : [];

    return {
      currentPlayerIndex: this.state.currentPlayerIndex,
      direction: this.state.direction,
      discardPile: this.state.discardPile.slice(-3), // Send last 3 cards
      drawPileCount: this.state.drawPile.length,
      players: this.state.players.map(toPublicPlayer),
      status: this.state.status,
      winnerId: this.state.winnerId,
      lastAction: null,
      mustCallUno: this.state.mustCallUno,
      hand: myHand,
      myIndex,
    };
  }
}
