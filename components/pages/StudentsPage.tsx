"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { generateTempPassword } from "@/lib/credentials";
import { type Student } from "@/lib/data";
import { useData } from "@/components/DataProvider";
import { fmtCredits, fmtDate, fmtTHB, isActiveEnrolment, liveClasses, practiceStrip, toDateInput } from "@/lib/live";
import { creditsForValue, planTransfer, ratePerCredit, roundCredits, valueOfLots, type CreditRate } from "@/lib/credit-transfer";
import { opensCreate } from "@/lib/quick-actions";
import { createStudentAccount, slugOf } from "@/lib/student-login-id";
import { classFilterOptions, classNamesOfStudent, isInClass } from "@/lib/student-classes";
import { Icon } from "@/lib/icons";
import { classDotColor, COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import {
  ActionButton,
  AddButton,
  ConfirmDeleteModal,
  CrudFormModal,
  ErrorNote,
  errorText,
  RowActions,
  type CrudField,
  type CrudValues,
} from "../crud";
import {
  EmptyRow,
  fieldStyle,
  FilterBar,
  InfoGrid,
  labelStyle,
  Modal,
  dangerSolidButtonStyle,
  equalTemplate,
  ExportButton,
  PageHeader,
  paginate,
  Pagination,
  primaryButtonStyle,
  SearchInput,
  secondaryButtonStyle,
  SelectFilter,
  selectStyle,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";
import { BackLink, DangerPanel, DeleteButton, DetailHeader, EditButton } from "../detail";
import { CardGrid, EmptyCards, EntityCard, ViewToggle } from "../view-mode";
import { useViewMode } from "@/lib/view-mode";
import { useErrorToast } from "../ErrorToast";

const TEMPLATE = equalTemplate(5, 90);
const VIEWS = ["list", "card"] as const;
const ATTENDANCE_TEMPLATE = equalTemplate(2, 120);
const CLASS_OPTIONS = ["Group Class", "Private Class", "Master Class", "Weekend Class"];

/* One branch today, and the academy expects more. It is asked at registration
   rather than after a second site exists, because reconstructing where every
   child on the roster belongs is a job nobody will want then. Stored since
   backend migration 0024 — the picker that used to be here had no column and
   threw the answer away, which is why it was removed in #92. */
const BRANCH_OPTIONS = ["Bangkok"];
const STATUS_VALUES = ["Normal", "Low Credit", "Expiring", "Expired", "Inactive"] as const;
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];
const RELATION_OPTIONS = ["Mother", "Father", "Guardian"];

/* Branch had a picker here with one option and no column behind it. Its own
   comment warned that a mismatched list would "silently move them to the first
   option on save" — which is what the whole card was doing, to six fields at
   once, because nothing it collected was written at all. */

/**
 * What the server said, with the status it said it with.
 *
 * `errorText` alone gives the message, which is usually enough — but a refusal
 * reported from another machine is not something anyone can reproduce from
 * "could not save", and the number is what separates "you are not allowed" from
 * "that field does not exist" from "the backend is down". This is the string
 * the office reads out when a save will not take.
 */
function saveFailureText(e: unknown, fallback: string): string {
  const text = errorText(e, fallback);
  const status = e instanceof ApiError ? e.status : 0;
  return status ? `${text} (${status})` : text;
}

/**
 * Which of the fields we just sent did not come back the way we sent them.
 *
 * A write is meant to fail loudly, and mostly it does — a refusal is a 4xx and
 * says why. What no error can catch is a write that is *accepted* and does not
 * take: a 200, an untouched row, and a screen that goes back to showing what
 * it showed before. That is indistinguishable from a save that worked, and it
 * is the only shape left that matches "I changed it and it did not change"
 * after the refusals, the roles, the date format and the sleeping backend have
 * all been ruled out.
 *
 * The backend answers a PATCH with the row it wrote, so the check is free:
 * compare it against what was asked for. A column the response does not carry
 * at all is named separately — that is a server that has never heard of the
 * field, which is a different problem from one that ignored it.
 */
function disagreements(
  sent: Record<string, string | null>,
  written: Record<string, unknown>,
): string[] {
  const same = (a: unknown, b: unknown) => String(a ?? "") === String(b ?? "");
  return Object.keys(sent).filter((key) => {
    if (!(key in written)) return true;
    return !same(sent[key], written[key]);
  });
}


/* Credit reads as a warning before it reads as a number, so the chip is
   coloured by how close to empty the balance is — shared by both views. */
function creditChipFor(credit: number): { color: string; bg: string } {
  if (credit <= 0) return { color: COLORS.danger, bg: COLORS.dangerBg };
  if (credit <= 3) return { color: COLORS.warning, bg: COLORS.warningBg };
  return { color: COLORS.success, bg: COLORS.successBg };
}

/* A guardian given at the desk as a name and a phone number still needs a way
   into the parent portal, so their login gets the same kind of made-up address
   the roster gives a student. It is a username, not a mailbox — the address the
   academy actually writes to is the email *contact*, which stays empty until
   the family gives one, and can be filled in later on the Parents screen. */
function parentEmailFor(name: string): string {
  return `${slugOf(name) || "parent"}@parent.jca.ac.th`;
}


type View =
  | { kind: "list" }
  /* `edit` / `remove` are set when the card's own buttons were used: the card
     has no room for a form, so it opens the student on the state that button
     asked for. */
  | { kind: "detail"; id: string; edit?: boolean; remove?: boolean }
  | { kind: "wizard" };

/* ---------------------------------------------------------------- detail --- */

const DETAIL_TABS = ["Overview", "Attendance", "Credits", "Practice", "Payments"] as const;
const CREDIT_TEMPLATE = equalTemplate(5, 90);
const CREDIT_TYPES = ["purchase", "consumption", "manual_adjustment"];
type DetailTab = (typeof DETAIL_TABS)[number];

function StudentDetail({
  student,
  startEditing = false,
  startDeleting = false,
  guardianOptions,
  onBack,
  onSave,
  onDelete,
  onLinkGuardian,
  onUnlinkGuardian,
}: {
  student: Student;
  startEditing?: boolean;
  startDeleting?: boolean;
  /* Every guardian on file. A child has one, so this is a picker rather than
     a create form — making a new guardian is the Parents screen's job. */
  guardianOptions: Array<{ id: string; name: string }>;
  onBack: () => void;
  /* Awaited by the Save button, which stays disabled until it resolves. */
  onSave: (student: Student) => Promise<void>;
  /* `alsoParent` is only ever offered when this is the guardian's last child;
     a guardian with other children is never touched. */
  /* Returns a promise so the confirm button can stop saying "Deleting…". */
  onDelete: (id: string, alsoParent: boolean) => void | Promise<void>;
  onLinkGuardian: (parentId: string, relation: string) => Promise<void>;
  onUnlinkGuardian: () => void;
}) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const [tab, setTab] = useState<DetailTab>("Overview");
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState<Student>(student);
  const [deleteConfirm, setDeleteConfirm] = useState(startDeleting);
  const [alsoParent, setAlsoParent] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [guardianId, setGuardianId] = useState("");
  const [guardianRelation, setGuardianRelation] = useState(RELATION_OPTIONS[0]);
  /* Shown on the form itself rather than in a toast, and it keeps the form
     open — see the Save button. */
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  function setField<K extends keyof Student>(key: K, value: Student[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  const { raw, batch, create, update, remove } = useData();

  /**
   * Writes the link between this child and their guardian — which parent, and
   * how they are related. Nothing about the parent themselves.
   *
   * A parent is their own record, shared with their other children. Editing
   * their name or phone number from a child's page edits a person nobody is
   * looking at, and quietly changes what the *sibling's* page says too. Those
   * details are on the Parents screen, on their own page, where changing them
   * is visibly changing them. This is the half that genuinely belongs to the
   * child: whose child they are.
   */
  async function saveGuardianLink(next: Student) {
    const chosen = next.parentId;
    const before = student.parentId;
    if (chosen === before) {
      if (chosen && next.parentRelation !== student.parentRelation) {
        await update("student-parents", student.id, { relationship_type: next.parentRelation });
      }
      return;
    }
    /* The link is keyed by student, so there is at most one and swapping it is
       a delete and a create rather than a field. */
    if (before) await remove("student-parents", student.id);
    if (chosen) {
      await create("student-parents", {
        student_id: student.id,
        parent_id: chosen,
        relationship_type: next.parentRelation || RELATION_OPTIONS[0],
      });
    }
  }

  /* Real attendance: the sessions this student was checked in to, newest first. */
  const attendance = useMemo(() => {
    return raw.attendance
      .filter((a) => String(a["student_id"]) === student.id)
      .map((a) => {
        const session = raw.classSessions.find((s) => String(s["session_id"]) === String(a["session_id"]));
        const cls = session
          ? raw.classes.find((c) => String(c["class_id"]) === String(session["class_id"]))
          : undefined;
        return {
          id: String(a["attendance_id"]),
          date: session ? String(session["session_date"] ?? "") : "",
          className: cls ? String(cls["name"] ?? "") : "—",
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [raw.attendance, raw.classSessions, raw.classes, student.id]);

  /* Credit ledger for this student's enrolments — what actually adds up to the
     balance shown on the header chip. */
  const enrolmentIds = useMemo(
    () =>
      raw.enrollments
        .filter((e) => String(e["student_id"]) === student.id)
        .map((e) => String(e["enrollment_id"])),
    [raw.enrollments, student.id],
  );

  const creditRows = useMemo(() => {
    return raw.creditTransactions
      /* Their enrolments' entries, and the ones no enrolment claims — those
         are still the child's hours and still on the balance. */
      .filter(
        (tx) =>
          enrolmentIds.includes(String(tx["enrollment_id"])) ||
          (!String(tx["enrollment_id"] ?? "") && String(tx["student_id"] ?? "") === student.id),
      )
      .map((tx) => ({
        id: String(tx["credit_transaction_id"]),
        enrollmentId: String(tx["enrollment_id"]),
        type: String(tx["transaction_type"] ?? ""),
        amount: Number(tx["amount"] ?? 0),
        date: String(tx["transaction_date"] ?? ""),
        expiry: String(tx["expiry_date"] ?? ""),
        notes: String(tx["notes"] ?? ""),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [raw.creditTransactions, enrolmentIds, student.id]);

  const enrolments = useMemo(
    () =>
      raw.enrollments
        .filter((e) => String(e["student_id"]) === student.id)
        .map((e) => {
          const cls = raw.classes.find((c) => String(c["class_id"]) === String(e["class_id"]));
          /* Where they came from, if they came from anywhere. A retired course
             still resolves — that is why the column points at the class rather
             than at an enrolment, which can be deleted. */
          const fromId = String(e["moved_from_class_id"] ?? "");
          const fromCls = fromId
            ? raw.classes.find((c) => String(c["class_id"]) === fromId)
            : undefined;
          return {
            id: String(e["enrollment_id"]),
            classId: String(e["class_id"] ?? ""),
            className: cls ? String(cls["name"] ?? "") : "—",
            enrolledDate: String(e["enrolled_date"] ?? ""),
            status: String(e["status"] ?? ""),
            movedFrom: fromCls ? String(fromCls["name"] ?? "") : "",
          };
        }),
    [raw.enrollments, raw.classes, student.id],
  );

  /* Four things happen to an enrolment, and each has its own button.
     Deliberately none of them edits the row in place: retyping the course on
     an enrolment with a term of credits behind it moves that ledger to a
     course it was never spent in, and flipping its status by hand is a
     withdrawal that skips everything a withdrawal does.
       · Add      — a course they are joining
       · Change   — leaving one for another, which is one act, not two
       · Withdraw — leaving, and staying left
       · Delete   — undoing a row that should never have existed */
  const [addingEnrolment, setAddingEnrolment] = useState(false);
  const [changing, setChanging] = useState<(typeof enrolments)[number] | null>(null);
  const [changeTo, setChangeTo] = useState("");
  /* Whether the balance follows them. Ticked by default: an hour paid for is
     an hour owed whichever course it is taken in, and leaving it behind on a
     course the child has left is how a balance goes missing. */
  const [changeCarry, setChangeCarry] = useState(true);
  const [deletingEnrolment, setDeletingEnrolment] = useState<(typeof enrolments)[number] | null>(null);
  /* Putting unspent hours back into a course the child has joined. */
  const [claiming, setClaiming] = useState(false);
  const [claimTo, setClaimTo] = useState("");
  const [enrolmentValues, setEnrolmentValues] = useState<CrudValues>({});
  /* What lands on the new enrolment. null means "follow the computed
     conversion" — the field shows the sum's answer until the office types
     over it, and a hand-typed figure is what gets written. */
  const [moveAmount, setMoveAmount] = useState<string | null>(null);
  /* The moved credits' expiry. The transfer used to write the incoming entry
     with no expiry_date at all, so a moved balance quietly stopped expiring —
     and the parent portal read "valid until —" off it. Prefilled from the
     balance being moved. */
  const [moveExpiry, setMoveExpiry] = useState("");

  /** What is left on one enrolment. */
  function balanceOf(enrolmentId: string): number {
    return raw.creditTransactions
      .filter((tx) => String(tx["enrollment_id"]) === enrolmentId)
      .reduce((sum, tx) => sum + Number(tx["amount"] ?? 0), 0);
  }

  /**
   * The entries no enrolment claims — hours this child holds, unspent.
   *
   * They are what deleting an enrolment leaves behind. `credit_transaction`
   * carries its own `student_id` and `class_id` since backend 0026, so a
   * detached entry still says whose it is and what it was bought for, which is
   * what lets it be converted into a course later.
   */
  const looseCredits = useMemo(
    () =>
      raw.creditTransactions.filter(
        (tx) =>
          !String(tx["enrollment_id"] ?? "") && String(tx["student_id"] ?? "") === student.id,
      ),
    [raw.creditTransactions, student.id],
  );
  const looseBalance = looseCredits.reduce((sum, tx) => sum + Number(tx["amount"] ?? 0), 0);

  /**
   * What the loose hours are worth, each entry priced in its own course.
   *
   * A balance held outside any course is rarely one purchase. Twenty hours of
   * Beginner, moved to Intermediate at a different rate, then both enrolments
   * deleted, leaves three entries — +20 Beginner, −20 Beginner, +16.5
   * Intermediate — and the *number* left is 16.5 while what it is worth is
   * Intermediate money.
   *
   * This used to read the course off `looseCredits.at(-1)`, one arbitrary
   * entry standing in for the whole balance. Rejoining Beginner then priced
   * Intermediate hours at Beginner's rate and handed back the same 16.5
   * instead of the larger number that money buys.
   */
  const looseLots = useMemo(
    () =>
      looseCredits.map((tx) => ({
        credits: Number(tx["amount"] ?? 0),
        rate: rateOf("", String(tx["class_id"] ?? "")),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [looseCredits, raw.creditPackages],
  );
  const looseValue = valueOfLots(looseLots);

  /* Named where they all came from one course; a balance built from several
     has no single course to name, and saying one of them would be the same
     mistake in prose. */
  const looseClassIds = Array.from(
    new Set(looseCredits.map((tx) => String(tx["class_id"] ?? "")).filter(Boolean)),
  );
  const looseClassName =
    looseClassIds.length === 1
      ? raw.classes.find((c) => String(c["class_id"]) === looseClassIds[0])?.["name"]?.toString() ?? ""
      : "";
  const looseExpiry =
    looseCredits.map((tx) => String(tx["expiry_date"] ?? "")).filter(Boolean).sort().at(-1) ?? "";
  /* Where loose hours can go: a course the child is actually in. */
  const activeEnrolmentTargets = enrolments.filter((e) => isActiveEnrolment({ status: e.status }));

  /**
   * Puts unspent hours into a course the child has joined.
   *
   * The same act as a transfer between two enrolments, with the same
   * arithmetic — the balance is worth what it was worth, and the hours change
   * with the rate. What differs is only where it starts: nothing, rather than
   * another enrolment. So the outgoing side is a matching entry against the
   * loose balance, keeping the ledger's habit of showing where hours went.
   */
  async function claimLooseCredits(toEnrolmentId: string, amount: number, expiry: string) {
    const target = enrolments.find((e) => e.id === toEnrolmentId);
    if (!target || looseBalance <= 0) return;
    const today = new Date().toISOString().slice(0, 10);

    /* One settling entry per course, not one for the lot. A single −16.5 row
       would have to name a course, and naming any of them re-tells the lie
       this change exists to stop: it would be Intermediate hours filed under
       Beginner, priceable at the wrong rate for ever after. Netting each
       course separately keeps every row worth exactly what it says. */
    const byCourse = new Map<string, number>();
    for (const tx of looseCredits) {
      const classId = String(tx["class_id"] ?? "");
      byCourse.set(classId, (byCourse.get(classId) ?? 0) + Number(tx["amount"] ?? 0));
    }

    await batch(async () => {
      for (const [classId, net] of byCourse) {
        if (net === 0) continue;
        await create("credit-transactions", {
          student_id: student.id,
          ...(classId ? { class_id: classId } : {}),
          transaction_type: "manual_adjustment",
          amount: -net,
          transaction_date: today,
          notes: t("movedOut", { className: target.className }),
        });
      }
      await create("credit-transactions", {
        enrollment_id: target.id,
        student_id: student.id,
        class_id: target.classId,
        transaction_type: "manual_adjustment",
        amount,
        transaction_date: today,
        ...(expiry ? { expiry_date: expiry } : {}),
        notes: looseClassName
          ? t("movedIn", { className: looseClassName })
          : t("looseMovedIn"),
      });
    });
  }

  /** The latest expiry on an enrolment's ledger — the same "last date any of
      it is good for" rule the balance chip and the parent portal use. */
  function expiryOf(enrolmentId: string): string {
    return raw.creditTransactions
      .filter((tx) => String(tx["enrollment_id"]) === enrolmentId)
      .map((tx) => String(tx["expiry_date"] ?? ""))
      .filter(Boolean)
      .sort()
      .at(-1) ?? "";
  }

  /**
   * What an hour costs in a class, from that class's own credit package.
   *
   * The package the credits were bought under when the payment says which —
   * a family who paid last term's price keeps last term's hours — and the
   * class's current package otherwise. Never a figure held here: a level the
   * academy adds next term prices itself the day it exists.
   */
  function rateOf(enrolmentId: string, classId: string): CreditRate {
    /**
     * Only when there is an enrolment to look up.
     *
     * `String(p["enrollment_id"] ?? "") === ""` is true of every payment that
     * has no enrolment — so an empty id here did not mean "no payment", it
     * meant "the first detached payment on file", and the rate came back off
     * whatever package that one happened to buy. For a course being moved
     * *into* — which has no enrolment yet, and so was always asked for with an
     * empty id — that is a conversion computed against an unrelated course's
     * price list.
     *
     * Detached payments are not rare, either: deleting an enrolment nulls
     * `enrollment_id` on its payments and keeps the receipt, so the longer the
     * office tidies the list the more of them there are.
     */
    const payment = enrolmentId
      ? raw.payments.find(
          (p) =>
            String(p["enrollment_id"] ?? "") === enrolmentId &&
            String(p["status"] ?? "Paid") === "Paid" &&
            String(p["credit_package_id"] ?? ""),
        )
      : undefined;
    const bought = payment
      ? raw.creditPackages.find(
          (k) => String(k["credit_package_id"]) === String(payment["credit_package_id"]),
        )
      : undefined;
    const pkg =
      bought ?? raw.creditPackages.find((k) => String(k["class_id"] ?? "") === classId);
    return {
      credits: Number(pkg?.["credit_amount"] ?? 0),
      price: Number(pkg?.["standard_price"] ?? 0),
    };
  }

  /**
   * Whether anything is hanging off this enrolment.
   *
   * `credit_transaction.enrollment_id` is NOT NULL, so the moment a child has
   * bought credits for a class or attended one of its sessions, the database
   * refuses to delete the row — which is what the office kept running into.
   */
  function enrolmentHasHistory(id: string): boolean {
    return (
      raw.creditTransactions.some((tx) => String(tx["enrollment_id"]) === id) ||
      raw.payments.some((p) => String(p["enrollment_id"] ?? "") === id)
    );
  }

  /**
   * Takes a child out of a class.
   *
   * An enrolment nobody has spent anything against is a mistake being undone,
   * and goes. One with credits or payments behind it is a term that happened:
   * the row already has a word for that — Withdrawn — and the ledger it
   * carries has to stay, or a receipt loses what it was for.
   *
   * Either way the child leaves the class: nothing offers a withdrawn
   * enrolment's sessions, and the desk cannot check them into it.
   */
  async function leaveClass(id: string) {
    if (enrolmentHasHistory(id)) await update("enrollments", id, { status: "Withdrawn" });
    else await remove("enrollments", id);
  }

  /**
   * The courses a child could move to from this enrolment.
   *
   * Every course the academy still runs, less the one they are moving out of
   * and any they are already in — moving a child to a course they attend would
   * make a second enrolment for the same pair, and then two balances and two
   * rosters for one child in one room.
   */
  function changeTargets(from: (typeof enrolments)[number]) {
    const alreadyIn = new Set(
      enrolments.filter((e) => isActiveEnrolment({ status: e.status })).map((e) => e.classId),
    );
    return liveClasses({ classes: raw.classes })
      .map((c) => ({ id: String(c["class_id"]), name: String(c["name"] ?? "") }))
      .filter((c) => c.id !== from.classId && !alreadyIn.has(c.id));
  }

  /**
   * Moves a child from one course to another as a single act.
   *
   * Order matters. The new enrolment is written first because the credits need
   * somewhere to land; then the balance is converted across at the two
   * courses' rates ([[credits-follow-the-child]]); then the old enrolment is
   * left. Leaving it last also decides its fate correctly: the outgoing ledger
   * entry gives it a history, so `leaveClass` withdraws it and keeps the
   * record instead of deleting a row a receipt still points at.
   *
   * The new row carries `moved_from_class_id`. Without it a move is a
   * Withdrawn row and an Active row with nothing joining them, and "why did
   * this child stop attending Beginner" cannot be told apart from "they left
   * the academy" — least of all when there was no balance to move and the
   * ledger notes that used to be the only trace were never written.
   */
  async function changeCourse(
    from: (typeof enrolments)[number],
    toClassId: string,
    credits: { carry: boolean; credits: number; expiry: string },
  ) {
    const target = changeTargets(from).find((c) => c.id === toClassId);
    if (!target) return;
    const today = new Date().toISOString().slice(0, 10);
    const balance = balanceOf(from.id);

    await batch(async () => {
      const created = await create("enrollments", {
        student_id: student.id,
        class_id: target.id,
        enrolled_date: today,
        moved_from_class_id: from.classId,
      });
      const toId = String(created["enrollment_id"]);

      if (credits.carry && balance > 0) {
        /* Two entries, not one edited number: the ledger has to show where the
           hours went and where they came from, or a balance appears to have
           changed on its own. The expiry rides on the incoming entry only — it
           says how long the added credits are good for, which a removal is
           not. */
        /* `student_id` and `class_id` on every entry, so it still says whose
           the hours are and what they were bought for if the enrolment is
           deleted out from under it later. */
        await create("credit-transactions", {
          enrollment_id: from.id,
          student_id: student.id,
          class_id: from.classId,
          transaction_type: "manual_adjustment",
          amount: -balance,
          transaction_date: today,
          notes: t("movedOut", { className: target.name }),
        });
        await create("credit-transactions", {
          enrollment_id: toId,
          student_id: student.id,
          class_id: target.id,
          transaction_type: "manual_adjustment",
          amount: credits.credits,
          transaction_date: today,
          ...(credits.expiry ? { expiry_date: credits.expiry } : {}),
          notes: t("movedIn", { className: from.className }),
        });
      }

      await leaveClass(from.id);
    });
  }

  /**
   * Removes an enrolment, without removing what the family paid for.
   *
   * This is the list's tidy-up: a course a child left, kept only because the
   * row carries its ledger. The first version of this deleted that ledger, and
   * a child whose only enrolment went took their balance to zero with it —
   * thirteen paid-for hours, gone, with no way to put them back.
   *
   * So the dependants are moved aside rather than destroyed:
   *
   * 1. **Payments are detached.** `payment.enrollment_id` is nullable and a
   *    payment has carried its own `student_name` and `class_name` since
   *    `0006` — it was built to outlive what it points at, so the receipt
   *    still reads.
   * 2. **Credit entries are detached too**, since backend `0026`. They keep
   *    `student_id` and `class_id`, so the hours stay on the child's balance,
   *    still know what they were bought for, and can be converted into a
   *    course whenever the child joins one.
   *
   * Nothing here deletes money or hours. The enrolment row is the only thing
   * that goes, which is all the office asked for.
   */
  function enrolmentDependants(id: string) {
    return {
      credits: raw.creditTransactions.filter((tx) => String(tx["enrollment_id"]) === id),
      payments: raw.payments.filter((p) => String(p["enrollment_id"] ?? "") === id),
    };
  }

  async function deleteEnrolment(id: string) {
    const enrolment = enrolments.find((e) => e.id === id);
    const { credits, payments } = enrolmentDependants(id);
    await batch(async () => {
      for (const p of payments) {
        await update("payments", String(p["payment_id"]), { enrollment_id: null });
      }
      for (const tx of credits) {
        await update("credit-transactions", String(tx["credit_transaction_id"]), {
          enrollment_id: null,
          /* Written explicitly rather than trusted: rows created before 0026
             were backfilled, but one written by an older console in between
             would have neither, and a detached entry without them is a credit
             belonging to nobody. */
          student_id: student.id,
          ...(enrolment?.classId ? { class_id: enrolment.classId } : {}),
        });
      }
      await remove("enrollments", id);
    });
  }

  const enrolmentFields: CrudField[] = useMemo(
    () => [
      {
        name: "class_id",
        label: tCommon("class"),
        kind: "select",
        required: true,
        /* Nobody can be enrolled into a class the academy has retired. */
        options: liveClasses({ classes: raw.classes }).map((c) => ({ value: String(c["class_id"]), label: String(c["name"] ?? "") })),
      },
      { name: "enrolled_date", label: t("enrolledDate"), kind: "date", required: true, half: true },
      /* No status picker: joining a class is always joining it. The form used
         to offer all three, so the desk could enrol a child as Withdrawn — a
         row that puts them in a class and takes them out of it at once. */
    ],
    [raw.classes, t, tCommon],
  );

  function openAddEnrolment() {
    const first = liveClasses({ classes: raw.classes })[0];
    setAddingEnrolment(true);
    setEnrolmentValues({
      class_id: first ? String(first["class_id"]) : "",
      enrolled_date: new Date().toISOString().slice(0, 10),
    });
  }

  const [creditModal, setCreditModal] = useState<(typeof creditRows)[number] | "new" | null>(null);
  const [creditValues, setCreditValues] = useState<CrudValues>({});
  const [deletingCredit, setDeletingCredit] = useState<(typeof creditRows)[number] | null>(null);

  const creditFields: CrudField[] = useMemo(
    () => [
      {
        name: "enrollment_id",
        label: t("enrolment"),
        kind: "select",
        required: true,
        options: raw.enrollments
          .filter((e) => String(e["student_id"]) === student.id)
          .map((e) => {
            const cls = raw.classes.find((c) => String(c["class_id"]) === String(e["class_id"]));
            return {
              value: String(e["enrollment_id"]),
              label: cls ? String(cls["name"] ?? "") : String(e["enrollment_id"]),
            };
          }),
      },
      {
        name: "transaction_type",
        label: t("creditType"),
        kind: "select",
        required: true,
        half: true,
        options: CREDIT_TYPES.map((v) => ({ value: v, label: t(`creditType_${v}`) })),
      },
      {
        name: "amount",
        label: tCommon("amount"),
        kind: "number",
        required: true,
        half: true,
        /* One credit is an hour, so half a credit is a real half-hour lesson.
           Without a step the spinner counts in whole hours and the browser
           calls 13.5 a mistake. */
        step: 0.5,
        help: t("creditAmountHelp"),
      },
      { name: "transaction_date", label: tCommon("date"), kind: "date", required: true, half: true },
      { name: "expiry_date", label: t("expires"), kind: "date", half: true },
      { name: "notes", label: t("notes"), kind: "textarea" },
    ],
    [raw.enrollments, raw.classes, student.id, t, tCommon],
  );

  function openCreditModal(row: (typeof creditRows)[number] | "new") {
    setCreditModal(row);
    const today = new Date().toISOString().slice(0, 10);
    setCreditValues(
      row === "new"
        ? {
            enrollment_id: enrolmentIds[0] ?? "",
            transaction_type: "manual_adjustment",
            amount: "",
            transaction_date: today,
            expiry_date: "",
            notes: "",
          }
        : {
            enrollment_id: row.enrollmentId,
            transaction_type: row.type,
            amount: String(row.amount),
            transaction_date: row.date,
            expiry_date: row.expiry,
            notes: row.notes,
          },
    );
  }

  const practice = useMemo(() => practiceStrip(raw, student.id), [raw, student.id]);

  /* This student's real payments, newest first — the tab used to show a
     generated set that had nothing to do with what the office recorded. */
  const payments = useMemo(
    () =>
      raw.payments
        .filter((p) => String(p["student_id"]) === student.id)
        .map((p) => {
          const enr = raw.enrollments.find((e) => String(e["enrollment_id"]) === String(p["enrollment_id"]));
          const cls = enr ? raw.classes.find((c) => String(c["class_id"]) === String(enr["class_id"])) : undefined;
          const pkg = raw.creditPackages.find(
            (k) => String(k["credit_package_id"]) === String(p["credit_package_id"]),
          );
          return {
            id: String(p["payment_id"]),
            className: cls ? String(cls["name"] ?? "") : "—",
            credits: pkg ? `+${Number(pkg["credit_amount"] ?? 0)}` : "—",
            amount: fmtTHB(Number(p["final_amount"] ?? 0)),
            date: String(p["payment_date"] ?? ""),
            method: String(p["payment_method"] ?? ""),
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [raw.payments, raw.enrollments, raw.classes, raw.creditPackages, student.id],
  );

  /* The guardian's name when this student is their only child, so the delete
     panel can offer to take them too — otherwise null and nothing is asked. */
  const onlyChildOf = useMemo(() => {
    const link = raw.studentParents.find((sp) => String(sp["student_id"]) === student.id);
    if (!link) return null;
    const parentId = String(link["parent_id"]);
    const siblings = raw.studentParents.filter(
      (sp) => String(sp["parent_id"]) === parentId && String(sp["student_id"]) !== student.id,
    );
    if (siblings.length > 0) return null;
    const parent = raw.parents.find((p) => String(p["parent_id"]) === parentId);
    return parent ? String(parent["name"] ?? "") : null;
  }, [raw.studentParents, raw.parents, student.id]);

  /* `toStudents` writes "—" when there is no link at all. */
  const hasGuardian = student.parentName !== "" && student.parentName !== "—";

  const chip = statusChipColors(student.status);
  /* Every attendance row is a session the student was checked in to, so the
     count of them is the count present. */
  const presentCount = attendance.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <BackLink label={t("backToStudents")} onClick={onBack} />

      <DetailHeader
        avatar={<Avatar initials={initialsOf(student.name)} size={54} />}
        title={student.name}
        /* The STU-xxxx id is an internal key — the desk identifies students by
           name, so it isn't shown. */
        subtitle={`${t("yrs", { age: student.age })} · ${student.level}`}
        badges={
          <>
            <Badge color={chip.color} bg={chip.bg}>{tStatus(student.status)}</Badge>
            <Badge color={COLORS.blue} bg={COLORS.light}>
              {tCommon("creditsCount", { count: student.credit })}
            </Badge>
          </>
        }
        actions={
          !editing && (
            <>
              <EditButton
                onClick={() => {
                  setDraft(student);
                  setDeleteConfirm(false);
                  setTab("Overview");
                  setEditing(true);
                }}
              />
              <DeleteButton onClick={() => setDeleteConfirm(true)} />
            </>
          )
        }
      />

      {deleteConfirm && (
        <DangerPanel title={t("deleteTitle", { name: student.name })} body={t("deleteBody")}>
          {/* Only when this is the guardian's last child. With siblings left
              the guardian is simply kept, and there is nothing to ask. */}
          {onlyChildOf && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                margin: "0 0 12px",
                fontFamily: FONT,
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={alsoParent}
                onChange={(e) => setAlsoParent(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: COLORS.danger, cursor: "pointer" }}
              />
              {t("alsoDeleteParent", { name: onlyChildOf })}
            </label>
          )}
          <div style={{ display: "flex", gap: 9 }}>
            <button type="button" style={secondaryButtonStyle} onClick={() => setDeleteConfirm(false)}>
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              style={{
                ...dangerSolidButtonStyle,
                opacity: deleting ? 0.75 : 1,
                cursor: deleting ? "wait" : "pointer",
              }}
              disabled={deleting}
              onClick={() => {
                setDeleting(true);
                /* Released again on failure: the caller shows a toast, and
                   without this the button stayed disabled reading "Deleting…"
                   with no way to retry. */
                void Promise.resolve(onDelete(student.id, alsoParent)).finally(() =>
                  setDeleting(false),
                );
              }}
            >
              {deleting ? tCommon("deleting") : t("deleteConfirm")}
            </button>
          </div>
        </DangerPanel>
      )}

      {/* Hidden while editing: the form only covers Overview, and leaving the
          tabs live would let a half-finished edit scroll out of sight. */}
      <div
        style={{
          display: editing ? "none" : "flex",
          gap: 18,
          borderBottom: `1px solid ${COLORS.border}`,
          flexWrap: "wrap",
        }}
      >
        {DETAIL_TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "10px 2px",
              fontFamily: FONT,
              fontSize: 14.5,
              fontWeight: 600,
              color: tab === name ? COLORS.blue : COLORS.textSecondary,
              borderBottom: `2px solid ${tab === name ? COLORS.blue : "transparent"}`,
            }}
          >
            {t(`tab${name}`)}
          </button>
        ))}
      </div>

      {tab === "Overview" && editing && (
        <>
          <div className="jt-duo">
            <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionTitle>{t("studentSection")}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="ed-name">{t("fullName")}</label>
                  <input id="ed-name" value={draft.name} onChange={(e) => setField("name", e.target.value)} style={fieldStyle} />
                </div>
                {/* Course, Branch and Membership used to be fields here. None
                    of them is a column on the student: the course comes from
                    the enrolment, membership is not a thing the academy has,
                    and Branch had nowhere to store it. They were editable, and
                    every edit was discarded. Which of a
                    child's courses they are in is a real question with a real
                    answer — it is the Enrolments tab, which moves the credits
                    with them. */}
                <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                  {t("courseOnEnrolments")}
                </p>
                <div>
                  <label style={labelStyle} htmlFor="ed-dob">{t("dateOfBirth")}</label>
                  <input
                    id="ed-dob"
                    type="date"
                    value={draft.dateOfBirth}
                    onChange={(e) => setField("dateOfBirth", e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                {/* Back, and this time with a column behind it. A child can
                    move between sites, and the answer registration collects
                    has to be correctable somewhere. */}
                <div>
                  <label style={labelStyle} htmlFor="ed-branch">{tCommon("branch")}</label>
                  <select
                    id="ed-branch"
                    value={draft.branch}
                    onChange={(e) => setField("branch", e.target.value)}
                    style={selectStyle}
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-level">{t("level")}</label>
                  <select id="ed-level" value={draft.level} onChange={(e) => setField("level", e.target.value)} style={selectStyle}>
                    {LEVEL_OPTIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-school">{t("currentSchool")}</label>
                  <input id="ed-school" value={draft.school} onChange={(e) => setField("school", e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-fide">{t("fideId")}</label>
                  <input id="ed-fide" value={draft.fideId} onChange={(e) => setField("fideId", e.target.value)} style={fieldStyle} />
                </div>
                {/* The student's own LINE ID was a field with nothing behind
                    it in either direction — `toStudents` sets it to "" every
                    time, and there is no column to write it to. A box that is
                    always empty and always stays empty is not a field. */}
              </div>
            </Card>

            {/* A parent is their own record, shared with their other children.
                Editing their name or phone number from here would be editing a
                person through one of their children — and the same details are
                on the Parents screen, on their own page, where a change is
                visibly a change to *them*. So this card chooses which parent,
                and how they are related to this child; both of those are facts
                about the link, and this is the only place they live. Their
                details are shown, read-only, with the way to change them. */}
            <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionTitle>{t("parentSection")}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="ed-pguardian">{t("chooseGuardian")}</label>
                  <select
                    id="ed-pguardian"
                    value={draft.parentId}
                    onChange={(e) => setField("parentId", e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">{t("noGuardianOption")}</option>
                    {guardianOptions.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-prel">{t("relation")}</label>
                  <select
                    id="ed-prel"
                    value={draft.parentRelation}
                    disabled={!draft.parentId}
                    onChange={(e) => setField("parentRelation", e.target.value)}
                    style={{ ...selectStyle, opacity: draft.parentId ? 1 : 0.6 }}
                  >
                    {RELATION_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {draft.parentId === student.parentId && hasGuardian && (
                  <>
                    <InfoGrid
                      rows={[
                        { label: tCommon("phone"), value: student.parentPhone || "—" },
                        { label: tCommon("email"), value: student.parentEmail || "—" },
                        { label: tCommon("lineId"), value: student.parentLineId || "—" },
                      ]}
                    />
                    <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                      {t("parentDetailsOnParents")}
                    </p>
                    <button
                      type="button"
                      className="jt-btn-ghost"
                      style={{ ...secondaryButtonStyle, alignSelf: "flex-start" }}
                      onClick={() => router.push(`/parents?id=${encodeURIComponent(student.parentId)}`)}
                    >
                      <Icon name="parents" size={14} /> {t("openParent", { name: student.parentName })}
                    </button>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Whatever the server actually said, on the form, beside the button
              that failed — not a generic "could not save" four seconds long in
              a corner. */}
          {saveError && <ErrorNote>{saveError}</ErrorNote>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              className="jt-btn-ghost"
              style={secondaryButtonStyle}
              onClick={() => { setSaveError(null); setEditing(false); }}
            >
              {tCommon("cancel")}
            </button>
            <ActionButton
              className="jt-btn-primary"
              style={primaryButtonStyle}
              disabled={!draft.name.trim()}
              busyLabel={tCommon("saving")}
              onClick={async () => {
                setSaveError(null);
                try {
                  /* The child and their guardian link in one act, so a
                     correction costs one refetch rather than three. */
                  await batch(async () => {
                    await onSave(draft);
                    await saveGuardianLink(draft);
                  });
                } catch (e) {
                  /* The form stays open, with what went wrong written on it.
                     It used to close either way and put a toast in the corner,
                     which is four seconds of something you may not be looking
                     at — after which the screen shows the old values back and
                     is indistinguishable from a save that worked. "I changed
                     it and it did not change" is what that looks like from the
                     desk, and it is not a thing the office should have to
                     diagnose. */
                  setSaveError(saveFailureText(e, tCommon("saveFailed")));
                  return;
                }
                setEditing(false);
              }}
            >
              {tCommon("save")}
            </ActionButton>
          </div>
        </>
      )}

      {tab === "Overview" && !editing && (
        <div className="jt-duo">
          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionTitle>{t("studentSection")}</SectionTitle>
            <InfoGrid
              rows={[
                { label: tCommon("class"), value: student.className },
                { label: tCommon("branch"), value: student.branch },
                /* Shown, not just implied by the age in the header. The only
                   trace of it used to be that number, so an office checking
                   whether a correction had saved had to work backwards from
                   it — and a wrong date and a missing one look identical
                   that way. */
                { label: t("dateOfBirth"), value: fmtDate(student.dateOfBirth) || "—" },
                { label: t("level"), value: student.level },
                { label: t("currentSchool"), value: student.school || "—" },
                { label: t("fideIdLabel"), value: student.fideId || "—" },
                /* One identifier, two kinds of thing: an ID for the children,
                   who have no mailbox, and a real address for an older student
                   who gave one. Labelled by what this row actually holds
                   rather than by which is more common, because the answer
                   decides whether the desk can write to it. */
                {
                  label: student.email && !student.email.includes("@") ? t("loginId") : tCommon("email"),
                  value: student.email || t("noAccountYet"),
                },
                { label: t("joined"), value: student.joinedDate },
                /* Membership, credits expire and the student's LINE ID used to
                   sit here. Membership was never a thing the academy has:
                   registration does not ask for it, no table records it, and
                   the row was filled with the course's own `class_type` — so
                   a child in Beginner had a "Beginner" membership, which is
                   the course said twice and a tier the office might act on.
                   Neither is a fact about the child. An expiry belongs to the
                   credits that were bought and is counted from the payment
                   that bought them — one child can hold several with different
                   dates, so a single row on their profile is at best the
                   latest of them and at worst a number the desk plans around.
                   It is on the Credits tab, per entry, where it means
                   something. The LINE ID was never collected at registration
                   and has no column: an empty row that no screen can ever
                   fill. */
              ]}
            />
          </Card>
          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <SectionTitle>{t("parentSection")}</SectionTitle>
              {hasGuardian && (
                <button
                  type="button"
                  className="jt-btn-ghost"
                  style={{ ...secondaryButtonStyle, padding: "6px 12px", fontSize: 13 }}
                  onClick={() => onUnlinkGuardian()}
                >
                  {t("unlinkGuardian")}
                </button>
              )}
            </div>
            {hasGuardian ? (
              <InfoGrid
                rows={[
                  { label: tCommon("name"), value: student.parentName },
                  { label: t("relation"), value: student.parentRelation },
                  { label: tCommon("phone"), value: student.parentPhone },
                  { label: tCommon("email"), value: student.parentEmail },
                  { label: tCommon("lineId"), value: student.parentLineId },
                ]}
              />
            ) : (
              /* A child can end up here by being registered without one, or by
                 having their guardian deleted. Either way the fix belongs on
                 this page — the office is already looking at the child. */
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
                  {t("noGuardian")}
                </p>
                {guardianOptions.length === 0 ? (
                  <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                    {t("noGuardiansYet")}
                  </p>
                ) : (
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: "1 1 170px" }}>
                      <label style={labelStyle} htmlFor="sd-guardian">{t("chooseGuardian")}</label>
                      <select
                        id="sd-guardian"
                        value={guardianId}
                        onChange={(e) => setGuardianId(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">—</option>
                        {guardianOptions.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: "0 1 140px" }}>
                      <label style={labelStyle} htmlFor="sd-relation">{t("relation")}</label>
                      <select
                        id="sd-relation"
                        value={guardianRelation}
                        onChange={(e) => setGuardianRelation(e.target.value)}
                        style={selectStyle}
                      >
                        {RELATION_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <ActionButton
                      className="jt-btn-primary"
                      style={primaryButtonStyle}
                      disabled={!guardianId}
                      busyLabel={tCommon("saving")}
                      onClick={() => onLinkGuardian(guardianId, guardianRelation)}
                    >
                      {t("linkGuardian")}
                    </ActionButton>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {creditModal && (
        <CrudFormModal
          title={creditModal === "new" ? t("addCredit") : t("editCredit")}
          fields={creditFields}
          values={creditValues}
          onChange={setCreditValues}
          onClose={() => setCreditModal(null)}
          onSubmit={async (payload) => {
            /* Stamped with whose hours these are and which course they were
               bought for, so the entry survives its enrolment being deleted
               and still has a rate to convert at afterwards. The class is read
               off the enrolment the form chose. */
            const chosen = raw.enrollments.find(
              (e) => String(e["enrollment_id"]) === String(payload["enrollment_id"] ?? ""),
            );
            const stamped = {
              ...payload,
              student_id: student.id,
              ...(chosen ? { class_id: String(chosen["class_id"] ?? "") } : {}),
            };
            if (creditModal === "new") await create("credit-transactions", stamped);
            else await update("credit-transactions", creditModal.id, stamped);
          }}
        />
      )}

      {deletingCredit && (
        <ConfirmDeleteModal
          what={t("creditEntry", { amount: deletingCredit.amount, date: fmtDate(deletingCredit.date) })}
          onClose={() => setDeletingCredit(null)}
          onConfirm={() => remove("credit-transactions", deletingCredit.id)}
        />
      )}

      {tab === "Overview" && !editing && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <SectionTitle>{t("enrolments")}</SectionTitle>
            <AddButton label={t("addEnrolment")} onClick={openAddEnrolment} />
          </div>
          {/* Hours the child holds and has not spent anywhere — what is left
              when the enrolment that recorded them is deleted. They used to
              vanish with it; now they sit here, on the balance, waiting for a
              course to be put into. */}
          {looseBalance > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                padding: "12px 14px",
                borderRadius: 10,
                border: `1px dashed ${COLORS.blue}`,
                background: COLORS.light,
              }}
            >
              <Icon name="wallet" size={17} color={COLORS.blue} />
              <span style={{ flex: "1 1 200px", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>
                  {t("looseCredits", { credits: fmtCredits(looseBalance) })}
                </span>
                <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                  {looseClassName ? t("looseFrom", { className: looseClassName }) : t("looseNoCourse")}
                </span>
              </span>
              <button
                type="button"
                className="jt-btn-primary"
                style={{ ...primaryButtonStyle, padding: "6px 13px", fontSize: 12.5 }}
                disabled={activeEnrolmentTargets.length === 0}
                title={activeEnrolmentTargets.length === 0 ? t("looseNeedsCourse") : undefined}
                onClick={() => {
                  setClaimTo(activeEnrolmentTargets[0]?.id ?? "");
                  setMoveAmount(null);
                  setMoveExpiry(looseExpiry);
                  setClaiming(true);
                }}
              >
                {t("looseMoveIn")}
              </button>
            </div>
          )}
          {/* A child with nothing but loose credits has no enrolments to list,
              and saying so under a balance they can still spend would read as
              a contradiction. */}
          {enrolments.length === 0 ? (
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
              {looseBalance > 0 ? t("noEnrolmentsYetCredits") : t("noEnrolments")}
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {enrolments.map((e) => {
                const active = isActiveEnrolment({ status: e.status });
                const balance = balanceOf(e.id);
                const nowhereToGo = changeTargets(e).length === 0;
                return (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                    /* A course they have left is history, not a live
                       enrolment. Dimming the row says so at a glance, which
                       the status chip alone stopped doing once a child had
                       three of them. */
                    background: active ? COLORS.surface : COLORS.bg,
                  }}
                >
                  <ClassDot color={classDotColor(e.className)} />

                  <span style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>
                        {e.className}
                      </span>
                      <Badge
                        color={active ? COLORS.success : COLORS.textSecondary}
                        bg={active ? COLORS.successBg : COLORS.neutralBg}
                      >
                        {tStatus(e.status)}
                      </Badge>
                      {/* Where the hours actually are. A left course still
                          holding a balance is the one row on this list that
                          needs a decision, and it used to take opening the
                          Credits tab to find that out. */}
                      {balance > 0 && (
                        <Badge color={COLORS.blue} bg={COLORS.light}>
                          {tCommon("creditsCount", { count: balance })}
                        </Badge>
                      )}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                      {fmtDate(e.enrolledDate)}
                      {e.movedFrom ? ` · ${t("movedFromCourse", { className: e.movedFrom })}` : ""}
                    </span>
                  </span>

                  {/* Both actions in the same place on every row, present or
                      disabled rather than appearing and vanishing — the office
                      reaches for the same spot each time. */}
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {/* Only out of a course they are in: there is no moving
                        out of one they already left. */}
                    {active && (
                      <button
                        type="button"
                        className="jt-btn-ghost"
                        aria-label={t("changeCourseFrom", { className: e.className })}
                        disabled={nowhereToGo}
                        title={nowhereToGo ? t("changeCourseNowhere") : undefined}
                        style={{
                          ...secondaryButtonStyle,
                          padding: "6px 12px",
                          fontSize: 12.5,
                          opacity: nowhereToGo ? 0.5 : 1,
                          cursor: nowhereToGo ? "not-allowed" : "pointer",
                        }}
                        onClick={() => {
                          setChangeTo(changeTargets(e)[0]?.id ?? "");
                          setChangeCarry(balance > 0);
                          setMoveAmount(null);
                          setMoveExpiry(expiryOf(e.id));
                          setChanging(e);
                        }}
                      >
                        <Icon name="refund" size={13} /> {t("changeCourse")}
                      </button>
                    )}
                    {/* On every row. It used to be offered only where nothing
                        hung off the enrolment, which hid it on exactly the
                        rows this list needs tidying of — the left-behind ones,
                        every one of which carries the ledger entry that moved
                        its credits out. */}
                    <button
                      type="button"
                      className="jt-btn-ghost"
                      aria-label={t("deleteEnrolmentFrom", { className: e.className })}
                      style={{
                        ...secondaryButtonStyle,
                        padding: "6px 12px",
                        fontSize: 12.5,
                        color: COLORS.danger,
                      }}
                      onClick={() => setDeletingEnrolment(e)}
                    >
                      <Icon name="trash" size={13} color={COLORS.danger} /> {tCommon("delete")}
                    </button>
                  </span>
                </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {addingEnrolment && (
        <CrudFormModal
          title={t("addEnrolment")}
          fields={enrolmentFields}
          values={enrolmentValues}
          onChange={setEnrolmentValues}
          onClose={() => setAddingEnrolment(false)}
          onSubmit={async (payload) => {
            await create("enrollments", { ...payload, student_id: student.id, status: "Active" });
          }}
        />
      )}

      {deletingEnrolment && (() => {
        const { credits, payments } = enrolmentDependants(deletingEnrolment.id);
        return (
          <ConfirmDeleteModal
            what={t("enrolmentIn", { className: deletingEnrolment.className })}
            /* Named exactly, because the same click means two very different
               things depending on the row: tidying away an empty enrolment, or
               deleting a term of credit history. */
            note={
              credits.length === 0 && payments.length === 0
                ? t("enrolmentDeleteNote")
                : t("enrolmentDeleteWithLedger", {
                    credits: credits.length,
                    payments: payments.length,
                  })
            }
            onClose={() => setDeletingEnrolment(null)}
            onConfirm={() => deleteEnrolment(deletingEnrolment.id)}
          />
        );
      })()}

      {claiming && (() => {
        const target = activeEnrolmentTargets.find((e) => e.id === claimTo) ?? activeEnrolmentTargets[0];
        /* Money in, hours out. Each loose entry is priced in its own course
           and the total is converted into the one being joined — which is the
           only sum that survives a balance built from more than one course. */
        const toRate = target ? rateOf(target.id, target.classId) : null;
        const landing =
          looseValue !== null && toRate ? creditsForValue(looseValue, toRate) : null;
        const suggested = String(landing ?? roundCredits(looseBalance));
        const amountText = moveAmount ?? suggested;
        const amount = Number(amountText);
        const amountOk = amountText.trim() !== "" && Number.isFinite(amount) && amount > 0;
        return (
          <Modal
            title={t("looseMoveInTitle")}
            width={470}
            onClose={() => setClaiming(false)}
            footer={
              <>
                <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setClaiming(false)}>
                  {tCommon("cancel")}
                </button>
                <ActionButton
                  className="jt-btn-primary"
                  style={primaryButtonStyle}
                  disabled={!target || !amountOk}
                  busyLabel={tCommon("saving")}
                  onClick={async () => {
                    if (!target || !amountOk) return;
                    await claimLooseCredits(target.id, roundCredits(amount), moveExpiry);
                    setClaiming(false);
                  }}
                >
                  {t("looseMoveIn")}
                </ActionButton>
              </>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {looseClassName
                  ? t("looseMoveInIntro", { credits: fmtCredits(looseBalance), className: looseClassName })
                  : t("looseMoveInIntroNoCourse", { credits: fmtCredits(looseBalance) })}
              </p>

              <div>
                <label style={labelStyle} htmlFor="cl-target">{t("moveCreditsTo")}</label>
                <select
                  id="cl-target"
                  value={target?.id ?? ""}
                  onChange={(e) => { setClaimTo(e.target.value); setMoveAmount(null); }}
                  style={selectStyle}
                >
                  {activeEnrolmentTargets.map((e) => (
                    <option key={e.id} value={e.id}>{e.className}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle} htmlFor="cl-amount">{t("moveAmount")}</label>
                  <input
                    id="cl-amount"
                    type="number"
                    min={0}
                    step={0.5}
                    value={amountText}
                    onChange={(e) => setMoveAmount(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle} htmlFor="cl-expiry">{t("expires")}</label>
                  <input
                    id="cl-expiry"
                    type="date"
                    value={moveExpiry}
                    onChange={(e) => setMoveExpiry(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
              </div>

              {/* The sum in full. What is preserved is the money, so the money
                  is the line in the middle — a family shown only two credit
                  counts has no way to see why one is larger. */}
              {landing !== null && looseValue !== null ? (
                <InfoGrid
                  rows={[
                    { label: t("moveFrom"), value: fmtCredits(looseBalance) },
                    { label: t("moveValue"), value: fmtTHB(looseValue) },
                    {
                      label: t("moveTo"),
                      value: t("creditsAtRate", {
                        credits: fmtCredits(roundCredits(amount) || 0),
                        className: target!.className,
                        rate: fmtTHB(ratePerCredit(toRate!) ?? 0),
                      }),
                    },
                  ]}
                />
              ) : (
                /* The course they were bought for may be retired, or never
                   have been priced. The hours carry across as they stand
                   rather than being held hostage to a price list. */
                <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                  {t("changeCourseNoRate")}
                </p>
              )}
            </div>
          </Modal>
        );
      })()}

      {changing && (() => {
        const targets = changeTargets(changing);
        const target = targets.find((c) => c.id === changeTo) ?? targets[0];
        const balance = balanceOf(changing.id);
        const plan = target
          ? planTransfer({
              balance,
              /* No enrolment id on the far side: it does not exist yet, so the
                 rate is the course's own package price, which is what a
                 balance there would have cost. */
              from: rateOf(changing.id, changing.classId),
              to: rateOf("", target.id),
            })
          : ({ ok: false, problem: "rateUnknown" } as const);
        /* The field follows the computed sum until somebody types; what is in
           the field is what gets written. Where no priced package says what an
           hour is worth on one side, the hours carry across as they stand
           rather than blocking the change — the office came here to move a
           child, not to price a course, and it can correct a number on the
           Credits tab. The note below says so. */
        const suggested = String(plan.ok ? plan.credits : roundCredits(balance));
        const amountText = moveAmount ?? suggested;
        const amount = Number(amountText);
        const amountOk = amountText.trim() !== "" && Number.isFinite(amount) && amount >= 0;
        const overridden = plan.ok && amountOk && roundCredits(amount) !== plan.credits;
        /* Carrying nothing is allowed — a balance can be left where it is —
           but carrying an unreadable number is not. */
        const canConfirm = Boolean(target) && (!changeCarry || balance <= 0 || amountOk);
        return (
          <Modal
            title={t("changeCourseTitle")}
            width={470}
            onClose={() => setChanging(null)}
            footer={
              <>
                <button
                  type="button"
                  className="jt-btn-ghost"
                  style={secondaryButtonStyle}
                  onClick={() => setChanging(null)}
                >
                  {tCommon("cancel")}
                </button>
                <ActionButton
                  className="jt-btn-primary"
                  style={primaryButtonStyle}
                  disabled={!canConfirm}
                  busyLabel={tCommon("saving")}
                  onClick={async () => {
                    if (!target || !canConfirm) return;
                    await changeCourse(changing, target.id, {
                      carry: changeCarry && balance > 0,
                      credits: roundCredits(amount),
                      expiry: moveExpiry,
                    });
                    setChanging(null);
                  }}
                >
                  {t("changeCourseConfirm")}
                </ActionButton>
              </>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("changeCourseIntro", { className: changing.className })}
              </p>

              <div>
                <label style={labelStyle} htmlFor="ch-target">{t("changeCourseTo")}</label>
                <select
                  id="ch-target"
                  value={target?.id ?? ""}
                  onChange={(e) => {
                    setChangeTo(e.target.value);
                    /* A figure typed against one course's rate says nothing
                       about another's; follow the new conversion until the
                       office types again. */
                    setMoveAmount(null);
                  }}
                  style={selectStyle}
                >
                  {targets.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Only when there is a balance to decide about. A tick box over
                  zero credits is a question with one answer. */}
              {balance > 0 && (
                <>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={changeCarry}
                      onChange={(e) => setChangeCarry(e.target.checked)}
                      style={{ marginTop: 3, cursor: "pointer" }}
                    />
                    <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.text }}>
                      {t("changeCourseCarry", { credits: fmtCredits(balance) })}
                    </span>
                  </label>

                  {changeCarry && (
                    <>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle} htmlFor="ch-amount">{t("moveAmount")}</label>
                          <input
                            id="ch-amount"
                            type="number"
                            min={0}
                            /* Half a credit is half an hour, and the academy
                               charges in half hours — so the grid the office
                               types on is the grid the conversion rounds to. */
                            step={0.5}
                            value={amountText}
                            onChange={(e) => setMoveAmount(e.target.value)}
                            style={fieldStyle}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle} htmlFor="ch-expiry">{t("expires")}</label>
                          <input
                            id="ch-expiry"
                            type="date"
                            value={moveExpiry}
                            onChange={(e) => setMoveExpiry(e.target.value)}
                            style={fieldStyle}
                          />
                        </div>
                      </div>

                      {overridden && (
                        <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                          {t("moveOverrideNote", { credits: fmtCredits(plan.ok ? plan.credits : 0) })}
                        </p>
                      )}

                      {/* The sum, in full, before anyone commits to it. A
                          credit is an hour and every course prices an hour
                          differently, so what moves is the money — the hours
                          change with it. */}
                      {plan.ok ? (
                        <InfoGrid
                          rows={[
                            {
                              label: t("moveFrom"),
                              value: t("creditsAtRate", {
                                credits: fmtCredits(balance),
                                className: changing.className,
                                rate: fmtTHB(plan.fromRate),
                              }),
                            },
                            {
                              label: t("moveTo"),
                              value: t("creditsAtRate", {
                                credits: fmtCredits(roundCredits(amount) || 0),
                                className: target!.name,
                                rate: fmtTHB(plan.toRate),
                              }),
                            },
                            { label: t("moveValue"), value: fmtTHB(plan.value) },
                          ]}
                        />
                      ) : (
                        <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                          {t("changeCourseNoRate")}
                        </p>
                      )}
                    </>
                  )}
                </>
              )}

              {/* What the row they are leaving will look like afterwards. The
                  two outcomes are different rows, and the office should not
                  have to find out which one it got. */}
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                {enrolmentHasHistory(changing.id) || (changeCarry && balance > 0)
                  ? t("changeCourseKeepsOld", { className: changing.className })
                  : t("changeCourseDropsOld", { className: changing.className })}
              </p>
            </div>
          </Modal>
        );
      })()}

      {tab === "Credits" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, flexWrap: "wrap" }}>
            <SectionTitle>{t("creditBalance", { count: student.credit })}</SectionTitle>
            <span style={{ marginLeft: "auto" }}>
              <AddButton label={t("addCredit")} onClick={() => openCreditModal("new")} />
            </span>
          </div>
          <Table
            columns={[tCommon("date"), t("creditType"), tCommon("amount"), t("expires"), tCommon("action")]}
            template={CREDIT_TEMPLATE}
            minWidth={720}
          >
            {creditRows.length === 0 && <EmptyRow>{t("noCredits")}</EmptyRow>}
            {creditRows.map((row) => (
              <TableRow key={row.id} template={CREDIT_TEMPLATE}>
                <span style={{ color: COLORS.textSecondary }}>{fmtDate(row.date)}</span>
                <span>{t(`creditType_${row.type}`)}</span>
                <span style={{ fontWeight: 700, color: row.amount < 0 ? COLORS.danger : COLORS.success }}>
                  {row.amount > 0 ? `+${row.amount}` : row.amount}
                </span>
                <span style={{ color: COLORS.textSecondary }}>{row.expiry ? fmtDate(row.expiry) : "—"}</span>
                <RowActions
                  label={t("creditEntry", { amount: row.amount, date: fmtDate(row.date) })}
                  onEdit={() => openCreditModal(row)}
                  onDelete={() => setDeletingCredit(row)}
                />
              </TableRow>
            ))}
          </Table>
        </Card>
      )}

      {tab === "Attendance" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 16px 0" }}>
            <SectionTitle>
              {t("attendanceSummary", { present: presentCount, total: attendance.length })}
            </SectionTitle>
          </div>
          <div style={{ marginTop: 12 }}>
            {/* No status column: every row in this list is an attended
                session, so a column reading "Present" all the way down told
                the reader nothing. */}
            <Table columns={[tCommon("date"), tCommon("class")]} template={ATTENDANCE_TEMPLATE} minWidth={420}>
              {attendance.length === 0 && <EmptyRow>{t("noAttendance")}</EmptyRow>}
              {attendance.map((row) => (
                <TableRow key={row.id} template={ATTENDANCE_TEMPLATE}>
                  <span style={{ color: COLORS.textSecondary }}>{fmtDate(row.date)}</span>
                  <span style={{ display: "flex", alignItems: "center" }}>
                    <ClassDot color={classDotColor(row.className)} />
                    {row.className}
                  </span>
                </TableRow>
              ))}
            </Table>
          </div>
        </Card>
      )}

      {tab === "Practice" && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionTitle>{t("practiceSummary", { days: practice.streak })}</SectionTitle>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
            {t("practiceHint")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, maxWidth: 320 }}>
            {practice.days.map((on, i) => (
              <span
                key={i}
                title={on ? t("practised") : t("noPractice")}
                style={{
                  aspectRatio: "1",
                  borderRadius: 5,
                  background: on ? COLORS.blue : COLORS.neutralBg,
                  opacity: on ? 0.85 : 1,
                }}
              />
            ))}
          </div>
        </Card>
      )}

      {tab === "Payments" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Table columns={[tCommon("class"), t("colCredit"), tCommon("amount"), tCommon("date"), tCommon("method")]} template={equalTemplate(5, 80)} minWidth={640}>
            {payments.length === 0 && <EmptyRow>{t("noPayments")}</EmptyRow>}
            {payments.map((p) => (
              <TableRow key={p.id} template={equalTemplate(5, 80)}>
                <span style={{ display: "flex", alignItems: "center" }}>
                  <ClassDot color={classDotColor(p.className)} />
                  {p.className}
                </span>
                <span style={{ color: COLORS.success, fontWeight: 600 }}>{p.credits}</span>
                <span style={{ fontWeight: 600 }}>{p.amount}</span>
                <span style={{ color: COLORS.textSecondary }}>{fmtDate(p.date)}</span>
                <span style={{ color: COLORS.textSecondary }}>{p.method}</span>
              </TableRow>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- wizard --- */

type Draft = {
  name: string;
  className: string;
  /* The list and the cards show age and level on every student. Registration
     collected neither, so a student added through the console read "0 yrs ·
     Beginner" beside imported ones that had both. */
  dateOfBirth: string;
  level: string;
  branch: string;
  school: string;
  fideId: string;
  fideRating: string;
  /* Set when the guardian already exists: the wizard then links to them
     instead of making a second account for the same person. A child has one
     guardian; a guardian can have any number of children. */
  parentId: string;
  parentName: string;
  parentRelation: string;
  parentPhone: string;
  parentEmail: string;
  parentLineId: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  className: "Group Class",
  dateOfBirth: "",
  level: LEVEL_OPTIONS[0],
  branch: BRANCH_OPTIONS[0],
  school: "",
  fideId: "",
  fideRating: "",
  parentId: "",
  parentName: "",
  parentRelation: "Mother",
  parentPhone: "",
  parentEmail: "",
  parentLineId: "",
};

function AddStudentWizard({
  initialName,
  classOptions,
  parentOptions,
  onCancel,
  onCreate,
}: {
  initialName: string;
  /* The academy's real classes. The picker used to offer a fixed four that no
     longer match what the school teaches, so registering someone silently
     enrolled them in nothing — and nothing is what the payment form then had
     to price. */
  classOptions: string[];
  /* Every guardian already on file, so a second child joins the first one's
     parent rather than getting a duplicate account. */
  parentOptions: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onCreate: (draft: Draft) => Promise<void>;
}) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const [stage, setStage] = useState<"choice" | "upload" | "form">(initialName ? "form" : "choice");
  const [draft, setDraft] = useState<Draft>({
    ...EMPTY_DRAFT,
    name: initialName,
    className: classOptions[0] ?? "",
  });
  const [docName, setDocName] = useState("");
  const [extracting, setExtracting] = useState(false);
  /* Registering writes nine rows. Until they all land the button has to stop
     accepting clicks, or a second press starts the whole thing again and the
     only sign of it is "email must be unique". */
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  /* Mirrors the mockup's fake OCR: guess a name from the filename, pause, then
     drop the user into a pre-filled form. */
  function extractFrom(file: File) {
    setDocName(file.name);
    setExtracting(true);
    const guessed = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    setTimeout(() => {
      setDraft((d) => ({ ...d, name: guessed || d.name }));
      setExtracting(false);
      setStage("form");
    }, 900);
  }

  /* An existing guardian already has their details on file; a new one is
     created from what is typed here, and a guardian with no name cannot be
     created at all — which is what the phone-only form used to attempt before
     giving up without saying so. */
  const canSubmit =
    draft.name.trim() !== "" &&
    (draft.parentId !== "" || (draft.parentName.trim() !== "" && draft.parentPhone.trim() !== ""));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 820 }}>
      <BackLink label={t("backToStudents")} onClick={onCancel} />

      <PageHeader title={t("registerTitle")} sub={t("registerSub")} />

      {stage === "choice" && (
        <div className="jt-duo">
          {(
            [
              { key: "upload", icon: "fileText" as const, titleKey: "uploadChoice", descKey: "uploadChoiceDesc" },
              { key: "manual", icon: "edit" as const, titleKey: "manualChoice", descKey: "manualChoiceDesc" },
            ]
          ).map((choice) => (
            <button
              key={choice.key}
              type="button"
              className="jt-reg-choice"
              onClick={() => setStage(choice.key === "upload" ? "upload" : "form")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 9,
                padding: 20,
                borderRadius: 14,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.surface,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 200ms ease",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: COLORS.light,
                }}
              >
                <Icon name={choice.icon} size={19} color={COLORS.blue} />
              </span>
              <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: COLORS.text }}>
                {t(choice.titleKey)}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t(choice.descKey)}
              </span>
            </button>
          ))}
        </div>
      )}

      {stage === "upload" && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", padding: 32 }}>
          {extracting ? (
            <>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: `3px solid ${COLORS.border}`,
                  borderTopColor: COLORS.blue,
                  animation: "jtrax-spin 0.8s linear infinite",
                }}
              />
              <span style={{ fontFamily: FONT, fontSize: 14.5, color: COLORS.textSecondary }}>
                {t("reading", { file: docName })}
              </span>
            </>
          ) : (
            <>
              <Icon name="fileText" size={30} color={COLORS.blue} />
              <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                {t("uploadPrompt")}
              </span>
              <label style={{ ...primaryButtonStyle, cursor: "pointer" }}>
                {t("chooseFile")}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) extractFrom(file);
                  }}
                  style={{ display: "none" }}
                />
              </label>
              <button
                type="button"
                onClick={() => setStage("choice")}
                style={{ ...secondaryButtonStyle, border: "none", background: "transparent" }}
              >
                {tCommon("back")}
              </button>
            </>
          )}
        </Card>
      )}

      {stage === "form" && (
        <>
          {docName && (
            <Card style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 14px" }}>
              <Icon name="check" size={15} color={COLORS.success} />
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("prefilled", { file: docName })}
              </span>
            </Card>
          )}

          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionTitle>{t("studentInfo")}</SectionTitle>
            <div className="jt-duo">
              <div>
                <label style={labelStyle} htmlFor="w-name">{t("fullName")}</label>
                <input id="w-name" value={draft.name} onChange={(e) => set("name", e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-class">{tCommon("class")}</label>
                <select id="w-class" value={draft.className} onChange={(e) => set("className", e.target.value)} style={selectStyle}>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-dob">{t("dateOfBirth")}</label>
                <input
                  id="w-dob"
                  type="date"
                  value={draft.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-level">{t("level")}</label>
                <select id="w-level" value={draft.level} onChange={(e) => set("level", e.target.value)} style={selectStyle}>
                  {LEVEL_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-branch">{tCommon("branch")}</label>
                <select id="w-branch" value={draft.branch} onChange={(e) => set("branch", e.target.value)} style={selectStyle}>
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-school">{t("currentSchool")}</label>
                <input id="w-school" value={draft.school} onChange={(e) => set("school", e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-fide">{t("fideId")}</label>
                <input id="w-fide" value={draft.fideId} onChange={(e) => set("fideId", e.target.value)} style={fieldStyle} />
              </div>
            </div>
          </Card>

          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <SectionTitle>{t("parentSection")}</SectionTitle>
              {parentOptions.length > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    gap: 2,
                    padding: 3,
                    borderRadius: 999,
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.surface,
                  }}
                >
                  {([
                    { existing: false, label: t("newGuardian") },
                    { existing: true, label: t("existingGuardian") },
                  ] as const).map((option) => {
                    const active = (draft.parentId !== "") === option.existing;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          set("parentId", option.existing ? parentOptions[0].id : "")
                        }
                        style={{
                          padding: "6px 14px",
                          borderRadius: 999,
                          border: "none",
                          background: active ? COLORS.light : "transparent",
                          color: active ? COLORS.blue : COLORS.textSecondary,
                          fontFamily: FONT,
                          fontSize: 13.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </span>
              )}
            </div>

            {draft.parentId ? (
              <div className="jt-duo">
                <div>
                  <label style={labelStyle} htmlFor="w-pexisting">{t("chooseGuardian")}</label>
                  <select
                    id="w-pexisting"
                    value={draft.parentId}
                    onChange={(e) => set("parentId", e.target.value)}
                    style={selectStyle}
                  >
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="w-prel-existing">{t("relation")}</label>
                  <select
                    id="w-prel-existing"
                    value={draft.parentRelation}
                    onChange={(e) => set("parentRelation", e.target.value)}
                    style={selectStyle}
                  >
                    {RELATION_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="jt-duo">
                <div>
                  <label style={labelStyle} htmlFor="w-pname">{tCommon("name")}</label>
                  <input id="w-pname" value={draft.parentName} onChange={(e) => set("parentName", e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="w-prel">{t("relation")}</label>
                  <select id="w-prel" value={draft.parentRelation} onChange={(e) => set("parentRelation", e.target.value)} style={selectStyle}>
                    {RELATION_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="w-pphone">{tCommon("phone")}</label>
                  <input id="w-pphone" value={draft.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="w-pmail">{tCommon("email")}</label>
                  <input id="w-pmail" type="email" value={draft.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} style={fieldStyle} />
                  <p style={{ margin: "5px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                    {t("guardianEmailHelp")}
                  </p>
                </div>
              </div>
            )}
          </Card>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={onCancel}>
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              className="jt-btn-primary"
              style={{
                ...primaryButtonStyle,
                opacity: canSubmit && !saving ? 1 : 0.75,
                cursor: !canSubmit ? "not-allowed" : saving ? "wait" : "pointer",
              }}
              disabled={!canSubmit || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onCreate(draft);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? t("registering") : t("registerTitle")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ list --- */

export function StudentsPage({
  startWizard,
  startStatus,
}: {
  /* Present means the registration wizard opens; its value prefills the name.
     Present-and-empty is the dashboard's "Register Student" pill — nothing
     typed yet, but still a request for the form. */
  startWizard?: string;
  /* The condition the dashboard's follow-up card was clicked on, if we got
     here from one. */
  startStatus?: string;
}) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const { showError } = useErrorToast();
  const tStatus = useTranslations("status");
  const { students, raw, batch, create, update, remove, removePerson, loading, error } = useData();
  const [view, setView] = useState<View>(
    opensCreate(startWizard) ? { kind: "wizard" } : { kind: "list" },
  );
  const [mode, setMode] = useViewMode("students", VIEWS);
  const router = useRouter();
  const [createdLogins, setCreatedLogins] = useState<{
    studentId: string;
    student: { email: string; password: string };
    parent: { email: string; password: string; generated: boolean } | null;
  } | null>(null);
  const [search, setSearch] = useState("");
  /* One control for the student's condition. There used to be two — a raw
     status picker and a follow-up bucket picker — which offered the same
     thing twice under different names. The dashboard links here with
     `?status=`; anything the list does not know is ignored rather than
     silently emptying the screen. */
  const [status, setStatus] = useState(
    STATUS_VALUES.includes(startStatus as (typeof STATUS_VALUES)[number]) ? startStatus! : "",
  );
  const [branch, setBranch] = useState("");
  /* By class id, not by name: two classes can share a name, and the id is what
     the enrolments are actually keyed on. */
  const [classId, setClassId] = useState("");
  const [page, setPage] = useState(0);

  /* Filter values stay "" for "all" so the label can be localised without
     changing what the filter compares against. */
  const branchOptions = useMemo(
    () => [
      { value: "", label: tCommon("allBranches") },
      ...Array.from(new Set(students.map((s) => s.branch))).map((b) => ({ value: b, label: b })),
    ],
    [tCommon, students],
  );
  /* Each option carries its own count, so the number on a dashboard card can
     be checked against the list it links to without counting rows. */
  const statusOptions = useMemo(
    () => [
      { value: "", label: tCommon("allStatuses") },
      ...STATUS_VALUES.map((v) => ({
        value: v,
        label: `${tStatus(v)} (${students.filter((s) => s.status === v).length})`,
      })),
    ],
    [tCommon, tStatus, students],
  );

  /* Read off the enrolments rather than the row's single `className`, which is
     only ever the first class a child is in — filtering on that would hide a
     child from the second class they attend. */
  const classOptions = useMemo(
    () => [
      { value: "", label: tCommon("allClasses") },
      ...classFilterOptions(raw, students.map((s) => s.id)).map((c) => ({
        value: c.id,
        label: `${c.name} (${c.count})`,
      })),
    ],
    [tCommon, raw, students],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (status && s.status !== status) return false;
      if (branch && s.branch !== branch) return false;
      if (!isInClass(raw.enrollments, s.id, classId)) return false;
      /* The ID is searchable because it is now the thing a family arrives
         holding — it is printed on the card they were given, and a child who
         cannot sign in reads it out rather than spelling their name. */
      if (
        q &&
        !s.name.toLowerCase().includes(q) &&
        !s.parentPhone.includes(q) &&
        !(s.email ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [students, search, status, branch, classId, raw.enrollments]);

  /* Every class a child is in, so a row that turns up under a class filter
     says why it did rather than naming a different class. */
  function classesOf(studentId: string, fallback: string): string[] {
    const names = classNamesOfStudent(raw, studentId);
    return names.length > 0 ? names : [fallback];
  }

  const { pageRows, totalPages, page: current } = paginate(filtered, page);

  const parentOptions = useMemo(
    () => raw.parents.map((p) => ({ id: String(p["parent_id"]), name: String(p["name"] ?? "") })),
    [raw.parents],
  );

  /* Falls back to the design's list only while the classes are still loading,
     so the picker is never empty. */
  const classNames = useMemo(() => {
    const live = liveClasses({ classes: raw.classes }).map((c) => String(c["name"] ?? "")).filter(Boolean);
    return live.length > 0 ? live : CLASS_OPTIONS;
  }, [raw.classes]);

  function toPayment(studentId: string) {
    setCreatedLogins(null);
    router.push(`/payment?student=${encodeURIComponent(studentId)}`);
  }

  /**
   * Registers a student: their login, their row, an enrolment in the class the
   * form chose, and — when the form named one — a guardian with their own
   * login, contacts and the link to this child.
   *
   * All of it inside one `batch`. Each write used to refetch all twenty-two
   * collections on its own, so nine writes cost 189 requests and the wizard
   * sat there looking hung while they ran.
   */
  async function registerStudent(draft: Draft) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await batch(async () => {
        /* A student who can sign in to the portal, not just a row on a list.
           The ID is built from their name so the office can predict it, and
           stepped along if another child already holds it; the password is
           shown once, at the end. */
        const studentPassword = generateTempPassword();
        const studentAccount = await createStudentAccount(create, draft.name, studentPassword);
        const created = await create("students", {
          user_account_id: studentAccount.accountId,
          name: draft.name,
          date_of_birth: draft.dateOfBirth || null,
          current_level: draft.level || "Beginner",
          /* Both were on the form from the start and neither was written, so
             the desk typed the child's school and their FIDE ID into a box
             that forgot them the moment it closed. */
          current_school: draft.school.trim() || null,
          branch: draft.branch || BRANCH_OPTIONS[0],
          fide_id: draft.fideId.trim() || null,
          fide_rating: draft.fideRating ? Number(draft.fideRating) : null,
        });

        const cls = raw.classes.find((c) => String(c.name) === draft.className);
        if (cls) {
          await create("enrollments", {
            student_id: created.student_id,
            class_id: cls.class_id,
            enrolled_date: today,
            status: "Active",
          });
        }

        let parentCredentials: { email: string; password: string; generated: boolean } | null = null;
        if (draft.parentId) {
          /* An existing guardian: link, and leave their account alone. */
          await create("student-parents", {
            student_id: created.student_id,
            parent_id: draft.parentId,
            relationship_type: draft.parentRelation || "Guardian",
          });
        } else if (draft.parentName.trim()) {
          /* A name is enough. The guardian used to need an email address as
             well, and the form never said so — a family who left one and gave
             a phone number instead registered a child with nobody attached to
             them, silently. The login falls back to a made-up address the same
             way a student's does. */
          const givenEmail = draft.parentEmail.trim();
          const loginEmail = givenEmail || parentEmailFor(draft.parentName);
          const parentPassword = generateTempPassword();
          const parentAccount = await create("user-accounts", {
            email: loginEmail,
            password: parentPassword,
            role: "Parent",
            display_name: draft.parentName.trim(),
          });
          const parent = await create("parents", {
            user_account_id: parentAccount.user_account_id,
            name: draft.parentName.trim(),
          });
          const parentId = String(parent.parent_id);
          for (const [kind, value] of [
            ["phone", draft.parentPhone],
            ["email", draft.parentEmail],
            ["line_id", draft.parentLineId],
          ] as const) {
            if (value.trim()) {
              await create("parent-contacts", { parent_id: parentId, contact_type: kind, value: value.trim() });
            }
          }
          await create("notification-preferences", { parent_id: parentId }).catch(() => {});
          await create("student-parents", {
            student_id: created.student_id,
            parent_id: parentId,
            relationship_type: draft.parentRelation || "Guardian",
          });
          parentCredentials = { email: loginEmail, password: parentPassword, generated: givenEmail === "" };
        }

        setCreatedLogins({
          studentId: String(created.student_id),
          /* The ID that was actually taken, not the one that was asked for.
             Rebuilding it from the name here would hand a second John Smith
             the *first* one's ID on the card the family walks out with. */
          student: { email: studentAccount.loginId, password: studentPassword },
          parent: parentCredentials,
        });
      });
    } catch (e) {
      showError(tCommon("createFailed"), e);
    }
    setView({ kind: "list" });
  }

  if (view.kind === "detail") {
    const student = students.find((s) => s.id === view.id);
    if (student)
      return (
        <StudentDetail
          key={view.id}
          student={student}
          startEditing={view.edit}
          startDeleting={view.remove}
          guardianOptions={parentOptions}
          onLinkGuardian={(parentId, relation) =>
            create("student-parents", {
              student_id: student.id,
              parent_id: parentId,
              relationship_type: relation,
            }).then(() => undefined)
          }
          onUnlinkGuardian={() => {
            /* The link is keyed by student, so this detaches only this child —
               the guardian and their other children are untouched. */
            remove("student-parents", student.id).catch((e) =>
              showError(tCommon("unlinkFailed"), e),
            );
          }}
          onBack={() => setView({ kind: "list" })}
          onSave={async (next) => {
            /* Deliberately not caught here. It used to be, with a toast — so a
               refused write closed the form and looked exactly like a save
               that worked. The card shows the failure itself now, and can only
               do that if it is told. */
            const sent: Record<string, string | null> = {
              name: next.name,
              /* Normalised on the way out too, so a row that arrived in some
                 other shape leaves in the one every reader can handle. */
              date_of_birth: toDateInput(next.dateOfBirth) || null,
              current_level: next.level,
              current_school: next.school.trim() || null,
              branch: next.branch || null,
              fide_id: next.fideId.trim() || null,
            };
            const written = await update("students", next.id, sent);
            const wrong = disagreements(sent, written);
            if (wrong.length) throw new Error(t("notStored", { fields: wrong.join(", ") }));
          }}
          onDelete={(id, alsoParent) =>
            /* One request: the backend removes the attendance, credits,
               payments, enrolments and family link in a transaction. Returned
               so the confirm button knows when it is over. */
            removePerson("students", id, { parent: alsoParent })
              .then(() => setView({ kind: "list" }))
              .catch((e) => showError(tCommon("deleteFailed"), e))
          }
        />
      );
  }

  if (view.kind === "wizard") {
    return (
      <AddStudentWizard
        initialName={startWizard ?? ""}
        classOptions={classNames}
        parentOptions={parentOptions}
        onCancel={() => setView({ kind: "list" })}
        onCreate={registerStudent}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {createdLogins && (
        /* Registering someone is the first half of enrolling them; the second
           is taking the payment. Closing this dialog — by the button, the X or
           Escape — carries on to the payment form with them already chosen. */
        <Modal
          title={t("loginsTitle")}
          width={460}
          onClose={() => toPayment(createdLogins.studentId)}
          footer={
            <button
              type="button"
              className="jt-btn-primary"
              style={primaryButtonStyle}
              onClick={() => toPayment(createdLogins.studentId)}
            >
              <Icon name="wallet" size={14} color={COLORS.surface} /> {t("continueToPayment")}
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
              {t("loginsHint")}
            </p>
            <div>
              <SectionTitle>{t("studentLogin")}</SectionTitle>
              <InfoGrid
                rows={[
                  /* Labelled for what it is. It said "Email" while holding an
                     address at a domain that receives nothing, which told the
                     desk to send the password to a mailbox that was never
                     going to exist. */
                  { label: t("loginId"), value: <strong>{createdLogins.student.email}</strong> },
                  {
                    label: t("tempPassword"),
                    value: <strong style={{ letterSpacing: "0.04em" }}>{createdLogins.student.password}</strong>,
                  },
                ]}
              />
              <p style={{ margin: "8px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                {t("studentLoginIdHint")}
              </p>
            </div>
            {createdLogins.parent && (
              <div>
                <SectionTitle>{t("parentLogin")}</SectionTitle>
                <InfoGrid
                  rows={[
                    { label: tCommon("email"), value: createdLogins.parent.email },
                    {
                      label: t("tempPassword"),
                      value: <strong style={{ letterSpacing: "0.04em" }}>{createdLogins.parent.password}</strong>,
                    },
                  ]}
                />
                {/* Nothing can be emailed to an address the academy invented,
                    so the desk has to hand this one over in person — and it
                    only says so when that is actually the case. */}
                {createdLogins.parent.generated && (
                  <p style={{ margin: "8px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                    {t("parentLoginGenerated")}
                  </p>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      <PageHeader
        title={t("title")}
        sub={t("sub")}
        action={
          <>
            <ExportButton
              filename="students"
              columns={[tCommon("student"), tCommon("class"), tCommon("branch"), t("colCredit"), tCommon("status"), tCommon("phone")]}
              rows={() =>
                filtered.map((s) => [
                  s.name,
                  classesOf(s.id, s.className).join(", "),
                  s.branch,
                  s.credit,
                  s.status,
                  s.parentPhone,
                ])
              }
            />
            <button
              type="button"
              className="jt-btn-primary"
              style={primaryButtonStyle}
              onClick={() => setView({ kind: "wizard" })}
            >
              <Icon name="usersPlus" size={15} color={COLORS.surface} />
              {t("registerTitle")}
            </button>
          </>
        }
      />

      <FilterBar>
        <SearchInput
          style={{ flex: "1 1 220px" }}
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder={t("searchPlaceholder")}
          label={t("searchLabel")}
        />
        <SelectFilter value={branch} onChange={(v) => { setBranch(v); setPage(0); }} options={branchOptions} label={tCommon("branch")} />
        <SelectFilter value={classId} onChange={(v) => { setClassId(v); setPage(0); }} options={classOptions} label={tCommon("class")} />
        <SelectFilter value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={statusOptions} label={tCommon("status")} />
        <ViewToggle value={mode} onChange={setMode} options={VIEWS} style={{ marginLeft: "auto" }} />
      </FilterBar>

      {mode === "card" ? (
        <>
          <CardGrid>
            {pageRows.length === 0 && (
              <EmptyCards>{loading ? tCommon("loading") : error ? error : t("empty")}</EmptyCards>
            )}
            {pageRows.map((s) => {
              const chip = statusChipColors(s.status);
              const creditChip = creditChipFor(s.credit);
              return (
                <EntityCard
                  key={s.id}
                  onClick={() => setView({ kind: "detail", id: s.id })}
                  avatar={<Avatar initials={initialsOf(s.name)} size={44} />}
                  title={s.name}
                  actions={
                    <RowActions
                      label={s.name}
                      onEdit={() => setView({ kind: "detail", id: s.id, edit: true })}
                      onDelete={() => setView({ kind: "detail", id: s.id, remove: true })}
                    />
                  }
                  subtitle={
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      <ClassDot color={classDotColor(s.className)} />
                      {classesOf(s.id, s.className).join(", ")}
                    </span>
                  }
                  badges={
                    <>
                      <Badge color={chip.color} bg={chip.bg}>{tStatus(s.status)}</Badge>
                      <Badge color={creditChip.color} bg={creditChip.bg}>
                        {tCommon("creditsCount", { count: s.credit })}
                      </Badge>
                    </>
                  }
                  rows={[
                    { label: t("level"), value: s.level },
                    { label: t("creditsExpire"), value: s.expires || "—" },
                    { label: t("parentLabel"), value: s.parentName },
                  ]}
                  footer={
                    s.parentPhone ? (
                      <ContactPill
                        phone={s.parentPhone}
                        label={t("contact")}
                        style={{ justifyContent: "center" }}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </CardGrid>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Table columns={[tCommon("student"), tCommon("class"), t("colCredit"), tCommon("status"), tCommon("action")]} template={TEMPLATE} minWidth={760}>
            {pageRows.length === 0 && (
              <EmptyRow>{loading ? tCommon("loading") : error ? error : t("empty")}</EmptyRow>
            )}
            {pageRows.map((s) => {
              const chip = statusChipColors(s.status);
              const creditChip = creditChipFor(s.credit);
              return (
                <TableRow key={s.id} template={TEMPLATE} onClick={() => setView({ kind: "detail", id: s.id })}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Avatar initials={initialsOf(s.name)} size={30} />
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name}
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", color: COLORS.textSecondary }}>
                    <ClassDot color={classDotColor(s.className)} />
                    {classesOf(s.id, s.className).join(", ")}
                  </span>
                  <Badge color={creditChip.color} bg={creditChip.bg} style={{ justifySelf: "start" }}>
                    {fmtCredits(s.credit)}
                  </Badge>
                  <Badge color={chip.color} bg={chip.bg} style={{ justifySelf: "start" }}>
                    {tStatus(s.status)}
                  </Badge>
                  <ContactPill phone={s.parentPhone} label={t("contact")} style={{ justifySelf: "start" }} />
                </TableRow>
              );
            })}
          </Table>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </Card>
      )}
    </div>
  );
}

/** Tel link styled as a pill. Its click never reaches the row behind it. */
function ContactPill({
  phone,
  label,
  style,
}: {
  phone: string;
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <a
      href={`tel:${phone.replace(/\s/g, "")}`}
      onClick={(e) => e.stopPropagation()}
      className="jt-qa-call"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${COLORS.border}`,
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: 600,
        color: COLORS.text,
        textDecoration: "none",
        transition: "all 160ms ease",
        ...style,
      }}
    >
      <Icon name="phone" size={12} /> {label}
    </a>
  );
}
