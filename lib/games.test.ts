/**
 * What the Games page says about a game: who won in words, how it ended,
 * what each side has taken, and the clock.
 */
import { describe, expect, it } from "vitest";
import {
  capturedFromFen,
  clockAt,
  fmtClock,
  reasonKey,
  timeControlLabel,
  winnerOf,
  type GameRoom,
} from "./games";

const room = (over: Partial<GameRoom>): GameRoom => ({
  gameRoomId: "gr",
  status: "Finished",
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  white: { userAccountId: "u1", displayName: "Mini" },
  black: { userAccountId: "u2", displayName: "Noe" },
  moveCount: 0,
  createdAt: "2026-09-28 09:00:00",
  lichessRated: false,
  ...over,
});

describe("who won", () => {
  it("names the winner rather than a score", () => {
    expect(winnerOf(room({ result: "1-0" }), "Waiting")).toBe("Mini");
    expect(winnerOf(room({ result: "0-1" }), "Waiting")).toBe("Noe");
  });

  it("has no winner in a draw or an unfinished game", () => {
    expect(winnerOf(room({ result: "1/2-1/2" }), "Waiting")).toBeNull();
    expect(winnerOf(room({ status: "Active" }), "Waiting")).toBeNull();
  });
});

describe("how it ended", () => {
  it("reads our own board's reasons as they are", () => {
    expect(reasonKey("Checkmate")).toBe("Checkmate");
    expect(reasonKey("Agreement")).toBe("Agreement");
  });

  it("reads Lichess's endings in the same words", () => {
    expect(reasonKey("lichess:outoftime")).toBe("TimeOut");
    expect(reasonKey("lichess:resign")).toBe("Resignation");
    expect(reasonKey("lichess:mate")).toBe("Checkmate");
    expect(reasonKey("lichess:somethingNew")).toBe("");
  });
});

describe("captured pieces", () => {
  it("is nothing at the start", () => {
    expect(capturedFromFen(room({}).fen)).toEqual({ byWhite: [], byBlack: [], advantage: 0 });
  });

  it("puts Black's lost pieces with White, cheapest first, and counts the lead", () => {
    // Black is missing a knight and a pawn; White a pawn.
    const fen = "r1bqkbnr/ppp1pppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1";
    expect(capturedFromFen(fen)).toEqual({ byWhite: ["p", "n"], byBlack: ["p"], advantage: 3 });
  });
});

describe("the clock", () => {
  it("says a time control the way a coach does", () => {
    expect(timeControlLabel({ limit: 600, increment: 5 })).toBe("10+5");
    expect(timeControlLabel(undefined)).toBe("");
  });

  it("counts down only the side to move since Lichess last reported", () => {
    const at = "2026-09-28T09:00:00.000Z";
    const r = room({ status: "Active", turn: "White", clock: { whiteMs: 60_000, blackMs: 50_000, at } });
    expect(clockAt(r, Date.parse(at) + 5_000)).toEqual({ white: 55_000, black: 50_000 });
  });

  it("stops at zero, and shows tenths in the last ten seconds", () => {
    expect(fmtClock(247_000)).toBe("4:07");
    expect(fmtClock(9_400)).toBe("0:09.4");
    expect(fmtClock(-5)).toBe("0:00.0");
  });
});
