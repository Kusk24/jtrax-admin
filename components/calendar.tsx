"use client";

/**
 * Month calendar for the sessions the academy ran.
 *
 * A list of past sessions answers "what happened"; a calendar answers "which
 * weekends were busy and which were empty", which is the question the desk
 * actually asks. Weeks start on Monday so the weekend is the last two columns
 * and can be shown on its own — the academy teaches at the weekend, and five
 * empty weekday columns are five columns of nothing.
 */
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { todayISO } from "@/lib/live";
import { secondaryButtonStyle } from "./page-kit";

/** One thing that happened on a day — a session, in every current caller. */
export type CalendarEntry = {
  key: string;
  /** Local calendar day, `YYYY-MM-DD`. */
  day: string;
  label: string;
  sub?: string;
  /** Accent for the dot, keyed to the class. */
  tone: string;
};

/** Saturday and Sunday, as indexes into a Monday-first week. */
const WEEKEND_COLUMNS = [5, 6];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** The Monday on or before `date`. */
function startOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Six Monday-first weeks covering the month, each a row of seven days. */
function weeksOf(month: Date): Date[][] {
  const first = startOfWeek(startOfMonth(month));
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    weeks.push(Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
  }
  /* A month that fits in five weeks would otherwise end on a row belonging
     entirely to the next one. */
  return weeks.filter((week) => week.some((d) => d.getMonth() === month.getMonth()));
}

export function MonthCalendar({
  month,
  onMonthChange,
  entries,
  weekendOnly,
  selected,
  onSelectDay,
}: {
  month: Date;
  onMonthChange: (next: Date) => void;
  entries: CalendarEntry[];
  weekendOnly: boolean;
  selected: string | null;
  onSelectDay: (day: string | null) => void;
}) {
  const t = useTranslations("classHistory");
  const locale = useLocale();
  const today = todayISO();

  const byDay = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.day);
    if (list) list.push(entry);
    else byDay.set(entry.day, [entry]);
  }

  const columns = weekendOnly ? WEEKEND_COLUMNS : [0, 1, 2, 3, 4, 5, 6];
  /* Weekend-only hides five of seven columns, so a week whose Saturday and
     Sunday both belong to the next month becomes a row of two greyed cells
     with nothing to say. */
  const weeks = weeksOf(month).filter((week) =>
    columns.some((c) => week[c].getMonth() === month.getMonth()),
  );
  const monthEntries = entries.filter((e) => e.day.startsWith(monthPrefix(month)));
  /* Weekend-only would otherwise silently drop the weekday sessions the office
     did run, and a calendar that hides rows without saying so is a lie. */
  const hiddenWeekday = weekendOnly
    ? monthEntries.filter((e) => !WEEKEND_COLUMNS.includes(mondayFirstIndex(e.day))).length
    : 0;
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);
  const weekdayName = new Intl.DateTimeFormat(locale, { weekday: "short" });
  /* Any Monday will do for the header labels; this one starts a known week. */
  const headerWeek = weeks[0];

  const inMonth = (day: Date) => day.getMonth() === month.getMonth();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="jt-btn-ghost"
          aria-label={t("previousMonth")}
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          style={{ ...secondaryButtonStyle, padding: "7px 10px" }}
        >
          <Icon name="chevronLeft" size={15} />
        </button>
        <span
          style={{
            minWidth: 170,
            textAlign: "center",
            fontFamily: FONT_DISPLAY,
            fontSize: 16.5,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          {monthLabel}
        </span>
        <button
          type="button"
          className="jt-btn-ghost"
          aria-label={t("nextMonth")}
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          style={{ ...secondaryButtonStyle, padding: "7px 10px" }}
        >
          <Icon name="chevronRight" size={15} />
        </button>
        <button
          type="button"
          className="jt-btn-ghost"
          onClick={() => {
            const now = new Date();
            onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
            onSelectDay(null);
          }}
          style={{ ...secondaryButtonStyle, padding: "7px 14px" }}
        >
          {t("thisMonth")}
        </button>
        <span style={{ marginLeft: "auto", fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
          {t("sessionsInMonth", { count: monthEntries.length })}
          {hiddenWeekday > 0 && ` · ${t("weekdayHidden", { count: hiddenWeekday })}`}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          /* Two columns stretched over a full-width page give 500px-wide day
             cells holding one chip; cap them instead. */
          gridTemplateColumns: weekendOnly
            ? "repeat(2, minmax(0, 320px))"
            : `repeat(${columns.length}, minmax(0, 1fr))`,
          gap: 8,
        }}
      >
        {columns.map((c) => (
          <span
            key={`head-${c}`}
            style={{
              fontFamily: FONT,
              fontSize: 12.5,
              fontWeight: 600,
              color: COLORS.textSecondary,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              textAlign: "center",
            }}
          >
            {weekdayName.format(headerWeek[c])}
          </span>
        ))}

        {weeks.map((week) =>
          columns.map((c) => {
            const day = week[c];
            const iso = todayISO(day);
            const dayEntries = byDay.get(iso) ?? [];
            const isSelected = selected === iso;
            const muted = !inMonth(day);
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelectDay(isSelected ? null : iso)}
                aria-pressed={isSelected}
                aria-label={t("dayWithSessions", {
                  date: new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(day),
                  count: dayEntries.length,
                })}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  minHeight: 92,
                  padding: 8,
                  borderRadius: 11,
                  border: `1.5px solid ${isSelected ? COLORS.blue : COLORS.border}`,
                  background: muted ? COLORS.bg : COLORS.surface,
                  opacity: muted ? 0.75 : 1,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 160ms ease",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: iso === today ? COLORS.blue : "transparent",
                    color: iso === today ? "#fff" : COLORS.text,
                    fontFamily: FONT,
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  {day.getDate()}
                </span>
                {dayEntries.slice(0, 3).map((entry) => (
                  <span
                    key={entry.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 6px",
                      borderRadius: 6,
                      background: `${entry.tone}1A`,
                      fontFamily: FONT,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: COLORS.text,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: entry.tone,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.label}
                    </span>
                  </span>
                ))}
                {dayEntries.length > 3 && (
                  <span style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary }}>
                    {t("moreSessions", { count: dayEntries.length - 3 })}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

function monthPrefix(month: Date): string {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
}

/** 0 = Monday … 6 = Sunday. Built from the parts rather than `new Date(iso)`,
    which reads a bare `YYYY-MM-DD` as UTC and lands on the previous day west
    of Greenwich. */
function mondayFirstIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (new Date(y, (m ?? 1) - 1, d ?? 1).getDay() + 6) % 7;
}
