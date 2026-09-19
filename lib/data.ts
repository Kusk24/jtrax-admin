/**
 * The console's display types.
 *
 * This module used to carry the design's fixtures alongside them. Every screen
 * reads real rows now — the last of them was the inbox, which went to the
 * academy's real LINE conversations — so what is left is the shapes those
 * adapters produce, and nothing to render when the backend is quiet.
 */
import type { JtraxRole } from './theme';

export type Student = {
  id: string;
  name: string;
  /** Login email from user_account, served as a staff-only derived column.
      Optional because a student registered at the desk has no account until
      someone issues one, and the mock fixtures below predate the field. */
  email?: string;
  /** Their `user_account_id`, or "" when nobody has issued them a login. The
      office needs it to reset the password, which for a child is the only way
      back in — an ID cannot be sent a link. */
  accountId?: string;
  branch: string;
  className: string;
  credit: number;
  expires: string;
  status: 'Normal' | 'Low Credit' | 'Expiring' | 'Expired' | 'Inactive';
  age: number;
  /** `YYYY-MM-DD`, normalised by `toDateInput` from whatever shape the row
      holds, so the edit form's date input can show it; `age` is it worked
      out. Empty when there is no usable date on file. */
  dateOfBirth: string;
  level: string;
  /** The school the child attends the rest of the week. Registration has always
      asked for it; until there was a column for it the answer was thrown away. */
  school: string;
  /** Their FIDE ID, which is how an arbiter's standings name them. */
  fideId: string;
  /** The guardian's own `parent_id`, or "" when nobody is linked. The student
      card chooses *which* parent; their details belong to them, on the Parents
      screen. */
  parentId: string;
  parentName: string;
  parentRelation: string;
  parentPhone: string;
  parentEmail: string;
  parentLineId: string;
  /* `parentLineIdNo`, `studentLineId` and `studentLineIdNo` used to sit here.
     All three were set to "" on every row and had no column to come from, so
     the screens that showed them showed an empty line the console could never
     fill. A field nothing can populate is not data.

     `membershipType` went the same way for the opposite reason: it was always
     populated, from the course's `class_type`, and the academy has no
     memberships at all. A field nothing asks for is not data either. */
  joinedDate: string;
};

/** A parent as the console lists them: their own contact details plus the
    children they are linked to through `student_parent`. */
export type ParentPerson = {
  id: string;
  name: string;
  loginEmail: string;
  /** Their `user_account_id`, so the office can reset the password. */
  accountId?: string;
  phone: string;
  email: string;
  lineId: string;
  children: { id: string; name: string; relation: string; className: string; credit: number }[];
};

export type Payment = {
  /** Present on live rows; absent in the design seed. */
  id?: string;
  name: string;
  className: string;
  credits: string;
  amount: string;
  /** Formatted for display. `isoDate` is the same day unformatted, which is
      what a date range can actually be compared against. */
  date: string;
  isoDate?: string;
  method: string;
  /** The guardian recorded as paying, when one was. */
  payer?: string;
  /* What the row shows only when opened: the amount before any discount, the
     discount itself, and the reference the office wrote down. */
  gross?: string;
  discount?: string;
  reference?: string;
  /** True once the student this was for has been deleted: the names on the
      row are all that is left of who it was about. */
  detached?: boolean;
  status: 'Paid' | 'Pending' | 'Refunded';
};

export type CheckinDef = {
  /** The attendance row behind this line, so dismissing can write to it. */
  attendanceId?: string;
  studentId?: string;
  name: string;
  class: string;
  timeIn: string;
  timeOut: string;
  status: 'In class' | 'Dismissed';
  credit: number;
};

export type ClassDef = {
  /* Present on live rows: the session being shown and the class it belongs to.
     Absent in the design seed, which had no ids. */
  id?: string;
  classId?: string;
  category: string;
  name: string;
  time: string;
  status: 'Ongoing' | 'Finished';
  students: string[];
  more: number;
  teacher: string;
  room: string;
  roster: string[];
};

export type AdminPerson = {
  id: string;
  name: string;
  /** Their `user_account_id`, so the office can reset the password. */
  accountId?: string;
  role: JtraxRole;
  phone: string;
  email: string;
  lineId: string;
  branch: string;
  lastLogin: string;
  createdDate: string;
  createdBy: string;
  status: string;
  initials: string;
};





export type Announcement = {
  /** Present on live rows from the backend; absent in the design seed. */
  id?: string;
  title: string;
  audience: string;
  date: string;
  body: string;
};

export type Participant = {
  /* Present on live rows; the design seed has neither. `categoryId` is what the
     edit form binds to — `category` is the resolved name, for display. */
  id?: string;
  studentId?: string;
  categoryId?: string;
  dateOfBirth?: string;
  feeCharged?: number;
  name: string;
  rating: number;
  category: string;
  score: string;
  rank: number;
  prize: string;
  paymentStatus: string;
  age: number;
  guardian: string;
  contact: string;
  wins: number;
  losses: number;
  draws: number;
  attendance: string;
  notes: string;
};

export type Tournament = {
  id: string;
  name: string;
  status: 'Ongoing' | 'Completed';
  hasStarted?: boolean;
  date: string;
  venue: string;
  format: string;
  published: boolean;
  /** Whether anyone with the link may register, not just the front desk. */
  publicRegistration: boolean;
  /** The chess-results.com event this tournament is linked to, when it is —
      the id in tnr{N}.aspx. Rows carry it so a list can offer the jump
      straight to where results are actually updated. */
  chessResultsId?: number;
  /** Percent off the entry fee for one of the academy's own students. */
  studentDiscountPct: number;
  /** The entry fee as a number, for arithmetic. `entryFeeMember` is the same
      value already formatted, and formatted strings do not divide. */
  entryFeeAmount: number;
  categories: string[];
  /** The same categories with their ids, for the screens that manage them. */
  categoryRows?: Array<{ id: string; name: string }>;
  organizer: string;
  chiefArbiter: string;
  registrationDeadline: string;
  timeControl: string;
  entryFeeMember: string;
  entryFeeNonMember: string;
  earlyBirdFeeMember?: string;
  earlyBirdFeeNonMember?: string;
  earlyBirdStart?: string;
  earlyBirdEnd?: string;
  certificatesNote?: string;
  address: string;
  contactPerson: string;
  maxParticipants: number;
  currentParticipants: number;
  rounds: number;
  revenue: string;
  participants: Participant[];
};
