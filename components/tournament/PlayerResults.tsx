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
import { COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { formatPoints } from "@/lib/tournament-results";
import {
  gamesFor,
  initialsOf,
  recordOf,
  type PlayerGame,
  type RoundView,
} from "@/lib/tournament-rounds";
import { Avatar, Badge } from "../ui";
import { ResultPill } from "./RoundCard";

/**
 * The results part of a participant's profile (ParticipantProfile.tsx): what
 * they scored, where they stand, and each board they sat at.
 */
export function PlayerResults({
  name,
  rounds,
  rank,
}: {
  /** The name as chess-results prints it — the boards are matched on it. */
  name: string;
  /** Every round of their category, unfiltered — the panel picks out this
      player's own boards and needs the rest to know which round is next. */
  rounds: RoundView[];
  rank?: number;
}) {
  const t = useTranslations("results");

  const games = gamesFor(name, rounds);
  const record = recordOf(games);
  /* The first game without a result: what the player is about to play. */
  const next = games.find((g) => g.score === null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {next && (
        <span style={{ alignSelf: "flex-start" }}>
          <Badge color={COLORS.success} bg={COLORS.successBg}>
            {t(next.side === "white" ? "whiteNext" : "blackNext")}
          </Badge>
        </span>
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

      {record.played > 0 && <ScoreChart games={games.filter((g) => g.score !== null)} />}
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
 * The running score as a chart: rounds along the bottom, total points up the
 * side, one dot a round in the colour of that game — green a win, amber a
 * draw, red a loss — so a run of losses reads before any number does.
 */
function ScoreChart({ games }: { games: PlayerGame[] }) {
  const t = useTranslations("results");
  const W = 320;
  const H = 190;
  const pad = { left: 34, right: 12, top: 12, bottom: 38 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const points = games.reduce<Array<{ round: number; score: number; total: number }>>((acc, g) => {
    const score = g.score ?? 0;
    return [...acc, { round: g.round, score, total: (acc.at(-1)?.total ?? 0) + score }];
  }, []);
  /* The most a player could have: one point a round played. */
  const maxY = Math.max(1, points.length);
  const stepY = maxY <= 6 ? 1 : 2;
  const ticksY = Array.from({ length: Math.floor(maxY / stepY) + 1 }, (_, i) => i * stepY);
  const x = (i: number) => pad.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => pad.top + plotH - (v / maxY) * plotH;
  const tone = (score: number) => (score >= 1 ? COLORS.success : score > 0 ? COLORS.warning : COLORS.danger);
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");
  const axisText = { fontFamily: FONT, fontSize: 10.5, fill: COLORS.textSecondary };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <strong style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, letterSpacing: 0.3, color: COLORS.text }}>
        {t("progression")}
      </strong>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t("progressionAlt", { scores: points.map((p) => formatPoints(p.total)).join(", ") })}
        style={{ width: "100%", height: "auto" }}
      >
        {/* score axis, with a faint line at each step */}
        {ticksY.map((v) => (
          <g key={v}>
            <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} stroke={COLORS.border} strokeDasharray={v === 0 ? undefined : "3 4"} />
            <text x={pad.left - 7} y={y(v) + 3.5} textAnchor="end" {...axisText}>
              {formatPoints(v)}
            </text>
          </g>
        ))}
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + plotH} stroke={COLORS.border} />
        {/* round axis */}
        {points.map((p, i) => (
          <text key={p.round} x={x(i)} y={pad.top + plotH + 15} textAnchor="middle" {...axisText}>
            R{p.round}
          </text>
        ))}
        <text x={pad.left + plotW / 2} y={H - 4} textAnchor="middle" {...axisText} fontWeight={600}>
          {t("chartRound")}
        </text>
        <text x={10} y={pad.top + plotH / 2} textAnchor="middle" transform={`rotate(-90 10 ${pad.top + plotH / 2})`} {...axisText} fontWeight={600}>
          {t("chartScore")}
        </text>

        {points.length > 1 && <polyline points={line} fill="none" stroke={COLORS.blue} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p, i) => (
          <circle key={p.round} cx={x(i)} cy={y(p.total)} r={5} fill={tone(p.score)} stroke={COLORS.surface} strokeWidth={2}>
            <title>{`R${p.round}: ${formatPoints(p.total)}`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary }}>
        {[
          { label: t("chartWin"), color: COLORS.success },
          { label: t("chartDraw"), color: COLORS.warning },
          { label: t("chartLoss"), color: COLORS.danger },
        ].map((k) => (
          <span key={k.label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: k.color }} />
            {k.label}
          </span>
        ))}
      </div>
    </div>
  );
}
