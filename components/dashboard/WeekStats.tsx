"use client";

/**
 * Four small cards for the week, beside the overview: classes (against last
 * week), students who came, games the office opened, and students playing
 * consistently. They follow the date picked in the top bar: its week, and
 * the window ending on it.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { getDashboardActivity, type DashboardActivity } from "@/lib/game-activity";
import { todayISO } from "@/lib/live";
import { classesThisWeek, studentsAttendedThisWeek, weekOf } from "@/lib/week-stats";
import { Icon, type IconName } from "@/lib/icons";
import { ACCENT_TINTS, ACCENTS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { useData } from "../DataProvider";
import { useDashboardDate } from "../DashboardDate";

type Accent = keyof typeof ACCENTS;

/**
 * One KPI: a filled icon badge in its own colour, the number large, what it
 * counts under it, and a pill for the week's context.
 */
function StatCard({
  icon,
  accent,
  label,
  value,
  pill,
  pillTone = "neutral",
}: {
  icon: IconName;
  accent: Accent;
  label: string;
  value: string;
  pill: string;
  pillTone?: "up" | "down" | "neutral";
}) {
  const vars = { "--kpi-accent": ACCENTS[accent], "--kpi-tint": ACCENT_TINTS[accent] } as CSSProperties;
  return (
    <div className="jt-kpi" style={vars}>
      <div className="jt-kpi-top">
        <span className="jt-kpi-icon" aria-hidden>
          <Icon name={icon} size={15} color="#fff" />
        </span>
        <span className={`jt-kpi-pill is-${pillTone}`}>{pill}</span>
      </div>
      <span className="jt-kpi-value" style={{ fontFamily: FONT_DISPLAY }}>{value}</span>
      <span className="jt-kpi-label" style={{ fontFamily: FONT }}>{label}</span>
    </div>
  );
}

export function WeekStats({ className }: { className?: string }) {
  const t = useTranslations("dashboard");
  const { raw } = useData();
  const { day, isToday } = useDashboardDate();
  const today = todayISO();
  const classes = useMemo(() => classesThisWeek(raw, day), [raw, day]);
  const attended = useMemo(() => studentsAttendedThisWeek(raw, day), [raw, day]);
  /* Another week than this one: the pills name its dates instead. */
  const week = weekOf(day);
  const thisWeek = week.start === weekOf(today).start;
  const weekPill = thisWeek ? t("thisWeek") : `${shortDay(week.start)} – ${shortDay(week.end)}`;

  /* Kept with the day it was read for: a result for another day is not
     shown, so moving the picker reads "…" until the new week arrives. */
  const [read, setRead] = useState<{ day: string; activity?: DashboardActivity; failed?: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getDashboardActivity(isToday ? undefined : day)
      .then((a) => !cancelled && setRead({ day, activity: a }))
      .catch(() => !cancelled && setRead({ day, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [day, isToday]);
  const current = read?.day === day ? read : null;
  const activity = current?.activity ?? null;
  const failed = Boolean(current?.failed);
  const serverValue = (n: number | undefined) => (activity ? String(n) : failed ? "—" : "…");

  const change = classes.changePct;
  const changePill =
    change === null ? t("noClassesLastWeek")
    : change === 0 ? t("sameAsLastWeek")
    : `${change > 0 ? "▲" : "▼"} ${Math.abs(change)}%`;
  const changeTone = change === null || change === 0 ? "neutral" : change > 0 ? "up" : "down";

  return (
    <div className={`jt-week-stats${className ? ` ${className}` : ""}`}>
      <StatCard
        icon="calendar"
        accent="blue"
        label={thisWeek ? t("classesThisWeek") : t("classesThatWeek")}
        value={String(classes.count)}
        pill={changePill}
        pillTone={changeTone}
      />
      <StatCard icon="userCheck" accent="green" label={t("studentsAttended")} value={String(attended)} pill={weekPill} />
      <StatCard icon="knight" accent="plum" label={t("gamesOpened")} value={serverValue(activity?.gamesOpened)} pill={weekPill} />
      <StatCard
        icon="flame"
        accent="amber"
        label={t("playingConsistently")}
        value={serverValue(activity?.consistentPlayers)}
        pill={t("consistentRule", { days: activity?.consistentDays ?? 3, window: activity?.windowDays ?? 7 })}
      />
    </div>
  );
}

/** "29 Sep" from YYYY-MM-DD. */
function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d);
}
