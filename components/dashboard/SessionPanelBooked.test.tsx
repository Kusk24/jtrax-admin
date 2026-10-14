/**
 * A scheduled class that has started: its booked students are expected, not
 * checked in, and each has a Check in the desk presses on arrival.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { todayISO } from "@/lib/live";
import type { ClassDef } from "@/lib/data";

const create = vi.fn(async () => ({}));
const remove = vi.fn(async () => ({}));
/* All day today, so it reads as running whatever the hour the test runs. */
const def: ClassDef = {
  id: "ses_1", classId: "cls_group", category: "Beginner", classType: "Group", name: "JCA Starters",
  time: "00:00 – 23:59", status: "Ongoing", date: todayISO(), start: "00:00",
  students: ["Anong"], more: 0, teacher: "—", room: "—", roster: [], booked: ["Anong"],
};
const state = {
  students: [{ id: "anong", name: "Anong" }],
  raw: {
    classes: [{ class_id: "cls_group", name: "JCA Starters", class_type: "Group" }],
    classSessions: [{ session_id: "ses_1", class_id: "cls_group", session_date: todayISO(), start_time: "00:00", end_time: "23:59" }],
    attendance: [], enrollments: [], creditTransactions: [],
    sessionBookings: [{ booking_id: "b1", session_id: "ses_1", student_id: "anong" }],
  },
  todaysClasses: [def],
  creditRules: { lowCredit: 3, expiringDays: 7, inactiveDays: 30, certHours: 50, maxNegativeCredit: 0 },
};
vi.mock("@/components/DataProvider", () => ({
  useData: () => ({ ...state, create, remove, update: vi.fn(), refresh: vi.fn(), batch: vi.fn() }),
}));

const { SessionPanel } = await import("./SessionPanel");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

describe("a started class's booked students", () => {
  it("are checked in, one by one, from the booked list", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ErrorToastProvider>
          <SessionPanel state={{ mode: "view", def }} onClose={() => {}} />
        </ErrorToastProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Check each one in when they arrive.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Check in Anong" }));
    expect(create).toHaveBeenCalledWith("attendance", expect.objectContaining({ student_id: "anong", session_id: "ses_1" }));
  });
});
