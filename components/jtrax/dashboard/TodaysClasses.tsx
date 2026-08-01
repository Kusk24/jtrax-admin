"use client";

import type { IconName } from "@/lib/jtrax/icons";
import { Icon } from "@/lib/jtrax/icons";
import { CLASSES_DEFS_REF, type ClassDef } from "@/lib/jtrax/data";
import { CLASS_CATEGORY_COLORS, COLORS, FONT, initialsOf, statusChipColors } from "@/lib/jtrax/theme";
import { Card, SectionTitle } from "../ui";

/* Each course tier gets its chess piece, matching COURSES_SEED's icon field. */
const CATEGORY_ICON: Record<string, IconName> = {
  Master: "trophy",
  Intermediate: "king",
  Beginner: "queen",
  Weekend: "pawn",
};

function ClassCard({ def, onView }: { def: ClassDef; onView: (def: ClassDef) => void }) {
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
        minHeight: 148,
      }}
    >
      <span>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 9,
              background: `${accent}1A`,
            }}
          >
            <Icon name={CATEGORY_ICON[def.category] ?? "pawn"} size={18} color={accent} />
          </span>
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              background: status.bg,
              color: status.color,
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {def.status}
          </span>
        </span>
        <span
          style={{
            display: "block",
            marginTop: 11,
            fontFamily: FONT,
            fontSize: 14.5,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          {def.name}
        </span>
        <span
          style={{ display: "block", marginTop: 2, fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}
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
                fontSize: 9.5,
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
                fontSize: 9.5,
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
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionTitle>Today&apos;s Classes</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: 12,
        }}
      >
        <button
          type="button"
          className="jt-create-card"
          onClick={onCreateSession}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 6,
            padding: 14,
            borderRadius: 13,
            border: `1.5px dashed ${COLORS.border}`,
            background: COLORS.surface,
            cursor: "pointer",
            textAlign: "left",
            minHeight: 148,
            justifyContent: "center",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: COLORS.light,
            }}
          >
            <Icon name="plus" size={19} color={COLORS.blue} />
          </span>
          <span style={{ marginTop: 6, fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.blue }}>
            Create Session
          </span>
          <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>
            Create a new class session
          </span>
        </button>

        {CLASSES_DEFS_REF.map((def) => (
          <ClassCard key={def.name} def={def} onView={onViewClass} />
        ))}
      </div>
    </Card>
  );
}
