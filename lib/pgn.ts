/**
 * A game, written out so it can be replayed somewhere else.
 *
 * The console exports every other list as CSV, because every other list ends
 * up in a spreadsheet. A game does not: a coach exporting one wants to walk
 * through it, and a column of "e4, e5, Nf3" is a chess game with the chess
 * taken out — no board, no analysis, nothing that reads it back.
 *
 * PGN is what every chess program in the world opens, Lichess included. Import
 * it there and the lesson game becomes a board with an engine on it, which is
 * the thing the export is for.
 */
import type { GameMove, GameRoom } from "./games";

/**
 * The Seven Tag Roster's date format: 1993.10.20, with ?? for what we lack.
 *
 * The day the game was played *here*, which is not the day in the timestamp.
 * A room is stamped by the backend with SQLite's `datetime('now')` — UTC, and
 * written without a marker to say so ("2026-08-22 19:05:03"). Bangkok is seven
 * hours ahead, so every game played before 07:00 local carries the previous
 * day's date, and a lesson at nine in the morning exports as yesterday.
 *
 * Slicing the string would take the UTC day; handing it to `new Date` unmarked
 * would be read as local time and shift the instant by seven hours instead.
 * So it is marked as UTC first, then asked for its local calendar date.
 */
export function pgnDate(stamp: string | undefined): string {
  if (!stamp) return "????.??.??";
  /* Both shapes the API produces: the backend's "YYYY-MM-DD HH:MM:SS" and the
     console's own `toISOString()`. Neither is trusted to be either. */
  const utc = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(stamp)
    ? new Date(`${stamp.slice(0, 10)}T${stamp.slice(11, 19)}Z`)
    : new Date(stamp);
  if (Number.isNaN(utc.getTime())) return "????.??.??";
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${utc.getFullYear()}.${pad(utc.getMonth() + 1)}.${pad(utc.getDate())}`;
}

/**
 * A tag value, with the two characters that end a tag early.
 *
 * The standard says to escape a double quote as `\"` and a backslash as `\\`.
 * Real readers disagree: chess.js — the parser this console draws its own
 * boards with — rejects the whole file at the first `\"`, and it is not alone.
 * A pupil with a nickname in quotes would export a game that opens nowhere,
 * and PGN fails by parsing into an empty board rather than by complaining.
 *
 * So the quote is turned into a single quote and the backslash into a slash.
 * The name still reads as itself, and the file opens. Losing the exact
 * character in a display name is the smaller loss by a distance.
 */
function tag(name: string, value: string): string {
  return `[${name} "${value.replace(/\\/g, "/").replace(/"/g, "'")}"]`;
}

/**
 * Moves as PGN movetext: `1. e4 e5 2. Nf3 Nc6`, wrapped at 80 columns.
 *
 * Wrapped because the standard says exporters wrap there, and a single
 * kilometre-long line is what makes some older readers give up.
 */
export function movetext(moves: GameMove[], result: string): string {
  const parts: string[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    parts.push(`${i / 2 + 1}.`, moves[i].san);
    if (moves[i + 1]) parts.push(moves[i + 1].san);
  }
  parts.push(result);

  const lines: string[] = [];
  let line = "";
  for (const part of parts) {
    if (line && line.length + 1 + part.length > 80) {
      lines.push(line);
      line = part;
    } else {
      line = line ? `${line} ${part}` : part;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

/** The result tag. A game still in play is "*" — unfinished, not a draw. */
export function pgnResult(room: Pick<GameRoom, "result" | "status">): string {
  if (room.result === "1-0" || room.result === "0-1" || room.result === "1/2-1/2") {
    return room.result;
  }
  return "*";
}

/**
 * The whole game as PGN.
 *
 * `waiting` names an empty seat — a room can be exported before anybody sat
 * down, and PGN has no way to say "nobody", so it says so in words rather than
 * leaving a tag that reads as a player called "".
 */
export function toPgn(
  room: GameRoom,
  moves: GameMove[],
  labels: { event: string; site: string; waiting: string },
): string {
  const result = pgnResult(room);
  /* Site is where the game was played, and a rated board really was played on
     Lichess — the link is also the only way back to the clocks and the rating
     change, neither of which this file can carry. One Site tag, though: the
     roster allows exactly one of each, and a second makes some readers stop. */
  const site = room.lichessGameId ? `https://lichess.org/${room.lichessGameId}` : labels.site;
  const header = [
    tag("Event", room.label || labels.event),
    tag("Site", site),
    tag("Date", pgnDate(room.startedAt ?? room.createdAt)),
    tag("Round", "-"),
    tag("White", room.white?.displayName || labels.waiting),
    tag("Black", room.black?.displayName || labels.waiting),
    tag("Result", result),
  ];
  if (room.resultReason) header.push(tag("Termination", room.resultReason));

  return `${header.join("\n")}\n\n${movetext(moves, result)}\n`;
}

/** Triggers a download of the game as `<filename>.pgn`. */
export function downloadPgn(filename: string, pgn: string): void {
  const blob = new Blob([pgn], { type: "application/x-chess-pgn;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.pgn`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
