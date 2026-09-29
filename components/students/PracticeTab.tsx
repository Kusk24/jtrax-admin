"use client";

/* A pupil's practice, on their profile: the streak, the last week against the
   week before, a month of days, four-plus weeks of progress, and what they
   actually did most recently. See lib/practice.ts for where each number comes
   from and why there are no points. */
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Icon, type IconName } from "@/lib/icons";
import { fmtDate, todayISO } from "@/lib/live";
import {
  activityOf,
  currentStreak,
  level,
  monthWeeks,
  overallTotals,
  practiceByDay,
  recentActivity,
  weeklyProgress,
  type HistoryEntry,
  type PracticeDay,
  type RecentRow,
} from "@/lib/practice";
import { COLORS, FONT } from "@/lib/theme";
import { useData } from "../DataProvider";
import { EmptyRow, selectStyle, Table, TableRow } from "../page-kit";
import { Card, SectionTitle } from "../ui";

/* The minutes series needs a colour of its own beside blue puzzles and the
   warm games line; the theme has no purple, and this one reads on both. */
const MINUTES_COLOR = "#9b7bf0";
const SHADES = [COLORS.neutralBg, "color-mix(in srgb, var(--jt-blue) 45%, transparent)", "color-mix(in srgb, var(--jt-blue) 75%, transparent)", COLORS.blue];
const RECENT_TEMPLATE = "minmax(110px, 0.9fr) minmax(180px, 2fr) minmax(80px, 0.6fr) minmax(80px, 0.6fr)";
const RECENT_SHOWN = 7;

/** The pupil's history, fetched once per pupil. A failure leaves games and
    the daily/free split out rather than the whole tab. */
function useHistory(studentId: string) {
  const [state, setState] = useState<{ id: string; entries: HistoryEntry[]; failed: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    api
      .get<{ history: HistoryEntry[] }>(`students/${encodeURIComponent(studentId)}/history`)
      .then((r) => live && setState({ id: studentId, entries: r.history ?? [], failed: false }))
      .catch(() => live && setState({ id: studentId, entries: [], failed: true }));
    return () => {
      live = false;
    };
  }, [studentId]);
  const current = state?.id === studentId ? state : null;
  return { entries: current?.entries ?? [], loading: current === null, failed: current?.failed ?? false };
}

function StatCard({
  icon,
  tint,
  value,
  label,
}: {
  icon: IconName;
  tint: string;
  value: string;
  label: string;
}) {
  return (
    <Card
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 18px",
      }}
    >
      <Icon name={icon} size={30} color={tint} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: COLORS.text }}>{value}</span>
        <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{label}</span>
      </span>
    </Card>
  );
}

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function DayTooltip({ date, day }: { date: string; day: PracticeDay | undefined }) {
  const t = useTranslations("practice");
  const row = { display: "flex", alignItems: "center", gap: 7 } as const;
  return (
    <>
      <strong style={{ fontSize: 13 }}>{fmtDate(date)}</strong>
      {!day || activityOf(day) === 0 ? (
        <span style={{ color: COLORS.textSecondary }}>{t("nothingThatDay")}</span>
      ) : (
        <>
          <span style={row}>
            <Icon name="pawn" size={13} color={COLORS.blue} /> {t("puzzlesSolved", { count: day.puzzles })}
          </span>
          <span style={row}>
            <Icon name="clockSmall" size={13} color={COLORS.warningFill} /> {t("minutes", { count: day.minutes + day.gameMinutes })}
          </span>
          {day.games > 0 && (
            <span style={row}>
              <Icon name="knight" size={13} color={MINUTES_COLOR} /> {t("gamesPlayed", { count: day.games })}
            </span>
          )}
          {day.dailyDone && (
            <span style={{ ...row, color: COLORS.success }}>
              <Icon name="check" size={13} color={COLORS.success} /> {t("dailyDone")}
            </span>
          )}
        </>
      )}
    </>
  );
}

function ActivityHeatmap({ days, today }: { days: Map<string, PracticeDay>; today: string }) {
  const t = useTranslations("practice");
  const locale = useLocale();
  const [y, m] = today.split("-").map(Number);
  const [month, setMonth] = useState({ year: y, month: m - 1 });
  /* The day under the pointer (or keyboard focus), and where its cell sits in
     the grid, so the tooltip can stand above it. */
  const [hover, setHover] = useState<{ date: string; left: number; top: number } | null>(null);
  const weeks = monthWeeks(month.year, month.month);
  const isCurrentMonth = month.year === y && month.month === m - 1;
  const monthLabel = new Date(month.year, month.month, 1).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
    month: "short",
    year: "numeric",
  });
  const move = (by: number) => {
    const d = new Date(month.year, month.month + by, 1);
    setHover(null);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };
  const show = (date: string, el: HTMLElement) =>
    setHover({ date, left: el.offsetLeft + el.offsetWidth / 2, top: el.offsetTop });

  const navButton = {
    display: "inline-flex",
    padding: 4,
    border: "none",
    background: "transparent",
    color: COLORS.text,
    cursor: "pointer",
  } as const;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <SectionTitle>{t("activityTitle")}</SectionTitle>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px",
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            fontFamily: FONT,
            fontSize: 13.5,
            color: COLORS.text,
          }}
        >
          <button type="button" aria-label={t("previousMonth")} onClick={() => move(-1)} style={navButton}>
            <Icon name="chevronLeft" size={15} />
          </button>
          <span style={{ minWidth: 72, textAlign: "center" }}>{monthLabel}</span>
          <button
            type="button"
            aria-label={t("nextMonth")}
            disabled={isCurrentMonth}
            onClick={() => move(1)}
            style={{ ...navButton, cursor: isCurrentMonth ? "not-allowed" : "pointer", color: isCurrentMonth ? COLORS.disabled : COLORS.text }}
          >
            <Icon name="chevronRight" size={15} />
          </button>
        </span>
      </div>

      {/* A month as a calendar: weekdays across, weeks down, each column as
          wide as the card allows so the grid fills it rather than sitting in
          one corner. Rows stretch too, to meet the chart card beside it. */}
      <div
        role="grid"
        aria-label={t("activityTitle")}
        onMouseLeave={() => setHover(null)}
        style={{
          position: "relative",
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gridTemplateRows: `auto repeat(${weeks.length}, minmax(34px, 1fr))`,
          gap: 6,
        }}
      >
        <div role="row" style={{ display: "contents" }}>
          {WEEKDAY_KEYS.map((k) => (
            <span
              key={k}
              role="columnheader"
              style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary, textAlign: "center", paddingBottom: 2 }}
            >
              {t(`weekday.${k}`)}
            </span>
          ))}
        </div>
        {weeks.map((week, w) => (
          <div key={w} role="row" style={{ display: "contents" }}>
            {week.map((date, i) => {
              if (!date) return <span key={i} />;
              const future = date > today;
              const n = activityOf(days.get(date));
              const shade = level(n);
              return (
                <span
                  key={date}
                  role="gridcell"
                  tabIndex={future ? -1 : 0}
                  aria-label={t("dayCell", { date: fmtDate(date), count: n })}
                  onMouseEnter={(e) => !future && show(date, e.currentTarget)}
                  onFocus={(e) => show(date, e.currentTarget)}
                  onBlur={() => setHover(null)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    padding: "5px 7px",
                    borderRadius: 8,
                    background: future ? "transparent" : SHADES[shade],
                    boxShadow: date === today ? `inset 0 0 0 2px ${COLORS.text}` : future ? `inset 0 0 0 1px ${COLORS.border}` : undefined,
                    fontFamily: FONT,
                    fontSize: 11.5,
                    fontWeight: 600,
                    /* The date sits on the shade, so it follows it: dim on an
                       empty day, white once the blue is strong enough. */
                    color: future ? COLORS.disabled : shade >= 2 ? "#fff" : COLORS.textSecondary,
                    outline: "none",
                    cursor: future ? "default" : "pointer",
                  }}
                >
                  {Number(date.slice(8))}
                </span>
              );
            })}
          </div>
        ))}

        {hover && (
          <div
            role="tooltip"
            style={{
              position: "absolute",
              left: hover.left,
              top: hover.top - 8,
              transform: "translate(-50%, -100%)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 190,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              boxShadow: "0 10px 28px rgb(0 0 0 / 0.3)",
              fontFamily: FONT,
              fontSize: 12.5,
              color: COLORS.text,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <DayTooltip date={hover.date} day={days.get(hover.date)} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>
        {[t("legendNone"), "1–2", "3–5", "6+"].map((label, i) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 13, height: 13, borderRadius: 4, background: SHADES[i] }} />
            {label}
          </span>
        ))}
      </div>
    </Card>
  );
}

function WeeklyProgress({ days, today }: { days: Map<string, PracticeDay>; today: string }) {
  const t = useTranslations("practice");
  const [count, setCount] = useState(4);
  const weeks = weeklyProgress(days, count, today);

  const W = 520;
  const H = 210;
  const pad = { top: 16, right: 40, bottom: 44, left: 34 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  /* Puzzles and games share the left axis (both counts); minutes the right. */
  const ceil = (n: number, step: number) => Math.max(step, Math.ceil(n / step) * step);
  const leftMax = ceil(Math.max(...weeks.map((w) => Math.max(w.puzzles, w.games))), 10);
  const rightMax = ceil(Math.max(...weeks.map((w) => w.minutes)), 50);
  const slot = plotW / weeks.length;
  const bar = Math.min(26, slot / 3.2);
  const yLeft = (v: number) => pad.top + plotH - (v / leftMax) * plotH;
  const yRight = (v: number) => pad.top + plotH - (v / rightMax) * plotH;
  const cx = (i: number) => pad.left + slot * i + slot / 2;
  const short = (iso: string) => fmtDate(iso).replace(/\s\d{4}$/, "");
  const line = weeks.map((w, i) => `${i ? "L" : "M"}${cx(i)},${yLeft(w.games)}`).join(" ");

  const legend = [
    { label: t("puzzlesLegend"), color: COLORS.blue },
    { label: t("minutesLegend"), color: MINUTES_COLOR },
    { label: t("gamesLegend"), color: COLORS.warningFill },
  ];

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <SectionTitle>{t("weeklyTitle")}</SectionTitle>
        <select
          aria-label={t("weeklyRange")}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          style={{ ...selectStyle, width: "auto", padding: "6px 32px 6px 10px", fontSize: 13 }}
        >
          {[4, 8, 12].map((n) => (
            <option key={n} value={n}>{t("lastWeeks", { count: n })}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, flexWrap: "wrap", fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>
        {legend.map((l) => (
          <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("weeklyChartLabel")} style={{ width: "100%", height: "auto" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = pad.top + plotH - f * plotH;
          return (
            <g key={f} fontFamily="inherit" fontSize="10" fill="var(--jt-textSecondary)">
              <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke="var(--jt-border)" strokeDasharray={f ? "3 4" : undefined} />
              <text x={pad.left - 6} y={y + 3} textAnchor="end">{Math.round(leftMax * f)}</text>
              <text x={W - pad.right + 6} y={y + 3}>{Math.round(rightMax * f)}</text>
            </g>
          );
        })}
        {weeks.map((w, i) => (
          <g key={w.start}>
            <rect x={cx(i) - bar - 2} y={yLeft(w.puzzles)} width={bar} height={pad.top + plotH - yLeft(w.puzzles)} rx={3} fill="var(--jt-blue)">
              <title>{t("puzzlesSolved", { count: w.puzzles })}</title>
            </rect>
            <rect x={cx(i) + 2} y={yRight(w.minutes)} width={bar} height={pad.top + plotH - yRight(w.minutes)} rx={3} fill={MINUTES_COLOR}>
              <title>{t("minutes", { count: w.minutes })}</title>
            </rect>
            <text x={cx(i)} y={H - pad.bottom + 16} textAnchor="middle" fontSize="10.5" fill="var(--jt-textSecondary)">
              {short(w.start)}
            </text>
            <text x={cx(i)} y={H - pad.bottom + 30} textAnchor="middle" fontSize="10.5" fill="var(--jt-textSecondary)">
              – {short(w.end)}
            </text>
          </g>
        ))}
        <path d={line} fill="none" stroke="var(--jt-warningFill)" strokeWidth={2} />
        {weeks.map((w, i) => (
          <circle key={w.start} cx={cx(i)} cy={yLeft(w.games)} r={4} fill="var(--jt-warningFill)">
            <title>{t("gamesPlayed", { count: w.games })}</title>
          </circle>
        ))}
      </svg>
    </Card>
  );
}

const ACTIVITY_ICON: Record<RecentRow["kind"], { icon: IconName; color: string }> = {
  daily: { icon: "trophy", color: COLORS.warningFill },
  free: { icon: "pawn", color: COLORS.blue },
  solo: { icon: "knight", color: MINUTES_COLOR },
  room: { icon: "rook", color: COLORS.success },
};

function RecentActivity({ rows, loading, failed }: { rows: RecentRow[]; loading: boolean; failed: boolean }) {
  const t = useTranslations("practice");
  const tc = useTranslations("common");
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, RECENT_SHOWN);
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px" }}>
        <SectionTitle>{t("recentTitle")}</SectionTitle>
        {rows.length > RECENT_SHOWN && (
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.blue }}
          >
            {all ? t("showLess") : t("viewAll")}
          </button>
        )}
      </div>
      <Table
        columns={[tc("date"), t("colActivity"), t("colPuzzles"), t("colTime")]}
        template={RECENT_TEMPLATE}
        minWidth={520}
      >
        {loading ? (
          <EmptyRow>{tc("loading")}</EmptyRow>
        ) : failed ? (
          <EmptyRow>{t("historyFailed")}</EmptyRow>
        ) : shown.length === 0 ? (
          <EmptyRow>{t("noActivity")}</EmptyRow>
        ) : (
          shown.map((row) => {
            const look = ACTIVITY_ICON[row.kind];
            return (
              <TableRow key={row.key} template={RECENT_TEMPLATE}>
                <span>{fmtDate(row.day)}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Icon name={look.icon} size={16} color={look.color} />
                  <span>{t(`kind.${row.kind}`)}</span>
                  {row.detail && row.kind === "solo" && (
                    <span style={{ fontSize: 12.5, color: COLORS.textSecondary }}>· {t(`opponent.${row.detail}`)}</span>
                  )}
                </span>
                <span>{row.puzzles === null ? "—" : row.puzzles}</span>
                <span>{row.minutes > 0 ? t("minutesShort", { count: row.minutes }) : "—"}</span>
              </TableRow>
            );
          })
        )}
      </Table>
    </Card>
  );
}

export function PracticeTab({ studentId }: { studentId: string }) {
  const t = useTranslations("practice");
  const { raw } = useData();
  const history = useHistory(studentId);
  const today = todayISO();
  const days = useMemo(
    () => practiceByDay(raw.practiceActivities, history.entries, studentId),
    [raw.practiceActivities, history.entries, studentId],
  );
  const streak = currentStreak(days, today);
  /* Everything the pupil has done, not a week against a week. */
  const overall = overallTotals(days);
  const rows = useMemo(() => recentActivity(history.entries), [history.entries]);
  const duration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return t("minutesShort", { count: m });
    return m === 0 ? t("hoursShort", { hours: h }) : t("hoursMinutesShort", { hours: h, minutes: m });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <StatCard
          icon="flame"
          tint={COLORS.warningFill}
          value={String(streak)}
          label={t("streakLabel")}
        />
        <StatCard
          icon="pawn"
          tint={COLORS.blue}
          value={String(overall.puzzles)}
          label={t("puzzlesLabel")}
        />
        <StatCard
          icon="clockSmall"
          tint={COLORS.blue}
          value={duration(overall.minutes)}
          label={t("timeLabel")}
        />
        <StatCard
          icon="knight"
          tint={MINUTES_COLOR}
          value={String(overall.games)}
          label={t("gamesLabel")}
        />
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" }}>
        <ActivityHeatmap days={days} today={today} />
        <WeeklyProgress days={days} today={today} />
      </div>

      <RecentActivity rows={rows} loading={history.loading} failed={history.failed} />
    </div>
  );
}

/** For the profile header: the streak from practice records alone, which is
    all the streak is counted from. */
export function useStreak(studentId: string): number {
  const { raw } = useData();
  return useMemo(
    () => currentStreak(practiceByDay(raw.practiceActivities, [], studentId)),
    [raw.practiceActivities, studentId],
  );
}
