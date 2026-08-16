"use client";

/* A read-only board for the console. Staff watch and review; they never play,
   so this takes a position and draws it — no selection, no move handling.

   Drawn in the console's own idiom (inline styles, COLORS) rather than reusing
   the web app's kawaii board, which belongs to the pupils' world. */
import { Chess } from "chess.js";
import { COLORS } from "@/lib/theme";

const GLYPH: Record<string, string> = {
  wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙",
  bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟",
};

const LIGHT = "#EEF1F7";
const DARK = "#B9C6DE";
const HIGHLIGHT = "#F5DFA6";

export function GameBoard({ fen, lastMove, size = 288 }: { fen: string; lastMove?: string; size?: number }) {
  let board;
  try {
    board = new Chess(fen).board();
  } catch {
    // A position the console cannot read is a bug worth seeing, not a crash.
    return (
      <div style={{ width: size, height: size, display: "grid", placeItems: "center",
                    background: COLORS.neutralBg, borderRadius: 10, color: COLORS.textSecondary, fontSize: 13 }}>
        —
      </div>
    );
  }
  const cell = size / 8;
  const from = lastMove?.slice(0, 2);
  const to = lastMove?.slice(2, 4);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(8, ${cell}px)`,
        gridTemplateRows: `repeat(8, ${cell}px)`,
        borderRadius: 10,
        overflow: "hidden",
        border: `1.5px solid ${COLORS.border}`,
      }}
    >
      {board.map((row, r) =>
        row.map((sq, c) => {
          const name = "abcdefgh"[c] + (8 - r);
          const touched = name === from || name === to;
          return (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: touched ? HIGHLIGHT : (r + c) % 2 === 0 ? LIGHT : DARK,
                fontSize: cell * 0.74,
                lineHeight: 1,
                color: sq?.color === "w" ? "#FFFFFF" : "#2B3A55",
                textShadow: sq?.color === "w" ? "0 1px 0 #6B7A96" : "none",
              }}
            >
              {sq ? GLYPH[sq.color + sq.type] : ""}
            </div>
          );
        }),
      )}
    </div>
  );
}
