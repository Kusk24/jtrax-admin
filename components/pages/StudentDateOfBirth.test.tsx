/**
 * Editing a child's date of birth, end to end through the real provider.
 *
 * Reported: the field cannot be changed, and the age beside the name never
 * moves. Age is not stored — `toStudents` works it out from `date_of_birth` on
 * every render — so if the number is stuck, either the write never carried the
 * field or the form never held it. This drives the real StudentsPage over a
 * fake API so both halves are in the frame.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const db: Record<string, Record<string, unknown>[]> = {};
const patches: Array<{ path: string; body: Record<string, unknown> }> = [];

function reset() {
  for (const key of Object.keys(db)) delete db[key];
  patches.length = 0;
  Object.assign(db, {
    students: [
      {
        student_id: "stu_1",
        name: "Anong Sri",
        date_of_birth: "2011-05-02",
        current_level: "Beginner",
      },
    ],
    classes: [{ class_id: "cls_group", name: "Group Class", class_type: "Group" }],
    enrollments: [
      { enrollment_id: "enr_1", student_id: "stu_1", class_id: "cls_group", status: "Active" },
    ],
  });
}

vi.mock("@/lib/api", () => ({
  api: {
    get: async (path: string) => {
      if (path === "auth/me") return { userAccountId: "usr_admin" };
      return (db[path] ?? []).map((row) => ({ ...row }));
    },
    patch: async (path: string, body: Record<string, unknown>) => {
      patches.push({ path, body });
      const [collection, id] = path.split("/");
      const row = (db[collection] ?? []).find((r) => Object.values(r).includes(id));
      /* The backend drops nulls rather than writing them; what matters here is
         that a real value arrives and sticks. */
      if (row) Object.assign(row, body);
      return row ?? {};
    },
    post: async () => ({}),
    del: async () => ({}),
    put: async () => ({}),
  },
  ApiError: class extends Error {},
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/students",
}));

const { DataProvider } = await import("../DataProvider");
const { StudentsPage } = await import("./StudentsPage");
const { ErrorToastProvider } = await import("../ErrorToast");

beforeEach(reset);

/** What the academy's clock makes of a 2 May 2011 birthday, today. */
function yearsSince(iso: string): number {
  const dob = new Date(iso);
  const now = new Date();
  let a = now.getFullYear() - dob.getFullYear();
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) a -= 1;
  return a;
}

async function openTheChild() {
  const user = userEvent.setup();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <DataProvider>
          <StudentsPage />
        </DataProvider>
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  await waitFor(() => expect(screen.getByText("Anong Sri")).toBeTruthy());
  await user.click(screen.getByText("Anong Sri"));
  await waitFor(() => expect(screen.getByText(en.students.backToStudents)).toBeTruthy());
  return user;
}

const dobField = () => screen.getByLabelText(en.students.dateOfBirth) as HTMLInputElement;

describe("a child's date of birth", () => {
  it("arrives in the form as the date on file", async () => {
    const user = await openTheChild();
    await user.click(screen.getByRole("button", { name: en.common.edit }));

    expect(dobField().value).toBe("2011-05-02");
  });

  it("takes a new date", async () => {
    const user = await openTheChild();
    await user.click(screen.getByRole("button", { name: en.common.edit }));

    await user.clear(dobField());
    await user.type(dobField(), "2014-03-09");

    expect(dobField().value).toBe("2014-03-09");
  });

  it("is written when the form is saved", async () => {
    const user = await openTheChild();
    await user.click(screen.getByRole("button", { name: en.common.edit }));
    await user.clear(dobField());
    await user.type(dobField(), "2014-03-09");
    await user.click(screen.getByRole("button", { name: en.common.save }));

    await waitFor(() => expect(patches.length).toBeGreaterThan(0));
    expect(patches[0].body["date_of_birth"]).toBe("2014-03-09");
    expect(db.students[0]["date_of_birth"]).toBe("2014-03-09");
  });

  it("moves the age beside the name", async () => {
    const user = await openTheChild();
    const before = `${yearsSince("2011-05-02")} yrs`;
    const after = `${yearsSince("2014-03-09")} yrs`;
    expect(screen.getByText(new RegExp(before))).toBeTruthy();

    await user.click(screen.getByRole("button", { name: en.common.edit }));
    await user.clear(dobField());
    await user.type(dobField(), "2014-03-09");
    await user.click(screen.getByRole("button", { name: en.common.save }));

    await waitFor(() => expect(screen.getByText(new RegExp(after))).toBeTruthy());
  });
});
