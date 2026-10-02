"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useData } from "@/components/DataProvider";
import { useErrorToast } from "@/components/ErrorToast";
import { type ClassDef, type Student } from "@/lib/data";
import { clockOf, fmtDate, liveClasses, todayISO, toTodaysClasses } from "@/lib/live";
import { sessionFinished, useMinuteClock } from "@/lib/class-progress";
import { Icon } from "@/lib/icons";
import { classDotColor, COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import {
  ActionButton,
  AddButton,
  ConfirmDeleteModal,
  RowActions,
} from "../crud";
import {
  ContactActions,
  EmptyRow,
  equalTemplate,
  ExportButton,
  fieldStyle,
  FilterBar,
  InfoGrid,
  labelStyle,
  Modal,
  PageHeader,
  primaryButtonStyle,
  paginate,
  Pagination,
  SearchInput,
  SelectFilter,
  selectStyle,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";
import { MonthCalendar, type CalendarEntry } from "../calendar";
import { DeleteButton, DetailHeader, EditButton } from "../detail";
import { CardGrid, EmptyCards, EntityCard, ViewToggle } from "../view-mode";
import { useViewMode } from "@/lib/view-mode";
import { SessionPanel, type PanelState } from "../dashboard/SessionPanel";

/* The chevron is the one column that is not data, so it keeps a fixed
   width; the five data columns share the rest equally. */
const TEMPLATE = `${equalTemplate(5, 100)} 44px`;

/* The attendee rows in the detail panel: name takes the slack, the two times
   and the two actions size to themselves. Shared by the header and the rows
   so a column added to one cannot drift from the other. */
const ATTENDEE_GRID = "1fr auto auto auto auto";
const VIEWS = ["list", "card", "calendar"] as const;


/* The Others option's value. Not "" — that is All — and not a name a course
   could ever be given, because the filter compares it against real class ids. */
const OTHER_COURSES = "others";

/* The times are the whole reason this screen exists: Class History is where
   the office answers "when did this child arrive, and when did they leave".
   The detail panel used to show a row of names and nothing else. */
type Attendee = {
  attendanceId: string;
  studentId: string;
  name: string;
  timeIn: string;
  timeOut: string;
};

type HistoryRow = {
  key: string;
  id: string;
  classId: string;
  dateObj: Date;
  /** The raw `YYYY-MM-DD` the calendar buckets on; `date` is it formatted. */
  iso: string;
  date: string;
  className: string;
  time: string;
  startTime: string;
  endTime: string;
  status: string;
  attendees: Attendee[];
};

/** Brief student + guardian card for one attendee of a past session. */
function AttendeeModal({
  name,
  session,
  onClose,
}: {
  name: string;
  session: HistoryRow;
  onClose: () => void;
}) {
  const t = useTranslations("classHistory");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const tStudents = useTranslations("students");
  const { students } = useData();
  /* An attendance row can outlive the student it points at, so the profile
     block is conditional rather than assumed. */
  const student: Student | undefined = students.find((s) => s.name === name);
  const chip = student ? statusChipColors(student.status) : null;

  return (
    <Modal title={name} onClose={onClose} width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar initials={initialsOf(name)} size={52} />
          <div>
            <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: COLORS.text }}>{name}</div>
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              {student && chip && (
                <>
                  <Badge color={chip.color} bg={chip.bg}>{tStatus(student.status)}</Badge>
                  <Badge color={COLORS.blue} bg={COLORS.light}>
                    {tCommon("creditsCount", { count: student.credit })}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 10,
            background: COLORS.light,
            fontFamily: FONT,
            fontSize: 13.5,
            color: COLORS.text,
          }}
        >
          <ClassDot color={classDotColor(session.className)} />
          {t("attendedOn", { className: session.className, date: session.date, time: session.time })}
        </div>

        {student ? (
          <>
            <SectionTitle>{tStudents("studentSection")}</SectionTitle>
            <InfoGrid
              rows={[
                { label: tCommon("class"), value: student.className },
                { label: tCommon("branch"), value: student.branch },
                { label: tStudents("level"), value: student.level },
                { label: tStudents("creditsExpire"), value: student.expires },
              ]}
            />
            <SectionTitle>{tStudents("parentSection")}</SectionTitle>
            <InfoGrid
              rows={[
                { label: tCommon("name"), value: student.parentName },
                { label: tStudents("relation"), value: student.parentRelation },
                { label: tCommon("phone"), value: student.parentPhone },
                { label: tCommon("email"), value: student.parentEmail },
              ]}
            />
            <ContactActions
              phone={student.parentPhone}
              lineId={student.parentLineId}
              email={student.parentEmail}
            />
          </>
        ) : (
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, lineHeight: 1.6, color: COLORS.textSecondary }}>
            {t("noProfile", { name })}
          </p>
        )}
      </div>
    </Modal>
  );
}

/** Who was in the session, as removable chips, plus the way to add one more.
    Shared by the table's expanded row and the card view, which shows it
    open — a card has the room for it, a table row does not. */
function AttendeeChips({
  row,
  onView,
  onRemove,
  onAdd,
}: {
  row: HistoryRow;
  onView: (name: string) => void;
  onRemove: (attendanceId: string) => void;
  onAdd: () => void;
}) {
  const t = useTranslations("classHistory");
  return (
    <>
      {row.attendees.length === 0 && (
        <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
          {t("noAttendees")}
        </span>
      )}
      {row.attendees.map((a) => (
        <span
          key={a.attendanceId}
          className="jt-pick-chip"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 7px 5px 5px",
            borderRadius: 999,
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            fontFamily: FONT,
            fontSize: 13.5,
            color: COLORS.text,
          }}
        >
          <button
            type="button"
            title={t("viewAttendee", { name: a.name })}
            onClick={() => onView(a.name)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 13.5,
              color: COLORS.text,
            }}
          >
            <Avatar initials={initialsOf(a.name)} size={20} />
            {a.name}
          </button>
          <button
            type="button"
            aria-label={t("removeAttendee", { name: a.name })}
            onClick={() => onRemove(a.attendanceId)}
            style={{
              display: "inline-flex",
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              color: COLORS.textSecondary,
            }}
          >
            <Icon name="x" size={12} />
          </button>
        </span>
      ))}
      <button
        type="button"
        className="jt-pick-chip"
        onClick={onAdd}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 999,
          background: COLORS.surface,
          border: `1px dashed ${COLORS.border}`,
          fontFamily: FONT,
          fontSize: 13.5,
          fontWeight: 600,
          color: COLORS.blue,
          cursor: "pointer",
        }}
      >
        <Icon name="plus" size={12} color={COLORS.blue} /> {t("addAttendee")}
      </button>
    </>
  );
}

/** One session as a card: what it was, who was in it, and how to change both.
    The card view lists these; the calendar shows the ones on the chosen day. */
function SessionCard({
  row,
  onOpen,
  onEdit,
  onDelete,
}: {
  row: HistoryRow;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("classHistory");
  const tStatus = useTranslations("status");
  const chip = statusChipColors(row.status);
  return (
    <EntityCard
      onClick={onOpen}
      title={row.className}
      subtitle={`${row.date} · ${row.time}`}
      badges={
        <>
          <Badge color={chip.color} bg={chip.bg}>{tStatus(row.status)}</Badge>
          <Badge color={COLORS.blue} bg={COLORS.light}>
            {t("presentCount", { count: row.attendees.length })}
          </Badge>
        </>
      }
      actions={
        <RowActions
          label={t("sessionOn", { className: row.className, date: row.date })}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      }
    />
  );
}

/**
 * One session, in full: who attended, and the way to change that.
 *
 * The roster editor used to sit open on every card, which made a page of cards
 * a wall of chips and put a destructive control (remove from session) one
 * stray click away on a list you were only scanning.
 */
function SessionDetail({
  row,
  onClose,
  onEdit,
  onDelete,
  onViewAttendee,
  onRemoveAttendee,
  onCheckOutAttendee,
  onAddAttendee,
}: {
  row: HistoryRow;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewAttendee: (name: string) => void;
  onRemoveAttendee?: (attendanceId: string) => void;
  onCheckOutAttendee: (attendanceId: string) => Promise<void>;
  onAddAttendee?: () => void;
}) {
  const t = useTranslations("classHistory");
  const tStatus = useTranslations("status");
  
  const tCommon = useTranslations("common");
  const chip = statusChipColors(row.status);
  return (
    <Modal title={t("sessionDetail")} onClose={onClose} width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <DetailHeader
          avatar={
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 46,
                height: 46,
                borderRadius: 12,
                background: COLORS.light,
              }}
            >
              <Icon name="history" size={22} color={classDotColor(row.className)} />
            </span>
          }
          title={row.className}
          subtitle={`${row.date} · ${row.time}`}
          badges={
            <>
              <Badge color={chip.color} bg={chip.bg}>{tStatus(row.status)}</Badge>
              <Badge color={COLORS.blue} bg={COLORS.light}>
                {t("presentCount", { count: row.attendees.length })}
              </Badge>
            </>
          }
          actions={
            <>
              {onEdit && <EditButton onClick={onEdit} />}
              {onDelete && <DeleteButton onClick={onDelete} />}
            </>
          }
        />
        <div>
          <SectionTitle>{t("attendance")}</SectionTitle>
          {/* Names alone were all this showed, which left the one question
              Class History exists to answer — when each child arrived and when
              they left — unanswerable from the record of the session. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {row.attendees.length === 0 && (
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("noAttendees")}
              </span>
            )}
            {row.attendees.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: ATTENDEE_GRID,
                  gap: "0 12px",
                  alignItems: "center",
                  fontFamily: FONT,
                  fontSize: 12.5,
                  color: COLORS.textSecondary,
                  padding: "0 8px 4px",
                }}
              >
                <span>{tCommon("student")}</span>
                <span>{t("checkedInAt")}</span>
                <span>{t("dismissedAt")}</span>
                <span />
                <span />
              </div>
            )}
            {row.attendees.map((a) => (
              <div
                key={a.attendanceId}
                style={{
                  display: "grid",
                  gridTemplateColumns: ATTENDEE_GRID,
                  gap: "0 12px",
                  alignItems: "center",
                  padding: "7px 8px",
                  borderRadius: 9,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => onViewAttendee(a.name)}
                  style={{
                    justifySelf: "start",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: FONT,
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {a.name}
                </button>
                <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                  {a.timeIn}
                </span>
                {/* Blank would read as missing data; still in the room is the
                    normal state until the class ends. */}
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: 13,
                    color: a.timeOut ? COLORS.textSecondary : COLORS.blue,
                  }}
                >
                  {a.timeOut || t("stillInClass")}
                </span>
                {/* The dashboard's check-out button only reaches today's
                    register, so a child nobody dismissed before midnight was
                    stranded "still in class" for good. This is the same write,
                    reachable from the record that still shows them in the room.

                    Only on a row that has no check-out: one that does is a
                    finished afternoon, not a pending act — the same rule the
                    dashboard's tick-boxes follow. */}
                <span>
                  {!a.timeOut && (
                    <ActionButton
                      className="jt-chip"
                      busyLabel={tCommon("saving")}
                      ariaLabel={t("checkOutAttendee", { name: a.name })}
                      onClick={() => onCheckOutAttendee(a.attendanceId)}
                      style={{
                        padding: "4px 11px",
                        borderRadius: 999,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.surface,
                        color: COLORS.text,
                        fontFamily: FONT,
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 160ms ease",
                      }}
                    >
                      {t("checkOut")}
                    </ActionButton>
                  )}
                </span>
                {onRemoveAttendee && (
                  <ActionButton
                    onClick={async () => onRemoveAttendee(a.attendanceId)}
                    ariaLabel={t("removeAttendee", { name: a.name })}
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
            {onAddAttendee && (
              <span style={{ marginTop: 6 }}>
                <AddButton label={t("addAttendee")} onClick={onAddAttendee} />
              </span>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function ClassHistoryPage() {
  const t = useTranslations("classHistory");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { raw, students, batch, create, update, remove } = useData();
  const { showError } = useErrorToast();
  const [mode, setMode] = useViewMode("classhistory", VIEWS);
  /* The calendar opens on the current month; `weekendOnly` starts on because
     the timetable is a weekend one. */
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [weekendOnly, setWeekendOnly] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [attendee, setAttendee] = useState<{ name: string; session: HistoryRow } | null>(null);
  const [sessionDetail, setSessionDetail] = useState<HistoryRow | null>(null);
  const [deletingSession, setDeletingSession] = useState<HistoryRow | null>(null);
  const [addingTo, setAddingTo] = useState<HistoryRow | null>(null);
  const [addStudentId, setAddStudentId] = useState("");

  /* Real sessions, each with the students actually checked in to it. */
  const all: HistoryRow[] = useMemo(() => {
    /* Cancelled classes stay in the history, marked, and are the only ones
       that can be removed. */
    return [...raw.classSessions, ...(raw.cancelledSessions ?? [])]
      .map((session) => {
        const id = String(session["session_id"]);
        const cls = raw.classes.find((c) => String(c["class_id"]) === String(session["class_id"]));
        const date = String(session["session_date"] ?? "");
        const start = String(session["start_time"] ?? "");
        const end = String(session["end_time"] ?? "");
        const attendees: Attendee[] = raw.attendance
          .filter((a) => String(a["session_id"]) === id)
          .map((a) => {
            const student = students.find((s) => s.id === String(a["student_id"]));
            const out = String(a["check_out_time"] ?? "");
            return {
              attendanceId: String(a["attendance_id"]),
              studentId: String(a["student_id"]),
              name: student?.name ?? String(a["student_id"]),
              timeIn: clockOf(String(a["check_in_time"] ?? "")),
              /* Still in the room, rather than a blank that reads as missing
                 data — a session where nobody was dismissed is the normal
                 state until the class ends. */
              timeOut: out ? clockOf(out) : "",
            };
          });
        return {
          key: id,
          id,
          classId: String(session["class_id"] ?? ""),
          dateObj: new Date(date),
          iso: date,
          date: fmtDate(date),
          className: cls ? String(cls["name"] ?? "") : "—",
          time: start && end ? `${start} – ${end}` : start,
          startTime: start,
          endTime: end,
          status: session["cancelled_at"] ? "Cancelled" : String(session["session_status"] ?? ""),
          attendees,
        };
      })
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [raw.classSessions, raw.cancelledSessions, raw.classes, raw.attendance, students]);

  /* Live courses by id, which is also what the filter matches on. By name was
     near enough until two courses shared one — then a class of the retired
     "Saturday Camp" answered a filter for the live one. */
  const liveCourseIds = useMemo(
    () => new Set(liveClasses({ classes: raw.classes }).map((c) => String(c["class_id"]))),
    [raw.classes],
  );

  /**
   * Retired courses are not offered by name.
   *
   * The Academy screen takes a retired course off every other list — the
   * Students filter has always used `classFilterOptions`, which drops them —
   * and this one was reading `raw.classes` straight, so it was the single
   * place in the console still presenting a retired course as a thing you
   * could pick. On an academy that has retired a few, most of the filter was
   * courses nobody can enrol in.
   *
   * They cannot simply go, though: their classes are still in the history and
   * always will be, because a retired course keeps its past
   * ([[0007-retire-a-row-instead-of-deleting-it]]). So they collect under one
   * Others entry — findable, without every dead name having its own line.
   */
  const classOptions = useMemo(() => {
    const options = [
      { value: "", label: tCommon("allClasses") },
      ...liveClasses({ classes: raw.classes }).map((c) => ({
        value: String(c["class_id"]),
        label: String(c["name"] ?? ""),
      })),
    ];
    /* Only when something is actually in it. An academy that has never retired
       a course would otherwise get an Others that always finds nothing. */
    if (all.some((row) => !liveCourseIds.has(row.classId))) {
      options.push({ value: OTHER_COURSES, label: t("otherCourses") });
    }
    return options;
  }, [raw.classes, all, liveCourseIds, t, tCommon]);

  /* Add and Edit open the dashboard's own class panel, so a class is made
     and changed the same way everywhere. */
  const [panel, setPanel] = useState<PanelState>(null);
  function openEdit(row: HistoryRow) {
    const def =
      toTodaysClasses(raw, row.iso).find((c) => c.id === row.id) ??
      ({
        id: row.id, classId: row.classId, date: row.iso, start: row.startTime, category: "",
        name: row.className, time: row.time, status: "Finished", students: [], more: 0,
        teacher: "—", room: "—", roster: [],
      } satisfies ClassDef);
    setPanel({ mode: "view", def });
  }

  /* The dashboard's line: once a class is over it is read-only — no edit, no
     cancel, no one added or removed. Cancelled ones are only removable. */
  const now = useMinuteClock();
  const today = todayISO();
  const isFinished = (row: HistoryRow) => sessionFinished(row.iso, row.endTime, row.status, now, today);
  const canEdit = (row: HistoryRow) => row.status !== "Cancelled" && !isFinished(row);

  /**
   * Close out an attendance row from the history, days after the fact.
   *
   * The dashboard is the only other place that writes `check_out_time`, and it
   * is built around `todayISO()` — today's sessions, today's register. Once the
   * date turns over, a child the desk forgot to check out has no screen left
   * that offers the act, and the record keeps them in the room forever.
   *
   * The stamp is the moment the button is pressed, not the class's end time:
   * the desk asked for the same behaviour the dashboard already has, so the
   * column means one thing everywhere — when someone said this child had left.
   */
  async function checkOutAttendee(attendanceId: string) {
    try {
      await update("attendance", attendanceId, { check_out_time: new Date().toISOString() });
    } catch (e) {
      /* A write here refetches every collection, so a refusal that said
         nothing would read as the panel having simply ignored the press. */
      showError(tCommon("saveFailed"), e);
    }
  }

  /* Attendance rows reference the session, so they go before it — batched, so
     a session with twenty attendees costs one refetch rather than twenty-one. */
  async function deleteSession(row: HistoryRow) {
    await batch(async () => {
      for (const a of row.attendees) await remove("attendance", a.attendanceId);
      await remove("class-sessions", row.id);
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTime = from ? new Date(from).getTime() : null;
    const toTime = to ? new Date(to).getTime() : null;
    return all.filter((row) => {
      /* Others is every class whose course the academy has retired — and the
         handful whose course row has gone missing entirely, which land in the
         same place for the same reason: there is no live name to file them
         under. */
      if (classFilter === OTHER_COURSES) {
        if (liveCourseIds.has(row.classId)) return false;
      } else if (classFilter && row.classId !== classFilter) return false;
      if (q && !row.className.toLowerCase().includes(q) && !row.attendees.some((a) => a.name.toLowerCase().includes(q)))
        return false;
      const t = row.dateObj.getTime();
      if (fromTime !== null && t < fromTime) return false;
      if (toTime !== null && t > toTime) return false;
      return true;
    });
  }, [all, search, classFilter, from, to, liveCourseIds]);

  const { pageRows, totalPages, page: current } = paginate(filtered, page);

  /* The calendar shows whatever the filter bar has narrowed to, so a class
     filter applies to the month grid exactly as it does to the table. */
  const calendarEntries: CalendarEntry[] = useMemo(
    () =>
      filtered.map((row) => ({
        key: row.key,
        day: row.iso,
        label: row.className,
        sub: row.time,
        tone: classDotColor(row.className),
      })),
    [filtered],
  );

  const daySessions = useMemo(
    () => (selectedDay ? filtered.filter((row) => row.iso === selectedDay) : []),
    [filtered, selectedDay],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title={t("title")}
        sub={t("sub")}
        action={
          <>
            <ExportButton
              filename="class-history"
              columns={[tCommon("date"), tCommon("class"), t("time"), t("attendance")]}
              rows={() => filtered.map((row) => [row.date, row.className, row.time, row.attendees.length])}
            />
            <AddButton label={t("addSession")} onClick={() => setPanel({ mode: "create", pickDay: true })} />
          </>
        }
      />

      <FilterBar>
        <SearchInput
          style={{ flex: "1 1 220px" }}
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder={t("searchPlaceholder")}
          label={t("searchLabel")}
        />
        <SelectFilter
          value={classFilter}
          onChange={(v) => {
            setClassFilter(v);
            setPage(0);
          }}
          options={classOptions}
          label={t("filterByClass")}
        />
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(0);
          }}
          aria-label={tCommon("fromDate")}
          style={{ ...fieldStyle, width: "auto", borderRadius: 999, padding: "9px 14px" }}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(0);
          }}
          aria-label={tCommon("toDate")}
          style={{ ...fieldStyle, width: "auto", borderRadius: 999, padding: "9px 14px" }}
        />
        <ViewToggle value={mode} onChange={setMode} options={VIEWS} style={{ marginLeft: "auto" }} />
      </FilterBar>

      {mode === "calendar" ? (
        <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <SectionTitle>{t("calendarTitle")}</SectionTitle>
            {/* Weekend-only is the default: the timetable is a weekend one, and
                five empty weekday columns push the two that matter into a
                quarter of the width. */}
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 2, padding: 3, borderRadius: 999, border: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
              {([
                { value: true, label: t("weekendOnly") },
                { value: false, label: t("allDays") },
              ] as const).map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  aria-pressed={weekendOnly === option.value}
                  onClick={() => setWeekendOnly(option.value)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: "none",
                    background: weekendOnly === option.value ? COLORS.light : "transparent",
                    color: weekendOnly === option.value ? COLORS.blue : COLORS.textSecondary,
                    fontFamily: FONT,
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </span>
          </div>

          <MonthCalendar
            month={month}
            onMonthChange={(next) => {
              setMonth(next);
              setSelectedDay(null);
            }}
            entries={calendarEntries}
            weekendOnly={weekendOnly}
            selected={selectedDay}
            onSelectDay={setSelectedDay}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {selectedDay === null ? (
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("pickADay")}
              </p>
            ) : daySessions.length === 0 ? (
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("noSessionsOn", { date: fmtDate(selectedDay) })}
              </p>
            ) : (
              <CardGrid min={300}>
                {daySessions.map((row) => (
                  <SessionCard
                    key={row.key}
                    row={row}
                    onOpen={() => setSessionDetail(row)}
                    onEdit={canEdit(row) ? () => openEdit(row) : undefined}
                    onDelete={row.status === "Cancelled" ? () => setDeletingSession(row) : undefined}
                  />
                ))}
              </CardGrid>
            )}
          </div>
        </Card>
      ) : mode === "card" ? (
        <>
          <CardGrid min={300}>
            {pageRows.length === 0 && <EmptyCards>{t("empty")}</EmptyCards>}
            {pageRows.map((row) => (
              <SessionCard
                key={row.key}
                row={row}
                onOpen={() => setSessionDetail(row)}
                onEdit={canEdit(row) ? () => openEdit(row) : undefined}
                onDelete={row.status === "Cancelled" ? () => setDeletingSession(row) : undefined}
              />
            ))}
          </CardGrid>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </>
      ) : (
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table columns={[tCommon("date"), tCommon("class"), t("time"), t("attendance"), tCommon("action"), ""]} template={TEMPLATE} minWidth={880}>
          {pageRows.length === 0 && <EmptyRow>{t("empty")}</EmptyRow>}
          {/* The row opens the session rather than unfolding underneath it: the
              roster is an editor, and an editor belongs on a screen you chose
              to open, not under a row you were scanning past. */}
          {pageRows.map((row) => {
            /* A cancelled class stays in the table, faded, with a tag after its
               name rather than a status column of its own. */
            const cancelled = row.status === "Cancelled";
            const fade = cancelled ? { opacity: 0.6 } : undefined;
            return (
            <TableRow key={row.key} template={TEMPLATE} onClick={() => setSessionDetail(row)}>
              <span style={{ color: COLORS.textSecondary, ...fade }}>{row.date}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", ...fade }}>
                  <ClassDot color={classDotColor(row.className)} />
                  {row.className}
                </span>
                {cancelled && (
                  <Badge color={COLORS.danger} bg={COLORS.dangerBg}>{tStatus("Cancelled")}</Badge>
                )}
              </span>
              <span style={{ color: COLORS.textSecondary, ...fade }}>{row.time}</span>
              <span style={{ color: COLORS.textSecondary, ...fade }}>
                {cancelled ? "—" : t("presentCount", { count: row.attendees.length })}
              </span>
              <RowActions
                label={t("sessionOn", { className: row.className, date: row.date })}
                onEdit={canEdit(row) ? () => openEdit(row) : undefined}
                onDelete={row.status === "Cancelled" ? () => setDeletingSession(row) : undefined}
              />
              <span style={{ display: "inline-flex", justifySelf: "end", color: COLORS.textSecondary }}>
                <Icon name="chevronRight" size={16} />
              </span>
            </TableRow>
            );
          })}
        </Table>
        <Pagination page={current} totalPages={totalPages} onChange={setPage} />
      </Card>
      )}

      {/* Read from `all`, not the captured row: adding or removing an attendee
          refetches, and the dialog has to show what is there now. */}
      {sessionDetail && (
        <SessionDetail
          row={all.find((r) => r.key === sessionDetail.key) ?? sessionDetail}
          onClose={() => setSessionDetail(null)}
          onEdit={canEdit(sessionDetail) ? () => { openEdit(sessionDetail); setSessionDetail(null); } : undefined}
          onDelete={sessionDetail.status === "Cancelled" ? () => { setDeletingSession(sessionDetail); setSessionDetail(null); } : undefined}
          onViewAttendee={(name) => setAttendee({ name, session: sessionDetail })}
          onRemoveAttendee={canEdit(sessionDetail) ? (id) => remove("attendance", id) : undefined}
          onCheckOutAttendee={checkOutAttendee}
          onAddAttendee={canEdit(sessionDetail) ? () => { setAddingTo(sessionDetail); setAddStudentId(""); } : undefined}
        />
      )}

      {attendee && (
        <AttendeeModal
          name={attendee.name}
          session={attendee.session}
          onClose={() => setAttendee(null)}
        />
      )}

      <SessionPanel state={panel} onClose={() => setPanel(null)} />

      {deletingSession && (
        <ConfirmDeleteModal
          what={t("sessionOn", { className: deletingSession.className, date: deletingSession.date })}
          note={t("sessionDeleteNote")}
          onClose={() => setDeletingSession(null)}
          onConfirm={() => deleteSession(deletingSession)}
        />
      )}

      {addingTo && (
        <Modal
          title={t("addAttendee")}
          width={420}
          onClose={() => setAddingTo(null)}
          footer={
            <ActionButton
              className="jt-btn-primary"
              style={primaryButtonStyle}
              disabled={!addStudentId}
              busyLabel={tCommon("saving")}
              onClick={async () => {
                /* check_in_time is what marks them present; the session's own
                   date carries the when, so the clock only needs the time. */
                await create("attendance", {
                  student_id: addStudentId,
                  session_id: addingTo.id,
                  check_in_time: new Date().toISOString(),
                });
                setAddingTo(null);
              }}
            >
              {tCommon("add")}
            </ActionButton>
          }
        >
          <label htmlFor="ch-add-student" style={labelStyle}>
            {tCommon("student")}
          </label>
          <select
            id="ch-add-student"
            value={addStudentId}
            onChange={(e) => setAddStudentId(e.target.value)}
            style={selectStyle}
          >
            <option value="">—</option>
            {students
              .filter((s) => !addingTo.attendees.some((a) => a.studentId === s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </Modal>
      )}
    </div>
  );
}
