"use client";

/* A read-only board for the console. Staff watch and review; they never play,
   so this takes a position and draws it — no selection, no move handling.

   The pieces are the students' own (the Cburnett set in `public/pieces`, copied
   from jtrax-web-app), so the coach watching a game sees the board the child
   is playing on. They were unicode glyphs, which drew differently on every
   machine and nothing like the pupils' board. */
import { Chess } from "chess.js";
import { COLORS } from "@/lib/theme";

const LIGHT = COLORS.boardLight;
const DARK = COLORS.boardDark;
const HIGHLIGHT = COLORS.boardHighlight;

/** `/pieces/lk.svg` is the white king — the same naming the web app uses. */
export const pieceSrc = (colour: string, type: string) => `/pieces/${colour === "w" ? "l" : "d"}${type}.svg`;

export function GameBoard({
  fen,
  lastMove,
  size = 288,
}: {
  fen: string;
  lastMove?: string;
  /** Pixels, or "fill" to take the width of the container and stay square. */
  size?: number | "fill";
}) {
  const box = size === "fill" ? { width: "100%", aspectRatio: "1 / 1" } : { width: size, height: size };
  let board;
  try {
    board = new Chess(fen).board();
  } catch {
    // A position the console cannot read is a bug worth seeing, not a crash.
    return (
      <div style={{ ...box, display: "grid", placeItems: "center",
                    background: COLORS.neutralBg, borderRadius: 10, color: COLORS.textSecondary, fontSize: 13 }}>
        —
      </div>
    );
  }
  const from = lastMove?.slice(0, 2);
  const to = lastMove?.slice(2, 4);

  return (
    <div
      style={{
        ...box,
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(8, 1fr)",
        borderRadius: 10,
        overflow: "hidden",
        border: `1.5px solid ${COLORS.border}`,
        flexShrink: 0,
      }}
    >
      {board.map((row, r) =>
        row.map((sq, c) => {
          const name = "abcdefgh"[c] + (8 - r);
          const touched = name === from || name === to;
          return (
            <div
              key={name}
              data-square={name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 0,
                minHeight: 0,
                background: touched ? HIGHLIGHT : (r + c) % 2 === 0 ? LIGHT : DARK,
              }}
            >
              {sq && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={pieceSrc(sq.color, sq.type)}
                  alt=""
                  draggable={false}
                  style={{ width: "88%", height: "88%" }}
                />
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
