"use client";

import { api, ApiError } from "@/lib/api";
import { cancelFailure } from "@/lib/cancel-class";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { busyStudents } from "@/lib/class-clash";
import { classStatusNow, useMinuteClock } from "@/lib/class-progress";
import { type ClassDef } from "@/lib/data";
import { activeEnrolments, fmtCredits, fmtDate, liveClasses, todayISO, toTodaysClasses } from "@/lib/live";
import {
  creditCost,
  defaultEndFor,
  draftProblem,
  endAfter,
  hourOf,
  hourOptions,
  joinClock,
  lengthMinutes,
  longestFrom,
  minuteOf,
  minuteOptions,
  MIN_SESSION_MINUTES,
  notBefore,
  nowClock,
} from "@/lib/session-draft";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
/* Shared with the rest of the forms so the panel's fields keep the same box —
   this file used to carry its own near-identical copies. */
import { ActionButton } from "../crud";
import { useData } from "../DataProvider";
import { fieldStyle, labelStyle, Req, selectStyle } from "../page-kit";
import { Avatar } from "../ui";
import { useErrorToast } from "../ErrorToast";
import { DurationField } from "./DurationField";

/* `day` is the dashboard's chosen date — a later one schedules the class ahead. */
export type PanelState =
  /* `pickDay`: Class History's Add — the date is chosen on the form. */
  | { mode: "create"; day?: string; pickDay?: boolean }
  | { mode: "view"; def: ClassDef }
  | null;

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

/* Outlined rather than filled: calling a class off is destructive but it is
   not the panel's main action, and a solid red button beside a solid blue one
   reads as the pair of equals it is not. */
const dangerBtn: React.CSSProperties = {
  ...ghostBtn,
  borderColor: COLORS.danger,
  color: COLORS.danger,
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
function CreateSession({
  day: chosenDay,
  pickDay = false,
  onClose,
}: {
  day?: string;
  pickDay?: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("session");
  const [pickedDay, setPickedDay] = useState(chosenDay ?? todayISO());
  const day = pickDay ? pickedDay : chosenDay ?? todayISO();
  const isToday = day === todayISO();
  const tCommon = useTranslations("common");
  const { showError } = useErrorToast();
  const { raw, students, create, batch, creditRules } = useData();

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

  /* Opens on now, running for the default length, rather than on two empty
     selects. Nearly every class is created as it is about to start or just
     after it has, so the empty form asked the desk to re-enter the one thing
     the computer already knew. Both stay fully editable.

     Read once at mount, not at render: the panel would otherwise re-date
     itself under the desk mid-form. */
  const [start, setStart] = useState(nowClock);
  const [end, setEnd] = useState(() => defaultEndFor(nowClock()));
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  /* Today's form offers now and later only — a class that has already been
     and gone is not created from the dashboard. Follows the clock, so a panel
     left open does not keep offering a time that has since passed. A later
     day is open all day. */
  const clock = useMinuteClock();
  const earliest = isToday ? nowClock(clock) : "";
  const hours = useMemo(() => hourOptions(earliest), [earliest]);
  const minutes5 = useMemo(() => minuteOptions(undefined, hourOf(start), earliest), [start, earliest]);
  const problem = draftProblem({ classCount: classes.length, classId, start, end, earliest });
  const minutes = lengthMinutes(start, end);
  const cost = creditCost(start, end);

  /**
   * Choosing a start keeps the length the desk already picked and slides the
   * end along with it — that is the whole point of asking for a length. It
   * only falls back to the default when there was no usable length yet, or
   * when the one chosen no longer fits inside the day.
   */
  function chooseStart(chosen: string) {
    /* Picking the current hour keeps the old minutes, which may already be
       past — land on now instead. */
    const value = notBefore(chosen, earliest);
    setStart(value);
    const keep = minutes >= MIN_SESSION_MINUTES && minutes <= longestFrom(value);
    setEnd(keep ? endAfter(value, minutes) : defaultEndFor(value));
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
  /* Already in another class at an overlapping time that day. They stay in
     the list — greyed, with where they are — rather than vanishing, so the
     desk can see why a child cannot be ticked. */
  const elsewhere = useMemo(() => busyStudents(raw, day, start, end), [raw, day, start, end]);
  /* Expired credit or a balance that would cross the academy's negative
     limit refuses check-in outright, so these ids can never be picked — not
     even by a tick made before the limit or the class changed. */
  const blockedIds = useMemo(
    () =>
      new Set(
        eligible
          .filter(
            (s) =>
              elsewhere.has(s.id) ||
              s.status === "Expired" ||
              (cost > 0 && s.credit - cost < -creditRules.maxNegativeCredit),
          )
          .map((s) => s.id),
      ),
    [eligible, elsewhere, cost, creditRules.maxNegativeCredit],
  );
  const picked = selected.filter((id) => eligibleIds.has(id) && !blockedIds.has(id));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const reason: Record<NonNullable<typeof problem>, string> = {
    noClasses: t("noClasses"),
    noClass: t("chooseAClass"),
    startPassed: t("startPassed"),
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
      /* A class that starts later is Scheduled, and its students are booked
         rather than checked in: nothing is charged until it starts, when the
         server checks them in (classstart.go in the backend). */
      const startsLater = !isToday || start > nowClock(new Date());
      await batch(async () => {
        const session = await create("class-sessions", {
          class_id: classId,
          session_date: day,
          start_time: start,
          end_time: end,
          session_status: startsLater ? "Scheduled" : "Ongoing",
        });
        for (const studentId of picked) {
          if (startsLater) {
            await create("session-bookings", { student_id: studentId, session_id: session.session_id });
          } else {
            await create("attendance", {
              student_id: studentId,
              session_id: session.session_id,
              check_in_time: new Date().toISOString(),
            });
          }
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
      title={isToday ? t("createTitle") : t("createTitleOn", { date: fmtDate(day) })}
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

          {pickDay && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="jtrax-class-day">{tCommon("date")}<Req /></label>
              <input
                id="jtrax-class-day"
                type="date"
                value={pickedDay}
                /* Today or later, as on the dashboard: a class that is
                   already over is not created. */
                min={todayISO()}
                onChange={(e) => e.target.value && e.target.value >= todayISO() && setPickedDay(e.target.value)}
                style={fieldStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="jtrax-class-name">{t("className")}<Req /></label>
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
              <span style={labelStyle}>{t("startTime")}<Req /></span>
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
              <span style={labelStyle}>{t("length")}<Req /></span>
              {/* A length, not a second clock time. The office decides a class
                  runs for an hour and a half from four — not that it ends at
                  17:30. */}
              <DurationField
                idPrefix="jtrax-length"
                minutes={minutes}
                max={longestFrom(start)}
                disabled={!start}
                onChange={(m) => setEnd(endAfter(start, m))}
              />
            </div>
          </div>

          {/* When it ends, and what it costs — both worked out, both said out
              loud before the desk commits. A family should not learn what an
              afternoon cost afterwards, and a length is only reassuring if you
              can see the time it lands on. */}
          <p style={{ margin: "0 0 18px", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
            {minutes > 0
              ? `${t("endsAt", { time: end })} · ${t("lengthAndCost", { minutes, credits: fmtCredits(cost) })}`
              : t("atLeastHalfAnHour")}
          </p>

          <>
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
          </>
        </div>

        {/* Ticking students checks them in when the class is running now, or
            books them on a class that starts later — free until it starts. */}
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
              const clashWith = elsewhere.get(student.id);
              const clash = clashWith !== undefined;
              const expired = !clash && student.status === "Expired";
              const insufficient = !clash && !expired && blockedIds.has(student.id);
              const blocked = clash || expired || insufficient;
              /* Short by the time the session is priced, but still within the
                 academy's negative limit. A warning, not a refusal: the
                 academy lets a child attend on credit and settle later, so
                 this marks who to chase rather than turning them away at the
                 door. */
              const short = !blocked && cost > 0 && student.credit < cost;
              const reason = clash
                ? t("inOtherClassTitle", { className: clashWith })
                : expired
                ? t("creditsExpiredTitle")
                : insufficient
                  ? t("insufficientCreditsTitle", { credits: fmtCredits(student.credit) })
                  : short
                    ? t("willGoNegative", { credits: fmtCredits(student.credit) })
                    : undefined;
              return (
                <label
                  key={student.id}
                  className="jt-find-row"
                  title={reason}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 9,
                    cursor: blocked ? "not-allowed" : "pointer",
                    opacity: blocked ? 0.6 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={picked.includes(student.id)}
                    onChange={() => toggle(student.id)}
                    disabled={blocked}
                    style={{ accentColor: COLORS.blue, width: 15, height: 15 }}
                  />
                  <Avatar initials={initialsOf(student.name)} size={26} />
                  <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>
                    {student.name}
                  </span>
                  {blocked && (
                    <span style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: COLORS.danger }}>
                      {clash
                        ? t("inOtherClass", { className: clashWith })
                        : expired
                          ? t("creditsExpired")
                          : t("insufficientCredits")}
                    </span>
                  )}
                  {/* What they have to spend, next to what this will cost. */}
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: 12.5,
                      fontWeight: short || blocked ? 600 : 400,
                      color: short || blocked ? COLORS.danger : COLORS.textSecondary,
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
  const { students, raw, create, remove, update, todaysClasses, refresh, creditRules } = useData();
  const { showError } = useErrorToast();
  /* Read from the live list for the class's own day — which is not always
     today, now that the dashboard can show another date. */
  const day = opened.date ?? todayISO();
  const dayClasses = day === todayISO() ? todaysClasses : toTodaysClasses(raw, day);
  const def = dayClasses.find((c) => c.id && c.id === opened.id) ?? opened;
  /* Ticking, not read once at open: the desk can leave this panel open past
     the end of the lesson, and editing has to stop the moment the clock says
     so — not only the next time the panel happens to remount. */
  const now = useMinuteClock();
  /* session_status stays Ongoing until someone sets it otherwise, so the
     clock and the class's day decide what it reads as. Re-timing and
     cancelling are open until it is over — a class on a later day included,
     so a scheduled one can still be moved or called off. Adding a student is
     a check-in, so it is only for a class running now. */
  const shownStatus = classStatusNow(def, now, todayISO());
  const editable = shownStatus !== "Finished" && shownStatus !== "Cancelled";
  /* Running now: a check-in, charged. Not started yet: a booking, free until
     the start. */
  const canAddStudents = shownStatus === "Ongoing" || shownStatus === "Scheduled";
  const booking = shownStatus === "Scheduled";
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  /* `ClassDef.time` is a display string, so the clock times come from the row
     it was built from — the length has to be arithmetic, not parsed English. */
  const row = raw.classSessions.find((s) => String(s.session_id) === def.id);
  const startClock = String(row?.start_time ?? "");
  const endClock = String(row?.end_time ?? "");
  const runningMinutes = lengthMinutes(startClock, endClock);
  /* What joining this session, right now, would cost a latecomer — the same
     figure the check-in refusal on the backend works out from the clock. */
  const cost = creditCost(startClock, endClock);

  /**
   * Re-length a class that is already running.
   *
   * Only `end_time` is sent: the backend's `storeSessionHours` recomputes
   * `duration_hours` from the clock and then re-charges every attendance at
   * the new length, so a class extended by half an hour costs each child
   * half a credit more without the console working any of that out.
   */
  async function changeLength(minutes: number) {
    const next = endAfter(startClock, minutes);
    if (!next || !def.id) return;
    setBusy(true);
    try {
      await update("class-sessions", def.id, { end_time: next });
    } catch (e) {
      showError(t("lengthChangeFailed"), e);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Call the class off.
   *
   * One request to the backend, which refunds every check-in, removes the
   * attendance and the session in one transaction, and then tells the parents
   * of every child who was due at the class. It used to be several deletes from
   * here, which refunded the credits but told nobody.
   */
  async function cancelClass() {
    if (!def.id) return;
    setBusy(true);
    try {
      await api.post(`class-sessions/${def.id}/cancel`, {});
    } catch (e) {
      const why = cancelFailure(e);
      /* Already gone is the outcome the desk asked for — say nothing, just
         catch up with whoever cancelled it first. */
      if (why !== "gone") {
        showError(
          why === "other" && e instanceof ApiError && e.message
            ? t("cancelFailedBecause", { reason: e.message })
            : t(`cancelFailed_${why}`),
          e,
        );
        setBusy(false);
        setConfirmCancel(false);
        return;
      }
    }
    /* The class is off. A refresh that fails now is a stale screen, not a
       failed cancellation — close regardless; the next refresh catches up. */
    await refresh().catch(() => {});
    onClose();
  }
  /* The roster comes from attendance, so adding or removing someone writes a
     row rather than editing a local array that the next refresh discards. */
  const roster = def.roster;
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const status = statusChipColors(shownStatus);

  /* Latecomers are the point of this panel: a student who turns up after the
     session started is added here. Only this class's own children, though —
     the list used to offer every student in the academy, so a child could be
     added to a session of a class they were never enrolled in, where their
     attendance could not be charged to anything. */
  const enrolledHere = new Set(
      activeEnrolments(raw.enrollments)
        .filter((e) => String(e["class_id"] ?? "") === String(def.classId ?? ""))
        .map((e) => String(e["student_id"])),
    );
  const addQuery = search.trim().toLowerCase();
  /* Same rule as creating a class: a child already in another class at an
     overlapping time stays listed, greyed, with that class's name. */
  const elsewhere = busyStudents(raw, day, startClock, String(row?.end_time ?? ""), def.id);
  const addable = students.filter(
    (student) =>
      enrolledHere.has(student.id) &&
      !roster.includes(student.name) &&
      !(def.booked ?? []).includes(student.name) &&
      (!addQuery || student.name.toLowerCase().includes(addQuery)),
  );

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
          {tStatus(shownStatus)}
        </span>
        {!editable && (
          <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
            {t("readOnly")}
          </span>
        )}
      </div>

      {/* A class that is running can still be re-timed and called off. Both
          are hidden once it is finished: the length is then a record of what
          happened, and there is nothing left to cancel. */}
      {/* Cancelling does not depend on the length: a class with no readable
          times, or one shorter than the half-hour a new class must run, can
          still be called off. Only the length control needs a length. */}
      {editable && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            padding: "12px 14px",
            marginBottom: 18,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
          }}
        >
          {runningMinutes > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 9, minWidth: 0 }}>
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary, whiteSpace: "nowrap", paddingTop: 2 }}>
                {t("length")}
              </span>
              <DurationField
                idPrefix="jtrax-running-length"
                minutes={runningMinutes}
                max={longestFrom(startClock)}
                disabled={busy}
                onChange={changeLength}
              />
            </div>
          ) : (
            <span />
          )}

          {confirmCancel ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                {t("cancelConfirm", { count: roster.length + (def.booked?.length ?? 0) })}
              </span>
              <button type="button" style={ghostBtn} disabled={busy} onClick={() => setConfirmCancel(false)}>
                {tCommon("close")}
              </button>
              <button type="button" style={dangerBtn} disabled={busy} onClick={cancelClass}>
                {busy ? tCommon("saving") : t("cancelConfirmYes")}
              </button>
            </span>
          ) : (
            <button type="button" style={dangerBtn} disabled={busy} onClick={() => setConfirmCancel(true)}>
              {t("cancelClass")}
            </button>
          )}
        </div>
      )}

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

      {(def.booked?.length ?? 0) > 0 && (
        <BookedList
          booked={def.booked ?? []}
          sessionId={def.id ?? ""}
          editable={editable}
        />
      )}

      {canAddStudents && (
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
                {addable.map((student) => {
                  const clashWith = elsewhere.get(student.id);
                  const clash = clashWith !== undefined;
                  const expired = !clash && student.status === "Expired";
                  const insufficient =
                    !clash && !expired && cost > 0 && student.credit - cost < -creditRules.maxNegativeCredit;
                  const blocked = clash || expired || insufficient;
                  return (
                    <ActionButton
                      key={student.id}
                      className="jt-find-row"
                      disabled={blocked}
                      title={
                        clash
                          ? t("inOtherClassTitle", { className: clashWith })
                          : expired
                          ? t("creditsExpiredTitle")
                          : insufficient
                            ? t("insufficientCreditsTitle", { credits: fmtCredits(student.credit) })
                            : undefined
                      }
                      onClick={async () => {
                        try {
                          if (booking) {
                            await create("session-bookings", { student_id: student.id, session_id: def.id });
                          } else {
                            await create("attendance", {
                              student_id: student.id,
                              session_id: def.id,
                              check_in_time: new Date().toISOString(),
                            });
                          }
                        } catch (e) {
                          /* The server itself refuses an expired or
                             over-the-limit check-in now (chargeAttendance()
                             in the backend's credits.go), so this UI-level
                             disable is a courtesy, not the only guard — a
                             race or a stale list still surfaces the server's
                             own message here rather than swallowing it. */
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
                        cursor: blocked ? "not-allowed" : "pointer",
                        opacity: blocked ? 0.6 : 1,
                        textAlign: "left",
                      }}
                    >
                      <Avatar initials={initialsOf(student.name)} size={26} />
                      <span style={{ flex: 1, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>
                        {student.name}
                      </span>
                      {blocked ? (
                        <span style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: COLORS.danger }}>
                          {clash
                            ? t("inOtherClass", { className: clashWith })
                            : expired
                              ? t("creditsExpired")
                              : t("insufficientCredits")}
                        </span>
                      ) : (
                        <Icon name="plus" size={15} color={COLORS.blue} />
                      )}
                    </ActionButton>
                  );
                })}
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
  if (state.mode === "create") return <CreateSession day={state.day} pickDay={state.pickDay} onClose={onClose} />;
  return <ViewClass def={state.def} onClose={onClose} />;
}


/**
 * Who is booked on a class that has not started. Not checked in and not
 * charged: the server checks each one in at the start. A booking it could not
 * check in — the credits had expired, say — stays here with the reason.
 */
function BookedList({ booked, sessionId, editable }: { booked: string[]; sessionId: string; editable: boolean }) {
  const t = useTranslations("session");
  const { students, raw, remove } = useData();
  return (
    <div style={{ marginTop: 18 }}>
      <h3 style={{ margin: "0 0 4px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
        {t("bookedCount", { count: booked.length })}
      </h3>
      <p style={{ margin: "0 0 12px", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
        {t("bookedHelp")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 9 }}>
        {booked.map((name) => {
          const student = students.find((s) => s.name === name);
          const row = (raw.sessionBookings ?? []).find(
            (b) => String(b.session_id) === sessionId && String(b.student_id) === student?.id,
          );
          const problem = row?.failed_reason ? String(row.failed_reason) : "";
          return (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "9px 11px",
                borderRadius: 10,
                border: `1px dashed ${problem ? COLORS.danger : COLORS.border}`,
              }}
            >
              <Avatar initials={initialsOf(name)} size={28} />
              <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>
                {name}
                {problem && (
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.danger }}>
                    {t("bookingProblem", { reason: problem })}
                  </span>
                )}
              </span>
              {editable && row && (
                <ActionButton
                  onClick={async () => {
                    await remove("session-bookings", String(row.booking_id)).catch(() => {});
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
          );
        })}
      </div>
    </div>
  );
}
