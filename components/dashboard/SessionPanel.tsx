"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { type ClassDef } from "@/lib/data";
import { activeEnrolments, fmtCredits, liveClasses, todayISO } from "@/lib/live";
import {
  creditCost,
  defaultEndFor,
  draftProblem,
  hourOf,
  hourOptions,
  joinClock,
  lengthMinutes,
  minuteOf,
  minuteOptions,
  MIN_SESSION_MINUTES,
} from "@/lib/session-draft";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
/* Shared with the rest of the forms so the panel's fields keep the same box —
   this file used to carry its own near-identical copies. */
import { ActionButton } from "../crud";
import { useData } from "../DataProvider";
import { fieldStyle, labelStyle, selectStyle } from "../page-kit";
import { Avatar } from "../ui";
import { useErrorToast } from "../ErrorToast";

export type PanelState = { mode: "create" } | { mode: "view"; def: ClassDef } | null;

function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: COLORS.scrim,
        zIndex: 50,
      }}
    />
  );
}

function PanelFrame({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const tCommon = useTranslations("common");

  /* Escape closes; body scroll is locked while the panel owns the screen. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <>
      <Scrim onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="jtrax-fade-in-up"
        style={{
          /* Centred with auto margins, not translateX — the fade-in keyframe
             animates `transform` and would otherwise cancel the centering. */
          position: "fixed",
          top: "5vh",
          left: 0,
          right: 0,
          marginInline: "auto",
          width: "min(920px, 92vw)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          boxShadow: "0 24px 60px rgb(20 33 58 / 0.28)",
          zIndex: 60,
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.textSecondary,
              padding: 0,
            }}
          >
            <Icon name="chevronLeft" size={17} color={COLORS.textSecondary} />
            {tCommon("back")}
          </button>
          <h2 style={{ margin: 0, fontFamily: FONT, fontSize: 17, fontWeight: 700, color: COLORS.text }}>
            {title}
          </h2>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>{children}</div>

        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 20px",
            borderTop: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
          }}
        >
          {footer}
        </footer>
      </div>
    </>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 999,
  border: "none",
  background: COLORS.blue,
  color: COLORS.surface,
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 18px",
  borderRadius: 999,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};


/**
 * An hour and a minute, side by side.
 *
 * One list of every five-minute mark in the day is 288 options: correct and
 * unusable, since finding 16:45 meant scrolling past three hundred
 * neighbours. Twenty-four hours and twelve minutes are both short enough to
 * take in at a glance, and between them they still reach every mark the
 * timetable uses.
 */
function ClockPicker({
  idPrefix,
  hourLabel,
  minuteLabel,
  value,
  hours,
  minutes,
  onChange,
}: {
  idPrefix: string;
  hourLabel: string;
  minuteLabel: string;
  value: string;
  hours: { value: string; label: string }[];
  minutes: { value: string; label: string }[];
  onChange: (clock: string) => void;
}) {
  const hour = hourOf(value);
  const minute = minuteOf(value);
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select
        id={`${idPrefix}-hour`}
        aria-label={hourLabel}
        value={hour}
        /* Choosing an hour alone is a whole time: 4pm means 16:00 without the
           desk also having to say "and no minutes". */
        onChange={(e) => onChange(joinClock(e.target.value, minute))}
        style={{ ...selectStyle, flex: 1, minWidth: 0 }}
      >
        <option value="">--</option>
        {hours.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span style={{ fontFamily: FONT, fontSize: 15, color: COLORS.textSecondary }}>:</span>
      <select
        id={`${idPrefix}-minute`}
        aria-label={minuteLabel}
        value={minute}
        onChange={(e) => onChange(joinClock(hour, e.target.value))}
        /* Without an hour there is no time to put minutes on. */
        disabled={!hour}
        style={{ ...selectStyle, flex: 1, minWidth: 0, opacity: hour ? 1 : 0.6 }}
      >
        <option value="">--</option>
        {minutes.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </span>
  );
}

/**
 * Create Session.
 *
 * A class runs when it runs: the academy sets no fixed hours, which is why a
 * session is written down one at a time. So both ends of it are chosen freely
 * — any start, any end, five minutes apart — rather than offered as "now until
 * something".
 *
 * The times are selects, not `<input type="time">`. That input reports its
 * value as "" until every segment is filled, and how many segments there are
 * is the browser's business, so a field reading "03:30" could be empty to the
 * code while the desk stared at a Create button that would not press. A pair
 * of selects cannot be half chosen.
 *
 * Students can be ticked here if they are already standing there, and checked
 * in afterwards from the dashboard if they are not — the same attendance rows
 * either way, which is what spends the credits.
 */
function CreateSession({ onClose }: { onClose: () => void }) {
  const t = useTranslations("session");
  const tCommon = useTranslations("common");
  const { showError } = useErrorToast();
  const { raw, students, create, batch } = useData();

  /* Only classes the academy still runs: an archived one cannot take a new
     session, though its finished ones keep its name. */
  const classes = useMemo(
    () => liveClasses({ classes: raw.classes }).map((c) => ({ id: String(c.class_id), name: String(c.name ?? "") })),
    [raw.classes],
  );

  const [chosenClass, setChosenClass] = useState("");
  /* Worked out at render, never frozen at mount: the panel can open before the
     class list arrives, and a name captured then would be one this list does
     not contain — a class that looks chosen and a button that stays dead. */
  const classId = classes.some((c) => c.id === chosenClass) ? chosenClass : classes[0]?.id ?? "";

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const hours = useMemo(() => hourOptions(), []);
  const minutes5 = useMemo(() => minuteOptions(), []);
  const problem = draftProblem({ classCount: classes.length, classId, start, end });
  const minutes = lengthMinutes(start, end);
  const cost = creditCost(start, end);

  /** Choosing a start moves an end that no longer makes sense, rather than
      leaving the desk with a Create button it cannot press and no clue why. */
  function chooseStart(value: string) {
    setStart(value);
    if (lengthMinutes(value, end) < MIN_SESSION_MINUTES) setEnd(defaultEndFor(value));
  }

  /**
   * Who may be in this session: the students enrolled in the class chosen.
   *
   * A child attends the classes they are enrolled in. Ticking anyone else here
   * writes an attendance nobody can charge — credits hang off an enrolment —
   * and the desk would find out at the end of the month.
   */
  const eligible = useMemo(() => {
    const enrolled = new Set(
      /* Currently in it — a child who has left the class, or finished it,
         is not on its roster any more. */
      activeEnrolments(raw.enrollments)
        .filter((e) => String(e["class_id"] ?? "") === classId)
        .map((e) => String(e["student_id"])),
    );
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => enrolled.has(s.id))
      .filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [students, raw.enrollments, classId, search]);

  /* Ticks do not survive a change of class: they were made against a roster
     that no longer applies. */
  const eligibleIds = useMemo(() => new Set(eligible.map((s) => s.id)), [eligible]);
  const picked = selected.filter((id) => eligibleIds.has(id));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const reason: Record<NonNullable<typeof problem>, string> = {
    noClasses: t("noClasses"),
    noClass: t("chooseAClass"),
    endBeforeStart: t("endAfterStart"),
    tooShort: t("atLeastHalfAnHour"),
  };

  async function createSession() {
    if (problem) return;
    setBusy(true);
    try {
      /* The session and everyone already in the room, as one unit — and the
         credits follow the attendance rows on the server, one hour to one
         credit, so nothing here has to work the price out twice. */
      await batch(async () => {
        const session = await create("class-sessions", {
          class_id: classId,
          session_date: todayISO(),
          start_time: start,
          end_time: end,
          session_status: "Ongoing",
        });
        for (const studentId of picked) {
          await create("attendance", {
            student_id: studentId,
            session_id: session.session_id,
            check_in_time: new Date().toISOString(),
          });
        }
      });
      onClose();
    } catch (e) {
      showError(tCommon("sessionFailed"), e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanelFrame
      title={t("createTitle")}
      onClose={onClose}
      footer={
        <>
          <span style={{ fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
            {problem ? reason[problem] : t("readyToCreate", { count: picked.length })}
          </span>
          <span style={{ display: "flex", gap: 10 }}>
            <button type="button" style={ghostBtn} onClick={onClose}>
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              className="jt-btn-primary"
              style={{
                ...primaryBtn,
                opacity: problem || busy ? 0.75 : 1,
                cursor: problem ? "not-allowed" : busy ? "wait" : "pointer",
              }}
              disabled={Boolean(problem) || busy}
              onClick={createSession}
            >
              {busy ? tCommon("saving") : t("createTitle")}
            </button>
          </span>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        <div>
          <h3 style={{ margin: "0 0 14px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
            {t("sessionDetails")}
          </h3>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="jtrax-class-name">{t("className")}</label>
            <select
              id="jtrax-class-name"
              value={classId}
              /* The times stay. A class has no fixed hours, so which class this
                 is says nothing about when it runs. */
              onChange={(e) => setChosenClass(e.target.value)}
              style={selectStyle}
            >
              {classes.length === 0 && <option value="">{t("noClasses")}</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>{t("startTime")}</span>
              <ClockPicker
                idPrefix="jtrax-start"
                hourLabel={t("startHour")}
                minuteLabel={t("startMinute")}
                value={start}
                hours={hours}
                minutes={minutes5}
                onChange={chooseStart}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>{t("endTime")}</span>
              <ClockPicker
                idPrefix="jtrax-end"
                hourLabel={t("endHour")}
                minuteLabel={t("endMinute")}
                value={end}
                hours={hours}
                minutes={minutes5}
                onChange={setEnd}
              />
            </div>
          </div>

          {/* The price, before the desk commits to it — a family should not
              learn what an afternoon cost afterwards. */}
          <p style={{ margin: "0 0 18px", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
            {minutes > 0
              ? t("lengthAndCost", { minutes, credits: fmtCredits(cost) })
              : t("atLeastHalfAnHour")}
          </p>

          <div style={{ height: 1, background: COLORS.border, margin: "4px 0 16px" }} />

          <h3 style={{ margin: "0 0 10px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
            {t("selectedStudents", { count: picked.length })}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {picked.length === 0 && (
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("noneSelectedYet")}
              </span>
            )}
            {picked.map((id) => {
              const student = students.find((s) => s.id === id);
              if (!student) return null;
              return (
                <span
                  key={id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "5px 8px 5px 5px",
                    borderRadius: 999,
                    background: COLORS.light,
                    fontFamily: FONT,
                    fontSize: 13.5,
                    color: COLORS.text,
                  }}
                >
                  <Avatar initials={initialsOf(student.name)} size={20} bg={COLORS.surface} />
                  {student.name}
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    aria-label={t("removeStudent", { name: student.name })}
                    style={{
                      display: "inline-flex",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                      color: COLORS.textSecondary,
                    }}
                  >
                    <Icon name="x" size={13} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <h3 style={{ margin: "0 0 4px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
            {t("addStudents")}
          </h3>
          {/* Nobody has to be ticked now: the dashboard checks a child in when
              they walk through the door, and it writes the same row. */}
          <p style={{ margin: "0 0 12px", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {t("addStudentsHelp")}
          </p>
          <div style={{ marginBottom: 12 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchStudents")}
              aria-label={t("searchStudentsLabel")}
              style={fieldStyle}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
            {eligible.length === 0 && (
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {search.trim() ? t("noStudentMatches") : t("nobodyEnrolled")}
              </span>
            )}
            {eligible.map((student) => {
              /* Short by the time the session is priced. A warning, not a
                 refusal: the academy lets a child attend on credit and settle
                 later, so this marks who to chase rather than turning them
                 away at the door. */
              const short = cost > 0 && student.credit < cost;
              return (
                <label
                  key={student.id}
                  className="jt-find-row"
                  title={short ? t("willGoNegative", { credits: fmtCredits(student.credit) }) : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 9,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={picked.includes(student.id)}
                    onChange={() => toggle(student.id)}
                    style={{ accentColor: COLORS.blue, width: 15, height: 15 }}
                  />
                  <Avatar initials={initialsOf(student.name)} size={26} />
                  <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>
                    {student.name}
                  </span>
                  {/* What they have to spend, next to what this will cost. */}
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: 12.5,
                      fontWeight: short ? 600 : 400,
                      color: short ? COLORS.danger : COLORS.textSecondary,
                    }}
                  >
                    {tCommon("creditsCount", { count: fmtCredits(student.credit) })}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}


/**
 * One session, open on the dashboard.
 *
 * The panel is handed the session that was clicked — but that is a snapshot,
 * taken when it was opened and held in the page's state ever since. Adding or
 * removing a student writes a row and refetches, and every other view of today
 * moved; this one did not, because it was still rendering the copy it was
 * given. The desk saw nothing happen, pressed again, and only found out it had
 * worked by closing the panel.
 *
 * So the snapshot is only ever a starting point: the session is read back out
 * of the live list by id on every render, and falls back to what it was handed
 * for a session that is no longer in today's list at all.
 */
function ViewClass({ def: opened, onClose }: { def: ClassDef; onClose: () => void }) {
  const t = useTranslations("session");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { students, raw, create, remove, todaysClasses } = useData();
  const { showError } = useErrorToast();
  const def = todaysClasses.find((c) => c.id && c.id === opened.id) ?? opened;
  const editable = def.status === "Ongoing";
  /* The roster comes from attendance, so adding or removing someone writes a
     row rather than editing a local array that the next refresh discards. */
  const roster = def.roster;
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const status = statusChipColors(def.status);

  /* Latecomers are the point of this panel: a student who turns up after the
     session started is added here. Only this class's own children, though —
     the list used to offer every student in the academy, so a child could be
     added to a session of a class they were never enrolled in, where their
     attendance could not be charged to anything. */
  const addable = useMemo(() => {
    const enrolled = new Set(
      activeEnrolments(raw.enrollments)
        .filter((e) => String(e["class_id"] ?? "") === String(def.classId ?? ""))
        .map((e) => String(e["student_id"])),
    );
    const q = search.trim().toLowerCase();
    return students.filter(
      (student) =>
        enrolled.has(student.id) &&
        !roster.includes(student.name) &&
        (!q || student.name.toLowerCase().includes(q)),
    );
  }, [roster, search, students, raw.enrollments, def.classId]);

  return (
    <PanelFrame
      title={def.name}
      onClose={onClose}
      footer={
        <>
          <span style={{ fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
            {def.time} · {def.teacher} · {def.room}
          </span>
          <button type="button" style={editable ? primaryBtn : ghostBtn} onClick={onClose}>
            {editable ? t("saveChanges") : tCommon("close")}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: status.bg,
            color: status.color,
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {tStatus(def.status)}
        </span>
        {!editable && (
          <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
            {t("readOnly")}
          </span>
        )}
      </div>

      <h3 style={{ margin: "0 0 12px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
        {t("checkedInCount", { count: roster.length })}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 9 }}>
        {roster.map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "9px 11px",
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Avatar initials={initialsOf(name)} size={28} />
            <span style={{ flex: 1, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>{name}</span>
            {editable && (
              <ActionButton
                onClick={async () => {
                  const student = students.find((s) => s.name === name);
                  const row = raw.attendance.find(
                    (a) => String(a.session_id) === def.id && String(a.student_id) === student?.id,
                  );
                  if (row) await remove("attendance", String(row.attendance_id)).catch(() => {});
                }}
                ariaLabel={t("removeFromRoster", { name })}
                style={{
                  display: "inline-flex",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                  color: COLORS.textSecondary,
                }}
              >
                <Icon name="x" size={14} />
              </ActionButton>
            )}
          </div>
        ))}
      </div>

      {editable && (
        <div style={{ marginTop: 18 }}>
          {addOpen ? (
            <div
              className="jtrax-fade-in-up"
              style={{
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.bg,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
                  {t("addStudents")}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    setSearch("");
                  }}
                  aria-label={tCommon("close")}
                  style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: COLORS.textSecondary, padding: 0 }}
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchStudents")}
                aria-label={t("searchStudentsLabel")}
                style={fieldStyle}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto", marginTop: 10 }}>
                {addable.length === 0 && (
                  <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary, padding: "8px 10px" }}>
                    {t("allAdded")}
                  </span>
                )}
                {addable.map((student) => (
                  <ActionButton
                    key={student.id}
                    className="jt-find-row"
                    onClick={async () => {
                      try {
                        await create("attendance", {
                          student_id: student.id,
                          session_id: def.id,
                          check_in_time: new Date().toISOString(),
                        });
                      } catch (e) {
                        /* This used to swallow everything as "already added".
                           The server now also refuses a child who cannot
                           afford the session, and that is the one refusal the
                           desk has to hear — it names the balance and the
                           cost, and the fix is a top-up. */
                        showError(tCommon("checkInFailed"), e);
                      }
                      setSearch("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 9,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Avatar initials={initialsOf(student.name)} size={26} />
                    <span style={{ flex: 1, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>
                      {student.name}
                    </span>
                    <Icon name="plus" size={15} color={COLORS.blue} />
                  </ActionButton>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" className="jt-btn-ghost" style={ghostBtn} onClick={() => setAddOpen(true)}>
              <Icon name="usersPlus" size={15} /> {t("addStudent")}
            </button>
          )}
        </div>
      )}
    </PanelFrame>
  );
}

export function SessionPanel({ state, onClose }: { state: PanelState; onClose: () => void }) {
  if (!state) return null;
  if (state.mode === "create") return <CreateSession onClose={onClose} />;
  return <ViewClass def={state.def} onClose={onClose} />;
}
