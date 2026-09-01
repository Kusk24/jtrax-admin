"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { suggestedActions, type DeskAction } from "@/lib/desk-actions";
import {
  checkInIntent,
  candidateSessions,
  deskStatusOf,
  todaysAttendance,
  type AttendanceRow,
  type EnrolmentRow,
  type SessionRow,
} from "@/lib/desk-state";

import { activeEnrolments } from "@/lib/live";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import { useData } from "../DataProvider";
import { useErrorToast } from "../ErrorToast";
import { Avatar, Badge, Card, SectionTitle } from "../ui";

const CREDIT_TOP_UPS = [5, 10, 20];

type PopoverKind = "class" | "credit" | null;

export function FindStudent() {
  const router = useRouter();
  const t = useTranslations("find");
  const tCommon = useTranslations("common");
  const { showError } = useErrorToast();
  const { students, todaysClasses, raw, create, update } = useData();
  const [query, setQuery] = useState("");
  const [popover, setPopover] = useState<{ id: string; kind: PopoverKind }>({ id: "", kind: null });
  /* The student whose row is mid-write. Every desk action is one request that
     refetches, and a second press before it lands is a second attendance row —
     or, on a unique index, an error the receptionist did not cause. */
  const [busy, setBusy] = useState("");

  /* Today's sessions, and the rows that say who is at them. The desk reads the
     same attendance table the check-in list and the "Checked in today" tile
     read, which is why pressing a button here now moves all three. */
  const sessions: SessionRow[] = useMemo(
    () =>
      todaysClasses
        .filter((c) => c.id)
        .map((c) => ({ sessionId: String(c.id), classId: String(c.classId ?? "") })),
    [todaysClasses],
  );

  const attendance: AttendanceRow[] = useMemo(
    () =>
      raw.attendance.map((a) => ({
        attendanceId: String(a["attendance_id"]),
        studentId: String(a["student_id"]),
        sessionId: String(a["session_id"]),
        checkedOut: Boolean(String(a["check_out_time"] ?? "")),
      })),
    [raw.attendance],
  );

  const enrolments: EnrolmentRow[] = useMemo(
    () =>
      /* Only the classes they are currently in: a withdrawn enrolment must
         not offer its sessions at the desk. */
      activeEnrolments(raw.enrollments).map((e) => ({
        studentId: String(e["student_id"]),
        classId: String(e["class_id"] ?? ""),
      })),
    [raw.enrollments],
  );

  /** The class a student is sitting in right now, for the chip. */
  function classNameOf(studentId: string): string {
    const row = todaysAttendance(attendance, sessions, studentId);
    return todaysClasses.find((c) => String(c.id) === row?.sessionId)?.name ?? "";
  }

  /** Writes the student into a session — moving them if the desk picked the
      wrong one first, rather than leaving two rows for one afternoon. */
  async function checkIn(studentId: string, sessionId: string) {
    const existing = todaysAttendance(attendance, sessions, studentId);
    setBusy(studentId);
    try {
      if (existing) {
        await update("attendance", existing.attendanceId, {
          session_id: sessionId,
          check_out_time: null,
        });
      } else {
        await create("attendance", {
          student_id: studentId,
          session_id: sessionId,
          check_in_time: new Date().toISOString(),
        });
      }
    } catch (e) {
      showError(tCommon("saveFailed"), e);
    } finally {
      setBusy("");
    }
  }

  async function dismiss(studentId: string) {
    const row = todaysAttendance(attendance, sessions, studentId);
    if (!row) return;
    setBusy(studentId);
    try {
      await update("attendance", row.attendanceId, { check_out_time: new Date().toISOString() });
    } catch (e) {
      showError(tCommon("saveFailed"), e);
    } finally {
      setBusy("");
    }
  }

  /** A manual adjustment, not a purchase: no money changed hands at the desk.
      Money goes through Record Payment, which writes its own ledger entry. */
  async function addCredits(studentId: string, amount: number) {
    const enr = activeEnrolments(raw.enrollments).find((e) => String(e["student_id"]) === studentId);
    if (!enr) {
      showError(t("noEnrolment"));
      return;
    }
    setBusy(studentId);
    try {
      await create("credit-transactions", {
        enrollment_id: String(enr["enrollment_id"]),
        /* Whose the hours are and what they were bought for, so they outlive
           the enrolment if the office ever deletes it. */
        student_id: studentId,
        class_id: String(enr["class_id"] ?? "") || null,
        transaction_type: "manual_adjustment",
        amount,
        transaction_date: new Date().toISOString().slice(0, 10),
        notes: t("addedAtDesk"),
      });
    } catch (e) {
      showError(tCommon("saveFailed"), e);
    } finally {
      setBusy("");
    }
  }

  /* Name or parent-phone, against the real roster. */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.parentPhone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    );
  }, [query, students]);
  const showResults = query.trim().length > 0;

  function togglePopover(id: string, kind: PopoverKind) {
    setPopover((prev) => (prev.id === id && prev.kind === kind ? { id: "", kind: null } : { id, kind }));
  }

  return (
    <div style={{ position: "relative" }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 18, overflow: "hidden" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionTitle>{t("title")}</SectionTitle>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "10px 14px",
              borderRadius: 999,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
            }}
          >
            <Icon name="search" size={17} color={COLORS.textSecondary} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholder")}
              aria-label={t("label")}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: FONT,
                fontSize: 14.5,
                color: COLORS.text,
              }}
            />
          </div>
        </div>
      </Card>

      {showResults && (
        <Card
          className="jtrax-fade-in-up"
          style={{
            marginTop: 8,
            padding: 8,
            boxShadow: "0 12px 28px rgb(36 59 99 / 0.12)",
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "26px 16px",
              }}
            >
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 14.5, color: COLORS.textSecondary }}>
                {t("noStudent")}
              </p>
              <button
                type="button"
                className="jt-btn-primary"
                onClick={() => router.push(`/students?new=${encodeURIComponent(query)}`)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 16px",
                  borderRadius: 999,
                  border: "none",
                  background: COLORS.blue,
                  color: COLORS.surface,
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Icon name="usersPlus" size={16} color={COLORS.surface} />
                {t("registerStudent")}
              </button>
            </div>
          ) : (
            results.map((student) => {
              /* Read, not remembered: the credit badge is the ledger's own
                 total and the chip is today's attendance row. */
              const credit = student.credit;
              const status = deskStatusOf(attendance, sessions, student.id);
              const chip = statusChipColors(student.status);
              const open = popover.id === student.id ? popover.kind : null;
              const actions: DeskAction[] = suggestedActions(status, student.status);
              const writing = busy === student.id;

              const checkinLabel =
                status === "in_class"
                  ? t("inClass", { className: classNameOf(student.id) })
                  : status === "dismissed"
                    ? t("dismissed")
                    : t("notCheckedIn");

              return (
                <div key={student.id}>
                  <div
                    className="jt-find-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 12px",
                      borderRadius: 10,
                    }}
                  >
                    <Avatar initials={initialsOf(student.name)} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                        {student.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
                        <Badge color={COLORS.textSecondary} bg={COLORS.neutralBg}>
                          {checkinLabel}
                        </Badge>
                        <Badge color={chip.color} bg={chip.bg}>
                          {t("creditCount", { count: credit })}
                        </Badge>
                      </div>
                    </div>

                    {/* Which buttons appear is the spec's matrix, not a fixed
                        set: attendance state crossed with credit standing. */}
                    {actions.length === 0 && (
                      <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary, flexShrink: 0 }}>
                        {t("noAction")}
                      </span>
                    )}
                    {actions.map((action) => {
                      if (action === "contact") {
                        return (
                          <a
                            key={action}
                            href={`tel:${student.parentPhone.replace(/\s/g, "")}`}
                            className="jt-chip"
                            style={{ ...ghostBtn, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
                          >
                            <Icon name="phone" size={13} /> {t("contact")}
                          </a>
                        );
                      }
                      if (action === "addCredits") {
                        return (
                          <button
                            key={action}
                            type="button"
                            className="jt-chip"
                            disabled={writing}
                            onClick={() => togglePopover(student.id, "credit")}
                            style={ghostBtn}
                          >
                            {t("addCredits")}
                          </button>
                        );
                      }
                      if (action === "dismiss") {
                        return (
                          <button
                            key={action}
                            type="button"
                            className="jt-chip"
                            disabled={writing}
                            onClick={() => dismiss(student.id)}
                            style={ghostBtn}
                          >
                            {t("dismiss")}
                          </button>
                        );
                      }
                      return (
                        <button
                          key={action}
                          type="button"
                          className="jt-btn-primary"
                          disabled={writing}
                          onClick={() => {
                            if (action !== "checkIn") {
                              togglePopover(student.id, "class");
                              return;
                            }
                            /* One class today and there is nothing to ask;
                               several and the desk must say which, because the
                               wrong one is a wrong record for a real child. */
                            const intent = checkInIntent(sessions, enrolments, student.id);
                            if (intent.kind === "write") void checkIn(student.id, intent.sessionId);
                            else togglePopover(student.id, "class");
                          }}
                          style={primaryBtn}
                        >
                          {writing
                            ? tCommon("saving")
                            : action === "checkIn"
                              ? t("checkIn")
                              : t("assignClass")}
                        </button>
                      );
                    })}
                  </div>

                  {open === "class" && (
                    <div className="jtrax-fade-in-up" style={popoverStyle}>
                      {/* Their own classes, or everything running today when
                          they are enrolled in none — a child at the desk has
                          to be recordable whatever the paperwork says. */}
                      {candidateSessions(sessions, enrolments, student.id).map((session) => {
                        const cls = todaysClasses.find((c) => String(c.id) === session.sessionId);
                        return (
                          <button
                            key={session.sessionId}
                            type="button"
                            className="jt-chip"
                            disabled={writing}
                            onClick={() => {
                              setPopover({ id: "", kind: null });
                              void checkIn(student.id, session.sessionId);
                            }}
                            style={chipBtn}
                          >
                            {cls ? `${cls.name} · ${cls.time}` : session.sessionId}
                          </button>
                        );
                      })}
                      {/* Two different dead ends, and the desk needs to know
                          which: nothing running today at all, or nothing this
                          child is enrolled in. The second is fixed on their
                          own page, not here. */}
                      {candidateSessions(sessions, enrolments, student.id).length === 0 && (
                        <p style={noteStyle}>
                          {sessions.length === 0 ? t("noSessionsToday") : t("notEnrolledToday")}
                        </p>
                      )}
                    </div>
                  )}

                  {open === "credit" && (
                    <div className="jtrax-fade-in-up" style={popoverStyle}>
                      {CREDIT_TOP_UPS.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          className="jt-chip"
                          disabled={writing}
                          onClick={() => {
                            setPopover({ id: "", kind: null });
                            void addCredits(student.id, amount);
                          }}
                          style={chipBtn}
                        >
                          +{amount}
                        </button>
                      ))}
                      {/* Credits hang off an enrolment; without one there is
                          nowhere to put them. */}
                      {!activeEnrolments(raw.enrollments).some((e) => String(e["student_id"]) === student.id) && (
                        <p style={noteStyle}>{t("noEnrolment")}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Card>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 999,
  border: "none",
  background: COLORS.blue,
  color: COLORS.surface,
  fontFamily: FONT,
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  flexShrink: 0,
};

const ghostBtn: React.CSSProperties = {
  padding: "6px 13px",
  borderRadius: 999,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  fontFamily: FONT,
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 160ms ease",
  flexShrink: 0,
};

const chipBtn: React.CSSProperties = {
  padding: "6px 13px",
  borderRadius: 999,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  fontFamily: FONT,
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 160ms ease",
};

const noteStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT,
  fontSize: 13,
  color: COLORS.textSecondary,
};

const popoverStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  padding: "4px 12px 12px 60px",
};
