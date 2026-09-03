/**
 * The guardian half of the student card: which parent, not what the parent is.
 *
 * A parent is their own record, shared with their other children. Editing
 * their name or phone number from a child's page edits a person nobody is
 * looking at, and silently rewrites what the *sibling's* page says too. Those
 * details belong on the Parents screen, on their own page, where changing them
 * is visibly changing them.
 *
 * What genuinely belongs to the child is the link: whose child they are, and
 * how they are related. That is what this card writes.
 *
 * Also here: a save that fails has to *look* failed. It used to close the form
 * and drop a toast in the corner, after which the screen showed the old values
 * back — which is indistinguishable from a save that worked, and is what "I
 * changed it and it did not change" looks like from the desk.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const db: Record<string, Record<string, unknown>[]> = {};
const writes: Array<{
  verb: string;
  path: string;
  body?: Record<string, unknown>;
}> = [];
/** Set to make the next student PATCH fail, the way a refused write does. */
let refuseStudentWrite = "";
const push = vi.fn();

function reset() {
  for (const key of Object.keys(db)) delete db[key];
  writes.length = 0;
  refuseStudentWrite = "";
  push.mockClear();
  Object.assign(db, {
    students: [
      {
        student_id: "stu_1",
        name: "Anong Sri",
        date_of_birth: "2013-04-01",
        current_level: "Beginner",
      },
    ],
    classes: [
      { class_id: "cls_group", name: "Group Class", class_type: "Group" },
    ],
    enrollments: [
      {
        enrollment_id: "enr_1",
        student_id: "stu_1",
        class_id: "cls_group",
        status: "Active",
      },
    ],
    parents: [
      { parent_id: "par_1", user_account_id: "usr_p1", name: "Malee Sri" },
      { parent_id: "par_2", user_account_id: "usr_p2", name: "Somchai Sri" },
    ],
    "parent-contacts": [
      {
        parent_contact_id: "pct_1",
        parent_id: "par_1",
        contact_type: "phone",
        value: "0801111111",
      },
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
      if (refuseStudentWrite && path.startsWith("students/"))
        throw new Error(refuseStudentWrite);
      writes.push({ verb: "PATCH", path, body });
      const [collection, id] = path.split("/");
      const row = (db[collection] ?? []).find((r) =>
        Object.values(r).includes(id),
      );
      if (row) Object.assign(row, body);
      return row ?? {};
    },
    post: async (path: string, body: Record<string, unknown>) => {
      writes.push({ verb: "POST", path, body });
      (db[path] ??= []).push({ ...body });
      return { ...body };
    },
    del: async (path: string) => {
      writes.push({ verb: "DELETE", path });
      const [collection, id] = path.split("/");
      db[collection] = (db[collection] ?? []).filter(
        (r) => !Object.values(r).includes(id),
      );
      return {};
    },
    put: async () => ({}),
  },
  ApiError: class extends Error {},
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/students",
}));

const { DataProvider } = await import("../DataProvider");
const { StudentsPage } = await import("./StudentsPage");
const { ErrorToastProvider } = await import("../ErrorToast");
const { SignedInAs } = await import("./signed-in-as");

beforeEach(reset);

async function openEditor() {
  const user = userEvent.setup();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <SignedInAs>
          <DataProvider>
            <StudentsPage />
          </DataProvider>
        </SignedInAs>
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  await waitFor(() => expect(screen.getByText("Anong Sri")).toBeTruthy());
  await user.click(screen.getByText("Anong Sri"));
  await waitFor(() =>
    expect(screen.getByText(en.students.backToStudents)).toBeTruthy(),
  );
  await user.click(screen.getByRole("button", { name: en.common.edit }));
  return user;
}

const save = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: en.common.save }));

const link = () =>
  db["student-parents"].find((r) => r["student_id"] === "stu_1");

describe("choosing the guardian", () => {
  it("offers the parents on file", async () => {
    await openEditor();
    const picker = screen.getByLabelText(
      en.students.chooseGuardian,
    ) as HTMLSelectElement;
    expect(Array.from(picker.options).map((o) => o.textContent)).toContain(
      "Somchai Sri",
    );
    expect(picker.value).toBe("par_1");
  });

  /* The link is keyed by student, so swapping the parent is a delete and a
     create rather than a field. */
  it("moves the child to another parent", async () => {
    const user = await openEditor();
    await user.selectOptions(
      screen.getByLabelText(en.students.chooseGuardian),
      "par_2",
    );
    await save(user);

    await waitFor(() => expect(link()?.["parent_id"]).toBe("par_2"));
    expect(
      writes.some(
        (w) => w.verb === "DELETE" && w.path === "student-parents/stu_1",
      ),
    ).toBe(true);
    expect(
      writes.some((w) => w.verb === "POST" && w.path === "student-parents"),
    ).toBe(true);
  });

  it("saves the relationship, which belongs to the link and nowhere else", async () => {
    const user = await openEditor();
    await user.selectOptions(
      screen.getByLabelText(en.students.relation),
      "Father",
    );
    await save(user);

    await waitFor(() => expect(link()?.["relationship_type"]).toBe("Father"));
  });

  it("can detach a guardian without touching the parent", async () => {
    const user = await openEditor();
    await user.selectOptions(
      screen.getByLabelText(en.students.chooseGuardian),
      "",
    );
    await save(user);

    await waitFor(() => expect(link()).toBeUndefined());
    /* The parent is still on file — they have their own record and possibly
       other children. */
    expect(db.parents).toHaveLength(2);
  });
});

describe("the parent's own details", () => {
  it("cannot be edited from the child's page", async () => {
    await openEditor();
    /* Their name, phone, email and LINE ID were all inputs here. The only
       name field left is the child's own. */
    expect(screen.queryByLabelText(en.common.name)).toBeNull();
    expect(screen.queryByLabelText(en.common.phone)).toBeNull();
    expect(screen.queryByLabelText(en.common.email)).toBeNull();
    expect(screen.queryByLabelText(en.common.lineId)).toBeNull();
  });

  it("says where they are changed, and goes there", async () => {
    const user = await openEditor();
    expect(screen.getByText(en.students.parentDetailsOnParents)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Malee Sri/ }));
    expect(push).toHaveBeenCalledWith("/parents?id=par_1");
  });

  it("shows them, so the desk can see what it is not editing", async () => {
    await openEditor();
    expect(screen.getByText("0801111111")).toBeTruthy();
  });

  it("is left alone by a save", async () => {
    const user = await openEditor();
    await user.selectOptions(
      screen.getByLabelText(en.students.relation),
      "Father",
    );
    await save(user);

    await waitFor(() => expect(link()?.["relationship_type"]).toBe("Father"));
    expect(writes.some((w) => w.path.startsWith("parents/"))).toBe(false);
    expect(writes.some((w) => w.path.startsWith("parent-contacts"))).toBe(
      false,
    );
  });
});

/* A refused write used to close the form and put a toast in the corner —
   four seconds of something you may not be looking at, after which the screen
   shows the old values back and looks exactly like a save that worked. */
describe("a save that fails", () => {
  it("keeps the form open instead of closing as though it worked", async () => {
    refuseStudentWrite = "the backend said no";
    const user = await openEditor();
    await save(user);

    await waitFor(() =>
      expect(screen.getByLabelText(en.students.dateOfBirth)).toBeTruthy(),
    );
  });

  it("writes what went wrong on the form", async () => {
    refuseStudentWrite = "the backend said no";
    const user = await openEditor();
    await save(user);

    await waitFor(() =>
      expect(screen.getByText(/the backend said no/)).toBeTruthy(),
    );
  });

  it("closes on a save that works", async () => {
    const user = await openEditor();
    await save(user);

    await waitFor(() =>
      expect(screen.queryByLabelText(en.students.dateOfBirth)).toBeNull(),
    );
  });
});
