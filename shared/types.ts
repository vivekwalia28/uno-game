// ─── Card Types ───

export type Color = 'red' | 'blue' | 'green' | 'yellow';
export type WildColor = Color | null;

export type NumberValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type ActionType = 'skip' | 'reverse' | 'draw_two';
export type WildType = 'wild' | 'wild_draw_four';

export interface NumberCard {
  id: string;
  type: 'number';
  color: Color;
  value: NumberValue;
}

export interface ActionCard {
  id: string;
  type: 'action';
  color: Color;
  action: ActionType;
}

export interface WildCard {
  id: string;
  type: 'wild';
  color: null;
  wildType: WildType;
  chosenColor: WildColor;
}

export type Card = NumberCard | ActionCard | WildCard;

// ─── Player Types ───

export interface Player {
  id: string;          // socket id
  name: string;
  isHost: boolean;
  isConnected: boolean;
  cardCount: number;
  disconnectedAt?: number;
}

export interface PlayerPrivateState {
  hand: Card[];
}

// ─── Room Types ───

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Room {
  code: string;
  players: Player[];
  status: RoomStatus;
  hostId: string;
  maxPlayers: number;
  createdAt: number;
}

// ─── Game State (sent to clients) ───

export type Direction = 1 | -1;

export interface GameState {
  currentPlayerIndex: number;
  direction: Direction;
  discardPile: Card[];           // top card(s) visible
  drawPileCount: number;
  players: Player[];
  status: RoomStatus;
  winnerId: string | null;
  lastAction: GameAction | null;
  mustCallUno: string | null;    // player id who must call UNO
}

export interface ClientGameState extends GameState {
  hand: Card[];                  // current player's hand only
  myIndex: number;
}

// ─── Game Actions ───

export type GameAction =
  | { type: 'play_card'; playerId: string; card: Card }
  | { type: 'draw_card'; playerId: string; count: number }
  | { type: 'skip_turn'; playerId: string }
  | { type: 'reverse'; playerId: string }
  | { type: 'uno_call'; playerId: string }
  | { type: 'uno_catch'; catcherId: string; targetId: string }
  | { type: 'color_chosen'; playerId: string; color: Color }
  | { type: 'game_over'; winnerId: string };

// ─── Socket Events: Client → Server ───

export interface ClientToServerEvents {
  // Room
  'room:create': (data: { playerName: string }, cb: (res: RoomResponse) => void) => void;
  'room:join': (data: { roomCode: string; playerName: string }, cb: (res: RoomResponse) => void) => void;
  'room:leave': () => void;
  'room:start': (cb: (res: { success: boolean; error?: string }) => void) => void;

  // Game
  'game:play_card': (data: { cardId: string; chosenColor?: Color }, cb: (res: { success: boolean; error?: string }) => void) => void;
  'game:draw_card': (cb: (res: { success: boolean; error?: string }) => void) => void;
  'game:call_uno': (cb: (res: { success: boolean; error?: string }) => void) => void;
  'game:catch_uno': (data: { targetId: string }, cb: (res: { success: boolean; error?: string }) => void) => void;

  // Voice signaling
  'voice:signal': (data: { targetId: string; signal: unknown }) => void;
  'voice:join': () => void;
  'voice:leave': () => void;
}

// ─── Socket Events: Server → Client ───

export interface ServerToClientEvents {
  // Room
  'room:updated': (room: Room) => void;
  'room:error': (error: string) => void;
  'room:player_joined': (player: Player) => void;
  'room:player_left': (playerId: string) => void;
  'room:host_changed': (hostId: string) => void;

  // Game
  'game:started': (state: ClientGameState) => void;
  'game:state_updated': (state: ClientGameState) => void;
  'game:action': (action: GameAction) => void;
  'game:hand_updated': (hand: Card[]) => void;
  'game:over': (winnerId: string) => void;
  'game:error': (error: string) => void;

  // Voice signaling
  'voice:signal': (data: { fromId: string; signal: unknown }) => void;
  'voice:peer_joined': (peerId: string) => void;
  'voice:peer_left': (peerId: string) => void;

  // System
  'player:disconnected': (playerId: string) => void;
  'player:reconnected': (playerId: string) => void;
  'toast': (message: string) => void;
}

// ─── Response Types ───

export interface RoomResponse {
  success: boolean;
  room?: Room;
  error?: string;
}
