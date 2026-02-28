import type { Card, Direction, Player, RoomStatus } from '../../../shared/types';

export interface InternalGameState {
  status: RoomStatus;
  players: InternalPlayer[];
  drawPile: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  direction: Direction;
  winnerId: string | null;
  mustCallUno: string | null;     // player id who needs to call UNO
  unoCallDeadline: number | null; // timestamp by which UNO must be called
}

export interface InternalPlayer {
  id: string;
  name: string;
  hand: Card[];
  isHost: boolean;
  isConnected: boolean;
  disconnectedAt?: number;
}

export function createInitialGameState(players: InternalPlayer[]): InternalGameState {
  return {
    status: 'playing',
    players,
    drawPile: [],
    discardPile: [],
    currentPlayerIndex: 0,
    direction: 1,
    winnerId: null,
    mustCallUno: null,
    unoCallDeadline: null,
  };
}

/** Convert internal player to public player (hides hand) */
export function toPublicPlayer(p: InternalPlayer): Player {
  return {
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    isConnected: p.isConnected,
    cardCount: p.hand.length,
    disconnectedAt: p.disconnectedAt,
  };
}

/** Advance to the next player, handling direction and skipping disconnected */
export function getNextPlayerIndex(
  currentIndex: number,
  direction: Direction,
  playerCount: number,
  skip: boolean = false
): number {
  let next = (currentIndex + direction + playerCount) % playerCount;
  if (skip) {
    next = (next + direction + playerCount) % playerCount;
  }
  return next;
}
