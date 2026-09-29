"use client";

/* Every game at once: the Grid view of the Games page.

   For the coach running a class activity or a mini-tournament, who wants to
   see which boards are moving, which have stalled and which are over without
   opening them one by one. Each card is drawn from the room list the page
   already polls — it carries every game's position and moves — so a wall of
   boards costs one request every couple of seconds, not a live stream per
   board (a browser allows only six connections to one server). Clicking a
   card opens the game's own page; the menu at its top right pauses, resumes,
   ends or removes it without leaving the grid. */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import {
  capturedFromFen,
  clockAt,
  fmtClock,
  needsCode,
  reasonKey,
  stageOf,
  timeControlLabel,
  winnerOf,
  type GameRoom,
} from "@/lib/games";
import { Badge, Card } from "../ui";
import { CodeChip } from "./CodeChip";
import { GameActions, type GameAct } from "./GameActions";
import { STATUS_TONE } from "./GameNavigator";
import { GameBoard, pieceSrc } from "./GameBoard";

/** Ticks once a second while any board on screen has a clock running. */
export function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return now;
}

type CardActions = {
  onOpen: (id: string) => void;
  onAct: (room: GameRoom, act: GameAct) => void;
  onResume: (room: GameRoom) => void;
  onRemove: (room: GameRoom) => void;
};

export function BoardsGrid({ rooms, ...actions }: { rooms: GameRoom[] } & CardActions) {
  const now = useNow(rooms.some((r) => r.status === "Active" && r.clock));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 430px), 1fr))", gap: 16 }}>
      {rooms.map((room) => (
        <GameCard key={room.gameRoomId} room={room} now={now} {...actions} />
      ))}
    </div>
  );
}

/** The pieces one side has taken, cheapest first, and their lead if any. */
export function CapturedPieces({ pieces, colour, lead }: { pieces: string[]; colour: "w" | "b"; lead: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", minHeight: 20 }}>
      {pieces.map((type, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={`${type}${i}`}
          src={pieceSrc(colour, type)}
          alt=""
          draggable={false}
          /* Runs of the same piece tuck together, so eight pawns still fit. */
          style={{ width: 19, height: 19, marginLeft: i > 0 && pieces[i - 1] === type ? -6 : i > 0 ? 1 : 0 }}
        />
      ))}
      {lead > 0 && (
        <span style={{ marginLeft: 4, fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.textSecondary }}>
          +{lead}
        </span>
      )}
    </span>
  );
}

/** How a game stands, in words: "Mini won", "Draw", "In play", "Waiting". */
export function OutcomePill({ room }: { room: GameRoom }) {
  const t = useTranslations("games");
  const winner = winnerOf(room, t("waiting"));
  const stage = stageOf(room);
  const [label, color, bg, icon] =
    stage === "Finished"
      ? winner
        ? [t("outcome.won", { name: winner }), COLORS.success, COLORS.successBg, "trophy" as const]
        : [t("outcome.draw"), COLORS.textSecondary, COLORS.neutralBg, "check" as const]
      : stage === "Active"
        ? [t("status.Active"), COLORS.warning, COLORS.warningBg, "flame" as const]
        : stage === "Stopped"
          ? [t("status.Stopped"), COLORS.blue, COLORS.light, "clockSmall" as const]
          : stage === "Open"
            ? [t("status.Open"), COLORS.blue, COLORS.light, "clockSmall" as const]
            : [t("status.Cancelled"), COLORS.danger, COLORS.dangerBg, "x" as const];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 14px",
        borderRadius: 10,
        background: bg,
        color,
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <Icon name={icon} size={15} color={color} />
      {label}
    </span>
  );
}

/** "Checkmate · 1-0", "Time out · 0-1", "Your move (White)" — the line under the pill. */
export function outcomeDetail(room: GameRoom, t: ReturnType<typeof useTranslations>): string {
  if (room.status === "Finished") {
    const key = reasonKey(room.resultReason);
    const reason = key && t.has(`reason.${key}`) ? t(`reason.${key}`) : "";
    const score = room.result === "1/2-1/2" ? "½-½" : room.result ?? "";
    return [reason, score].filter(Boolean).join(" · ");
  }
  if (room.status === "Active" && room.turn) return t("toMove", { side: t(`side.${room.turn.toLowerCase()}`) });
  /* A paused game waits for the office. A game the office set up waits for
     both players to press Enter; say who is still to come. A room with an
     empty seat is waiting on its code, which the card shows with a copy
     button. */
  if (room.stopped) return t("entered.stopped");
  if (room.status === "Open" && room.white && room.black) {
    if (room.whiteEntered) return t("entered.waitingFor", { name: room.black.displayName });
    if (room.blackEntered) return t("entered.waitingFor", { name: room.white.displayName });
    return t("entered.neither");
  }
  return "";
}

function GameCard({ room, now, onOpen, onAct, onResume, onRemove }: { room: GameRoom; now: number } & CardActions) {
  const t = useTranslations("games");
  const tView = useTranslations("view");
  const sans = room.sans ?? [];
  const captured = capturedFromFen(room.fen);
  const clock = clockAt(room, now);
  const movesRef = useRef<HTMLDivElement>(null);

  /* The latest move in view: the list scrolls to its end as the game grows,
     and the rest of the game is a scroll up. */
  useEffect(() => {
    const el = movesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sans.length]);

  const player = (side: "white" | "black") => {
    const seat = room[side];
    const colour = side === "white" ? "w" : "b";
    const toMove = room.status === "Active" && room.turn === (side === "white" ? "White" : "Black");
    const ms = clock ? clock[side] : null;
    /* White's tray holds the Black pieces White has taken, and vice versa. */
    const pieces = side === "white" ? captured.byWhite : captured.byBlack;
    const lead = side === "white" ? captured.advantage : -captured.advantage;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span
          aria-hidden
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            flexShrink: 0,
            background: side === "white" ? COLORS.surface : COLORS.navy,
            border: `2px solid ${toMove ? COLORS.success : side === "white" ? COLORS.border : COLORS.navy}`,
            boxShadow: toMove ? `0 0 0 3px ${COLORS.successBg}` : undefined,
          }}
        />
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: "0 1 auto" }}>
          <span
            style={{
              fontFamily: FONT,
              fontSize: 15,
              fontWeight: 700,
              color: seat ? COLORS.text : COLORS.textSecondary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {seat?.displayName ?? t("waiting")}
          </span>
          <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary, whiteSpace: "nowrap" }}>
            {t(`side.${side}`)}
            {seat?.rating ? ` · ${seat.rating}` : ""}
          </span>
        </span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-end", overflow: "hidden" }}>
          <CapturedPieces pieces={pieces} colour={colour === "w" ? "b" : "w"} lead={lead} />
        </span>
        {ms !== null && (
          <span
            aria-label={t("clockOf", { side: t(`side.${side}`), time: fmtClock(ms) })}
            style={{
              flexShrink: 0,
              padding: "4px 9px",
              borderRadius: 8,
              fontFamily: "ui-monospace, monospace",
              fontSize: 14,
              fontWeight: 700,
              background: toMove ? COLORS.navy : COLORS.neutralBg,
              color: toMove ? COLORS.surface : COLORS.text,
            }}
          >
            {fmtClock(ms)}
          </span>
        )}
      </div>
    );
  };

  const tc = timeControlLabel(room.timeControl);
  const detail = outcomeDetail(room, t);
  const stage = stageOf(room);
  const versus = t("navigator.versus", {
    white: room.white?.displayName ?? t("waiting"),
    black: room.black?.displayName ?? t("waiting"),
  });

  return (
    <Card className="jt-adm-card" style={{ padding: 0, overflow: "hidden" }}>
      <div role="group" aria-label={versus}>
        {/* The top bar: what the game is and where it stands, and its actions. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "11px 12px 11px 18px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.light,
          }}
        >
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text,
                           overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {room.label || versus}
            </span>
            {room.label && (
              <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary,
                             overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {versus}
              </span>
            )}
          </span>
          <Badge color={STATUS_TONE[stage].color} bg={STATUS_TONE[stage].bg}>
            {t(`status.${stage}`)}
          </Badge>
          <GameActions room={room} onAct={onAct} onResume={onResume} onRemove={onRemove} />
        </div>
        <div
          role="button"
          tabIndex={0}
          aria-label={tView("openCard", { what: versus })}
          onClick={() => onOpen(room.gameRoomId)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            onOpen(room.gameRoomId);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12, padding: 18, cursor: "pointer", outlineOffset: -3 }}
        >
          {/* Black above the board and White below, each on their own side of it. */}
          {player("black")}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 132px", gap: 10, alignItems: "stretch" }}>
            <GameBoard fen={room.fen} lastMove={room.lastUci} size="fill" />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "8px 10px",
                  borderBottom: `1px solid ${COLORS.border}`,
                  fontFamily: FONT,
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.text }}>{t("moves")}</span>
                <span style={{ fontSize: 11.5, color: COLORS.textSecondary }}>
                  {t("navigator.moveCount", { count: room.moveCount })}
                </span>
              </div>
              {sans.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: 10,
                    textAlign: "center",
                    fontFamily: FONT,
                    fontSize: 12,
                    color: COLORS.textSecondary,
                  }}
                >
                  <Icon name="clockSmall" size={18} color={COLORS.textSecondary} />
                  {t("firstMove")}
                </div>
              ) : (
                <div
                  ref={movesRef}
                  style={{
                    flex: "1 1 0",
                    minHeight: 0,
                    overflowY: "auto",
                    padding: "6px 4px",
                    fontFamily: FONT,
                    fontSize: 12.5,
                  }}
                >
                  {Array.from({ length: Math.ceil(sans.length / 2) }, (_, i) => {
                    const latest = i === Math.ceil(sans.length / 2) - 1;
                    return (
                      <div
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "22px 1fr 1fr",
                          gap: 2,
                          padding: "3px 6px",
                          borderRadius: 6,
                          background: latest ? COLORS.light : undefined,
                          color: latest ? COLORS.blue : COLORS.text,
                          fontWeight: latest ? 600 : 400,
                        }}
                      >
                        <span style={{ color: COLORS.textSecondary }}>{i + 1}.</span>
                        <span>{sans[i * 2]}</span>
                        <span>{sans[i * 2 + 1] ?? ""}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {player("white")}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
              <span>{tc ? (room.lichessRated ? t("tcRated", { tc }) : tc) : t("noTimeControl")}</span>
              {detail && <span>{detail}</span>}
              {needsCode(room) && room.code && <CodeChip code={room.code} />}
            </span>
            <OutcomePill room={room} />
          </div>
        </div>
      </div>
    </Card>
  );
}
