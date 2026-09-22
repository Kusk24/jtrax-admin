/**
 * What the console says about a tournament entry, from the rows behind it.
 *
 * Two things used to be made up here. Every participant read "Paid", whatever
 * had or had not been collected, and their notes read "" because the form that
 * asked for them had no column to write to.
 */
import { describe, expect, it } from "vitest";
import { toTournaments } from "./live";
import type { LiveCollections } from "./live";

const EMPTY: LiveCollections = {
  students: [], parents: [], parentContacts: [], studentParents: [], classes: [],
  classSessions: [], attendance: [], enrollments: [], creditTransactions: [],
  creditPackages: [], payments: [], teachers: [], admins: [], accounts: [],
  announcements: [], tournaments: [], tournamentCategories: [],
  tournamentRegistrations: [], practiceActivities: [], systemConfig: [],
};

const collections = (payments: Record<string, unknown>[]): LiveCollections => ({
  ...EMPTY,
  tournaments: [{
    tournament_id: "trn_1", name: "Wellington 2026", tournament_status: "Upcoming",
    regular_fee: 300, student_discount_pct: 0, max_participants: 40,
  }],
  tournamentRegistrations: [
    {
      tournament_registration_id: "treg_paid", tournament_id: "trn_1",
      participant_name: "Emma", status: "Approved", fee_charged: 300,
      medical_notes: "Asthma — inhaler in her bag.",
      remarks: "Please seat her near the door.",
    },
    {
      tournament_registration_id: "treg_owed", tournament_id: "trn_1",
      participant_name: "Liam", status: "Approved", fee_charged: 300,
      medical_notes: "", remarks: "",
    },
  ],
  payments,
});

describe("a tournament participant", () => {
  const [event] = toTournaments(collections([
    { payment_id: "pay_1", tournament_registration_id: "treg_paid", status: "Paid" },
  ]));
  const byName = Object.fromEntries(event.participants.map((p) => [p.name, p]));

  it("is paid only when a settled payment points at their registration", () => {
    expect(byName.Emma.paymentStatus).toBe("Paid");
    expect(byName.Liam.paymentStatus).toBe("Pending");
  });

  it("is not paid by somebody else's payment", () => {
    const [other] = toTournaments(collections([
      { payment_id: "pay_1", tournament_registration_id: "treg_somebody_else", status: "Paid" },
    ]));
    expect(other.participants.every((p) => p.paymentStatus === "Pending")).toBe(true);
  });

  it("is not paid by a card payment that has not settled", () => {
    const [pending] = toTournaments(collections([
      { payment_id: "pay_1", tournament_registration_id: "treg_paid", status: "Pending" },
    ]));
    expect(pending.participants[0].paymentStatus).toBe("Pending");
  });

  it("carries what the family wrote on the form", () => {
    expect(byName.Emma.medicalNotes).toBe("Asthma — inhaler in her bag.");
    expect(byName.Emma.notes).toBe("Please seat her near the door.");
    expect(byName.Liam.medicalNotes).toBe("");
  });

  /* A public entry is quoted a fee and only charged one later. Reading the
     charge alone showed those as owing nothing, and the drawer offered no fee
     to collect at the desk. */
  it("owes its quote until a charge is set", () => {
    const [quoted] = toTournaments({
      ...collections([]),
      tournamentRegistrations: [{
        tournament_registration_id: "treg_quoted", tournament_id: "trn_1",
        participant_name: "Noah", status: "Approved", fee_quoted: 270, fee_charged: null,
      }],
    });
    expect(quoted.participants[0].feeCharged).toBe(270);
  });
});

describe("a tournament's student pricing", () => {
  it("is the server's price and the organiser's choice", () => {
    const [event] = toTournaments({
      ...collections([]),
      tournaments: [{
        tournament_id: "trn_1", name: "Wellington 2026", tournament_status: "Upcoming",
        regular_fee: 300, student_discount_pct: 10, student_fee: 225,
        student_gets_discount: 1, student_gets_early_bird: 1,
      }],
    });
    expect(event.studentFeeNow).toBe(225);
    expect(event.studentGetsDiscount).toBe(true);
    expect(event.studentGetsEarlyBird).toBe(true);
  });

  it("falls back to the old rule for a backend that does not say", () => {
    const [event] = toTournaments(collections([]));
    expect(event.studentGetsDiscount).toBe(true);
    expect(event.studentGetsEarlyBird).toBe(false);
    expect(event.studentFeeNow).toBeUndefined();
  });
});
