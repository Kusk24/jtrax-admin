"use client";

import { useState } from "react";
import { buildCheckins } from "@/lib/derive";
import { classDotColor, COLORS, FONT, statusChipColors } from "@/lib/theme";
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";

const COLLAPSED_ROWS = 5;
const GRID = "minmax(160px, 2fr) 80px minmax(120px, 1.2fr) 100px 110px 110px 100px";

function creditColors(credit: number) {
  if (credit <= 0) return { color: COLORS.danger, bg: COLORS.dangerBg };
  if (credit <= 3) return { color: COLORS.warning, bg: COLORS.warningBg };
  return { color: COLORS.success, bg: COLORS.successBg };
}

export function CheckinTable() {
  const [dismissed, setDismissed] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState(false);

  const rows = buildCheckins(dismissed);
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);

  function dismiss(idx: number) {
    if (dismissed[idx]) return;
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setDismissed((prev) => ({ ...prev, [idx]: time }));
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "18px 18px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <SectionTitle>Today&apos;s Check-in</SectionTitle>
          <Badge color={COLORS.blue} bg={COLORS.light}>
            {rows.length} students
          </Badge>
        </div>
        {rows.length > COLLAPSED_ROWS && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.blue,
            }}
          >
            {expanded ? "Show less" : "View all"}
          </button>
        )}
      </div>

      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ minWidth: 860 }}>
          <div
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              gap: 12,
              padding: "10px 18px",
              borderBottom: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
            }}
          >
            {["Student", "Credit", "Class", "Arrival", "Dismissal", "Status", "Action"].map((h) => (
              <span
                key={h}
                style={{
                  fontFamily: FONT,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: COLORS.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {visible.map((row) => {
            const credit = creditColors(row.credit);
            const status = statusChipColors(row.status === "In class" ? "Ongoing" : "Dismissed");
            return (
              <div
                key={row.idx}
                className="jt-table-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  gap: 12,
                  alignItems: "center",
                  padding: "11px 18px",
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar initials={row.initials} size={30} />
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: COLORS.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.name}
                  </span>
                </span>

                <Badge color={credit.color} bg={credit.bg} style={{ justifySelf: "start" }}>
                  {row.credit}
                </Badge>

                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontFamily: FONT,
                    fontSize: 13,
                    color: COLORS.textSecondary,
                  }}
                >
                  <ClassDot color={classDotColor(row.class)} />
                  {row.class}
                </span>

                <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                  {row.timeIn}
                </span>
                <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                  {row.timeOut}
                </span>

                <Badge color={status.color} bg={status.bg} style={{ justifySelf: "start" }}>
                  {row.displayStatus}
                </Badge>

                <span>
                  {row.canDismiss && (
                    <button
                      type="button"
                      className="jt-chip"
                      onClick={() => dismiss(row.idx)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 999,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.surface,
                        color: COLORS.text,
                        fontFamily: FONT,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 160ms ease",
                      }}
                    >
                      Dismiss
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
