/**
 * Exporting a game so it can be replayed somewhere else.
 *
 * Every other list in the console exports as CSV because every other list ends
 * up in a spreadsheet. A game does not: a column of "e4, e5, Nf3" is a chess
 * game with the chess taken out. PGN is what Lichess and every other board
 * program reads, so a lesson game can be opened with an engine on it.
 *
 * These check the things a parser is strict about, because a PGN that almost
 * parses is worse than none — it imports as an empty board with no error.
 */
import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import type { GameMove, GameRoom } from "./games";
import { movetext, pgnDate, pgnResult, toPgn } from "./pgn";

const LABELS = { event: "JCA lesson game", site: "Junior Chess Academy", waiting: "Waiting" };

const ROOM: GameRoom = {
  gameRoomId: "gr_1",
  code: "4821",
  status: "Finished",
  fen: "8/8/8/8/8/8/8/8 w - - 0 1",
  result: "0-1",
  resultReason: "checkmate",
  white: { userAccountId: "u1", displayName: "Anong Sri" },
  black: { userAccountId: "u2", displayName: "Boon Mek" },
  moveCount: 4,
  createdAt: "2026-08-23T08:55:00Z",
  startedAt: "2026-08-23T09:00:00Z",
  lichessRated: false,
};

/* Fool's mate: the shortest game that ends in a result. */
const MOVES: GameMove[] = ["f3", "e5", "g4", "Qh4#"].map((san, i) => ({
  ply: i + 1, san, uci: "", fenAfter: "", createdAt: "",
}));

describe("the tags", () => {
  it("names both players and the result", () => {
    const pgn = toPgn(ROOM, MOVES, LABELS);
    expect(pgn).toContain('[White "Anong Sri"]');
    expect(pgn).toContain('[Black "Boon Mek"]');
    expect(pgn).toContain('[Result "0-1"]');
  });

  /* A quote ends a tag early. The standard says to escape it as \" — but
     chess.js, the parser this console draws its own boards with, rejects the
     whole file at the first one, so escaping produces a game that opens
     nowhere. A single quote reads the same and parses everywhere. */
  it("turns a quote in a name into one a reader can take", () => {
    const room = { ...ROOM, white: { userAccountId: "u1", displayName: 'Bobby "Fish" Fischer' } };
    const pgn = toPgn(room, MOVES, LABELS);
    expect(pgn).toContain(`[White "Bobby 'Fish' Fischer"]`);
    /* Everything after the tags still made it. */
    expect(pgn).toContain("Qh4#");
  });

  it("says a seat is empty rather than naming nobody", () => {
    const pgn = toPgn({ ...ROOM, black: null }, MOVES, LABELS);
    expect(pgn).toContain('[Black "Waiting"]');
  });

  /* Site is where the game was played, and exactly one tag of each name is
     allowed — a second makes some readers stop at the header. */
  it("points Site at Lichess for a game that ran there", () => {
    const pgn = toPgn({ ...ROOM, lichessGameId: "abcd1234" }, MOVES, LABELS);
    expect(pgn).toContain('[Site "https://lichess.org/abcd1234"]');
    expect(pgn.match(/^\[Site /gm)).toHaveLength(1);
  });

  it("points Site at the academy otherwise", () => {
    expect(toPgn(ROOM, MOVES, LABELS)).toContain('[Site "Junior Chess Academy"]');
  });

  it("uses the room's own label as the event when it has one", () => {
    expect(toPgn({ ...ROOM, label: "Friday club" }, MOVES, LABELS)).toContain('[Event "Friday club"]');
  });
});

describe("the date", () => {
  it("is the roster's dotted form", () => {
    /* Shape only — which day it is depends on where you are, and the test
       below is the one that pins that down. */
    expect(pgnDate("2026-08-23T09:00:00Z")).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });

  /* The day the game was played *here*. A room is stamped with SQLite's
     `datetime('now')` — UTC, written with no marker to say so — and Bangkok is
     seven hours ahead, so a nine o'clock lesson is 02:00 UTC the same day and
     an evening one is the next day in UTC. Slicing the string exports the
     wrong date for every game played before seven in the morning. */
  it("is the local day, not the one in the UTC timestamp", () => {
    /* Expected via Intl rather than the same arithmetic the function uses, and
       from the instant rather than the string — in Bangkok this is the 23rd
       where the timestamp says the 22nd, and the test says so wherever it is
       run from. */
    const instant = new Date(Date.UTC(2026, 7, 22, 19, 5, 3));
    const localDay = instant.toLocaleDateString("sv-SE").replace(/-/g, ".");
    expect(pgnDate("2026-08-22 19:05:03")).toBe(localDay);
  });

  it("reads the backend's unmarked stamp as UTC, not as local time", () => {
    /* Handed straight to `new Date`, this would be read as local and land
       seven hours out — the same instant, the wrong wall clock. */
    expect(pgnDate("2026-08-22 19:05:03")).toBe(pgnDate("2026-08-22T19:05:03Z"));
  });

  /* The roster requires the tag, and "unknown" has a spelling of its own. */
  it("says unknown rather than being left out", () => {
    expect(pgnDate(undefined)).toBe("????.??.??");
    expect(pgnDate("")).toBe("????.??.??");
    expect(pgnDate("not a date")).toBe("????.??.??");
  });
});

describe("the result", () => {
  it("carries a finished game's own result", () => {
    expect(pgnResult({ result: "1-0", status: "Finished" })).toBe("1-0");
    expect(pgnResult({ result: "1/2-1/2", status: "Finished" })).toBe("1/2-1/2");
  });

  /* A game still being played is unfinished, which is not the same as a draw —
     and "*" is how PGN says so. */
  it("is a star while the game is still on", () => {
    expect(pgnResult({ result: undefined, status: "Active" })).toBe("*");
    expect(pgnResult({ result: undefined, status: "Cancelled" })).toBe("*");
  });
});

describe("the moves", () => {
  it("are numbered in pairs", () => {
    expect(movetext(MOVES, "0-1")).toBe("1. f3 e5 2. g4 Qh4# 0-1");
  });

  it("do not lose a last move with no reply", () => {
    expect(movetext(MOVES.slice(0, 3), "*")).toBe("1. f3 e5 2. g4 *");
  });

  it("end with the result, so the file is a complete game", () => {
    expect(movetext(MOVES, "0-1").endsWith("0-1")).toBe(true);
  });

  /* Exporters wrap at 80 columns, and a single kilometre-long line is what
     makes some older readers give up. */
  it("wrap at eighty columns", () => {
    const long: GameMove[] = Array.from({ length: 80 }, (_, i) => ({
      ply: i + 1, san: "Nf3", uci: "", fenAfter: "", createdAt: "",
    }));
    for (const line of movetext(long, "*").split("\n")) {
      expect(line.length).toBeLessThanOrEqual(80);
    }
  });

  it("leave a blank line between the tags and the moves", () => {
    /* The one piece of structure a parser uses to know the header has ended.
       Matched against the last tag, whichever it is — Termination is optional
       and sits after Result when a game says how it ended. */
    expect(toPgn(ROOM, MOVES, LABELS)).toMatch(/\]\n\n1\. f3/);
  });
});

/**
 * The assertions above describe a file that looks like PGN. This one is
 * whether it *is* PGN — a real parser is the only thing that can say, and a
 * file that almost parses is worse than none, because it imports as an empty
 * board rather than an error.
 */
describe("read back by a chess engine", () => {
  it("replays to the same position the game ended in", () => {
    const chess = new Chess();
    chess.loadPgn(toPgn(ROOM, MOVES, LABELS));

    expect(chess.history()).toEqual(["f3", "e5", "g4", "Qh4#"]);
    expect(chess.isCheckmate()).toBe(true);
  });

  it("keeps the players and the result through the round trip", () => {
    const chess = new Chess();
    chess.loadPgn(toPgn(ROOM, MOVES, LABELS));

    const headers = chess.getHeaders();
    expect(headers.White).toBe("Anong Sri");
    expect(headers.Black).toBe("Boon Mek");
    expect(headers.Result).toBe("0-1");
  });

  it("parses a game that is still being played", () => {
    const chess = new Chess();
    const live = { ...ROOM, status: "Active" as const, result: undefined, resultReason: undefined };
    chess.loadPgn(toPgn(live, MOVES.slice(0, 3), LABELS));

    expect(chess.history()).toEqual(["f3", "e5", "g4"]);
    expect(chess.getHeaders().Result).toBe("*");
  });

  /* The reason the quote is replaced rather than escaped: this is the exact
     file a coach would hand to Lichess, and an unopenable one is silent. */
  it("parses a name with a quote in it", () => {
    const chess = new Chess();
    const room = { ...ROOM, white: { userAccountId: "u1", displayName: 'Bobby "Fish" Fischer' } };
    chess.loadPgn(toPgn(room, MOVES, LABELS));

    expect(chess.getHeaders().White).toBe("Bobby 'Fish' Fischer");
    expect(chess.history()).toHaveLength(4);
  });

  it("parses a name with a backslash in it", () => {
    const chess = new Chess();
    const room = { ...ROOM, black: { userAccountId: "u2", displayName: "A\\B" } };
    chess.loadPgn(toPgn(room, MOVES, LABELS));

    expect(chess.getHeaders().Black).toBe("A/B");
  });
});
