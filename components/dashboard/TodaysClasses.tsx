"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { IconName } from "@/lib/icons";
import { Icon } from "@/lib/icons";
import { classProgress, classStatusNow, endingSoon, useMinuteClock } from "@/lib/class-progress";
import { type ClassDef } from "@/lib/data";
import { CLASS_CATEGORY_COLORS, COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import { fmtDate, todayISO, toCancelledClasses, toTodaysClasses } from "@/lib/live";
import { useDashboardDate } from "../DashboardDate";
import { useData } from "../DataProvider";
import { Card, SectionTitle } from "../ui";

/* Each course tier gets its chess piece. */
const CATEGORY_ICON: Record<string, IconName> = {
  Master: "trophy",
  Advanced: "trophy",
  Intermediate: "king",
  Beginner: "queen",
  Weekend: "pawn",
};

/** Up to this many classes show in full; past it, the list scrolls. */
export const CLASSES_BEFORE_SCROLL = 3;

/**
 * Caps a list at the bottom of its Nth child. Class cards are not all one
 * height — an ongoing class carries a progress bar — so the cap is measured
 * rather than guessed, and re-measured whenever the cards change size.
 */
function useCapAtChild(n: number, active: boolean, items: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    if (!active) {
      list.style.maxHeight = "";
      return;
    }
    const measure = () => {
      const last = list.children[n - 1] as HTMLElement | undefined;
      if (last) list.style.maxHeight = `${last.offsetTop - list.offsetTop + last.offsetHeight}px`;
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    /* The list itself stops resizing once capped, so watch the cards. */
    const observer = new ResizeObserver(measure);
    for (const child of Array.from(list.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [n, active, items]);
  return ref;
}

/** How far through the hour an in-progress class is. */
function TimePassed({ time, now }: { time: string; now: Date }) {
  const t = useTranslations("dashboard");
  const progress = classProgress(time, now);
  /* No bar rather than a wrong one when the backend's time string will not
     parse — see lib/class-progress.ts. */
  if (!progress) return null;

  return (
    <span className="jt-class-progress">
      <span className="jt-class-progress-row">
        <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>
          {t("timePassed")}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.text }}>
          {t("minutesOf", { done: Math.round(progress.elapsed), total: progress.total })}
        </span>
      </span>
      <span
        className="jt-class-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={Math.round(progress.elapsed)}
        aria-label={t("timePassed")}
      >
        <span
          className="jt-class-progress-fill"
          style={{ width: `${Math.round(progress.fraction * 100)}%` }}
        />
      </span>
    </span>
  );
}

function ClassCard({ def, now, onView }: { def: ClassDef; now: Date; onView: (def: ClassDef) => void }) {
  const tStatus = useTranslations("status");
  const tDash = useTranslations("dashboard");
  const accent = CLASS_CATEGORY_COLORS[def.category] ?? COLORS.blue;
  const shownStatus = classStatusNow(def, now, todayISO());
  const status = statusChipColors(shownStatus);
  /* A running class with a quarter of an hour or less to go. */
  const minutesLeft = shownStatus === "Ongoing" ? endingSoon(def.time, now) : null;

  return (
    <button
      type="button"
      className="jt-class-card"
      onClick={() => onView(def)}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 0,
        overflow: "hidden",
        borderRadius: 13,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {/* The top in the class's level colour, fading across; the students
          below on white. */}
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          flex: 1,
          padding: 14,
          background: `linear-gradient(110deg, color-mix(in srgb, ${accent} 7%, ${COLORS.surface}), color-mix(in srgb, ${accent} 18%, ${COLORS.surface}))`,
        }}
      >
      <span>
        {/* The icon sits beside the name, not above it, so the card is a line
            shorter. The status sits in the top corner, with the ending-soon
            tag under it while a class is in its last minutes. */}
        <span style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: 8,
                background: COLORS.surface,
                flexShrink: 0,
              }}
            >
              <Icon name={CATEGORY_ICON[def.category] ?? "pawn"} size={15} color={accent} />
            </span>
            <span
              style={{
                fontFamily: FONT,
                fontSize: 15.5,
                fontWeight: 700,
                color: COLORS.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {def.name}
            </span>
          </span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                background: status.bg,
                color: status.color,
                fontFamily: FONT,
                fontSize: 11.5,
                fontWeight: 600,
                lineHeight: 1.4,
                whiteSpace: "nowrap",
              }}
            >
              {tStatus(shownStatus)}
            </span>
            {minutesLeft !== null && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: COLORS.warningBg,
                  color: COLORS.warning,
                  fontFamily: FONT,
                  fontSize: 11.5,
                  fontWeight: 600,
                  lineHeight: 1.4,
                  whiteSpace: "nowrap",
                }}
              >
                {tDash("endsInMinutes", { minutes: Math.round(minutesLeft) })}
              </span>
            )}
          </span>
        </span>
        <span
          style={{ display: "block", marginTop: 2, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}
        >
          {def.time}
        </span>
      </span>

      {/* Only while it is genuinely still running: a class whose time is up
          reads Finished above regardless of session_status, and a full bar on
          every past lesson would be noise. */}
      {shownStatus === "Ongoing" && <TimePassed time={def.time} now={now} />}
      </span>

      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderTop: `1px solid ${COLORS.border}`,
          background: COLORS.surface,
        }}
      >
        <span style={{ display: "flex", alignItems: "center" }}>
          {def.students.slice(0, 2).map((name, i) => (
            <span
              key={name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: `color-mix(in srgb, ${accent} 14%, ${COLORS.surface})`,
                color: accent,
                border: `2px solid ${COLORS.surface}`,
                fontFamily: FONT,
                fontSize: 10.5,
                fontWeight: 700,
                marginLeft: i === 0 ? 0 : -8,
              }}
            >
              {initialsOf(name)}
            </span>
          ))}
          {def.more > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 26,
                padding: "0 7px",
                borderRadius: 999,
                background: COLORS.neutralBg,
                color: COLORS.textSecondary,
                border: `2px solid ${COLORS.surface}`,
                fontFamily: FONT,
                fontSize: 10.5,
                fontWeight: 700,
                marginLeft: -8,
              }}
            >
              +{def.more}
            </span>
          )}
        </span>
        <span style={{ display: "flex", color: COLORS.textSecondary }}>
          <Icon name="chevronRight" size={17} />
        </span>
      </span>
    </button>
  );
}

/** The three views of the day, in the order the reference shows them. */
const FILTERS = ["all", "Scheduled", "Ongoing", "Finished", "Cancelled"] as const;

type ClassFilter = (typeof FILTERS)[number];

export function TodaysClasses({ onViewClass }: { onViewClass: (def: ClassDef) => void }) {
  const t = useTranslations("dashboard");
  /* Ongoing and Finished come from the shared `status` catalogue, not a copy
     of their own: the pill and the chip on the card beneath it name the same
     state, and two entries would eventually disagree. */
  const tStatus = useTranslations("status");
  const { raw, todaysClasses: providedToday } = useData();
  const { day, isToday, isPast } = useDashboardDate();
  /* The day the top bar's date chip is on — today unless someone picked
     another. Today's list is already worked out by the data provider. */
  const todaysClasses = useMemo(
    () => [
      ...(isToday ? providedToday : toTodaysClasses(raw, day)),
      /* Called-off classes stay on the day, marked, after the ones that ran. */
      ...(raw ? toCancelledClasses(raw, day) : []),
    ],
    [isToday, providedToday, raw, day],
  );
  const today = todayISO();
  const now = useMinuteClock();
  /* Opens on what is running now; with nothing running, on the whole day.
     Null until the desk picks one, so the default follows the data as it
     loads rather than being frozen at mount. */
  const [picked, setPicked] = useState<ClassFilter | null>(null);

  const countFor = (f: ClassFilter) =>
    f === "all" ? todaysClasses.length : todaysClasses.filter((d) => classStatusNow(d, now, today) === f).length;
  const filter: ClassFilter = picked ?? (countFor("Ongoing") > 0 ? "Ongoing" : "all");
  const shown =
    filter === "all" ? todaysClasses : todaysClasses.filter((d) => classStatusNow(d, now, today) === filter);
  const scrollable = shown.length > CLASSES_BEFORE_SCROLL;
  const listRef = useCapAtChild(CLASSES_BEFORE_SCROLL, scrollable, shown);

  return (
    <Card className="jt-today-classes" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Title on the left, the day's count in the top corner. */}
      <div className="jt-classes-heading">
        <SectionTitle>{isToday ? t("todaysClasses") : t("classesOn", { date: fmtDate(day) })}</SectionTitle>
        <span className="jt-class-count">{t("classCount", { count: todaysClasses.length })}</span>
      </div>

      {/* Offered only once there is a day to sort through. On an empty day the
          three pills would all read zero and filter nothing. */}
      {todaysClasses.length > 0 && (
        <div className="jt-class-filters" role="radiogroup" aria-label={t("classFilterLabel")}>
          {/* Scheduled is shown only when something is: a class that has not
              started yet, today or on a later day. */}
          {FILTERS.filter((o) => o !== "Scheduled" || countFor(o) > 0).map((option) => {
            const label = option === "all" ? t("classFilterAll") : tStatus(option);
            const count = countFor(option);
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={option === filter}
                /* Spelt out: the count sits in its own element, so the name
                   derived from the text would run together as "All3". */
                aria-label={`${label} (${count})`}
                className={`jt-class-filter${option === filter ? " is-on" : ""}`}
                onClick={() => setPicked(option)}
              >
                {label}
                <span className="jt-class-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {todaysClasses.length === 0 ? (
        /* The rail's Create Class card sits directly above this, so the empty
           state describes the day rather than offering the same action a
           second time within 200px of itself. */
        <div className="jt-dashboard-empty">
          <span className="jt-dashboard-empty-icon">
            <Icon name="calendar" size={20} color={COLORS.blue} />
          </span>
          <strong>{isToday ? t("noClassesToday") : t("noClassesOn", { date: fmtDate(day) })}</strong>
          <span>{isToday ? t("noClassesTodaySub") : isPast ? t("noClassesPastSub") : t("noClassesFutureSub")}</span>
        </div>
      ) : shown.length === 0 ? (
        /* A filter that matches nothing is not the same as a day with no
           classes, and must not borrow that card's "take a breather" copy. */
        <p className="jt-class-filter-empty">{t("noClassesInFilter")}</p>
      ) : (
        /* The card grows with the day up to three classes; a busier day
           scrolls inside the list so the rail below stays in reach. */
        <div
          ref={listRef}
          className={`jt-class-list${scrollable ? " is-scrollable" : ""}`}
          role="region"
          aria-label={t("classListLabel")}
          tabIndex={scrollable ? 0 : undefined}
        >
          {shown.map((def) => (
            <ClassCard key={def.id ?? def.name} def={def} now={now} onView={onViewClass} />
          ))}
        </div>
      )}
    </Card>
  );
}
