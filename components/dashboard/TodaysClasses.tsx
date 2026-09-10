"use client";

import { useTranslations } from "next-intl";
import type { IconName } from "@/lib/icons";
import { Icon } from "@/lib/icons";
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

function ClassCard({ def, onView }: { def: ClassDef; onView: (def: ClassDef) => void }) {
  const tStatus = useTranslations("status");
  const accent = CLASS_CATEGORY_COLORS[def.category] ?? COLORS.blue;
  const status = statusChipColors(def.status);

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
            {tStatus(def.status)}
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

export function TodaysClasses({
  onCreateSession,
  onViewClass,
}: {
  onCreateSession: () => void;
  onViewClass: (def: ClassDef) => void;
}) {
  const t = useTranslations("dashboard");
  const { todaysClasses } = useData();
  const scrollable = todaysClasses.length > 2;

  return (
    <Card className="jt-today-classes" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="jt-classes-heading">
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <SectionTitle>{t("todaysClasses")}</SectionTitle>
          <span className="jt-class-count">{t("classCount", { count: todaysClasses.length })}</span>
        </div>
        <button
          type="button"
          className="jt-add-class-button"
          onClick={onCreateSession}
          aria-label={t("createSession")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 10px",
            borderRadius: 9,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.light,
            color: COLORS.blue,
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: 12.5,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="plus" size={15} color={COLORS.blue} />
          <span>{t("createSession")}</span>
        </button>
      </div>

      {todaysClasses.length === 0 ? (
        <div className="jt-dashboard-empty">
          <span className="jt-dashboard-empty-icon">
            <Icon name="calendar" size={20} color={COLORS.blue} />
          </span>
          <strong>{t("noClassesToday")}</strong>
          <span>{t("noClassesTodaySub")}</span>
        </div>
      ) : (
        <div
          className={`jt-class-list${scrollable ? " is-scrollable" : ""}`}
          role="region"
          aria-label={t("classListLabel")}
          tabIndex={scrollable ? 0 : undefined}
        >
          {todaysClasses.map((def) => (
            <ClassCard key={def.id ?? def.name} def={def} onView={onViewClass} />
          ))}
        </div>
      )}
    </Card>
  );
}
