"use client";

/* Games: open a room, read out its code, watch the board live, and keep the
   record of who played whom.

   Follows the list/detail shape the console uses everywhere else — the detail
   is a Drawer rather than a full page because staff watch a board *while*
   doing something else, and losing the list to do it would be a step back. */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf } from "@/lib/theme";
import { RATED_CLOCKS, cancelRoom, durationOf, openRoom, playersOf, type GameRoom } from "@/lib/games";
import { GameBoard } from "../games/GameBoard";
import { useLiveRoom, useLiveRooms } from "../games/useLiveRooms";
import { ErrorNote, errorText } from "../crud";
import {
  Drawer,
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

const TEMPLATE = equalTemplate(5, 90);
const VIEWS = ["list", "card"] as const;

const STATUS_TONE: Record<GameRoom["status"], { color: string; bg: string }> = {
  Active: { color: COLORS.success, bg: COLORS.successBg },
  Open: { color: COLORS.warning, bg: COLORS.warningBg },
  Finished: { color: COLORS.textSecondary, bg: COLORS.neutralBg },
  Cancelled: { color: COLORS.danger, bg: COLORS.dangerBg },
};

/* --------------------------------------------------------------- detail --- */

function RoomDrawer({ roomId, onClose, onChanged }: { roomId: string; onClose: () => void; onChanged: () => void }) {
  const t = useTranslations("games");
  const tc = useTranslations("common");
  const { detail, connection } = useLiveRoom(roomId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <Drawer title={t("gameTitle")} onClose={onClose}>
      {!room ? (
        <p style={{ fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>{tc("loading")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <ErrorNote>{error}</ErrorNote>}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Badge color={STATUS_TONE[room.status].color} bg={STATUS_TONE[room.status].bg}>
              {t(`status.${room.status}`)}
            </Badge>
            {room.status !== "Finished" && room.status !== "Cancelled" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT,
                             fontSize: 12.5, fontWeight: 600, color: connection === "live" ? COLORS.success : COLORS.warning }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%",
                               background: connection === "live" ? COLORS.successFill : COLORS.warningFill }} />
                {t(`connection.${connection}`)}
              </span>
            )}
          </div>

          {/* An Open room still needs its code read out, so it stays visible. */}
          {room.status === "Open" && room.code && (
            <Card style={{ textAlign: "center", background: COLORS.light, borderColor: COLORS.light }}>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("readOutCode")}</p>
              <p style={{ margin: "6px 0 0", fontFamily: "ui-monospace, monospace", fontSize: 30,
                          fontWeight: 700, letterSpacing: "0.25em", color: COLORS.navy }}>
                {room.code}
              </p>
            </Card>
          )}

          <div style={{ display: "flex", justifyContent: "center" }}>
            <GameBoard fen={room.fen} lastMove={last?.uci} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            {(["white", "black"] as const).map((side) => {
              const seat = room[side];
              return (
                <div key={side} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  <Avatar initials={seat ? initialsOf(seat.displayName) : "?"} size={30} />
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>
                      {seat?.displayName ?? t("waiting")}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>{t(`side.${side}`)}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <Card style={{ padding: 14 }}>
            <SectionTitle style={{ fontSize: 14, marginBottom: 8 }}>{t("moves")}</SectionTitle>
            {moves.length === 0 ? (
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("noMoves")}</p>
            ) : (
              <div style={{ maxHeight: 150, overflowY: "auto", display: "grid",
                            gridTemplateColumns: "auto 1fr 1fr", gap: "2px 12px",
                            fontFamily: "ui-monospace, monospace", fontSize: 12.5, color: COLORS.text }}>
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

          {room.status === "Finished" && (
            <Card style={{ padding: 14, background: COLORS.light, borderColor: COLORS.light }}>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>
                {t(`result.${room.result === "1/2-1/2" ? "draw" : room.result === "1-0" ? "white" : "black"}`)}
                {room.resultReason ? ` · ${t(`reason.${room.resultReason}`)}` : ""}
              </p>
              <p style={{ margin: "4px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                {t("lasted", { time: durationOf(room) })}
              </p>
            </Card>
          )}

          {(room.status === "Open" || room.status === "Active") && (
            <button onClick={stop} disabled={busy} style={{ ...secondaryButtonStyle, color: COLORS.danger }}>
              {t("stopGame")}
            </button>
          )}
        </div>
      )}
    </Drawer>
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
      <Table
        template={TEMPLATE}
        columns={[t("col.players"), t("col.status"), t("col.code"), t("col.moves"), t("col.result")]}
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
            </TableRow>
          ))
        )}
      </Table>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

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

      {openId && (
        <RoomDrawer roomId={openId} onClose={() => setOpenId(null)} onChanged={reload} />
      )}
    </div>
  );
}
