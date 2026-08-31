/**
 * Adapter between jtrax-backend rows (snake_case, ISO dates, numeric money)
 * and the console's display types from lib/data.ts (formatted strings).
 * All joins happen here so the page components keep their existing shapes.
 */
import type {
  AdminPerson, Announcement, CheckinDef, ClassDef, ParentPerson, Payment,
  Student, Tournament, Participant,
} from "./data";
import { MONTH_SHORT } from "./theme";
import { DEFAULT_CREDIT_RULES, RULE_KEYS, type CreditRules, type TrendPoint } from "./derive";
import type { JtraxRole } from "./theme";

/* ---- raw backend row shapes (only the fields we read) ---- */
export type Row = Record<string, unknown>;
const s = (r: Row, k: string) => (r[k] as string | null) ?? "";
const n = (r: Row, k: string) => Number(r[k] ?? 0);

export type LiveCollections = {
  students: Row[];
  parents: Row[];
  parentContacts: Row[];
  studentParents: Row[];
  classes: Row[];
  classSessions: Row[];
  attendance: Row[];
  enrollments: Row[];
  creditTransactions: Row[];
  creditPackages: Row[];
  payments: Row[];
  teachers: Row[];
  admins: Row[];
  accounts: Row[];
  announcements: Row[];
  tournaments: Row[];
  tournamentCategories: Row[];
  tournamentRegistrations: Row[];
  practiceActivities: Row[];
  systemConfig: Row[];
};

export function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function fmtTHB(amount: number): string {
  return `${new Intl.NumberFormat("en-US").format(amount)} THB`;
}

/**
 * A stored date as `<input type="date">` will actually show it.
 *
 * That control accepts exactly `YYYY-MM-DD` and silently renders **blank** for
 * anything else — no warning, no fallback, just an empty field over a date the
 * database is holding. Every other reader of `date_of_birth` is forgiving
 * (`new Date` takes a timestamp, a slashed date, a space instead of a T), so a
 * row imported in one of those shapes looks fine everywhere and looks *unset*
 * in the one place the office goes to change it. Which reads, correctly, as a
 * field that cannot be edited.
 *
 * Anything unparseable comes back as "", because a date input cannot show it
 * either and an empty field at least invites a real answer.
 */
export function toDateInput(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  /* A leading ISO date with a time or timezone glued on: take it as written
     rather than through `new Date`, which would shift 2011-05-02T00:00:00Z
     back a day for anyone west of Greenwich. */
  const iso = /^(\d{4}-\d{2}-\d{2})[T ]/.exec(value);
  if (iso) return iso[1];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  /* Local getters, to match the calendar the person is looking at. */
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function age(dobISO: string): number {
  if (!dobISO) return 0;
  const dob = new Date(dobISO);
  const now = new Date();
  let a = now.getFullYear() - dob.getFullYear();
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) a--;
  return a;
}

/** The thresholds the academy saved, or the defaults until it saves any.
    Read from the same collection everything else is, so the status on a row,
    the dashboard's counts and the Settings screen cannot drift apart. */
export function creditRulesOf(c: LiveCollections): CreditRules {
  const read = (key: string, fallback: number) => {
    const row = c.systemConfig.find((r) => r["config_key"] === key);
    const value = Number(row?.["config_value"]);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    lowCredit: read(RULE_KEYS.lowCredit, DEFAULT_CREDIT_RULES.lowCredit),
    expiringDays: read(RULE_KEYS.expiringDays, DEFAULT_CREDIT_RULES.expiringDays),
    inactiveDays: read(RULE_KEYS.inactiveDays, DEFAULT_CREDIT_RULES.inactiveDays),
    certSessions: read(RULE_KEYS.certSessions, DEFAULT_CREDIT_RULES.certSessions),
  };
}

/**
 * The one place a student's condition is decided. Ordered worst-first, so a
 * student has exactly one status and the dashboard's buckets can simply group
 * by it. The thresholds used to be hard-coded here (3, 7, 30) while the
 * dashboard read the saved ones — editing them in Settings moved the counts
 * and left the chips alone.
 */
function studentStatus(
  credit: number,
  expiresISO: string,
  lastAttended: string,
  rules: CreditRules,
): Student["status"] {
  const today = new Date();
  if (expiresISO) {
    const exp = new Date(expiresISO);
    if (exp < today) return "Expired";
    if (exp.getTime() - today.getTime() < rules.expiringDays * 86400_000) return "Expiring";
  }
  if (lastAttended && today.getTime() - new Date(lastAttended).getTime() > rules.inactiveDays * 86400_000) {
    return "Inactive";
  }
  if (credit <= rules.lowCredit) return "Low Credit";
  return "Normal";
}

/** One student row joined across enrollment, class, credits and parent info. */
export function toStudents(c: LiveCollections): Student[] {
  const rules = creditRulesOf(c);
  return c.students.map((st) => {
    const sid = s(st, "student_id");
    const enr = c.enrollments.find((e) => s(e, "student_id") === sid && s(e, "status") === "Active")
      ?? c.enrollments.find((e) => s(e, "student_id") === sid);
    const cls = enr ? c.classes.find((k) => s(k, "class_id") === s(enr, "class_id")) : undefined;
    const txs = enr ? c.creditTransactions.filter((t) => s(t, "enrollment_id") === s(enr, "enrollment_id")) : [];
    const credit = txs.reduce((sum, t) => sum + n(t, "amount"), 0);
    const expiry = txs.filter((t) => s(t, "expiry_date")).map((t) => s(t, "expiry_date")).sort().at(-1) ?? "";
    const link = c.studentParents.find((sp) => s(sp, "student_id") === sid);
    const parent = link ? c.parents.find((p) => s(p, "parent_id") === s(link, "parent_id")) : undefined;
    const contacts = parent ? c.parentContacts.filter((pc) => s(pc, "parent_id") === s(parent, "parent_id")) : [];
    const contact = (type: string) => s(contacts.find((pc) => s(pc, "contact_type") === type) ?? {}, "value");
    return {
      id: sid,
      name: s(st, "name"),
      email: s(st, "email"),
      branch: "Bangkok",
      className: cls ? s(cls, "name") : "—",
      credit,
      expires: fmtDate(expiry),
      status: studentStatus(credit, expiry, s(st, "last_attended_date"), rules),
      age: age(s(st, "date_of_birth")),
      /* Normalised here rather than at the form, so every reader gets the same
         shape and the edit field can actually show what is on file. */
      dateOfBirth: toDateInput(s(st, "date_of_birth")),
      level: s(st, "current_level") || "—",
      school: s(st, "current_school"),
      fideId: s(st, "fide_id"),
      parentName: parent ? s(parent, "name") : "—",
      parentRelation: link ? s(link, "relationship_type") || "Guardian" : "—",
      parentPhone: contact("phone"),
      parentEmail: contact("email"),
      parentLineId: contact("line_id"),
      parentLineIdNo: "",
      studentLineId: "",
      studentLineIdNo: "",
      membershipType: cls ? s(cls, "class_type") : "—",
      joinedDate: enr ? fmtDate(s(enr, "enrolled_date")) : "",
    };
  });
}

/** One parent row with their contacts and the children linked to them.
    `loginEmail` is the account address from user_account, which the backend
    serves as a staff-only derived column; `email` is whatever contact address
    the office recorded in parent_contact, and the two are often different. */
export function toParents(c: LiveCollections): ParentPerson[] {
  const students = toStudents(c);
  return c.parents.map((p) => {
    const pid = s(p, "parent_id");
    const contacts = c.parentContacts.filter((pc) => s(pc, "parent_id") === pid);
    const contact = (type: string) => s(contacts.find((pc) => s(pc, "contact_type") === type) ?? {}, "value");
    const children = c.studentParents
      .filter((sp) => s(sp, "parent_id") === pid)
      .map((sp) => {
        const child = students.find((st) => st.id === s(sp, "student_id"));
        /* relationship_type is free text and the seed stores it lower-case,
           but the console's own picker offers Mother/Father/Guardian. */
        const rel = s(sp, "relationship_type");
        return {
          id: s(sp, "student_id"),
          name: child?.name ?? s(sp, "student_id"),
          relation: rel ? rel[0].toUpperCase() + rel.slice(1) : "Guardian",
          className: child?.className ?? "—",
          credit: child?.credit ?? 0,
        };
      });
    return {
      id: pid,
      name: s(p, "name"),
      loginEmail: s(p, "email"),
      phone: contact("phone"),
      email: contact("email"),
      lineId: contact("line_id"),
      children,
    };
  });
}

export function toPayments(c: LiveCollections): Payment[] {
  return [...c.payments]
    .sort((a, b) => s(b, "payment_date").localeCompare(s(a, "payment_date")))
    .map((p) => {
      const st = c.students.find((x) => s(x, "student_id") === s(p, "student_id"));
      const enr = c.enrollments.find((e) => s(e, "enrollment_id") === s(p, "enrollment_id"));
      const cls = enr ? c.classes.find((k) => s(k, "class_id") === s(enr, "class_id")) : undefined;
      const pkg = c.creditPackages.find((k) => s(k, "credit_package_id") === s(p, "credit_package_id"));
      /* The snapshot on the row wins over the join. A payment outlives the
         student it was for, so a detached one has only these names — and even
         while the student exists, the snapshot is what the till recorded. */
      return {
        id: s(p, "payment_id"),
        name: s(p, "student_name") || (st ? s(st, "name") : s(p, "student_id")),
        className: s(p, "class_name") || (cls ? s(cls, "name") : "—"),
        payer: s(p, "parent_name"),
        detached: !s(p, "student_id"),
        credits: pkg ? `+${n(pkg, "credit_amount")}` : "—",
        amount: fmtTHB(n(p, "final_amount")),
        gross: fmtTHB(n(p, "amount")),
        discount: n(p, "discount_amount") > 0 ? fmtTHB(n(p, "discount_amount")) : "—",
        reference: s(p, "reference_number"),
        date: fmtDate(s(p, "payment_date")),
        isoDate: s(p, "payment_date"),
        method: s(p, "payment_method"),
        /* Read, not assumed. A payment recorded as Pending is money the
           academy has been promised, and one recorded as Refunded is money it
           gave back — calling both of them Paid put them in Total Revenue. */
        status: (s(p, "status") || "Paid") as Payment["status"],
      };
    });
}

const CONSOLE_ROLE: Record<string, JtraxRole> = { Admin: "Admin", Receptionist: "Receptionist" };

export function toAdmins(c: LiveCollections): AdminPerson[] {
  return c.admins.map((a) => {
    const acct = c.accounts.find((u) => s(u, "user_account_id") === s(a, "user_account_id"));
    const name = s(a, "name");
    return {
      id: s(a, "admin_id"),
      name,
      role: acct ? CONSOLE_ROLE[s(acct, "role")] ?? "Admin" : "Admin",
      phone: s(a, "phone"),
      email: s(a, "email") || (acct ? s(acct, "email") : ""),
      lineId: s(a, "line_id"),
      branch: "Bangkok",
      lastLogin: "—",
      createdDate: "",
      createdBy: "",
      status: "Active",
      initials: name.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase(),
    };
  });
}

export function toAnnouncements(c: LiveCollections): Announcement[] {
  return [...c.announcements]
    .sort((a, b) => s(b, "posted_at").localeCompare(s(a, "posted_at")))
    .map((a) => ({
      id: s(a, "announcement_id"),
      title: s(a, "title"),
      audience: "All",
      date: fmtDate(s(a, "posted_at")),
      body: s(a, "body"),
    }));
}

export function toTournaments(c: LiveCollections): Tournament[] {
  return c.tournaments.map((t) => {
    const tid = s(t, "tournament_id");
    const cats = c.tournamentCategories.filter((k) => s(k, "tournament_id") === tid);
    /* Only people who are actually in the event. A public sign-up waiting for
       approval is a request, not a participant — counting one would inflate the
       roster, the revenue and the "registration filled" figure with people the
       desk has not let in, and might yet turn away. They are shown separately,
       in the approval queue. Rows predating public registration have no status
       at all, so a missing one reads as in. */
    const regs = c.tournamentRegistrations.filter(
      (k) => s(k, "tournament_id") === tid && (s(k, "status") || "Approved") === "Approved",
    );
    const participants: Participant[] = regs.map((r, i) => ({
      id: s(r, "tournament_registration_id"),
      studentId: s(r, "student_id"),
      categoryId: s(r, "tournament_category_id"),
      dateOfBirth: s(r, "participant_date_of_birth"),
      feeCharged: n(r, "fee_charged"),
      name: s(r, "participant_name"),
      rating: n(r, "fide_rating"),
      category: s(cats.find((k) => s(k, "tournament_category_id") === s(r, "tournament_category_id")) ?? {}, "name") || "—",
      score: "—",
      rank: i + 1,
      prize: "—",
      paymentStatus: "Paid",
      age: 0,
      guardian: "—",
      contact: s(r, "participant_contact"),
      wins: 0,
      losses: 0,
      draws: 0,
      attendance: "—",
      notes: "",
    }));
    const backendStatus = s(t, "tournament_status");
    return {
      id: tid,
      name: s(t, "name"),
      status: backendStatus === "Completed" ? "Completed" : "Ongoing",
      hasStarted: backendStatus !== "Upcoming",
      date: fmtDate(s(t, "start_date")),
      venue: s(t, "venue_name"),
      format: "Swiss",
      /* Whether the standings are readable without signing in. It was
         hard-coded true while nothing was published at all; it is now the
         real column, so the Results tab reports the actual state. */
      published: n(t, "results_public") === 1,
      publicRegistration: n(t, "public_registration") === 1,
      chessResultsId: t["chess_results_id"] == null ? undefined : n(t, "chess_results_id"),
      studentDiscountPct: n(t, "student_discount_pct"),
      entryFeeAmount: t["regular_fee"] == null ? 0 : n(t, "regular_fee"),
      categories: cats.map((k) => s(k, "name")),
      categoryRows: cats.map((k) => ({ id: s(k, "tournament_category_id"), name: s(k, "name") })),
      organizer: s(t, "organizer_name"),
      chiefArbiter: "—",
      registrationDeadline: fmtDate(s(t, "registration_deadline")),
      timeControl: "—",
      entryFeeMember: t["regular_fee"] == null ? "—" : fmtTHB(n(t, "regular_fee")),
      entryFeeNonMember: t["regular_fee"] == null ? "—" : fmtTHB(n(t, "regular_fee")),
      earlyBirdFeeMember: t["early_bird_fee"] == null ? undefined : fmtTHB(n(t, "early_bird_fee")),
      address: s(t, "venue_address"),
      contactPerson: s(t, "organizer_name"),
      maxParticipants: n(t, "max_participants"),
      currentParticipants: regs.length,
      rounds: 0,
      revenue: fmtTHB(regs.reduce((sum, r) => sum + n(r, "fee_charged"), 0)),
      participants,
    };
  });
}

/* ---- today's dashboard ----

   These used to be constants in lib/data.ts, which meant the dashboard showed
   the same classes, check-ins and revenue whatever the academy had actually
   recorded. Each one now reads the same rows the rest of the console does. */

/** Local calendar day as YYYY-MM-DD. `toISOString` would shift Bangkok back a day. */
export function todayISO(now: Date = new Date()): string {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "14:00" -> "2:00 PM", matching how the design writes session times. */
function fmtTime(value: string): string {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h)) return value;
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

/* The dashboard colours and picks an icon by category, which the ER model
   spells as class_type. */
function categoryOf(className: string, classType: string): string {
  for (const word of ["Master", "Intermediate", "Beginner", "Weekend"]) {
    if (className.includes(word)) return word;
  }
  return classType === "Master" ? "Master" : "Beginner";
}

/** Today's sessions, each with the students checked in to it. */
export function toTodaysClasses(c: LiveCollections, day = todayISO()): ClassDef[] {
  return c.classSessions
    .filter((session) => s(session, "session_date") === day)
    .map((session) => {
      const id = s(session, "session_id");
      const cls = c.classes.find((k) => s(k, "class_id") === s(session, "class_id"));
      const name = cls ? s(cls, "name") : "—";
      const roster = c.attendance
        .filter((a) => s(a, "session_id") === id)
        .map((a) => {
          const student = c.students.find((st) => s(st, "student_id") === s(a, "student_id"));
          return student ? s(student, "name") : s(a, "student_id");
        });
      const start = s(session, "start_time");
      const end = s(session, "end_time");
      return {
        id,
        classId: s(session, "class_id"),
        category: categoryOf(name, cls ? s(cls, "class_type") : ""),
        name,
        time: start && end ? `${fmtTime(start)} – ${fmtTime(end)}` : fmtTime(start),
        /* The design's card has two states; a session not yet started reads as
           upcoming, which its own chip already says. */
        status: s(session, "session_status") === "Completed" ? "Finished" : "Ongoing",
        students: roster.slice(0, 2),
        more: Math.max(0, roster.length - 2),
        teacher: "—",
        room: "—",
        roster,
      } satisfies ClassDef;
    })
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** Who is at the academy today, from attendance on today's sessions. */
export function toCheckins(c: LiveCollections, day = todayISO()): CheckinDef[] {
  const todaysSessions = c.classSessions.filter((x) => s(x, "session_date") === day);
  const sessionIds = new Set(todaysSessions.map((x) => s(x, "session_id")));

  return c.attendance
    .filter((a) => sessionIds.has(s(a, "session_id")))
    .map((a) => {
      const studentId = s(a, "student_id");
      const student = c.students.find((st) => s(st, "student_id") === studentId);
      const session = todaysSessions.find((x) => s(x, "session_id") === s(a, "session_id"));
      const cls = session ? c.classes.find((k) => s(k, "class_id") === s(session, "class_id")) : undefined;
      const enr = c.enrollments.find((e) => s(e, "student_id") === studentId);
      const credit = enr
        ? c.creditTransactions
            .filter((t) => s(t, "enrollment_id") === s(enr, "enrollment_id"))
            .reduce((sum, t) => sum + n(t, "amount"), 0)
        : 0;
      const out = s(a, "check_out_time");
      return {
        attendanceId: s(a, "attendance_id"),
        studentId,
        name: student ? s(student, "name") : studentId,
        class: cls ? categoryOf(s(cls, "name"), s(cls, "class_type")) : "—",
        timeIn: clockOf(s(a, "check_in_time")),
        timeOut: out ? clockOf(out) : "—",
        status: out ? "Dismissed" : "In class",
        credit,
      } satisfies CheckinDef;
    })
    .sort((a, b) => a.timeIn.localeCompare(b.timeIn));
}

/** "2026-08-13T09:58:00" -> "9:58 AM". */
/** The clock time out of a timestamp — "14:05" from an ISO check-in stamp.
    Exported because Class History shows the same times the dashboard does, and
    two copies of this drifted apart once already. */
export function clockOf(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Six months of real revenue, oldest first, ending with the current month. */
export type { TrendPoint };

export function toRevenueTrend(c: LiveCollections, now = new Date()): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let back = 5; back >= 0; back--) {
    const month = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const value = c.payments
      .filter((p) => isRevenue(p) && s(p, "payment_date").startsWith(prefix))
      .reduce((sum, p) => sum + n(p, "final_amount"), 0);
    points.push({ month: MONTH_SHORT[month.getMonth()], value });
  }
  return points;
}

/** Revenue booked in the current calendar month, and how many payments made it. */
/**
 * The classes the academy still runs.
 *
 * A class is never deleted — `class_id` is NOT NULL on enrolments, sessions
 * and packages, so removing the row would take last term's attendance and a
 * year of receipts with it. It is archived instead, and every screen that
 * *offers* a class filters through here.
 *
 * Lookups deliberately do not: `raw.classes` still holds the archived ones, so
 * an old enrolment or a finished session can still say which class it was.
 * Choosing and naming are different questions, and only one of them should
 * forget.
 */
export function liveClasses(c: { classes: Row[] }): Row[] {
  return c.classes.filter((k) => !s(k, "archived_at"));
}

/**
 * Whether this enrolment is one the child is currently in.
 *
 * `student_enrollment.status` has had Active / Completed / Withdrawn from the
 * first migration — a lifecycle for exactly this — but nothing ever read it,
 * so a child who had left a class was still offered its sessions and could
 * still be checked into them.
 *
 * A blank status counts as Active: the column is NOT NULL with an Active
 * default, and a row that predates the default should not vanish from a
 * child's classes on a technicality.
 */
export function isActiveEnrolment(enrolment: Row): boolean {
  const status = s(enrolment, "status");
  return status === "" || status === "Active";
}

/** The classes a child is in right now. */
export function activeEnrolments(rows: Row[]): Row[] {
  return rows.filter(isActiveEnrolment);
}

/** True once the academy has stopped running this class, or selling this
    package. Both carry `archived_at` and both mean the same thing: still on
    file, no longer on offer. */
export function isArchived(row: Row | undefined): boolean {
  return Boolean(row && s(row, "archived_at"));
}

/**
 * The packages the academy still sells.
 *
 * A package cannot be deleted once it has been sold — a payment points at it,
 * and the console reads it to say what that payment bought, so removing it
 * stops old receipts adding up. Retired ones leave the till and the price list
 * and stay on file for the payments that need them.
 *
 * A package for a retired class goes too, without being archived itself: the
 * class is not on offer, so neither is its price.
 */
export function livePackages(c: { creditPackages: Row[]; classes: Row[] }): Row[] {
  return c.creditPackages.filter((p) => {
    if (s(p, "archived_at")) return false;
    const cls = c.classes.find((k) => s(k, "class_id") === s(p, "class_id"));
    return !isArchived(cls);
  });
}

/**
 * A credit balance as a person would write it.
 *
 * One credit is an hour, so balances are fractional — half an hour is 0.5, and
 * a twenty-minute make-up lesson is a third of a credit that no amount of
 * arithmetic will make exact. Summing those in binary floating point produces
 * 13.499999999999998, which is the right number and the wrong thing to put on
 * a chip. Two decimal places, with trailing zeros dropped so a whole balance
 * still reads "14" rather than "14.00".
 */
export function fmtCredits(credit: number): string {
  return String(Math.round(credit * 100) / 100);
}

/* Revenue is money the academy has, not money it has been promised. A payment
   sitting Pending has not cleared and a Refunded one went back out, so neither
   belongs in a total — a row with no status at all predates the column and was
   taken at the till, which is Paid. */
function isRevenue(p: Row): boolean {
  return (s(p, "status") || "Paid") === "Paid";
}

export function monthRevenue(c: LiveCollections, now = new Date()): { total: number; count: number } {
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rows = c.payments.filter((p) => isRevenue(p) && s(p, "payment_date").startsWith(prefix));
  return { total: rows.reduce((sum, p) => sum + n(p, "final_amount"), 0), count: rows.length };
}

/** A student's last 35 days of practice, and the streak trailing off today. */
export function practiceStrip(
  c: LiveCollections,
  studentId: string,
  now = new Date(),
): { days: boolean[]; streak: number } {
  const done = new Set(
    c.practiceActivities
      .filter((a) => s(a, "student_id") === studentId && n(a, "minutes_practiced") > 0)
      .map((a) => s(a, "activity_date")),
  );
  const days: boolean[] = [];
  for (let back = 34; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    days.push(done.has(todayISO(d)));
  }
  let streak = 0;
  for (let i = days.length - 1; i >= 0 && days[i]; i--) streak++;
  return { days, streak };
}
