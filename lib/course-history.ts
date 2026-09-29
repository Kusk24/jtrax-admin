/**
 * What happened to each of a child's enrolments, read off the enrolments.
 *
 * Nothing stores "events": each enrolment knows when it started, which course
 * it moved from (moved_from_class_id), and — since migration 0043 — the day it
 * ended. Joining, moving and leaving all fall out of those three.
 */

export type HistoryEnrolment = {
  id: string;
  classId: string;
  className: string;
  status: string;
  enrolledDate: string;
  /** The day it stopped being Active; "" if never, or before this was kept. */
  endedDate: string;
  movedFromClassId: string;
  movedFrom: string;
  /** Set when the office deleted it; the row is kept for this history. */
  deletedDate?: string;
};

/** The latest thing that happened to one enrolment. */
export type EnrolmentEvent =
  | { kind: "joined"; date: string }
  | { kind: "movedFrom"; date: string; other: string }
  | { kind: "movedTo"; date: string; other: string }
  | { kind: "left"; date: string }
  | { kind: "deleted"; date: string };

const active = (status: string) => status === "" || status === "Active";
const day = (d: string) => d.slice(0, 10);

export function enrolmentEvents(enrolments: HistoryEnrolment[]): Map<string, EnrolmentEvent> {
  /* For each ended enrolment, the one that moved out of it: the same course,
     started no earlier than it. */
  const successor = new Map<string, HistoryEnrolment>();
  for (const e of enrolments) {
    if (!e.movedFromClassId) continue;
    const from = enrolments
      .filter((o) => o.id !== e.id && o.classId === e.movedFromClassId && !active(o.status) && o.enrolledDate <= e.enrolledDate)
      .sort((a, b) => a.enrolledDate.localeCompare(b.enrolledDate))
      .at(-1);
    if (from && !successor.has(from.id)) successor.set(from.id, e);
  }

  const events = new Map<string, EnrolmentEvent>();
  for (const e of enrolments) {
    if (e.deletedDate) {
      events.set(e.id, { kind: "deleted", date: day(e.deletedDate) });
    } else if (!active(e.status)) {
      const next = successor.get(e.id);
      events.set(
        e.id,
        next
          ? { kind: "movedTo", date: day(e.endedDate || next.enrolledDate), other: next.className }
          : { kind: "left", date: day(e.endedDate) },
      );
    } else if (e.movedFromClassId) {
      events.set(e.id, { kind: "movedFrom", date: day(e.enrolledDate), other: e.movedFrom });
    } else {
      events.set(e.id, { kind: "joined", date: day(e.enrolledDate) });
    }
  }
  return events;
}

/**
 * Newest first by what last happened to each. A leaving with no recorded day
 * sorts by when it started instead — the latest it can honestly be placed.
 */
export function byLatestEvent<T extends HistoryEnrolment>(enrolments: T[], events: Map<string, EnrolmentEvent>): T[] {
  const when = (e: T) => events.get(e.id)?.date || day(e.enrolledDate);
  return [...enrolments].sort((a, b) => when(b).localeCompare(when(a)));
}

type Tx = Record<string, unknown>;
const str = (row: Tx, key: string) => String(row[key] ?? "");

export type CreditMoveIn = { amount: number; from: string[]; date: string };

/**
 * Credits moved between a child's courses, read off the ledger.
 *
 * Every move — a course change, or loose credits put into a course after a
 * delete — writes a pair on the same day: minus on the course they left,
 * plus on the course they went to. The pair is how each side is found.
 *
 * Returns, per enrolment, the moves it received ("+8 from King Slayer"), and
 * per deleted enrolment, the courses its credits went to.
 */
export function creditMoves(
  txs: Tx[],
  enrolments: (HistoryEnrolment & { classId: string })[],
  classNameOf: (classId: string) => string,
): { movesIn: Map<string, CreditMoveIn[]>; movedTo: Map<string, string[]> } {
  const byId = new Map(enrolments.map((e) => [e.id, e]));
  const classOf = (tx: Tx) => str(tx, "class_id") || byId.get(str(tx, "enrollment_id"))?.classId || "";
  const adjustments = txs.filter((tx) => str(tx, "transaction_type") === "manual_adjustment");
  const movesIn = new Map<string, CreditMoveIn[]>();
  const movedTo = new Map<string, string[]>();

  for (const inc of adjustments) {
    const target = byId.get(str(inc, "enrollment_id"));
    const amount = Number(inc["amount"] ?? 0);
    if (!target || amount <= 0) continue;
    const date = day(str(inc, "transaction_date"));
    const sources = adjustments.filter(
      (tx) => Number(tx["amount"] ?? 0) < 0 && day(str(tx, "transaction_date")) === date && classOf(tx) !== target.classId,
    );
    if (sources.length === 0) continue;
    const from = [...new Set(sources.map((tx) => classNameOf(classOf(tx))).filter(Boolean))];
    movesIn.set(target.id, [...(movesIn.get(target.id) ?? []), { amount, from, date }]);

    /* Loose credits (no enrolment) that left a deleted course that day. */
    for (const src of sources) {
      if (str(src, "enrollment_id")) continue;
      const gone = enrolments.find((e) => e.deletedDate && e.classId === classOf(src) && day(e.deletedDate) <= date);
      if (gone && !(movedTo.get(gone.id) ?? []).includes(target.className)) {
        movedTo.set(gone.id, [...(movedTo.get(gone.id) ?? []), target.className]);
      }
    }
  }
  return { movesIn, movedTo };
}
