"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { IconName } from "@/lib/icons";
import { Icon } from "@/lib/icons";
import { classProgress, hasClassEnded, useMinuteClock } from "@/lib/class-progress";
import { type ClassDef } from "@/lib/data";
import { CLASS_CATEGORY_COLORS, COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import { useData } from "../DataProvider";
import { Card, SectionTitle } from "../ui";

/* Each course tier gets its chess piece. */
const CATEGORY_ICON: Record<string, IconName> = {
  Master: "trophy",
  Intermediate: "king",
  Beginner: "queen",
  Weekend: "pawn",
};

/**
 * What the card should show right now, which is not always what the database
 * says. `session_status` stays `Ongoing` until someone sets it otherwise —
 * nothing does that on its own — so a class the clock says ended twenty
 * minutes ago still reads `Ongoing` until the desk notices. Every reader of a
 * class's status (the chip, the filter pills and their counts, the panel's
 * edit gate) goes through this rather than `def.status` directly, so the
 * three cannot disagree.
 */
function effectiveStatus(def: ClassDef, now: Date): ClassDef["status"] {
  return def.status === "Ongoing" && hasClassEnded(def.time, now) ? "Finished" : def.status;
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
  const accent = CLASS_CATEGORY_COLORS[def.category] ?? COLORS.blue;
  const shownStatus = effectiveStatus(def, now);
  const status = statusChipColors(shownStatus);

  return (
    <button
      type="button"
      className="jt-class-card"
      onClick={() => onView(def)}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 14,
        padding: 14,
        borderRadius: 13,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        cursor: "pointer",
        textAlign: "left",
        minHeight: 108,
      }}
    >
      <span>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `${accent}1A`,
            }}
          >
            <Icon name={CATEGORY_ICON[def.category] ?? "pawn"} size={16} color={accent} />
          </span>
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              background: status.bg,
              color: status.color,
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {tStatus(shownStatus)}
          </span>
        </span>
        <span
          style={{
            display: "block",
            marginTop: 8,
            fontFamily: FONT,
            fontSize: 15.5,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          {def.name}
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

      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                background: COLORS.light,
                color: COLORS.blue,
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
const FILTERS = ["all", "Ongoing", "Finished"] as const;

type ClassFilter = (typeof FILTERS)[number];

export function TodaysClasses({ onViewClass }: { onViewClass: (def: ClassDef) => void }) {
  const t = useTranslations("dashboard");
  /* Ongoing and Finished come from the shared `status` catalogue, not a copy
     of their own: the pill and the chip on the card beneath it name the same
     state, and two entries would eventually disagree. */
  const tStatus = useTranslations("status");
  const { todaysClasses } = useData();
  const now = useMinuteClock();
  const [filter, setFilter] = useState<ClassFilter>("all");

  const countFor = (f: ClassFilter) =>
    f === "all" ? todaysClasses.length : todaysClasses.filter((d) => effectiveStatus(d, now) === f).length;
  const shown =
    filter === "all" ? todaysClasses : todaysClasses.filter((d) => effectiveStatus(d, now) === filter);
  const scrollable = shown.length > 2;

  return (
    <Card className="jt-today-classes" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="jt-classes-heading">
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <SectionTitle>{t("todaysClasses")}</SectionTitle>
          <span className="jt-class-count">{t("classCount", { count: todaysClasses.length })}</span>
        </div>
      </div>

      {/* Offered only once there is a day to sort through. On an empty day the
          three pills would all read zero and filter nothing. */}
      {todaysClasses.length > 0 && (
        <div className="jt-class-filters" role="radiogroup" aria-label={t("classFilterLabel")}>
          {FILTERS.map((option) => {
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
                onClick={() => setFilter(option)}
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
          <strong>{t("noClassesToday")}</strong>
          <span>{t("noClassesTodaySub")}</span>
        </div>
      ) : shown.length === 0 ? (
        /* A filter that matches nothing is not the same as a day with no
           classes, and must not borrow that card's "take a breather" copy. */
        <p className="jt-class-filter-empty">{t("noClassesInFilter")}</p>
      ) : (
        <div
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
