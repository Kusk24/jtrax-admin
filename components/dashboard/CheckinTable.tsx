"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { byRegisterOrder, fmtCredits, fmtDate, toCheckins } from "@/lib/live";
import { Icon } from "@/lib/icons";
import { classDotColor, COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import { ActionButton } from "../crud";
import { useDashboardDate } from "../DashboardDate";
import { useData } from "../DataProvider";
import { useErrorToast } from "../ErrorToast";
import { SelectFilter, Table, TableRow } from "../page-kit";
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";
import { useEarlyCheckout } from "./EarlyCheckout";

const COLLAPSED_ROWS = 5;
/* The fixed first column is the tick box; the seven after it share the
   width equally. */
const GRID = "32px repeat(7, minmax(0, 1fr))";

function creditColors(credit: number) {
  if (credit <= 0) return { color: COLORS.danger, bg: COLORS.dangerBg };
  if (credit <= 3) return { color: COLORS.warning, bg: COLORS.warningBg };
  return { color: COLORS.success, bg: COLORS.successBg };
}

export function CheckinTable() {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { raw, checkins, batch, update } = useData();
  const { day, isToday } = useDashboardDate();
  /* Today's register comes ready-made from the data provider; another day's
     is read from the same rows. */
  const allRows = useMemo(() => (isToday ? checkins : toCheckins(raw, day)), [isToday, checkins, raw, day]);
  /* One course at a time, when the desk wants it. Everything below — the
     count, select-all, check-out — works on the filtered rows, so ticking
     "all" never reaches a child the desk cannot see. */
  const [course, setCourse] = useState("");
  const courses = useMemo(() => [...new Set(allRows.map((r) => r.class).filter(Boolean))].sort(), [allRows]);
  const activeCourse = courses.includes(course) ? course : "";
  const rows = useMemo(
    () => (activeCourse ? allRows.filter((r) => r.class === activeCourse) : allRows).slice().sort(byRegisterOrder),
    [allRows, activeCourse],
  );
  const { showError } = useErrorToast();
  const [expanded, setExpanded] = useState(false);
  /* Attendance ids, not student ids: the write is against the attendance row,
     and a child could in principle have one for a class that already ended. */
  const [selected, setSelected] = useState<string[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const early = useEarlyCheckout();
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);

  /* Everyone still in a class — the only rows a check-out means anything for.
     Read from `rows`, not `visible`: "all" means all of today, and a desk
     clearing the building at closing time should not have to press View all
     first to reach the sixth child. */
  /* Only today's: checking out on another day's register would stamp today's
     time on a visit that was not today. */
  const checkable = rows
    .filter((r) => isToday && r.status === "In class" && r.attendanceId)
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
    <Card className="jt-dashboard-checkins" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0, overflow: "hidden" }}>
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
          <SectionTitle>{isToday ? t("todaysCheckin") : t("checkinsOn", { date: fmtDate(day) })}</SectionTitle>
          <Badge color={COLORS.blue} bg={COLORS.light}>
            {t("studentCount", { count: rows.length })}
          </Badge>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {courses.length > 1 && (
          <SelectFilter
            value={activeCourse}
            onChange={(v) => {
              setCourse(v);
              setSelected([]);
            }}
            options={[{ value: "", label: tCommon("allClasses") }, ...courses.map((c) => ({ value: c, label: c }))]}
            label={t("filterByCourse")}
          />
        )}
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
                  await early.request(chosen, () => checkOut(chosen));
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

      {rows.length === 0 ? (
        <div className="jt-dashboard-empty jt-checkin-empty">
          <span className="jt-dashboard-empty-icon">
            <Icon name="userCheck" size={20} color={COLORS.blue} />
          </span>
          <strong>{isToday ? t("noCheckinsToday") : t("noCheckinsOn", { date: fmtDate(day) })}</strong>
          {isToday && <span>{t("noCheckinsTodaySub")}</span>}
        </div>
      ) : (
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
          minWidth={728}
        >
          {visible.map((row) => {
          /* In class: the balance before today, and what today costs after
             it ("20  − 1.5"). Checked out: the balance that is left. */
          const charge = row.status === "In class" ? (row.charge ?? 0) : 0;
          const used = row.charge ?? 0;
          const shown = row.credit + charge;
          const credit = creditColors(shown);
          const status = statusChipColors(row.status === "In class" ? "Ongoing" : "Dismissed");
          const canCheckOut = isToday && row.status === "In class" && Boolean(row.attendanceId);
          const ticked = Boolean(row.attendanceId) && chosen.includes(row.attendanceId!);
          return (
            <TableRow
              key={row.attendanceId}
              template={GRID}
              /* The row opens the student; the tick box and Dismiss below
                 keep their own clicks. */
              onClick={row.studentId ? () => router.push(`/students?id=${encodeURIComponent(row.studentId!)}`) : undefined}
            >
              <span onClick={(e) => e.stopPropagation()}>
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

              {/* Two lines: the balance in bold, and under it what today does —
                  "−1.5 today → 18.5 left" while in class, "1.5 used today"
                  once checked out. */}
              <span style={{ justifySelf: "start", display: "flex", flexDirection: "column", gap: 2, fontVariantNumeric: "tabular-nums", minWidth: 0 }}>
                <span style={{ fontWeight: 700, color: credit.color }}>
                  {tCommon("creditsCount", { count: fmtCredits(shown) })}
                </span>
                {used > 0 && (
                  <span style={{ fontSize: 12, color: COLORS.textSecondary, whiteSpace: "nowrap" }}>
                    {charge > 0 ? (
                      <>
                        {t("todayCharge", { credits: fmtCredits(charge) })}{" → "}
                        <span style={{ fontWeight: 600, color: row.credit < 0 ? COLORS.danger : COLORS.text }}>
                          {t("leftAfter", { credits: fmtCredits(row.credit) })}
                        </span>
                      </>
                    ) : (
                      t("usedToday", { credits: fmtCredits(used) })
                    )}
                  </span>
                )}
              </span>

              <span style={{ display: "flex", alignItems: "center", color: COLORS.textSecondary }}>
                <ClassDot color={classDotColor(row.class)} />
                {row.class}
              </span>

              <span style={{ color: COLORS.textSecondary }}>{row.timeIn}</span>
              <span style={{ color: COLORS.textSecondary }}>{row.timeOut}</span>

              <Badge color={status.color} bg={status.bg} style={{ justifySelf: "start" }}>
                {tStatus(row.status)}
              </Badge>

              <span onClick={(e) => e.stopPropagation()}>
                {canCheckOut && (
                  <ActionButton
                    className="jt-chip"
                    busyLabel={tCommon("saving")}
                    onClick={() => early.request([row.attendanceId!], () => checkOut([row.attendanceId!]))}
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
      )}

      {early.dialog}
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
