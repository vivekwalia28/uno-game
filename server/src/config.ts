export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
export const CORS_ORIGIN = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://opnetz.com' : 'http://localhost:5173');
export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;
export const CARDS_PER_PLAYER = 7;
export const RECONNECT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const UNO_CALL_WINDOW_MS = 3000; // 3 seconds to call UNO
export const ROOM_CODE_LENGTH = 6;
