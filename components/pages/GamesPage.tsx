"use client";

/* Games: open a room, read out its code, watch the board live, and keep the
   record of who played whom.

   Follows the list/detail shape the console uses everywhere else, detail
   included. It was a Drawer, on the theory that staff watch a board *while*
   doing something else — but a 460px panel is not enough room for a board, two
   players and a move list, so the board came out small and the moves were a
   scrollbar inside a scrollbar. A game is the thing you came to look at. It
   gets the page, the same way a student does.

   Lichess shares the screen, and leads it. Both answer "what is this child
   playing?" — one here, one at home — and as adjacent tabs they were two
   clicks apart for no reason anybody could name. Lichess goes first because it
   is the half the academy never sees; the boards it opened itself are the half
   it already knows about. The pattern is Academy's: h1 for the first section,
   h2 for the rest, so the page still has exactly one h1. */
import { Fragment, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf } from "@/lib/theme";
import { useUrlBackedState } from "@/lib/url-state";
import type { ViewMode } from "@/lib/view-mode";
import {
  cancelRoom,
  capturedFromFen,
  clockAt,
  deleteRoom,
  fmtClock,
  needsCode,
  stageOf,
  resumeRoom,
  stopRoom,
  durationOf,
  playedAt,
  playedDay,
  playersOf,
  timeControlLabel,
  winnerOf,
  type GameRoom,
} from "@/lib/games";
import { isInClass } from "@/lib/student-classes";
import { downloadPgn, toPgn } from "@/lib/pgn";
import { GameBoard } from "../games/GameBoard";
import { GameNavigator, STATUS_TONE } from "../games/GameNavigator";
import { BoardsGrid, CapturedPieces, OutcomePill, outcomeDetail, useNow } from "../games/BoardsGrid";
import { NewGameModal } from "../games/NewGameModal";
import { CodeChip } from "../games/CodeChip";
import { GameActions, GameConfirmModal, type GameAct } from "../games/GameActions";
import { useData } from "../DataProvider";
import { BOARDS_POLL_MS, useLiveRoom, useLiveRooms } from "../games/useLiveRooms";
import { LichessPanel } from "../lichess/LichessPanel";
import { ActionButton, ConfirmDeleteModal, ErrorNote, errorText } from "../crud";
import { useErrorToast } from "../ErrorToast";
import { BackLink, DeleteButton, DetailHeader } from "../detail";
import {
  EmptyRow,
  ExportButton,
  fieldStyle,
  FilterBar,
  Modal,
  PageHeader,
  paginate,
  Pagination,
  primaryButtonStyle,
  SearchInput,
  secondaryButtonStyle,
  SelectFilter,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, SectionTitle } from "../ui";
import { EmptyCards, ViewToggle } from "../view-mode";

const TEMPLATE = "1.3fr 1fr 1fr 1fr 0.6fr 1.1fr 76px";
/* The grid of boards first — it is what a class activity is watched on — and
   the list for reviewing who played whom. The card view went once the grid
   arrived: a card per game said less than the board it stood for. */
const VIEWS = ["boards", "list"] as const;

/* --------------------------------------------------------------- detail --- */

/* The Back link and the game navigator sit above this, in GamesPage: they
   outlive a switch from one game to the next, which remounts this. */
function RoomDetail({
  roomId,
  onChanged,
  onDeleted,
}: {
  roomId: string;
  onChanged: () => void;
  /* Deleting takes the page's subject away, so the caller has to go somewhere
     — the detail cannot close itself onto a room that no longer exists. */
  onDeleted: () => void;
}) {
  const t = useTranslations("games");
  const tc = useTranslations("common");
  const { detail, connection } = useLiveRoom(roomId);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [acting, setActing] = useState<GameAct | null>(null);

  const room = detail?.room;
  const moves = detail?.moves ?? [];
  const last = moves.length ? moves[moves.length - 1] : undefined;
  const now = useNow(Boolean(room?.clock) && room?.status === "Active");
  const clock = room ? clockAt(room, now) : null;
  const captured = capturedFromFen(room?.fen ?? "");
  const tcLabel = timeControlLabel(room?.timeControl);

  /* Pausing (the two finish it another day) and ending (it stops for good,
     kept in the record) are both asked first — louder on a rated game. */
  async function act(kind: GameAct) {
    try {
      await (kind === "stop" ? stopRoom(roomId) : cancelRoom(roomId));
      onChanged();
    } catch (e) {
      setError(errorText(e, t("failed")));
    }
  }

  /* PGN rather than the CSV every other export produces. A column of SANs is
     a chess game with the chess removed; this opens in Lichess. */
  function exportPgn() {
    if (!room) return;
    downloadPgn(
      `game-${room.code || roomId}`,
      toPgn(room, moves, { event: t("event"), site: t("site"), waiting: t("waiting") }),
    );
  }

  if (!room) {
    return (
      <Card>
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>{tc("loading")}</p>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <ErrorNote>{error}</ErrorNote>}

      <DetailHeader
        title={playersOf(room, t("waiting"))}
        subtitle={t("gameTitle")}
        badges={
          <>
            <Badge color={STATUS_TONE[stageOf(room)].color} bg={STATUS_TONE[stageOf(room)].bg}>
              {t(`status.${stageOf(room)}`)}
            </Badge>
            <RatedBadge room={room} t={t} />
            {/* Whether what is on screen is still arriving. Only while the game
                can still change — a finished board is not "reconnecting". */}
            {room.status !== "Finished" && room.status !== "Cancelled" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT,
                             fontSize: 12.5, fontWeight: 600, color: connection === "live" ? COLORS.success : COLORS.warning }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%",
                               background: connection === "live" ? COLORS.successFill : COLORS.warningFill }} />
                {t(`connection.${connection}`)}
              </span>
            )}
          </>
        }
        actions={
          <>
            {/* Only where there is a game to write down. An empty room exports
                seven tags and no moves, which is a file that says nothing. */}
            {moves.length > 0 && (
              <button onClick={exportPgn} className="jt-btn-ghost" style={secondaryButtonStyle}>
                <Icon name="download" size={14} /> {t("exportPgn")}
              </button>
            )}
            {room.status === "Active" && (
              <button onClick={() => setActing("stop")} className="jt-btn-ghost" style={secondaryButtonStyle}>
                {t("actions.stop")}
              </button>
            )}
            {(room.status === "Active" || stageOf(room) === "Stopped") && (
              <button onClick={() => setActing("end")} style={{ ...secondaryButtonStyle, color: COLORS.danger }}>
                {t("actions.end")}
              </button>
            )}
            {stageOf(room) === "Stopped" && (
              <ActionButton
                className="jt-btn-primary"
                style={primaryButtonStyle}
                onClick={async () => {
                  try {
                    await resumeRoom(roomId);
                    onChanged();
                  } catch (e) {
                    setError(errorText(e, t("failed")));
                  }
                }}
              >
                {t("actions.resume")}
              </ActionButton>
            )}
            {/* A game being played is not deletable — pausing or ending it is
                the act there, and the backend refuses this one anyway. */}
            {room.status !== "Active" && (
              <DeleteButton onClick={() => setDeleting(true)} label={t("deleteGame")} />
            )}
          </>
        }
      />

      {deleting && (
        <ConfirmDeleteModal
          what={playersOf(room, t("waiting"))}
          note={moves.length > 0 ? t("deleteNote", { moves: moves.length }) : undefined}
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await deleteRoom(roomId);
            onDeleted();
          }}
        />
      )}

      {acting && (
        <GameConfirmModal room={room} act={acting} onClose={() => setActing(null)} onConfirm={() => act(acting)} />
      )}

      {/* A room with an open seat still needs its code read out. A game the
          office set up has no seat to give away, so no code. */}
      {needsCode(room) && room.code && (
        <Card style={{ textAlign: "center", background: COLORS.light, borderColor: COLORS.light }}>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("readOutCode")}</p>
          <div style={{ marginTop: 6 }}>
            <CodeChip code={room.code} size={30} />
          </div>
        </Card>
      )}

      {/* Board beside the move list on a wide screen, stacked on a narrow one.
          In the drawer these were one column at 460px and the board was the
          loser; here the board keeps its size and the moves get a column of
          their own. */}
      <div className="jt-game-split">
        <Card style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
          {/* Black above the board and White below, each on their side of it,
              with what they have taken and — on a rated game — their clock. */}
          {(["black", "white"] as const).map((side) => {
            const seat = room[side];
            const toMove = room.status === "Active" && room.turn === (side === "white" ? "White" : "Black");
            const ms = clock ? clock[side] : null;
            const row = (
              <div key={side} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Avatar initials={seat ? initialsOf(seat.displayName) : "?"} size={34} />
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text,
                                 overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {seat?.displayName ?? t("waiting")}
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                    {t(`side.${side}`)}
                    {seat?.rating ? ` · ${seat.rating}` : ""}
                  </span>
                </span>
                <span style={{ flex: 1, display: "flex", justifyContent: "flex-end", minWidth: 0, overflow: "hidden" }}>
                  <CapturedPieces
                    pieces={side === "white" ? captured.byWhite : captured.byBlack}
                    colour={side === "white" ? "b" : "w"}
                    lead={side === "white" ? captured.advantage : -captured.advantage}
                  />
                </span>
                {ms !== null && (
                  <span style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 8, fontFamily: "ui-monospace, monospace",
                                 fontSize: 15, fontWeight: 700,
                                 background: toMove ? COLORS.navy : COLORS.neutralBg,
                                 color: toMove ? COLORS.surface : COLORS.text }}>
                    {fmtClock(ms)}
                  </span>
                )}
              </div>
            );
            return side === "black" ? (
              <div key={side} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {row}
                <GameBoard fen={room.fen} lastMove={last?.uci} size="fill" />
              </div>
            ) : (
              row
            );
          })}
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {tcLabel ? (room.lichessRated ? t("tcRated", { tc: tcLabel }) : tcLabel) : t("noTimeControl")}
          </p>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {room.status !== "Finished" && outcomeDetail(room, t) && (
            <Card style={{ background: COLORS.light, borderColor: COLORS.light }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <OutcomePill room={room} />
                <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                  {outcomeDetail(room, t)}
                </span>
              </div>
            </Card>
          )}
          {room.status === "Finished" && (
            <Card style={{ background: COLORS.light, borderColor: COLORS.light }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <OutcomePill room={room} />
                <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                  {outcomeDetail(room, t)}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                {t("lasted", { time: durationOf(room) })}
              </p>
            </Card>
          )}

          <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionTitle>{t("moves")}</SectionTitle>
            {moves.length === 0 ? (
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>{t("noMoves")}</p>
            ) : (
              /* Sized to the moves, not to the card: `1fr` columns pushed
                 White's move and Black's reply to opposite ends of a wide
                 panel, which is a pair you read together. */
              <div style={{ display: "grid", gridTemplateColumns: "auto minmax(56px, auto) minmax(56px, auto)",
                            justifyContent: "start", gap: "3px 16px",
                            fontFamily: "ui-monospace, monospace", fontSize: 13, color: COLORS.text }}>
                {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => (
                  <div key={i} style={{ display: "contents" }}>
                    <span style={{ color: COLORS.textSecondary }}>{i + 1}.</span>
                    <span>{moves[i * 2]?.san}</span>
                    <span>{moves[i * 2 + 1]?.san ?? ""}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- page --- */

/** Says whether a board counts on Lichess, and why it stopped if it did.

    Detaching is deliberately loud: staff need to know a game they told two
    pupils was rated has stopped being one, while the game is still on. */
function RatedBadge({ room, t }: { room: GameRoom; t: (k: string) => string }) {
  if (room.lichessRated) {
    return (
      <Badge color={COLORS.blue} bg={COLORS.neutralBg}>
        {t("ratedBadge")}
      </Badge>
    );
  }
  if (room.lichessDetachedReason) {
    return (
      <Badge color={COLORS.warning} bg={COLORS.neutralBg}>
        {t(`detached.${room.lichessDetachedReason}`)}
      </Badge>
    );
  }
  return null;
}

type StatusTab = "all" | "Open" | "Active" | "Stopped" | "Finished";
const STATUS_TABS: StatusTab[] = ["all", "Open", "Active", "Stopped", "Finished"];

/** Today on the admin's own calendar, as the date field writes it. */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/* `detailId` is the game in the address bar (?id=), so a refresh or a shared
   link lands on the same board. */
export function GamesPage({ detailId }: { detailId?: string } = {}) {
  const t = useTranslations("games");
  const tc = useTranslations("common");
  const tLichess = useTranslations("lichessAdmin");
  const { raw } = useData();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusTab>("all");
  /* Today's games by default: the page is opened during a class, and the
     record of every earlier day is one cleared date away. */
  const [day, setDay] = useState(todayLocal);
  const [classId, setClassId] = useState("");
  const [result, setResult] = useState("");
  /* Always opens on the grid: it is what a class is watched on. The list is
     a switch away for reviewing, and is not remembered between visits. */
  const [mode, setMode] = useState<ViewMode>("boards");
  /* The grid is watched, not browsed, so it refreshes faster and carries each
     game's moves. */
  const { rooms, loading, error, reload } = useLiveRooms(
    mode === "boards" ? BOARDS_POLL_MS : undefined,
    mode === "boards",
  );
  /* 0-indexed, like every other list here — starting at 1 opened the list on
     page two and hid the first twelve rooms. */
  const [page, setPage] = useState(0);
  /* Opening a game is a push, so Back returns to the list; stepping between
     games replaces, or Back would walk through every board glanced at. */
  const [openId, setOpenId] = useUrlBackedState<string>("id", detailId ?? "", [], "push");
  const [creating, setCreating] = useState(false);
  const [minted, setMinted] = useState<GameRoom | null>(null);
  const [seated, setSeated] = useState<GameRoom | null>(null);
  const { showError } = useErrorToast();
  /* Deleting from the list as well as from the detail: the rooms most worth
     clearing out are the ones nobody ever opened, and making the office visit
     each one first is the long way round. */
  const [deleting, setDeleting] = useState<GameRoom | null>(null);
  const [acting, setActing] = useState<{ room: GameRoom; act: GameAct } | null>(null);
  const onAct = (room: GameRoom, act: GameAct) => setActing({ room, act });

  const classOptions = useMemo(
    () =>
      raw.classes
        .filter((k) => !k["archived_at"])
        .map((k) => ({ value: String(k["class_id"]), label: String(k["name"] ?? "") })),
    [raw.classes],
  );

  const filtered = useMemo(
    () =>
      rooms.filter((r) => {
        if (status !== "all" && stageOf(r) !== status) return false;
        if (day && playedDay(r) !== day) return false;
        const seats = [r.white?.studentId, r.black?.studentId].filter((id): id is string => Boolean(id));
        if (classId && !seats.some((id) => isInClass(raw.enrollments, id, classId))) return false;
        if (result === "white" && r.result !== "1-0") return false;
        if (result === "black" && r.result !== "0-1") return false;
        if (result === "draw" && r.result !== "1/2-1/2") return false;
        if (!query) return true;
        const hay = [r.label, r.code, r.white?.displayName, r.black?.displayName].join(" ").toLowerCase();
        return hay.includes(query.toLowerCase());
      }),
    [rooms, query, status, day, classId, result, raw.enrollments],
  );
  const { pageRows, totalPages } = paginate(filtered, page);

  /* Resuming needs no question: it is putting back what was held. */
  async function resume(room: GameRoom) {
    try {
      await resumeRoom(room.gameRoomId);
    } catch (e) {
      showError(errorText(e, t("failed")));
    }
    reload();
  }
  const resetPage = () => setPage(0);

  const resultText = (r: GameRoom) => {
    if (r.status !== "Finished") return t(`status.${r.status}`);
    const winner = winnerOf(r, t("waiting"));
    return winner ? t("outcome.won", { name: winner }) : t("outcome.draw");
  };
  const tcText = (r: GameRoom) => timeControlLabel(r.timeControl) || "—";
  const whenText = (r: GameRoom) => {
    const d = playedAt(r);
    return d ? dateTime.format(d) : "—";
  };

  /* The detail replaces the list rather than sitting on top of it, so the
     board gets the width. Keyed by room so switching games closes the first
     one's event stream before the next opens — never two at once, and a late
     reply for the old board cannot land on the new one. */
  if (openId) {
    /* The table's own order and filters, so Next is the row under this one.
       A game the filters hide (one just opened, say) falls back to every
       game rather than leaving the navigator with nowhere to go. */
    const inTable = filtered.some((r) => r.gameRoomId === openId);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ display: "flex" }}>
            <BackLink label={t("backToGames")} onClick={() => setOpenId("")} />
          </span>
          {rooms.length > 0 && (
            <GameNavigator
              rooms={inTable ? filtered : rooms}
              currentId={openId}
              onSelect={(id) => setOpenId(id, "replace")}
            />
          )}
        </div>
        <RoomDetail
          key={openId}
          roomId={openId}
          onChanged={reload}
          onDeleted={() => {
            setOpenId("");
            reload();
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title={tLichess("title")} sub={tLichess("pageSub")} />
      <LichessPanel heading={false} />

      {/* A clear break, so the second half reads as its own screen rather than
          as more of the Lichess table. */}
      <div style={{ marginTop: 10, borderTop: `1px solid ${COLORS.border}`, paddingTop: 22 }} />

      <PageHeader
        level={2}
        title={t("title")}
        sub={t("subtitle")}
        action={
          <>
            <ExportButton
              filename="games"
              columns={[t("history.dateTime"), t("history.white"), t("history.black"), t("history.timeControl"),
                        t("history.moves"), t("history.result"), t("col.label")]}
              rows={() =>
                filtered.map((r) => [
                  whenText(r),
                  r.white?.displayName ?? t("waiting"),
                  r.black?.displayName ?? t("waiting"),
                  tcText(r),
                  r.moveCount,
                  resultText(r),
                  r.label ?? "",
                ])
              }
            />
            <button type="button" className="jt-btn-primary" onClick={() => setCreating(true)} style={primaryButtonStyle}>
              <Icon name="plus" size={15} />
              {t("create.title")}
            </button>
          </>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <FilterBar>
        <SearchInput value={query} onChange={(v) => { setQuery(v); resetPage(); }} placeholder={t("search")} label={t("search")} />
        <input
          type="date"
          value={day}
          onChange={(e) => { setDay(e.target.value); resetPage(); }}
          aria-label={t("filter.date")}
          style={{ ...fieldStyle, width: "auto", borderRadius: 999, padding: "9px 14px" }}
        />
        <SelectFilter
          value={classId}
          onChange={(v) => { setClassId(v); resetPage(); }}
          options={[{ value: "", label: t("filter.allClasses") }, ...classOptions]}
          label={t("filter.class")}
        />
        <SelectFilter
          value={status}
          onChange={(v) => { setStatus(v as StatusTab); resetPage(); }}
          options={STATUS_TABS.map((v) => ({ value: v, label: t(`status.${v}`) }))}
          label={t("filter.status")}
        />
        <SelectFilter
          value={result}
          onChange={(v) => { setResult(v); resetPage(); }}
          options={[
            { value: "", label: t("filter.allResults") },
            { value: "white", label: t("filter.whiteWon") },
            { value: "black", label: t("filter.blackWon") },
            { value: "draw", label: t("filter.draw") },
          ]}
          label={t("filter.result")}
        />
        <ViewToggle value={mode} onChange={setMode} options={VIEWS} style={{ marginLeft: "auto" }} />
      </FilterBar>

      {mode === "boards" ? (
        <>
          {loading ? (
            <EmptyCards>{tc("loading")}</EmptyCards>
          ) : pageRows.length === 0 ? (
            <EmptyCards>{day ? t("emptyDay") : t("empty")}</EmptyCards>
          ) : (
            <BoardsGrid rooms={pageRows} onOpen={(id) => setOpenId(id)} onAct={onAct} onResume={resume} onRemove={setDeleting} />
          )}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      ) : (
      /* On a card, like every other list here. Bare, the table sat straight on
         the page background with no surface under it — the only list in the
         console that did. */
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table
          template={TEMPLATE}
          minWidth={1080}
          columns={[t("history.dateTime"), t("history.white"), t("history.black"), t("history.timeControl"),
                    t("history.moves"), t("history.result"), tc("action")]}
        >
          {loading ? (
            <EmptyRow>{tc("loading")}</EmptyRow>
          ) : pageRows.length === 0 ? (
            <EmptyRow>{day ? t("emptyDay") : t("empty")}</EmptyRow>
          ) : (
            pageRows.map((room: GameRoom) => {
              const winner = room.status === "Finished" ? winnerOf(room, t("waiting")) : null;
              const cell = { fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary };
              const name = (side: "white" | "black") => (
                <span style={{ fontFamily: FONT, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                               fontWeight: room[side] && winner === room[side]?.displayName ? 700 : 500,
                               color: room[side] ? COLORS.text : COLORS.textSecondary }}>
                  {room[side]?.displayName ?? t("waiting")}
                </span>
              );
              return (
                <TableRow key={room.gameRoomId} template={TEMPLATE} onClick={() => setOpenId(room.gameRoomId)}>
                  <span style={cell}>{whenText(room)}</span>
                  {name("white")}
                  {name("black")}
                  <span style={{ ...cell, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {tcText(room)}
                    <RatedBadge room={room} t={t} />
                  </span>
                  <span style={cell}>{room.moveCount}</span>
                  <span>
                    {room.status === "Finished" ? (
                      <Badge
                        color={winner ? COLORS.success : COLORS.textSecondary}
                        bg={winner ? COLORS.successBg : COLORS.neutralBg}
                      >
                        {resultText(room)}
                      </Badge>
                    ) : (
                      <Badge color={STATUS_TONE[stageOf(room)].color} bg={STATUS_TONE[stageOf(room)].bg}>
                        {t(`status.${stageOf(room)}`)}
                      </Badge>
                    )}
                  </span>
                  {/* Stop a game in play; remove anything that is not. */}
                  <GameActions room={room} onAct={onAct} onResume={resume} onRemove={setDeleting} />
                </TableRow>
              );
            })
          )}
        </Table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
      )}

      {deleting && (
        <ConfirmDeleteModal
          what={playersOf(deleting, t("waiting"))}
          note={deleting.moveCount > 0 ? t("deleteNote", { moves: deleting.moveCount }) : undefined}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteRoom(deleting.gameRoomId);
            reload();
          }}
        />
      )}

      {acting && (
        <GameConfirmModal
          room={acting.room}
          act={acting.act}
          onClose={() => setActing(null)}
          onConfirm={async () => {
            try {
              const id = acting.room.gameRoomId;
              await (acting.act === "stop" ? stopRoom(id) : cancelRoom(id));
            } catch (e) {
              showError(errorText(e, t("failed")));
            }
            reload();
          }}
        />
      )}

      {creating && (
        <NewGameModal
          rooms={rooms}
          onClose={() => setCreating(false)}
          onCreated={(room, how) => {
            setCreating(false);
            if (how === "players") setSeated(room);
            else setMinted(room);
            reload();
          }}
        />
      )}

      {/* Seated by the office: the students enter from their own screens, so
          there is no code to hand out. */}
      {seated && (
        <Modal title={t("create.started")} onClose={() => setSeated(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Who plays which side, and nothing else to read. */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
              {(["white", "black"] as const).map((side, i) => (
                <Fragment key={side}>
                  {i === 1 && (
                    <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.textSecondary }}>
                      {t("create.vs")}
                    </span>
                  )}
                  <span
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 10px",
                             borderRadius: 12, border: `1px solid ${COLORS.border}`, textAlign: "center", minWidth: 0 }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT, fontSize: 12.5,
                                   color: COLORS.textSecondary }}>
                      <span
                        aria-hidden
                        style={{ width: 10, height: 10, borderRadius: "50%",
                                 background: side === "white" ? COLORS.surface : COLORS.navy,
                                 border: `1.5px solid ${side === "white" ? COLORS.border : COLORS.navy}` }}
                      />
                      {t(side === "white" ? "create.whitePlayer" : "create.blackPlayer")}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: 15.5, fontWeight: 700, color: COLORS.text,
                                   overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                      {seated[side]?.displayName ?? t("waiting")}
                    </span>
                  </span>
                </Fragment>
              ))}
            </div>
            <button onClick={() => setSeated(null)} className="jt-btn-primary" style={primaryButtonStyle}>
              {t("create.done")}
            </button>
          </div>
        </Modal>
      )}

      {/* The code is shown once, big, because it is about to be read aloud. */}
      {minted && (
        <Modal title={t("roomReady")} onClose={() => setMinted(null)}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>{t("readOutCode")}</p>
            {minted.code && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <CodeChip code={minted.code} size={40} />
              </div>
            )}
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("firstTwo")}</p>
            <button onClick={() => setMinted(null)} className="jt-btn-primary" style={primaryButtonStyle}>
              {t("create.done")}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
