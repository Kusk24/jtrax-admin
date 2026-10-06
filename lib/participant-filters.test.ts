import { describe, expect, it } from "vitest";
import type { Participant } from "./data";
import { filterParticipants, nextSort, NO_FILTERS, paymentOf } from "./participant-filters";

const base = {
  rating: 0, score: "", rank: 0, prize: "", guardian: "", contact: "", wins: 0, losses: 0, draws: 0,
  attendance: "", medicalNotes: "", notes: "",
} as const;

const make = (o: Partial<Participant> & { name: string }): Participant => ({
  ...base, category: "U10", registeredAt: "", paymentStatus: "", age: 0, ...o,
});

const ann = make({ name: "Ann", category: "U10", age: 9, feeCharged: 500, paymentStatus: "Paid", registeredAt: "2026-10-01T09:00:00", arrival: "Confirmed" });
const bob = make({ name: "Bob", category: "U14", age: 13, feeCharged: 800, paymentStatus: "Pending", registeredAt: "2026-10-03T09:00:00", arrival: "NotAttending" });
const cat = make({ name: "Cat", category: "U14", age: 0, feeCharged: 0, registeredAt: "2026-10-05T09:00:00" });
const dan = make({ name: "Dan", category: "U10", age: 7, feeCharged: 500, paymentStatus: "Cancelled", registeredAt: "2026-10-02T09:00:00" });
const all = [ann, bob, cat, dan];
const names = (list: Participant[]) => list.map((p) => p.name);

describe("participant filters", () => {
  it("reads payment as the badge does", () => {
    expect([ann, bob, cat, dan].map(paymentOf)).toEqual(["Paid", "Unpaid", "", "Cancelled"]);
  });

  it("filters by category, payment and attending", () => {
    expect(names(filterParticipants(all, { ...NO_FILTERS, category: "U14" }))).toEqual(["Bob", "Cat"]);
    expect(names(filterParticipants(all, { ...NO_FILTERS, payment: "Unpaid" }))).toEqual(["Bob"]);
    expect(names(filterParticipants(all, { ...NO_FILTERS, attending: "notAttending" }))).toEqual(["Bob"]);
    expect(names(filterParticipants(all, { ...NO_FILTERS, attending: "notSent" }))).toEqual(["Cat", "Dan"]);
  });

  it("filters by registration date, inclusive", () => {
    expect(names(filterParticipants(all, { ...NO_FILTERS, from: "2026-10-02", to: "2026-10-03" }))).toEqual(["Bob", "Dan"]);
    expect(names(filterParticipants(all, { ...NO_FILTERS, from: "2026-10-04" }))).toEqual(["Cat"]);
  });

  it("sorts by age and amount, blanks last", () => {
    expect(names(filterParticipants(all, { ...NO_FILTERS, sort: { key: "age", dir: "asc" } }))).toEqual(["Dan", "Ann", "Bob", "Cat"]);
    expect(names(filterParticipants(all, { ...NO_FILTERS, sort: { key: "age", dir: "desc" } }))).toEqual(["Bob", "Ann", "Dan", "Cat"]);
    expect(names(filterParticipants(all, { ...NO_FILTERS, sort: { key: "amount", dir: "desc" } }))).toEqual(["Bob", "Ann", "Dan", "Cat"]);
  });

  it("cycles a header: ascending, descending, off", () => {
    const a = nextSort(null, "age");
    const d = nextSort(a, "age");
    expect([a, d, nextSort(d, "age"), nextSort(d, "amount")]).toEqual([
      { key: "age", dir: "asc" }, { key: "age", dir: "desc" }, null, { key: "amount", dir: "asc" },
    ]);
  });
});
