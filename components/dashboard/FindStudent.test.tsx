/**
 * The front desk writes.
 *
 * The gap this covers: every button here used to move a chip in component
 * state and save nothing, so the check-in table beside it never saw the
 * student and a refresh lost the lot. These tests assert the requests, because
 * the request is the entire point — a green chip proves nothing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const create = vi.fn(async () => ({}));
const update = vi.fn(async () => ({}));

/* Anong is enrolled in Group only; Boon in both, so the desk has to ask. */
const state = {
  students: [
    { id: "anong", name: "Anong Sri", credit: 8, status: "Normal", parentPhone: "0811111111" },
    { id: "boon", name: "Boon Mek", credit: 2, status: "Low Credit", parentPhone: "0822222222" },
  ],
  todaysClasses: [
    { id: "ses_group", classId: "cls_group", name: "Group Class", time: "10:00 – 11:00" },
    { id: "ses_master", classId: "cls_master", name: "Master Class", time: "14:00 – 15:00" },
  ],
  raw: {
    attendance: [] as Record<string, unknown>[],
    enrollments: [
      { enrollment_id: "enr_anong", student_id: "anong", class_id: "cls_group" },
      { enrollment_id: "enr_boon_g", student_id: "boon", class_id: "cls_group" },
      { enrollment_id: "enr_boon_m", student_id: "boon", class_id: "cls_master" },
    ],
  },
};

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({ ...state, create, update }),
}));

/* The desk offers "Register Student" when a search finds nobody, which needs a
   router; nothing under test navigates. */
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { FindStudent } = await import("./FindStudent");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

function renderDesk() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <FindStudent />
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  return screen.getByLabelText("Search students by name or phone number");
}

beforeEach(() => {
  create.mockClear();
  update.mockClear();
  state.raw.attendance = [];
});

describe("checking a student in", () => {
  it("writes an attendance row for their only class today", async () => {
    const user = userEvent.setup();
    await user.type(renderDesk(), "Anong");
    await user.click(await screen.findByRole("button", { name: "Check In" }));

    expect(create).toHaveBeenCalledTimes(1);
    const [path, body] = create.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(path).toBe("attendance");
    expect(body.student_id).toBe("anong");
    expect(body.session_id).toBe("ses_group");
    expect(body.check_in_time).toBeTruthy();
  });

  it("asks which class when they are enrolled in more than one, and writes the one chosen", async () => {
    const user = userEvent.setup();
    await user.type(renderDesk(), "Boon");
    await user.click(await screen.findByRole("button", { name: "Check In" }));

    /* Nothing written yet — the wrong class is a wrong record for a real child. */
    expect(create).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: /Master Class/ }));
    expect(create).toHaveBeenCalledTimes(1);
    const [, body] = create.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(body.session_id).toBe("ses_master");
  });

  it("shows the student as in class once the row exists", async () => {
    state.raw.attendance = [
      { attendance_id: "att_1", student_id: "anong", session_id: "ses_group", check_in_time: "2026-08-21T03:00:00Z" },
    ];
    const user = userEvent.setup();
    await user.type(renderDesk(), "Anong");

    expect(await screen.findByText("In class · Group Class")).toBeTruthy();
  });
});

describe("dismissing", () => {
  it("stamps check_out_time on the row that exists", async () => {
    state.raw.attendance = [
      { attendance_id: "att_1", student_id: "anong", session_id: "ses_group", check_in_time: "2026-08-21T03:00:00Z" },
    ];
    const user = userEvent.setup();
    await user.type(renderDesk(), "Anong");
    await user.click(await screen.findByRole("button", { name: "Dismiss" }));

    expect(update).toHaveBeenCalledTimes(1);
    const [path, id, body] = update.mock.calls[0] as unknown as [string, string, Record<string, unknown>];
    expect([path, id]).toEqual(["attendance", "att_1"]);
    expect(body.check_out_time).toBeTruthy();
  });
});

describe("topping up credits", () => {
  it("writes a manual adjustment against their enrolment", async () => {
    const user = userEvent.setup();
    await user.type(renderDesk(), "Boon");
    await user.click(await screen.findByRole("button", { name: "Add Credits" }));
    await user.click(await screen.findByRole("button", { name: "+10" }));

    expect(create).toHaveBeenCalledTimes(1);
    const [path, body] = create.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(path).toBe("credit-transactions");
    expect(body.enrollment_id).toBe("enr_boon_g");
    expect(body.transaction_type).toBe("manual_adjustment");
    expect(body.amount).toBe(10);
  });
});

describe("nothing to write to", () => {
  it("says so rather than checking anyone in when no class is running", async () => {
    const saved = state.todaysClasses;
    state.todaysClasses = [];
    try {
      const user = userEvent.setup();
      await user.type(renderDesk(), "Anong");
      await user.click(await screen.findByRole("button", { name: "Check In" }));

      expect(create).not.toHaveBeenCalled();
      expect(await screen.findByText(/No class is running today/)).toBeTruthy();
    } finally {
      state.todaysClasses = saved;
    }
  });
});
