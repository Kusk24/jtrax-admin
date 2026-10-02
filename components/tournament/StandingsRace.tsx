"use client";

/**
 * The standings race: a line per player showing where they stood after each
 * round, drawn above the rounds on the Results tab.
 *
 * It is an addition, not a replacement — the rounds below are still the record
 * — and it can be switched off from the Results header. A Swiss event works
 * like a racing season: nobody is knocked out, everybody plays every round and
 * points add up, so the question worth a picture is who climbed. The academy's
 * own players are drawn in colour and everybody else in faint grey; with none
 * of ours in the event, the leaders are coloured instead.
 *
 * Positions are by points alone (see `standingsRace`), and the subtitle says
 * so: the official tiebreaks exist only for the current ranking.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { ACCENTS, ACCENT_TINTS, COLORS, FONT } from "@/lib/theme";
import { formatPoints } from "@/lib/tournament-results";
import type { Race, RaceRow } from "@/lib/standings-race";
import { Card } from "../ui";

const PALETTE = [ACCENTS.blue, ACCENTS.amber, ACCENTS.green, ACCENTS.plum, ACCENTS.red, ACCENTS.navy];
/** More coloured lines than this and the colours stop telling them apart. */
const MAX_COLOURED = 8;
/** Below this width the names move out of the chart into the legend. */
const WIDE = 560;

export function StandingsRace({
  race,
  selected,
  onSelect,
}: {
  race: Race;
  /** The player the search has narrowed the tab to, drawn on top. */
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const t = useTranslations("results");

  /* Drawn in real pixels rather than scaled from a fixed viewBox, so the labels
     stay readable on a phone instead of shrinking with the chart. */
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = box.current;
    /* No observer (a test DOM): the legend below still names everybody. */
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ours = race.rows.filter((r) => r.studentId);
  const base = (ours.length > 0 ? ours : race.rows.slice(0, 3)).slice(0, MAX_COLOURED);
  const pickedRow = selected ? race.rows.find((r) => r.name === selected) : undefined;
  const coloured = pickedRow && !base.includes(pickedRow) ? [...base, pickedRow] : base;
  const colourOf = new Map(coloured.map((row, i) => [row.name, PALETTE[i % PALETTE.length]]));

  const place = (row: RaceRow, i: number) =>
    `${row.tied[i] ? "=" : ""}${t("racePlace", { n: row.positions[i] })}`;
  const last = race.rounds.length - 1;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          aria-hidden
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 11,
            background: ACCENT_TINTS.blue,
            flexShrink: 0,
          }}
        >
          <Icon name="trendingUp" size={19} color={ACCENTS.blue} />
        </span>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block", fontFamily: FONT, fontSize: 15, color: COLORS.text }}>
            {t("raceTitle")}
          </strong>
          <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {t("raceSub")} {ours.length > 0 ? t("raceOursColoured") : t("raceLeadersColoured")}
          </span>
        </div>
      </div>

      <div ref={box} style={{ width: "100%" }}>
        {width > 0 && (
          <Chart
            race={race}
            width={width}
            coloured={coloured}
            colourOf={colourOf}
            selected={pickedRow?.name ?? null}
            onSelect={onSelect}
            place={place}
          />
        )}
      </div>

      {/* The coloured players by name. On a phone this is where the names are;
          on any screen it is the part a finger or a keyboard can use. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {coloured.map((row) => {
          const on = row.name === pickedRow?.name;
          return (
            <button
              key={row.name}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(row.name)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${on ? colourOf.get(row.name) : COLORS.border}`,
                background: on ? COLORS.light : COLORS.surface,
                fontFamily: FONT,
                fontSize: 12.5,
                color: COLORS.text,
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden
                style={{ width: 9, height: 9, borderRadius: 999, background: colourOf.get(row.name), flexShrink: 0 }}
              />
              <span style={{ fontWeight: 600 }}>{row.name}</span>
              <span style={{ color: COLORS.textSecondary }}>
                {place(row, last)} · {t("racePoints", { points: formatPoints(row.points[last]) })}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Chart({
  race,
  width,
  coloured,
  colourOf,
  selected,
  onSelect,
  place,
}: {
  race: Race;
  width: number;
  coloured: RaceRow[];
  colourOf: Map<string, string>;
  selected: string | null;
  onSelect: (name: string) => void;
  place: (row: RaceRow, i: number) => string;
}) {
  const t = useTranslations("results");
  const wide = width >= WIDE;
  const padL = 44;
  const padR = wide ? 170 : 14;
  const padT = 12;
  const padB = 26;
  /* Taller for a bigger field, within reason: a 60-player event still has to
     fit on the screen above the rounds. */
  const plotH = Math.max(150, Math.min(300, race.field * 14));
  const plotW = Math.max(40, width - padL - padR);
  const height = padT + plotH + padB;
  const n = race.rounds.length;

  const x = (i: number) => (n <= 1 ? padL + plotW / 2 : padL + (i * plotW) / (n - 1));
  const y = (pos: number) =>
    race.field <= 1 ? padT + plotH / 2 : padT + ((pos - 1) * plotH) / (race.field - 1);
  const line = (row: RaceRow) => row.positions.map((p, i) => `${x(i)},${y(p)}`).join(" ");

  const ticks = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(1 + f * (race.field - 1))))];

  /* Names at the right-hand end, nudged apart so two players on the same
     score do not print on top of each other. */
  const labels = coloured
    .map((row) => ({ row, y: y(row.positions[n - 1]) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) {
    if (labels[i].y - labels[i - 1].y < 14) labels[i].y = labels[i - 1].y + 14;
  }

  const grey = race.rows.filter((r) => !colourOf.has(r.name));
  /* The selected player last, so their line is drawn over everybody's. */
  const front = [...coloured].sort((a, b) => Number(a.name === selected) - Number(b.name === selected));

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={t("raceAria", { rounds: n, players: race.field })}
      style={{ display: "block", fontFamily: FONT, overflow: "visible" }}
    >
      {ticks.map((p) => (
        <g key={`tick-${p}`}>
          <line x1={padL} x2={padL + plotW} y1={y(p)} y2={y(p)} stroke={COLORS.border} strokeWidth={1} />
          <text x={padL - 8} y={y(p) + 4} textAnchor="end" fontSize={11} fill={COLORS.textSecondary}>
            {t("racePlace", { n: p })}
          </text>
        </g>
      ))}
      {race.rounds.map((round, i) => (
        <text key={`round-${round}`} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={COLORS.textSecondary}>
          {t("raceRound", { n: round })}
        </text>
      ))}

      {grey.map((row) => (
        <polyline
          key={row.name}
          points={line(row)}
          fill="none"
          stroke={COLORS.textSecondary}
          strokeOpacity={0.22}
          strokeWidth={1.2}
        >
          <title>{`${row.name} · ${place(row, n - 1)}`}</title>
        </polyline>
      ))}

      {front.map((row) => {
        const colour = colourOf.get(row.name);
        const on = row.name === selected;
        const dim = selected !== null && !on;
        return (
          <g
            key={row.name}
            onClick={() => onSelect(row.name)}
            style={{ cursor: "pointer" }}
            opacity={dim ? 0.45 : 1}
          >
            <polyline points={line(row)} fill="none" stroke={colour} strokeWidth={on ? 3.6 : 2.6} strokeLinejoin="round" />
            {row.positions.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p)} r={on ? 4.5 : 3.6} fill={colour}>
                <title>
                  {t("raceDot", {
                    name: row.name,
                    round: race.rounds[i],
                    place: place(row, i),
                    points: formatPoints(row.points[i]),
                  })}
                </title>
              </circle>
            ))}
          </g>
        );
      })}

      {wide &&
        labels.map(({ row, y: ly }) => (
          <text
            key={`label-${row.name}`}
            x={padL + plotW + 10}
            y={ly + 4}
            fontSize={12}
            fontWeight={row.name === selected ? 700 : 600}
            fill={colourOf.get(row.name)}
            onClick={() => onSelect(row.name)}
            style={{ cursor: "pointer" }}
          >
            {`${row.name.length > 18 ? `${row.name.slice(0, 17)}…` : row.name} · ${place(row, n - 1)}`}
          </text>
        ))}
    </svg>
  );
}
