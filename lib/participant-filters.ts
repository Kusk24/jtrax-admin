/**
 * The Participants tab's filters and sorting, kept apart from the page so the
 * rules can be tested on their own.
 */
import { arrivalState, type ArrivalState } from "./arrival";
import type { Participant } from "./data";
import { todayISO } from "./live";

export type PaymentFilter = "" | "Paid" | "Unpaid" | "Cancelled";
export type SortKey = "age" | "amount";
export type SortDir = "asc" | "desc";

export type ParticipantFilters = {
  search: string;
  category: string;
  payment: PaymentFilter;
  attending: "" | ArrivalState;
  /** YYYY-MM-DD, either end may be blank. */
  from: string;
  to: string;
  sort: { key: SortKey; dir: SortDir } | null;
};

export const NO_FILTERS: ParticipantFilters = {
  search: "", category: "", payment: "", attending: "", from: "", to: "", sort: null,
};

/** The payment badge a row shows: Paid, Cancelled, Unpaid, or "" for no fee. */
export function paymentOf(p: Participant): PaymentFilter {
  if ((p.feeCharged ?? 0) <= 0) return "";
  if (p.paymentStatus === "Paid") return "Paid";
  if (p.paymentStatus === "Cancelled") return "Cancelled";
  return "Unpaid";
}

/** The calendar day an entry was made, in local time. */
function dayOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : todayISO(d);
}

/** Header click: ascending, then descending, then back to entry order. */
export function nextSort(current: ParticipantFilters["sort"], key: SortKey): ParticipantFilters["sort"] {
  if (current?.key !== key) return { key, dir: "asc" };
  return current.dir === "asc" ? { key, dir: "desc" } : null;
}

export function filterParticipants(list: Participant[], f: ParticipantFilters, now: Date = new Date()): Participant[] {
  const q = f.search.trim().toLowerCase();
  const out = list.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
    if (f.category && p.category !== f.category) return false;
    if (f.payment && paymentOf(p) !== f.payment) return false;
    if (f.attending && arrivalState(p.arrival, p.arrivalRemindedAt, now) !== f.attending) return false;
    if (f.from || f.to) {
      const day = p.registeredAt ? dayOf(p.registeredAt) : "";
      if (!day) return false;
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
    }
    return true;
  });
  if (!f.sort) return out;
  const { key, dir } = f.sort;
  const valueOf = (p: Participant) => (key === "age" ? p.age : p.feeCharged ?? 0) || 0;
  /* Rows with no age or no fee stay at the bottom whichever way it sorts. */
  return [...out].sort((a, b) => {
    const va = valueOf(a), vb = valueOf(b);
    if (!va !== !vb) return va ? -1 : 1;
    return dir === "asc" ? va - vb : vb - va;
  });
}
