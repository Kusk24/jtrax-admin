"use client";

/**
 * One player's event, beside the boards it was played on.
 *
 * This is the question the Results tab could not answer before. The table says
 * what happened on each board; a parent at the desk asks about a child — how
 * are they doing, who have they played, who is next — and answering it meant
 * reading five rounds and holding the score in your head.
 *
 * Every figure is derived from the mirrored pairings at render time. None of
 * it is stored: a saved "wins" is a number that can disagree with the boards
 * it came from, and the boards are the ones chess-results.com published.
 */
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { ACCENTS, ACCENT_TINTS, COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { formatPoints } from "@/lib/tournament-results";
import {
  gamesFor,
  initialsOf,
  progression,
  recordOf,
  type PlayerGame,
  type RoundView,
} from "@/lib/tournament-rounds";
import { useData } from "../DataProvider";
import { Avatar, Badge, Card } from "../ui";
import { ResultPill } from "./RoundCard";

export function PlayerPanel({
  name,
  rounds,
  rating,
  club,
  rank,
  /** The age group being shown, when the tab strip is on a group. */
  category,
  /** Set when this name matched one of the academy's own students. */
  studentId,
  onClose,
}: {
  name: string;
  /** Every round of the event, unfiltered — the panel picks out this player's
      own boards and needs the rest to know which round is next. */
  rounds: RoundView[];
  rating?: number;
  club?: string;
  rank?: number;
  category?: string;
  studentId?: string;
  onClose: () => void;
}) {
  const t = useTranslations("results");
  const { students } = useData();

  const games = gamesFor(name, rounds);
  const record = recordOf(games);
  const running = progression(games);
  /* The first game without a result: what the player is about to play, and
     the only thing on this panel that is about the future. */
  const next = games.find((g) => g.score === null);

  /* Only for one of ours, and only from the student record — an outside
     player's family is not the academy's to show. */
  const student = studentId ? students.find((s) => s.id === studentId) : undefined;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Avatar initials={initialsOf(name)} size={52} color={COLORS.surface} bg={COLORS.blue} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontFamily: FONT_DISPLAY, fontSize: 17, color: COLORS.text }}>
            {name}
          </strong>
          <span style={{ display: "block", marginTop: 2, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {[rating ? t("ratingIs", { rating }) : null, club || null, category || null]
              .filter(Boolean)
              .join(" · ") || t("noRating")}
          </span>
          <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
            {student && (
              <Badge color={ACCENTS.blue} bg={ACCENT_TINTS.blue}>
                {t("academyStudent")}
              </Badge>
            )}
            {next && (
              <Badge color={COLORS.success} bg={COLORS.successBg}>
                {t(next.side === "white" ? "whiteNext" : "blackNext")}
              </Badge>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("closePlayer")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: "none",
            borderRadius: 8,
            background: "transparent",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Icon name="x" size={16} color={COLORS.textSecondary} />
        </button>
      </div>

      {/* Who to call if something happens at the venue — the one thing on this
          panel that is not in the arbiter's tables, and the reason an
          organiser opens it during an event. */}
      {student && (student.parentName || student.parentPhone) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            padding: "11px 13px",
            borderRadius: 11,
            background: COLORS.light,
          }}
        >
          {student.parentName && (
            <ContactLine icon="students" label={t("guardian")} value={student.parentName} />
          )}
          {student.parentPhone && (
            <ContactLine
              icon="phone"
              label={t("emergencyPhone")}
              value={
                <a href={`tel:${student.parentPhone}`} style={{ color: COLORS.blue, textDecoration: "none" }}>
                  {student.parentPhone}
                </a>
              }
            />
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
        <Stat label={t("points")} value={formatPoints(record.points)} />
        {/* Rank comes from the ranking page rather than being counted here:
            the tie-breaks that order two players on the same score are the
            arbiter's, and re-deriving them would be inventing a standing. */}
        <Stat label={t("standing")} value={rank ? `#${rank}` : "—"} />
        <Stat label={t("wdl")} value={`${record.wins}–${record.draws}–${record.losses}`} small />
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <strong style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, letterSpacing: 0.3, color: COLORS.text }}>
            {t("roundResults")}
          </strong>
          <span style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary }}>{t("swissPairing")}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 9 }}>
          {games.length === 0 ? (
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
              {t("noGamesYet")}
            </p>
          ) : (
            games.map((g) => <GameRow key={`${g.round}-${g.board}`} game={g} />)
          )}
        </div>
      </div>

      {record.played > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "12px 13px",
            borderRadius: 11,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontFamily: FONT, fontSize: 13, color: COLORS.text }}>{t("performance")}</strong>
            {/* Points as a share of those available — a draw counts half, which
                is why this is not a win percentage and is not labelled one. */}
            <span style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: COLORS.blue }}>
              {t("scoreRate", { pct: Math.round(record.rate * 100) })}
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: COLORS.neutralBg, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.round(record.rate * 100)}%`,
                height: "100%",
                borderRadius: 999,
                background: COLORS.blue,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary }}>
            <span>{t("matchesCompleted", { count: record.played })}</span>
            <span>{t("ofPossible", { got: formatPoints(record.points), max: record.played })}</span>
          </div>
        </div>
      )}

      {running.length > 1 && <Progression running={running} />}
    </Card>
  );
}

function ContactLine({
  icon,
  label,
  value,
}: {
  icon: "students" | "phone";
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT, fontSize: 12.5 }}>
      <Icon name={icon} size={14} color={COLORS.textSecondary} />
      <span style={{ color: COLORS.textSecondary }}>{label}</span>
      <span style={{ marginLeft: "auto", fontWeight: 600, color: COLORS.text, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        padding: "11px 6px",
        borderRadius: 11,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <span style={{ fontFamily: FONT, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, color: COLORS.textSecondary, textTransform: "uppercase" }}>
        {label}
      </span>
      <strong style={{ fontFamily: FONT_DISPLAY, fontSize: small ? 16 : 20, color: COLORS.text, whiteSpace: "nowrap" }}>
        {value}
      </strong>
    </div>
  );
}

function GameRow({ game }: { game: PlayerGame }) {
  const t = useTranslations("results");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 10px",
        borderRadius: 10,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <span style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: COLORS.textSecondary, width: 22, flexShrink: 0 }}>
        R{game.round}
      </span>
      {!game.bye && <Avatar initials={initialsOf(game.opponent)} size={24} />}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontFamily: FONT,
            fontSize: 12.5,
            fontWeight: 600,
            color: COLORS.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {game.bye ? t("bye") : t("versusName", { name: game.opponent })}
        </span>
        <span style={{ display: "block", fontFamily: FONT, fontSize: 11, color: COLORS.textSecondary }}>
          {t("boardAndColour", {
            board: game.board,
            colour: t(game.side === "white" ? "asWhite" : "asBlack"),
          })}
        </span>
      </span>
      {/* The pill is coloured from white's side, so on a board this player had
          black it reads as their opponent's result — which is what the
          scoresheet says too. The colour is on the line below it. */}
      <ResultPill result={game.result} />
    </div>
  );
}

/**
 * The running score as a shape.
 *
 * A line rather than numbers because the question it answers is a shape one —
 * whether a player is climbing, flat or stalled — and five numbers in a row
 * make you do that reading yourself. Drawn as an SVG polyline against the
 * points available so far, so a flat stretch is visibly flat.
 */
function Progression({ running }: { running: number[] }) {
  const t = useTranslations("results");
  const width = 100;
  const height = 34;
  /* The stroke is centred on the line, so a point at y=0 or y=height loses
     half its width off the edge of the box. Inset by that half. */
  const pad = 1.5;
  const max = running.length; // one point a round is the ceiling
  const points = running
    .map((score, i) => {
      const x = running.length === 1 ? 0 : (i / (running.length - 1)) * width;
      const span = height - pad * 2;
      const y = height - pad - (max === 0 ? 0 : (score / max) * span);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const perRound = running[running.length - 1] / running.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, letterSpacing: 0.3, color: COLORS.text }}>
          {t("progression")}
        </strong>
        <span style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: COLORS.success }}>
          {t("perRound", { pts: formatPoints(Math.round(perRound * 2) / 2) })}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t("progressionAlt", { scores: running.map((r) => formatPoints(r)).join(", ") })}
        style={{ width: "100%", height: 38 }}
      >
        <polyline
          points={points}
          fill="none"
          stroke={COLORS.blue}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
