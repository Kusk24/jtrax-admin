"use client";

/**
 * One round of the event, as a card that opens.
 *
 * The round is the unit because the round is what an organiser is asked about
 * at the venue — "is three up yet?", "who has my daughter got next?" — and
 * because it is the unit the arbiter publishes in. The old view put every
 * round side by side in a horizontal scroller, which read as a timeline and
 * made the one round anybody wanted the hardest to find: the further the event
 * got, the further right the live round slid.
 *
 * Nothing here is editable. Results are typed in Swiss-Manager and published
 * to chess-results.com; this draws what was mirrored back and nothing else.
 */
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { ACCENTS, ACCENT_TINTS, COLORS, FONT } from "@/lib/theme";
import type { LinkedPairing } from "@/lib/chess-results";
import { formatPoints } from "@/lib/tournament-results";
import { initialsOf, nameKey, scoresOf, type RoundView } from "@/lib/tournament-rounds";
import { Avatar, Badge, Card } from "../ui";

/** What the table knows about a name beyond the board it is on — the club and
    the running score, which live on the ranking page rather than the pairing
    one. */
export type PlayerMeta = {
  rating?: number;
  club?: string;
  points?: number;
  /** Set when this name matched one of the academy's students. */
  studentId?: string;
};

export function RoundCard({
  view,
  open,
  onToggle,
  meta,
  selected,
  onSelect,
  /** Drawn as the round the event is currently at: a blue rim and a filled
      number, so the live round is findable without reading any of them. */
  highlight,
}: {
  view: RoundView;
  open: boolean;
  onToggle: () => void;
  meta: (name: string) => PlayerMeta;
  /** The player the table is filtered to, whose seat is picked out. */
  selected?: string | null;
  onSelect: (name: string) => void;
  highlight: boolean;
}) {
  const t = useTranslations("results");
  const played = view.state === "completed";
  const paired = view.state === "pairings";

  /* Which of the three the badge says, in the arbiter's terms. "Latest" is
     worth its own label: it is the round a question at the venue is almost
     always about. */
  const status = view.latest
    ? { label: t("roundCompletedLatest"), color: COLORS.success, bg: COLORS.successBg }
    : played
      ? { label: t("roundCompleted"), color: COLORS.success, bg: COLORS.successBg }
      : paired
        ? { label: t("roundPaired"), color: ACCENTS.blue, bg: ACCENT_TINTS.blue }
        : { label: t("roundScheduled"), color: COLORS.textSecondary, bg: COLORS.neutralBg };

  /* The sub-line is about how much of the round exists, not about the round's
     name. A scheduled round has no boards to count, so it says what it is
     waiting for instead. */
  const summary = played
    ? `${t("boards", { count: view.boards })} · ${t("gamesFinished", { count: view.finished })}`
    : paired
      ? `${t("boards", { count: view.boards })} · ${t("roundScheduled")}`
      : view.round > 1
        ? t("pairingsAfter", { n: view.round - 1 })
        : t("roundScheduled");

  const headerId = `round-${view.round}-header`;
  const panelId = `round-${view.round}-panel`;

  return (
    <Card
      style={{
        padding: 0,
        overflow: "hidden",
        border: `${highlight ? 2 : 1}px solid ${highlight ? COLORS.blue : COLORS.border}`,
      }}
    >
      <button
        type="button"
        id={headerId}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          /* The rim already costs a pixel on each side; without this the
             header shifts by one when a round becomes the live one. */
          padding: highlight ? "13px 15px" : "14px 16px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          flexWrap: "wrap",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: "50%",
            flexShrink: 0,
            background: highlight ? COLORS.blue : COLORS.light,
            color: highlight ? COLORS.surface : COLORS.textSecondary,
            fontFamily: FONT,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          R{view.round}
        </span>
        <strong style={{ fontFamily: FONT, fontSize: 15, color: COLORS.text, whiteSpace: "nowrap" }}>
          {view.final ? t("roundFinal", { n: view.round }) : t("round", { n: view.round })}
        </strong>
        <Badge color={status.color} bg={status.bg}>
          {status.label}
        </Badge>
        <span style={{ flex: 1, minWidth: 120, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
          {summary}
        </span>
        <span
          style={{
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 600,
            color: open ? COLORS.textSecondary : COLORS.blue,
            whiteSpace: "nowrap",
          }}
        >
          {t(open ? "expanded" : "clickToExpand")}
        </span>
        <span
          aria-hidden
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            flexShrink: 0,
            /* Rotated rather than swapped for a second glyph: one icon that
               turns reads as the same control changing state. */
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 160ms ease",
          }}
        >
          <Icon name="chevronDown" size={15} color={COLORS.textSecondary} />
        </span>
      </button>

      {open && (
        <div id={panelId} role="region" aria-labelledby={headerId}>
          {view.pairings.length === 0 ? (
            <p
              style={{
                margin: 0,
                padding: "22px 18px",
                textAlign: "center",
                fontFamily: FONT,
                fontSize: 13.5,
                lineHeight: 1.55,
                color: COLORS.textSecondary,
                borderTop: `1px solid ${COLORS.border}`,
              }}
            >
              {view.state === "scheduled" ? t("scheduledBody", { n: view.round }) : t("noBoardsHere")}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }} tabIndex={0} role="region" aria-label={t("round", { n: view.round })}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT }}>
                <thead>
                  <tr style={{ background: COLORS.light }}>
                    {[t("boardNo"), t("whitePlayer"), t("result"), t("blackPlayer")].map((label, i) => (
                      <th
                        key={label}
                        style={{
                          padding: "9px 14px",
                          textAlign: i === 2 ? "center" : "left",
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: COLORS.textSecondary,
                          whiteSpace: "nowrap",
                          borderTop: `1px solid ${COLORS.border}`,
                          borderBottom: `1px solid ${COLORS.border}`,
                          width: i === 0 ? 56 : undefined,
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.pairings.map((p) => (
                    <BoardRow
                      key={`${view.round}-${p.board}`}
                      pairing={p}
                      meta={meta}
                      selected={selected}
                      onSelect={onSelect}
                      /* Before a round is played the useful number beside a
                         name is the score they carry into it, not the rating
                         — it is what the pairing was made from. */
                      showRunning={!played}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function BoardRow({
  pairing,
  meta,
  selected,
  onSelect,
  showRunning,
}: {
  pairing: LinkedPairing;
  meta: (name: string) => PlayerMeta;
  selected?: string | null;
  onSelect: (name: string) => void;
  showRunning: boolean;
}) {
  const t = useTranslations("results");
  const scores = scoresOf(pairing.result);
  const bye = !pairing.black?.trim();

  return (
    <tr style={{ borderTop: `1px solid ${COLORS.border}` }}>
      <td style={{ padding: "10px 14px", fontSize: 13, color: COLORS.textSecondary, verticalAlign: "middle" }}>
        {pairing.board}
      </td>
      <td style={{ padding: "8px 14px", verticalAlign: "middle" }}>
        <PlayerCell
          name={pairing.white}
          rating={pairing.whiteRating}
          studentId={pairing.whiteStudentId}
          meta={meta}
          selected={selected}
          onSelect={onSelect}
          showRunning={showRunning}
        />
      </td>
      <td style={{ padding: "8px 10px", textAlign: "center", verticalAlign: "middle" }}>
        <ResultPill result={pairing.result} scores={scores} />
      </td>
      <td style={{ padding: "8px 14px", verticalAlign: "middle" }}>
        {bye ? (
          <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("bye")}</span>
        ) : (
          <PlayerCell
            name={pairing.black}
            rating={pairing.blackRating}
            studentId={pairing.blackStudentId}
            meta={meta}
            selected={selected}
            onSelect={onSelect}
            showRunning={showRunning}
          />
        )}
      </td>
    </tr>
  );
}

/** A name with the two things that identify a player across a hall of them:
    their rating and the school on their badge. */
function PlayerCell({
  name,
  rating,
  studentId,
  meta,
  selected,
  onSelect,
  showRunning,
}: {
  name: string;
  rating?: number;
  studentId?: string;
  meta: (name: string) => PlayerMeta;
  selected?: string | null;
  onSelect: (name: string) => void;
  showRunning: boolean;
}) {
  const info = meta(name);
  const ours = Boolean(studentId ?? info.studentId);
  const picked = selected !== null && selected !== undefined && nameKey(selected) === nameKey(name);
  const shownRating = rating ?? info.rating;
  const running = showRunning && info.points !== undefined ? ` (${formatPoints(info.points)})` : "";

  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        width: "100%",
        minWidth: 0,
        padding: "5px 7px",
        borderRadius: 9,
        border: `1px solid ${picked ? COLORS.blue : "transparent"}`,
        background: picked ? COLORS.light : "transparent",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <Avatar
        initials={initialsOf(name)}
        size={28}
        /* One of ours is filled rather than tinted. The whole reason the
           mirror matches names to students is so staff can pick their own
           children out of an arbiter's table at a glance. */
        color={ours ? COLORS.surface : COLORS.blue}
        bg={ours ? COLORS.blue : COLORS.light}
      />
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontFamily: FONT,
            fontSize: 13.5,
            fontWeight: 600,
            color: COLORS.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
          {running}
        </span>
        {(shownRating || info.club) && (
          <span
            style={{
              display: "block",
              fontFamily: FONT,
              fontSize: 11.5,
              color: COLORS.textSecondary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {[shownRating || null, info.club || null].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * The result, coloured from white's side of the board.
 *
 * Green-for-good would need a side to be good for, and a pairing table has
 * two. So the convention is the scoresheet's: the colour tracks the top name,
 * the same way "1 - 0" is read. The pill is never the academy's opinion of the
 * result — a JCA student losing on board one is still a red pill.
 */
export function ResultPill({ result, scores }: { result?: string; scores?: { white: number | null } }) {
  const t = useTranslations("results");
  const white = (scores ?? scoresOf(result)).white;

  if (white === null) {
    return (
      <span
        style={{
          display: "inline-block",
          minWidth: 46,
          padding: "4px 11px",
          borderRadius: 8,
          background: COLORS.neutralBg,
          color: COLORS.textSecondary,
          fontFamily: FONT,
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        {t("versus")}
      </span>
    );
  }

  const tone =
    white === 1
      ? { color: COLORS.success, bg: COLORS.successBg }
      : white === 0.5
        ? { color: COLORS.warning, bg: COLORS.warningBg }
        : { color: COLORS.danger, bg: COLORS.dangerBg };

  return (
    <span
      style={{
        display: "inline-block",
        minWidth: 46,
        padding: "4px 11px",
        borderRadius: 8,
        background: tone.bg,
        color: tone.color,
        fontFamily: FONT,
        fontSize: 12.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {/* The arbiter's own text, whitespace tidied and nothing else. Rewriting
          "½ - ½" as "0.5-0.5" would be us restating their result. */}
      {(result ?? "").replace(/\s+/g, " ").trim()}
    </span>
  );
}
