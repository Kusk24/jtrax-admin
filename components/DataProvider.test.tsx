/**
 * The refresh chain, end to end through the real provider.
 *
 * Reported: dismissing a student changes nothing on screen until the page is
 * reloaded by hand — the write lands, and the console goes on showing what it
 * had. The pages themselves read live data, so if anything is stale it is
 * between the write and the render, which is what this exercises: the real
 * DataProvider over a fake API.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const today = new Date().toISOString().slice(0, 10);

/** A tiny in-memory backend: the rows, and what a PATCH does to them. */
const db: Record<string, Record<string, unknown>[]> = {};

function reset() {
  for (const key of Object.keys(db)) delete db[key];
  Object.assign(db, {
    students: [{ student_id: "stu_1", name: "Anong Sri" }],
    classes: [{ class_id: "cls_group", name: "Group Class", class_type: "Group" }],
    "class-sessions": [
      { session_id: "ses_1", class_id: "cls_group", session_date: today, start_time: "09:00", end_time: "10:00" },
    ],
    attendance: [
      { attendance_id: "att_1", student_id: "stu_1", session_id: "ses_1", check_in_time: `${today}T02:00:00Z` },
    ],
    enrollments: [{ enrollment_id: "enr_1", student_id: "stu_1", class_id: "cls_group", status: "Active" }],
    "credit-transactions": [
      { credit_transaction_id: "ctx_1", enrollment_id: "enr_1", transaction_type: "purchase", amount: 10 },
    ],
  });
}

vi.mock("@/lib/api", () => ({
  api: {
    get: async (path: string) => {
      if (path === "auth/me") return { userAccountId: "usr_admin" };
      /* Fresh objects every time, the way parsing a JSON response gives them.
         Returning the stored array itself would hand React the same identity
         on every refresh and make memos look stale when they are not — a bug
         in the test, not in the console. */
      return (db[path] ?? []).map((row) => ({ ...row }));
    },
    patch: async (path: string, body: Record<string, unknown>) => {
      /* The deployed backend is not instant, and a write refetches every
         collection. The freeze was reported in exactly this gap. */
      await new Promise((r) => setTimeout(r, 40));
      const [collection, id] = path.split("/");
      const row = (db[collection] ?? []).find((r) => Object.values(r).includes(id));
      if (row) Object.assign(row, body);
      return row ?? {};
    },
    post: async () => ({}),
    del: async () => ({}),
    put: async () => ({}),
  },
  ApiError: class extends Error {},
}));

const { DataProvider } = await import("./DataProvider");
const { CheckinTable } = await import("./dashboard/CheckinTable");
const { FindStudent } = await import("./dashboard/FindStudent");
const { ErrorToastProvider } = await import("./ErrorToast");

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(reset);

describe("dismissing a student from the check-in table", () => {
  it("shows them as dismissed without the page being reloaded", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ErrorToastProvider>
          <DataProvider>
            <CheckinTable />
          </DataProvider>
        </ErrorToastProvider>
      </NextIntlClientProvider>,
    );

    /* The first fetch has to land before there is a row to dismiss. */
    await waitFor(() => expect(screen.getByText("Anong Sri")).toBeTruthy());
    expect(screen.getByText("In class")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Dismiss/i }));

    /* The write went through — the fake backend has the stamp. */
    await waitFor(() => expect(db.attendance[0].check_out_time).toBeTruthy());

    /* And the screen followed, with nobody reloading anything. */
    await waitFor(() => expect(screen.getByText("Dismissed")).toBeTruthy());
    expect(screen.queryByText("In class")).toBeNull();
  });
});

describe("dismissing a student from the desk search", () => {
  it("shows them as dismissed without the page being reloaded", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ErrorToastProvider>
          <DataProvider>
            <FindStudent />
          </DataProvider>
        </ErrorToastProvider>
      </NextIntlClientProvider>,
    );

    await user.type(screen.getByLabelText("Search students by name or phone number"), "Anong");
    await waitFor(() => expect(screen.getByText("In class · Group Class")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => expect(db.attendance[0].check_out_time).toBeTruthy());
    await waitFor(() => expect(screen.getByText("Dismissed")).toBeTruthy());
  });
});

describe("while a dismissal is in flight", () => {
  /* A write refetches all twenty collections. On the deployed backend that is
     seconds, and a plain button sat there looking unpressed for all of them —
     which the desk read as a freeze, and reloaded the page to find the
     dismissal had gone through the whole time. */
  it("says it is working rather than sitting there looking unpressed", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ErrorToastProvider>
          <DataProvider>
            <CheckinTable />
          </DataProvider>
        </ErrorToastProvider>
      </NextIntlClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("Anong Sri")).toBeTruthy());
    const button = screen.getByRole("button", { name: /Dismiss/i }) as HTMLButtonElement;
    await user.click(button);

    /* Mid-write: the label has changed and the button will not take a second
       press. */
    expect(screen.getByRole("button", { name: /Saving/i })).toBeTruthy();
    expect((screen.getByRole("button", { name: /Saving/i }) as HTMLButtonElement).disabled).toBe(true);

    await waitFor(() => expect(screen.getByText("Dismissed")).toBeTruthy());
  });

  it("takes one press, not two", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ErrorToastProvider>
          <DataProvider>
            <CheckinTable />
          </DataProvider>
        </ErrorToastProvider>
      </NextIntlClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("Anong Sri")).toBeTruthy());
    const button = screen.getByRole("button", { name: /Dismiss/i });
    await user.click(button);
    await user.click(button).catch(() => {});

    await waitFor(() => expect(screen.getByText("Dismissed")).toBeTruthy());
    expect(db.attendance).toHaveLength(1);
  });
});
