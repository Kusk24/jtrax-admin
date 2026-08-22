/**
 * Game-room types and reads for the console.
 *
 * Kept out of `live.ts` because a room is not part of the ER model the rest of
 * that file maps — it is a thing the product grew, with its own endpoints and
 * its own camelCase shape rather than raw table columns.
 */
import { api } from "./api";

export type GameSeat = { userAccountId: string; displayName: string; studentId?: string };

export type GameRoom = {
  gameRoomId: string;
  code?: string;
  label?: string;
  status: "Open" | "Active" | "Finished" | "Cancelled";
  fen: string;
  turn?: "White" | "Black";
  result?: string;
  resultReason?: string;
  white: GameSeat | null;
  black: GameSeat | null;
  moveCount: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;

  /** Whether this board is also a real rated game on lichess.org. */
  lichessRated: boolean;
  lichessGameId?: string;
  lichessStatus?: string;
  /** Why it stopped counting, when it did. Shown rather than swallowed: a game
      that has quietly stopped being rated is worse than one that admits it. */
  lichessDetachedReason?: string;
};

/** Clocks Lichess accepts, in the shapes a coach would actually pick.

    Lichess takes 0/15/30/45/60/90 seconds or any multiple of 60 up to three
    hours; offering a free-text box would mostly produce rejections, so the
    console offers the sensible handful instead. */
export const RATED_CLOCKS = [
  { limit: 300, increment: 0, label: "5+0" },
  { limit: 600, increment: 5, label: "10+5" },
  { limit: 900, increment: 10, label: "15+10" },
  { limit: 1800, increment: 20, label: "30+20" },
];

export type GameMove = { ply: number; san: string; uci: string; fenAfter: string; createdAt: string };

export type GameDetail = { room: GameRoom; moves: GameMove[]; seat: string; legalMoves: string[] };

export const listRooms = () => api.get<GameRoom[]>("game-rooms");
export const getRoom = (id: string) => api.get<GameDetail>(`game-rooms/${id}`);
export type OpenRoomOptions = {
  lichessRated?: boolean;
  clockLimit?: number;
  clockIncrement?: number;
};

export const openRoom = (label: string, opts: OpenRoomOptions = {}) =>
  api.post<GameRoom>("game-rooms", { label, ...opts });
export const cancelRoom = (id: string) => api.del<{ status: string }>(`game-rooms/${id}`);

/** Throws the room and its moves away. Refused while the game is being played —
    stopping it is the reversible act, and this one is not. */
export const deleteRoom = (id: string) => api.del<{ status: string }>(`game-rooms/${id}/record`);

/** Live boards first, then rooms still waiting for players, then the record —
    the console is opened during a class, not to browse history. */
const RANK: Record<GameRoom["status"], number> = { Active: 0, Open: 1, Finished: 2, Cancelled: 3 };

export function sortRooms(rooms: GameRoom[]): GameRoom[] {
  return [...rooms].sort(
    (a, b) => RANK[a.status] - RANK[b.status] || b.createdAt.localeCompare(a.createdAt),
  );
}

/** "Penny vs Uri", or who is still missing. */
export function playersOf(room: GameRoom, waiting: string): string {
  const white = room.white?.displayName ?? waiting;
  const black = room.black?.displayName ?? waiting;
  return `${white} — ${black}`;
}

/** Elapsed wall time for a game, as mm:ss. Rooms store ISO-ish UTC strings
    from SQLite's datetime('now'), which have no zone marker, so the Z is added
    before parsing or a browser east of Greenwich reads them hours out. */
export function durationOf(room: GameRoom): string {
  if (!room.startedAt) return "—";
  const start = Date.parse(room.startedAt.replace(" ", "T") + "Z");
  const end = room.endedAt ? Date.parse(room.endedAt.replace(" ", "T") + "Z") : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return "—";
  const secs = Math.max(0, Math.round((end - start) / 1000));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}
