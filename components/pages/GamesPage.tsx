"use client";

/* Games: open a room, read out its code, watch the board live, and keep the
   record of who played whom.

   Follows the list/detail shape the console uses everywhere else, detail
   included. It was a Drawer, on the theory that staff watch a board *while*
   doing something else — but a 460px panel is not enough room for a board, two
   players and a move list, so the board came out small and the moves were a
   scrollbar inside a scrollbar. A game is the thing you came to look at. It
   gets the page, the same way a student does. */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf } from "@/lib/theme";
import { RATED_CLOCKS, cancelRoom, deleteRoom, durationOf, openRoom, playersOf, type GameRoom } from "@/lib/games";
import { downloadPgn, toPgn } from "@/lib/pgn";
import { GameBoard } from "../games/GameBoard";
import { useLiveRoom, useLiveRooms } from "../games/useLiveRooms";
import { ConfirmDeleteModal, ErrorNote, RowActions, errorText } from "../crud";
import { BackLink, DeleteButton, DetailHeader } from "../detail";
import {
  EmptyRow,
  equalTemplate,
  ExportButton,
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
import { CardGrid, EmptyCards, EntityCard, ViewToggle } from "../view-mode";
import { useViewMode } from "@/lib/view-mode";

const TEMPLATE = equalTemplate(6, 90);
const VIEWS = ["list", "card"] as const;

const STATUS_TONE: Record<GameRoom["status"], { color: string; bg: string }> = {
  Active: { color: COLORS.success, bg: COLORS.successBg },
  Open: { color: COLORS.warning, bg: COLORS.warningBg },
  Finished: { color: COLORS.textSecondary, bg: COLORS.neutralBg },
  Cancelled: { color: COLORS.danger, bg: COLORS.dangerBg },
};

/* --------------------------------------------------------------- detail --- */

function RoomDetail({
  roomId,
  onBack,
  onChanged,
  onDeleted,
}: {
  roomId: string;
  onBack: () => void;
  onChanged: () => void;
  /* Deleting takes the page's subject away, so the caller has to go somewhere
     — the detail cannot close itself onto a room that no longer exists. */
  onDeleted: () => void;
}) {
  const t = useTranslations("games");
  const tc = useTranslations("common");
  const { detail, connection } = useLiveRoom(roomId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const room = detail?.room;
  const moves = detail?.moves ?? [];
  const last = moves.length ? moves[moves.length - 1] : undefined;

  async function stop() {
    setBusy(true);
    try {
      await cancelRoom(roomId);
      onChanged();
    } catch (e) {
      setError(errorText(e, t("failed")));
    } finally {
      setBusy(false);
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
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <BackLink label={t("backToGames")} onClick={onBack} />
        <Card>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>{tc("loading")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <BackLink label={t("backToGames")} onClick={onBack} />

      {error && <ErrorNote>{error}</ErrorNote>}

      <DetailHeader
        title={playersOf(room, t("waiting"))}
        subtitle={t("gameTitle")}
        badges={
          <>
            <Badge color={STATUS_TONE[room.status].color} bg={STATUS_TONE[room.status].bg}>
              {t(`status.${room.status}`)}
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
            {(room.status === "Open" || room.status === "Active") && (
              <button onClick={stop} disabled={busy} style={{ ...secondaryButtonStyle, color: COLORS.danger }}>
                {t("stopGame")}
              </button>
            )}
            {/* A game being played is not deletable — stopping it is the
                reversible act, and the backend refuses this one anyway. */}
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

      {/* An Open room still needs its code read out, so it stays visible. */}
      {room.status === "Open" && room.code && (
        <Card style={{ textAlign: "center", background: COLORS.light, borderColor: COLORS.light }}>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("readOutCode")}</p>
          <p style={{ margin: "6px 0 0", fontFamily: "ui-monospace, monospace", fontSize: 34,
                      fontWeight: 700, letterSpacing: "0.25em", color: COLORS.navy }}>
            {room.code}
          </p>
        </Card>
      )}

      {/* Board beside the move list on a wide screen, stacked on a narrow one.
          In the drawer these were one column at 460px and the board was the
          loser; here the board keeps its size and the moves get a column of
          their own. */}
      <div className="jt-game-split">
        <Card style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <GameBoard fen={room.fen} lastMove={last?.uci} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, width: "100%" }}>
            {(["white", "black"] as const).map((side) => {
              const seat = room[side];
              return (
                <div key={side} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  <Avatar initials={seat ? initialsOf(seat.displayName) : "?"} size={34} />
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text,
                                   overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {seat?.displayName ?? t("waiting")}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t(`side.${side}`)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {room.status === "Finished" && (
            <Card style={{ background: COLORS.light, borderColor: COLORS.light }}>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>
                {t(`result.${room.result === "1/2-1/2" ? "draw" : room.result === "1-0" ? "white" : "black"}`)}
                {room.resultReason ? ` · ${t(`reason.${room.resultReason}`)}` : ""}
              </p>
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

export function GamesPage() {
  const t = useTranslations("games");
  const tc = useTranslations("common");
  const { rooms, loading, error, reload } = useLiveRooms();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [mode, setMode] = useViewMode("games", VIEWS);
  /* 0-indexed, like every other list here — starting at 1 opened the list on
     page two and hid the first twelve rooms. */
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [minted, setMinted] = useState<GameRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const [mintError, setMintError] = useState("");
  const [rated, setRated] = useState(false);
  const [clockIndex, setClockIndex] = useState(2); // 15+10, a school-friendly rapid
  /* Deleting from the list as well as from the detail: the rooms most worth
     clearing out are the ones nobody ever opened, and making the office visit
     each one first is the long way round. */
  const [deleting, setDeleting] = useState<GameRoom | null>(null);

  const filtered = useMemo(
    () =>
      rooms.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (!query) return true;
        const hay = [r.label, r.code, r.white?.displayName, r.black?.displayName].join(" ").toLowerCase();
        return hay.includes(query.toLowerCase());
      }),
    [rooms, query, status],
  );
  const { pageRows, totalPages } = paginate(filtered, page);

  async function mint() {
    setBusy(true);
    setMintError("");
    try {
      const clock = RATED_CLOCKS[clockIndex];
      const room = await openRoom("", rated
        ? { lichessRated: true, clockLimit: clock.limit, clockIncrement: clock.increment }
        : {});
      setMinted(room);
      reload();
    } catch (e) {
      setMintError(errorText(e, t("failed")));
    } finally {
      setBusy(false);
    }
  }

  /* The detail replaces the list rather than sitting on top of it, so the
     board gets the width. Keyed by room so opening a second game does not
     inherit the first one's socket. */
  if (openId) {
    return (
      <RoomDetail
        key={openId}
        roomId={openId}
        onBack={() => setOpenId(null)}
        onChanged={reload}
        onDeleted={() => {
          setOpenId(null);
          reload();
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title={t("title")}
        sub={t("subtitle")}
        action={
          <>
            <ExportButton
              filename="games"
              columns={[t("col.label"), t("col.players"), t("col.status"), t("col.moves"),
                        t("col.result"), t("col.started"), t("col.duration")]}
              rows={() =>
                filtered.map((r) => [
                  r.label ?? "",
                  playersOf(r, t("waiting")),
                  r.status,
                  r.moveCount,
                  r.result ?? "",
                  r.startedAt ?? "",
                  durationOf(r),
                ])
              }
            />
            {/* Rated is opt-in per room: it needs both pupils to have granted
                Lichess play access, and a lesson game should not move a child's
                rating. */}
            <label
              style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FONT,
                       fontSize: 13, color: COLORS.text, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={rated}
                onChange={(e) => setRated(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              {t("ratedLabel")}
            </label>
            {rated && (
              <select
                value={clockIndex}
                onChange={(e) => setClockIndex(Number(e.target.value))}
                aria-label={t("clockLabel")}
                style={{ ...secondaryButtonStyle, cursor: "pointer", paddingRight: 8 }}
              >
                {RATED_CLOCKS.map((c, i) => (
                  <option key={c.label} value={i}>{c.label}</option>
                ))}
              </select>
            )}
            <button onClick={mint} disabled={busy} style={primaryButtonStyle}>
              <Icon name="plus" size={15} />
              {rated ? t("openRatedRoom") : t("openRoom")}
            </button>
          </>
        }
      />

      {(error || mintError) && <ErrorNote>{error || mintError}</ErrorNote>}

      <FilterBar>
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder={t("search")} label={t("search")} />
        <SelectFilter
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { value: "all", label: t("status.all") },
            { value: "Active", label: t("status.Active") },
            { value: "Open", label: t("status.Open") },
            { value: "Finished", label: t("status.Finished") },
            { value: "Cancelled", label: t("status.Cancelled") },
          ]}
          label={t("col.status")}
        />
        <ViewToggle value={mode} onChange={setMode} options={VIEWS} style={{ marginLeft: "auto" }} />
      </FilterBar>

      {mode === "card" ? (
        <CardGrid min={250}>
          {loading ? (
            <EmptyCards>{tc("loading")}</EmptyCards>
          ) : pageRows.length === 0 ? (
            <EmptyCards>{t("empty")}</EmptyCards>
          ) : (
            pageRows.map((room: GameRoom) => (
              <EntityCard
                key={room.gameRoomId}
                onClick={() => setOpenId(room.gameRoomId)}
                title={playersOf(room, t("waiting"))}
                actions={
                  room.status !== "Active" ? (
                    <RowActions
                      label={playersOf(room, t("waiting"))}
                      onDelete={() => setDeleting(room)}
                    />
                  ) : undefined
                }
                badges={
                  <>
                    <Badge color={STATUS_TONE[room.status].color} bg={STATUS_TONE[room.status].bg}>
                      {t(`status.${room.status}`)}
                    </Badge>
                    <RatedBadge room={room} t={t} />
                  </>
                }
                rows={[
                  {
                    label: t("col.code"),
                    value: (
                      <span style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.1em" }}>
                        {room.status === "Open" ? room.code : "—"}
                      </span>
                    ),
                  },
                  { label: t("col.moves"), value: room.moveCount },
                  { label: t("col.result"), value: room.result ?? "—" },
                ]}
              />
            ))
          )}
        </CardGrid>
      ) : (
      /* On a card, like every other list here. Bare, the table sat straight on
         the page background with no surface under it — the only list in the
         console that did. */
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table
          template={TEMPLATE}
          columns={[t("col.players"), t("col.status"), t("col.code"), t("col.moves"), t("col.result"), tc("action")]}
        >
          {loading ? (
            <EmptyRow>{tc("loading")}</EmptyRow>
          ) : pageRows.length === 0 ? (
            <EmptyRow>{t("empty")}</EmptyRow>
          ) : (
            pageRows.map((room: GameRoom) => (
              <TableRow key={room.gameRoomId} template={TEMPLATE} onClick={() => setOpenId(room.gameRoomId)}>
                <span style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>
                  {playersOf(room, t("waiting"))}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Badge color={STATUS_TONE[room.status].color} bg={STATUS_TONE[room.status].bg}>
                    {t(`status.${room.status}`)}
                  </Badge>
                  <RatedBadge room={room} t={t} />
                </span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, letterSpacing: "0.1em",
                               color: room.status === "Open" ? COLORS.navy : COLORS.textSecondary }}>
                  {room.status === "Open" ? room.code : "—"}
                </span>
                <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>{room.moveCount}</span>
                <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                  {room.result ?? "—"}
                </span>
                {/* Nothing to offer on a board two people are playing: the act
                    there is Stop, which lives on the game's own page. */}
                {room.status === "Active" ? (
                  <span />
                ) : (
                  <RowActions
                    label={playersOf(room, t("waiting"))}
                    onDelete={() => setDeleting(room)}
                  />
                )}
              </TableRow>
            ))
          )}
        </Table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
      )}

      {mode === "card" && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

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

      {/* The code is shown once, big, because it is about to be read aloud. */}
      {minted && (
        <Modal title={t("roomReady")} onClose={() => setMinted(null)}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>{t("readOutCode")}</p>
            <p style={{ margin: 0, fontFamily: "ui-monospace, monospace", fontSize: 44, fontWeight: 700,
                        letterSpacing: "0.25em", color: COLORS.navy }}>
              {minted.code}
            </p>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("firstTwo")}</p>
            <button onClick={() => { setOpenId(minted.gameRoomId); setMinted(null); }} style={primaryButtonStyle}>
              {t("watchGame")}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
