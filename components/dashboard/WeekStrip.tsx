"use client";

/**
 * The week the desk is standing in, at the top of the dashboard rail.
 *
 * Not `components/calendar.tsx`: that is a month grid for reading a term's
 * shape after the fact, and it is the height of three cards. The dashboard
 * needs the opposite — which day is it, what is around it — so this is one row
 * of seven, the same height as the card it sits above.
 *
 * Read-only by design. Picking a day here would imply the page below re-dates
 * itself, and it does not: the dashboard is always today. The arrows are for
 * looking, and "today" brings the strip back when a look has wandered.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { Card } from "../ui";

/** The Monday on or before `date`. Weeks start on Monday, as they do in the
    month calendar, so the weekend stays together in the last two columns. */
function startOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function WeekStrip({ today = new Date() }: { today?: Date }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [monday, setMonday] = useState(() => startOfWeek(today));

  const days = Array.from(
    { length: 7 },
    (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
  );

  const shiftWeeks = (weeks: number) =>
    setMonday((m) => new Date(m.getFullYear(), m.getMonth(), m.getDate() + weeks * 7));

  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const dayNumber = new Intl.DateTimeFormat(locale, { day: "numeric" });
  /* Titled from the Thursday, not the Monday: in a week that straddles two
     months the Thursday is in whichever month owns four of the seven days. */
  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(days[3]);
  const showingThisWeek = sameDay(monday, startOfWeek(today));

  return (
    <Card className="jt-week-strip" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="jt-week-head">
        <strong style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: COLORS.text }}>
          {title}
        </strong>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Only offered once it would do something, so it is never a dead
              control on the view it returns to. */}
          {!showingThisWeek && (
            <button
              type="button"
              className="jt-week-today"
              onClick={() => setMonday(startOfWeek(today))}
            >
              {t("calendarToday")}
            </button>
          )}
          <button
            type="button"
            className="jt-week-arrow"
            onClick={() => shiftWeeks(-1)}
            aria-label={t("calendarPrevWeek")}
          >
            <Icon name="chevronLeft" size={16} color={COLORS.textSecondary} />
          </button>
          <button
            type="button"
            className="jt-week-arrow"
            onClick={() => shiftWeeks(1)}
            aria-label={t("calendarNextWeek")}
          >
            <Icon name="chevronRight" size={16} color={COLORS.textSecondary} />
          </button>
        </div>
      </div>

      <ol className="jt-week-days">
        {days.map((day) => {
          const isToday = sameDay(day, today);
          return (
            <li key={day.toISOString()} className={`jt-week-day${isToday ? " is-today" : ""}`}>
              <span className="jt-week-weekday" style={{ fontFamily: FONT }}>
                {weekday.format(day)}
              </span>
              <span className="jt-week-date" style={{ fontFamily: FONT_DISPLAY }}>
                {dayNumber.format(day)}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
