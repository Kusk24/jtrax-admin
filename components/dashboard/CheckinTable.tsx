"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { fmtCredits } from "@/lib/live";
import { classDotColor, COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import { ActionButton } from "../crud";
import { useData } from "../DataProvider";
import { useErrorToast } from "../ErrorToast";
import { equalTemplate, Table, TableRow } from "../page-kit";
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";

const COLLAPSED_ROWS = 5;
/* Shared with every other list on purpose — this table used to roll its own
   grid and padding, which made its rows a different height from the rest. The
   fixed first column is the tick box; it does not share the flexible width
   because a checkbox does not grow. */
const GRID = `34px ${equalTemplate(7, 90)}`;

function creditColors(credit: number) {
  if (credit <= 0) return { color: COLORS.danger, bg: COLORS.dangerBg };
  if (credit <= 3) return { color: COLORS.warning, bg: COLORS.warningBg };
  return { color: COLORS.success, bg: COLORS.successBg };
}

export function CheckinTable() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { checkins: rows, batch, update } = useData();
  const { showError } = useErrorToast();
  const [expanded, setExpanded] = useState(false);
  /* Attendance ids, not student ids: the write is against the attendance row,
     and a child could in principle have one for a class that already ended. */
  const [selected, setSelected] = useState<string[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);

  /* Everyone still in a class — the only rows a check-out means anything for.
     Read from `rows`, not `visible`: "all" means all of today, and a desk
     clearing the building at closing time should not have to press View all
     first to reach the sixth child. */
  const checkable = rows
    .filter((r) => r.status === "In class" && r.attendanceId)
    .map((r) => r.attendanceId!);
  const chosen = selected.filter((id) => checkable.includes(id));
  const allChosen = checkable.length > 0 && chosen.length === checkable.length;

  function toggleOne(attendanceId: string) {
    setSelected((prev) =>
      prev.includes(attendanceId) ? prev.filter((id) => id !== attendanceId) : [...prev, attendanceId],
    );
  }

  function toggleAll() {
    if (allChosen) {
      setSelected([]);
      return;
    }
    setSelected(checkable);
    /* Selecting people you cannot see and then sending them home is not a
       thing to do quietly — open the list so the desk sees the names it is
       about to check out. */
    setExpanded(true);
  }

  /**
   * Checking out stamps check_out_time on the attendance row, so the desk's
   * action outlives the page — it used to live in component state and vanish
   * on the next render.
   *
   * Awaited, and through ActionButton, because a write here refetches every
   * collection: on the deployed backend that is seconds during which a plain
   * button sits there looking unpressed. The desk read that as a freeze and
   * reloaded the page to find the check-out had gone through all along.
   */
  async function checkOut(attendanceIds: string[]) {
    const at = new Date().toISOString();
    try {
      /* One refetch for the lot. Twenty children at closing time is twenty
         writes, and unbatched that is twenty full reloads of every collection
         — minutes of a spinner for one press. */
      await batch(async () => {
        for (const id of attendanceIds) {
          await update("attendance", id, { check_out_time: at });
        }
      });
      setSelected((prev) => prev.filter((id) => !attendanceIds.includes(id)));
    } catch (e) {
      /* Swallowing this was how a refusal became a freeze too. */
      showError(tCommon("saveFailed"), e);
    }
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

      {/* Only once something is ticked. An always-there bar with a disabled
          button is a permanent piece of furniture for an action taken once a
          day, and it pushed the first row of names below the fold. */}
      {chosen.length > 0 && (
        <div
          className="jtrax-fade-in-up"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            margin: "0 18px",
            padding: "10px 14px",
            borderRadius: 11,
            background: COLORS.light,
          }}
        >
          <span style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>
            {t("selectedCount", { count: chosen.length })}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <button
              type="button"
              className="jt-chip"
              onClick={() => setSelected([])}
              style={{ ...chipStyle, background: "transparent" }}
            >
              {t("clearSelection")}
            </button>
            <ActionButton
              className="jt-btn-primary"
              busyLabel={tCommon("saving")}
              onClick={async () => {
                setCheckingOut(true);
                try {
                  await checkOut(chosen);
                } finally {
                  setCheckingOut(false);
                }
              }}
              style={{
                padding: "7px 15px",
                borderRadius: 999,
                border: "none",
                background: COLORS.blue,
                color: COLORS.surface,
                fontFamily: FONT,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("checkOutSelected", { count: chosen.length })}
            </ActionButton>
          </div>
        </div>
      )}

      <Table
        columns={[
          <input
            key="all"
            type="checkbox"
            /* Indeterminate is the honest third state when some but not all
               are ticked; without it the box reads as "none selected" while a
               dozen are. */
            ref={(el) => {
              if (el) el.indeterminate = chosen.length > 0 && !allChosen;
            }}
            checked={allChosen}
            disabled={checkable.length === 0 || checkingOut}
            onChange={toggleAll}
            aria-label={t("selectAll")}
            title={t("selectAll")}
            style={{ cursor: checkable.length === 0 ? "default" : "pointer" }}
          />,
          tCommon("student"),
          t("colCredit"),
          tCommon("class"),
          t("colArrival"),
          t("colDismissal"),
          tCommon("status"),
          tCommon("action"),
        ]}
        template={GRID}
        minWidth={894}
      >
        {visible.map((row) => {
          const credit = creditColors(row.credit);
          const status = statusChipColors(row.status === "In class" ? "Ongoing" : "Dismissed");
          const canCheckOut = row.status === "In class" && Boolean(row.attendanceId);
          const ticked = Boolean(row.attendanceId) && chosen.includes(row.attendanceId!);
          return (
            <TableRow key={row.attendanceId} template={GRID}>
              <span>
                {/* Nothing to tick for a child already sent home: the row is
                    the record of a finished afternoon, not a pending act. */}
                {canCheckOut && (
                  <input
                    type="checkbox"
                    checked={ticked}
                    disabled={checkingOut}
                    onChange={() => toggleOne(row.attendanceId!)}
                    aria-label={t("selectStudent", { name: row.name })}
                    style={{ cursor: "pointer" }}
                  />
                )}
              </span>

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
                {fmtCredits(row.credit)}
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
                {canCheckOut && (
                  <ActionButton
                    className="jt-chip"
                    busyLabel={tCommon("saving")}
                    onClick={() => checkOut([row.attendanceId!])}
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
                  </ActionButton>
                )}
              </span>
            </TableRow>
          );
        })}
      </Table>

    </Card>
  );
}

const chipStyle: React.CSSProperties = {
  padding: "7px 13px",
  borderRadius: 999,
  border: `1px solid ${COLORS.border}`,
  color: COLORS.text,
  fontFamily: FONT,
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
};
