/**
 * Game-room types and reads for the console.
 *
 * Kept out of `live.ts` because a room is not part of the ER model the rest of
 * that file maps — it is a thing the product grew, with its own endpoints and
 * its own camelCase shape rather than raw table columns.
 */
import { api } from "./api";

export type GameSeat = {
  userAccountId: string;
  displayName: string;
  studentId?: string;
  /** Their Lichess rating in this game's speed, when they have a settled one. */
  rating?: number;
};

export type TimeControl = { limit: number; increment: number };

/** Each side's time as Lichess last reported it, and when — rated games only. */
export type GameClock = { whiteMs: number; blackMs: number; at: string };

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

  /** The time control chosen, if one was. Only a rated game's clock runs. */
  timeControl?: TimeControl;
  clock?: GameClock;
  /** The colour offering a draw, while the offer stands. */
  drawOffer?: "White" | "Black";
  /** Every move in SAN and the last in UCI — on the console's list read. */
  sans?: string[];
  lastUci?: string;
  /** Whether each seated player has pressed Enter. A game the office sets up
      waits, Open, until both have. */
  whiteEntered?: boolean;
  blackEntered?: boolean;
  /** Paused by the office mid-game: Open again with its moves kept, and
      nobody can move until the office resumes it. */
  stopped?: boolean;
};

/** Where a game is, as the console names it. A stopped game is Open on the
    server but is not "waiting to start" — it has moves and will resume. */
export type GameStage = GameRoom["status"] | "Stopped";

export function stageOf(room: GameRoom): GameStage {
  return room.status === "Open" && room.stopped ? "Stopped" : room.status;
}

/** Whether a room still has a code worth showing: it is waiting and has a
    seat nobody holds. A game the office set up has both seats taken, and its
    players enter from their own screens, so there is nothing to read out. */
export function needsCode(room: GameRoom): boolean {
  return room.status === "Open" && !room.stopped && Boolean(room.code) && (!room.white || !room.black);
}

/** Pause a game in play so the two can finish it another day. A rated
    game becomes unrated: Lichess cannot pause one. */
export const stopRoom = (id: string) => api.post<{ status: string }>(`game-rooms/${id}/stop`, {});

/** Put a paused game back in play. Only the office can; the players cannot. */
export const resumeRoom = (id: string) => api.post<{ status: string }>(`game-rooms/${id}/resume`, {});

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

export const listRooms = (withMoves = false) =>
  api.get<GameRoom[]>(withMoves ? "game-rooms?moves=1" : "game-rooms");
export const getRoom = (id: string) => api.get<GameDetail>(`game-rooms/${id}`);
export type OpenRoomOptions = {
  lichessRated?: boolean;
  /** A time control was chosen. A rated game always has one. */
  timed?: boolean;
  clockLimit?: number;
  clockIncrement?: number;
  /** Seat both players now: the game opens in play and appears in both
      students' own game lists, with no code to type. Both or neither. */
  whiteStudentId?: string;
  blackStudentId?: string;
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

/** Where a game sits in a list, and the games either side of it — null at the
    ends, so the navigator can disable rather than wrap around. */
export function neighbours(
  rooms: GameRoom[],
  id: string,
): { index: number; prev: GameRoom | null; next: GameRoom | null } {
  const index = rooms.findIndex((r) => r.gameRoomId === id);
  if (index < 0) return { index, prev: null, next: null };
  return { index, prev: rooms[index - 1] ?? null, next: rooms[index + 1] ?? null };
}

/** "10+5" — minutes and increment seconds, the way a coach says it. */
export function timeControlLabel(tc: TimeControl | undefined): string {
  if (!tc) return "";
  const minutes = tc.limit / 60;
  return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)}+${tc.increment}`;
}

/**
 * Who won, in words: "Mini won", or null for a draw or a game with no result.
 * A bare "0-1" makes the reader work out which colour was whose.
 */
export function winnerOf(room: GameRoom, waiting: string): string | null {
  if (room.result === "1-0") return room.white?.displayName ?? waiting;
  if (room.result === "0-1") return room.black?.displayName ?? waiting;
  return null;
}

/**
 * The message key for how a game ended, or "" when it is not one we can name.
 *
 * Our own board records chess's terms ("Checkmate", "Resignation"); a rated
 * game Lichess ended records "lichess:" and Lichess's status ("outoftime").
 * Both come out as the same words.
 */
export function reasonKey(reason: string | undefined): string {
  if (!reason) return "";
  const lichess: Record<string, string> = {
    mate: "Checkmate",
    resign: "Resignation",
    stalemate: "Stalemate",
    outoftime: "TimeOut",
    timeout: "Abandoned",
    draw: "Agreement",
    aborted: "Aborted",
    noStart: "Aborted",
  };
  if (reason.startsWith("lichess:")) return lichess[reason.slice(8)] ?? "";
  return reason;
}

const START_COUNT: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ORDER = ["p", "n", "b", "r", "q"];

/**
 * The pieces each side has taken, read off the position: whatever of the
 * other colour's starting set is no longer on the board, cheapest first.
 * `byWhite` holds Black pieces, `byBlack` White ones. A promotion puts a
 * piece back that was never taken, so the count is clamped rather than
 * negative. `advantage` is White's material lead (negative when Black leads).
 */
export function capturedFromFen(fen: string): { byWhite: string[]; byBlack: string[]; advantage: number } {
  const placement = fen.split(" ")[0] ?? "";
  const on: Record<string, number> = {};
  for (const ch of placement) if (/[a-zA-Z]/.test(ch)) on[ch] = (on[ch] ?? 0) + 1;
  const missing = (colour: "w" | "b") =>
    ORDER.flatMap((type) => {
      const key = colour === "w" ? type.toUpperCase() : type;
      return Array<string>(Math.max(0, START_COUNT[type] - (on[key] ?? 0))).fill(type);
    });
  let advantage = 0;
  for (const type of ORDER) advantage += VALUE[type] * ((on[type.toUpperCase()] ?? 0) - (on[type] ?? 0));
  return { byWhite: missing("b"), byBlack: missing("w"), advantage };
}

/**
 * A rated game's clock as it stands at `now`: the side to move has been
 * counting down since Lichess last reported; the other side is paused.
 */
export function clockAt(room: GameRoom, now: number): { white: number; black: number } | null {
  if (!room.clock) return null;
  let { whiteMs: white, blackMs: black } = room.clock;
  const since = Date.parse(room.clock.at);
  if (room.status === "Active" && !Number.isNaN(since)) {
    const elapsed = Math.max(0, now - since);
    if (room.turn === "White") white -= elapsed;
    if (room.turn === "Black") black -= elapsed;
  }
  return { white: Math.max(0, white), black: Math.max(0, black) };
}

/** "4:07", or "0:09.4" under ten seconds, when a tenth matters. */
export function fmtClock(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  if (total < 10) return `0:${seconds.toFixed(1).padStart(4, "0")}`;
  return `${minutes}:${String(Math.floor(seconds)).padStart(2, "0")}`;
}

/** When a game was played: its start, or when the room opened if it never began. */
export function playedAt(room: GameRoom): Date | null {
  const raw = room.startedAt || room.createdAt;
  if (!raw) return null;
  // Stored as SQLite UTC without a zone marker; see durationOf.
  const ms = Date.parse(raw.includes("T") ? raw : raw.replace(" ", "T") + "Z");
  return Number.isNaN(ms) ? null : new Date(ms);
}

/** The local calendar day a game was played, as yyyy-mm-dd, for the date filter. */
export function playedDay(room: GameRoom): string {
  const d = playedAt(room);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
