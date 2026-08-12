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
import type { TrendPoint } from "./derive";
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

function age(dobISO: string): number {
  if (!dobISO) return 0;
  const dob = new Date(dobISO);
  const now = new Date();
  let a = now.getFullYear() - dob.getFullYear();
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) a--;
  return a;
}

/* Status thresholds mirror lib/derive.ts DEFAULT_CREDIT_RULES. */
function studentStatus(credit: number, expiresISO: string, lastAttended: string): Student["status"] {
  const today = new Date();
  if (expiresISO) {
    const exp = new Date(expiresISO);
    if (exp < today) return "Expired";
    if (exp.getTime() - today.getTime() < 7 * 86400_000) return "Expiring";
  }
  if (credit <= 3) return "Low Credit";
  if (lastAttended && today.getTime() - new Date(lastAttended).getTime() > 30 * 86400_000) return "Inactive";
  return "Normal";
}

/** One student row joined across enrollment, class, credits and parent info. */
export function toStudents(c: LiveCollections): Student[] {
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
      status: studentStatus(credit, expiry, s(st, "last_attended_date")),
      age: age(s(st, "date_of_birth")),
      level: s(st, "current_level") || "—",
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
      return {
        id: s(p, "payment_id"),
        name: st ? s(st, "name") : s(p, "student_id"),
        className: cls ? s(cls, "name") : "—",
        credits: pkg ? `+${n(pkg, "credit_amount")}` : "—",
        amount: fmtTHB(n(p, "final_amount")),
        date: fmtDate(s(p, "payment_date")),
        method: s(p, "payment_method"),
        status: "Paid",
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
    const regs = c.tournamentRegistrations.filter((k) => s(k, "tournament_id") === tid);
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
      published: true,
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
function clockOf(iso: string): string {
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
      .filter((p) => s(p, "payment_date").startsWith(prefix))
      .reduce((sum, p) => sum + n(p, "final_amount"), 0);
    points.push({ month: MONTH_SHORT[month.getMonth()], value });
  }
  return points;
}

/** Revenue booked in the current calendar month, and how many payments made it. */
export function monthRevenue(c: LiveCollections, now = new Date()): { total: number; count: number } {
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rows = c.payments.filter((p) => s(p, "payment_date").startsWith(prefix));
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
