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
};

export type GameMove = { ply: number; san: string; uci: string; fenAfter: string; createdAt: string };

export type GameDetail = { room: GameRoom; moves: GameMove[]; seat: string; legalMoves: string[] };

export const listRooms = () => api.get<GameRoom[]>("game-rooms");
export const getRoom = (id: string) => api.get<GameDetail>(`game-rooms/${id}`);
export const openRoom = (label: string) => api.post<GameRoom>("game-rooms", { label });
export const cancelRoom = (id: string) => api.del<{ status: string }>(`game-rooms/${id}`);

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
