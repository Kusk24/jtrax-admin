import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ListFilter,
} from "lucide-react";
import { calendarEvents } from "@/lib/super-data";
import type { CalendarEvent } from "@/lib/admin-types";

const dayKeys = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const dayDates = [19, 20, 21, 22, 23, 24, 25];
const startHour = 9;
const endHour = 18;

const toneCls: Record<CalendarEvent["tone"], string> = {
  olive: "bg-olive-soft border-olive",
  navy: "bg-navy-soft border-navy",
  brick: "bg-brick-soft border-brick",
  peach: "bg-peach border-peach-ink",
};

function fmt(v: number) {
  const h = Math.floor(v);
  const minutes = v % 1 ? "30" : "00";
  const period = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h;
  return `${display}:${minutes} ${period}`;
}

const chipCls =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-line bg-card px-3 py-1.5 text-[11px] font-bold text-ink transition-colors hover:border-navy/40";

export function WeekCalendar({ branch }: { branch?: string }) {
  const events = branch
    ? calendarEvents.filter((e) => e.branch === branch)
    : calendarEvents;
  const t = useTranslations("courseDetail");
  const td = useTranslations("days");
  const rows = (endHour - startHour) * 2;
  const cols = "52px repeat(7, minmax(88px, 1fr))";

  return (
    <div className="rounded-card border-2 border-line bg-card p-3.5 shadow-clay">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button type="button" className={chipCls}>
            {td("today")}
          </button>
          <button
            type="button"
            aria-label={t("prevWeek")}
            className="grid size-7 cursor-pointer place-items-center rounded-full border-2 border-line text-muted transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={t("nextWeek")}
            className="grid size-7 cursor-pointer place-items-center rounded-full border-2 border-line text-muted transition-colors hover:text-ink"
          >
            <ChevronRight className="size-3.5" />
          </button>
          <span className="ml-1 text-sm font-bold text-ink">May 2025</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={chipCls}>
            {t("week")}
            <ChevronDown className="size-3" />
          </button>
          <button type="button" className={chipCls}>
            <ListFilter className="size-3" />
            {t("filter")}
          </button>
          <button type="button" className={chipCls}>
            <Download className="size-3" />
            {t("export")}
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid" style={{ gridTemplateColumns: cols }}>
            <div />
            {dayKeys.map((key, i) => (
              <div key={key} className="px-1 pb-2 text-center">
                <p className="text-[10px] font-bold text-muted">{td(key)}</p>
                <p className="text-sm font-bold text-ink">{dayDates[i]}</p>
              </div>
            ))}
          </div>
          <div
            className="grid"
            style={{
              gridTemplateColumns: cols,
              gridTemplateRows: `repeat(${rows}, 22px)`,
            }}
          >
            {Array.from({ length: endHour - startHour }, (_, h) => (
              <div
                key={`label-${h}`}
                className="pr-2 text-right text-[10px] text-muted"
                style={{ gridColumn: 1, gridRow: `${h * 2 + 1} / span 2` }}
              >
                {fmt(startHour + h)}
              </div>
            ))}
            {Array.from({ length: endHour - startHour }, (_, h) =>
              dayKeys.map((key, d) => (
                <div
                  key={`cell-${h}-${key}`}
                  className="border-l border-t border-line/70"
                  style={{
                    gridColumn: d + 2,
                    gridRow: `${h * 2 + 1} / span 2`,
                  }}
                />
              )),
            )}
            {events.map((event, i) => (
              <div
                key={`${event.title}-${i}`}
                className={`z-10 m-0.5 overflow-hidden rounded-lg border-l-4 px-1.5 py-1 text-[9px] leading-tight text-ink ${toneCls[event.tone]}`}
                style={{
                  gridColumn: event.day + 2,
                  gridRow: `${(event.start - startHour) * 2 + 1} / ${
                    (event.end - startHour) * 2 + 1
                  }`,
                }}
              >
                <p className="truncate font-bold">{event.title}</p>
                <p className="truncate">
                  {fmt(event.start)} - {fmt(event.end)}
                </p>
                <p className="truncate text-muted">{event.branch}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
