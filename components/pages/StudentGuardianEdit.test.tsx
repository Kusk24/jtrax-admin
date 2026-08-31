/**
 * The student edit card, and whether it edits anything.
 *
 * It showed fourteen fields and wrote five. The guardian's name, the
 * relationship and all three ways of reaching them were typed, saved, and
 * discarded — no error, no hint, the values simply back as they were on the
 * next render. Course, Branch, Membership and the student's own LINE ID were
 * worse: nothing behind them in either direction.
 *
 * A guardian is a person with their own record, shared with their other
 * children, so saving them is several writes across three tables rather than
 * columns on the student. That is what this covers.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const db: Record<string, Record<string, unknown>[]> = {};
const writes: Array<{ verb: string; path: string; body?: Record<string, unknown> }> = [];

function reset() {
  for (const key of Object.keys(db)) delete db[key];
  writes.length = 0;
  Object.assign(db, {
    students: [
      { student_id: "stu_1", name: "Anong Sri", date_of_birth: "2013-04-01", current_level: "Beginner" },
    ],
    classes: [{ class_id: "cls_group", name: "Group Class", class_type: "Group" }],
    enrollments: [
      { enrollment_id: "enr_1", student_id: "stu_1", class_id: "cls_group", status: "Active" },
    ],
    parents: [{ parent_id: "par_1", user_account_id: "usr_p1", name: "Malee Sri" }],
    /* A phone and an email on file, and no LINE ID — the three cases the save
       has to tell apart: change one, clear one, add one. */
    "parent-contacts": [
      { parent_contact_id: "pct_1", parent_id: "par_1", contact_type: "phone", value: "0801111111" },
      { parent_contact_id: "pct_2", parent_id: "par_1", contact_type: "email", value: "malee@example.com" },
    ],
    "student-parents": [
      { student_id: "stu_1", parent_id: "par_1", relationship_type: "Mother" },
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
      writes.push({ verb: "PATCH", path, body });
      const [collection, id] = path.split("/");
      const row = (db[collection] ?? []).find((r) => Object.values(r).includes(id));
      if (row) Object.assign(row, body);
      return row ?? {};
    },
    post: async (path: string, body: Record<string, unknown>) => {
      writes.push({ verb: "POST", path, body });
      const row = { ...body, [`${path.replace(/s$/, "").replace(/-/g, "_")}_id`]: `new_${writes.length}` };
      (db[path] ??= []).push(row);
      return row;
    },
    del: async (path: string) => {
      writes.push({ verb: "DELETE", path });
      const [collection, id] = path.split("/");
      db[collection] = (db[collection] ?? []).filter((r) => !Object.values(r).includes(id));
      return {};
    },
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

async function openEditor() {
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
  await user.click(screen.getByRole("button", { name: en.common.edit }));
  return user;
}

const save = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: en.common.save }));

async function retype(user: ReturnType<typeof userEvent.setup>, field: HTMLElement, value: string) {
  await user.clear(field);
  if (value) await user.type(field, value);
}

const contactValue = (type: string) =>
  db["parent-contacts"].find((r) => r["contact_type"] === type)?.["value"];

describe("the guardian's details", () => {
  it("saves a corrected name to the guardian's own row", async () => {
    const user = await openEditor();
    await retype(user, screen.getByLabelText(en.common.name), "Malee Sriwongse");
    await save(user);

    await waitFor(() => expect(db.parents[0]["name"]).toBe("Malee Sriwongse"));
    expect(writes.some((w) => w.verb === "PATCH" && w.path === "parents/par_1")).toBe(true);
  });

  it("saves the relationship on the link, not on the child", async () => {
    const user = await openEditor();
    await user.selectOptions(screen.getByLabelText(en.students.relation), "Father");
    await save(user);

    await waitFor(() => expect(db["student-parents"][0]["relationship_type"]).toBe("Father"));
  });

  it("changes a contact line that is already on file", async () => {
    const user = await openEditor();
    await retype(user, screen.getByLabelText(en.common.phone), "0899999999");
    await save(user);

    await waitFor(() => expect(contactValue("phone")).toBe("0899999999"));
  });

  /* No LINE ID on file, so there is no row to change — one has to be made. */
  it("adds a contact line the family did not have", async () => {
    const user = await openEditor();
    await retype(user, screen.getByLabelText(en.common.lineId), "@malee");
    await save(user);

    await waitFor(() => expect(contactValue("line_id")).toBe("@malee"));
    expect(writes.some((w) => w.verb === "POST" && w.path === "parent-contacts")).toBe(true);
  });

  /* `parent_contact.value` is required, so a blank one is a row the backend
     refuses — and a blank phone number reads at the desk as "we have one". */
  it("removes a contact line that was cleared rather than blanking it", async () => {
    const user = await openEditor();
    await retype(user, screen.getByLabelText(en.common.email), "");
    await save(user);

    await waitFor(() => expect(contactValue("email")).toBeUndefined());
    expect(writes.some((w) => w.verb === "DELETE" && w.path === "parent-contacts/pct_2")).toBe(true);
  });

  it("leaves alone what was not touched", async () => {
    const user = await openEditor();
    await retype(user, screen.getByLabelText(en.common.phone), "0899999999");
    await save(user);

    await waitFor(() => expect(contactValue("phone")).toBe("0899999999"));
    /* The email and the name were not edited, so nothing was written for them. */
    expect(writes.some((w) => w.path === "parent-contacts/pct_2")).toBe(false);
    expect(writes.some((w) => w.path === "parents/par_1")).toBe(false);
  });

  it("saves the child and the guardian together", async () => {
    const user = await openEditor();
    await retype(user, screen.getByLabelText(en.students.fullName), "Anong Sriwongse");
    await retype(user, screen.getByLabelText(en.common.phone), "0899999999");
    await save(user);

    await waitFor(() => expect(db.students[0]["name"]).toBe("Anong Sriwongse"));
    expect(contactValue("phone")).toBe("0899999999");
  });
});

/* Fields with nothing behind them are worse than fields that fail to save:
   they invite an edit the console was never going to keep. */
describe("the fields that were never real", () => {
  it("no longer offers a course picker that discards the choice", async () => {
    await openEditor();
    expect(screen.queryByLabelText(en.common.class)).toBeNull();
    /* It says where the answer actually lives instead. */
    expect(screen.getByText(en.students.courseOnEnrolments)).toBeTruthy();
  });

  it("no longer offers Branch or Membership", async () => {
    await openEditor();
    expect(screen.queryByLabelText(en.common.branch)).toBeNull();
    expect(screen.queryByLabelText(en.students.membership)).toBeNull();
  });

  /* `toStudents` sets this to "" every time and there is no column to write
     it to, so the box was always empty and always stayed empty. */
  it("no longer offers the student their own LINE ID", async () => {
    await openEditor();
    /* Only the guardian's remains. */
    expect(screen.getAllByLabelText(en.common.lineId)).toHaveLength(1);
  });
});
