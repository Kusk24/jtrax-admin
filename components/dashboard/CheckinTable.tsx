"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { classDotColor, COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import { useData } from "../DataProvider";
import { equalTemplate, Table, TableRow } from "../page-kit";
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";

const COLLAPSED_ROWS = 5;
/* Shared with every other list on purpose — this table used to roll its own
   grid and padding, which made its rows a different height from the rest. */
const GRID = equalTemplate(7, 90);

function creditColors(credit: number) {
  if (credit <= 0) return { color: COLORS.danger, bg: COLORS.dangerBg };
  if (credit <= 3) return { color: COLORS.warning, bg: COLORS.warningBg };
  return { color: COLORS.success, bg: COLORS.successBg };
}

export function CheckinTable() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { checkins: rows, update } = useData();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);

  /* Dismissing stamps check_out_time on the attendance row, so the desk's
     action outlives the page — it used to live in component state and vanish
     on the next render. */
  function dismiss(attendanceId: string) {
    update("attendance", attendanceId, { check_out_time: new Date().toISOString() }).catch(() => {});
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
          <SectionTitle>{t("todaysCheckin")}</SectionTitle>
          <Badge color={COLORS.blue} bg={COLORS.light}>
            {t("studentCount", { count: rows.length })}
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
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.blue,
            }}
          >
            {expanded ? tCommon("showLess") : tCommon("viewAll")}
          </button>
        )}
      </div>

      <Table
        columns={[
          tCommon("student"),
          t("colCredit"),
          tCommon("class"),
          t("colArrival"),
          t("colDismissal"),
          tCommon("status"),
          tCommon("action"),
        ]}
        template={GRID}
        minWidth={860}
      >
        {visible.map((row) => {
          const credit = creditColors(row.credit);
          const status = statusChipColors(row.status === "In class" ? "Ongoing" : "Dismissed");
          return (
            <TableRow key={row.attendanceId} template={GRID}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Avatar initials={initialsOf(row.name)} size={30} />
                <span
                  style={{
                    fontWeight: 600,
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

              <span style={{ display: "flex", alignItems: "center", color: COLORS.textSecondary }}>
                <ClassDot color={classDotColor(row.class)} />
                {row.class}
              </span>

              <span style={{ color: COLORS.textSecondary }}>{row.timeIn}</span>
              <span style={{ color: COLORS.textSecondary }}>{row.timeOut}</span>

              <Badge color={status.color} bg={status.bg} style={{ justifySelf: "start" }}>
                {tStatus(row.status)}
              </Badge>

              <span>
                {row.status === "In class" && row.attendanceId && (
                  <button
                    type="button"
                    className="jt-chip"
                    onClick={() => dismiss(row.attendanceId!)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 999,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.surface,
                      color: COLORS.text,
                      fontFamily: FONT,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 160ms ease",
                    }}
                  >
                    {t("dismiss")}
                  </button>
                )}
              </span>
            </TableRow>
          );
        })}
      </Table>

    </Card>
  );
}
