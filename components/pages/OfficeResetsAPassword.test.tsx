/**
 * Resetting a password from the office, and who may.
 *
 * A child signs in with an ID — `stu_penny_ward` — and an ID has no mailbox, so
 * the forgot-password link that serves everyone else cannot reach them. The
 * office is the only route back in, which makes this button the thing standing
 * between a locked-out seven-year-old and their account.
 *
 * It is admin-only, matching the server: whoever types a new password can then
 * sign in as that person and read every family's details. The console hiding it
 * is a courtesy — the check that matters is the one in the API — so the test
 * asserts both that the receptionist cannot see it and that the write the
 * button makes is the one the server expects.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { JtraxRole } from "@/lib/theme";

type Row = Record<string, unknown>;
const db: Record<string, Row[]> = {};
const writes: Array<{ verb: string; path: string; body?: Row }> = [];
/** Set to make the next account PATCH fail the way a refused write does. */
let refuseAccountWrite = "";

function reset() {
  for (const key of Object.keys(db)) delete db[key];
  writes.length = 0;
  refuseAccountWrite = "";
  Object.assign(db, {
    students: [
      {
        student_id: "stu_1",
        user_account_id: "usr_penny",
        email: "stu_penny_ward",
        name: "Penny Ward",
        date_of_birth: "2018-04-01",
        current_level: "Beginner",
      },
    ],
    classes: [{ class_id: "cls_group", name: "Group Class", class_type: "Group" }],
    enrollments: [
      { enrollment_id: "enr_1", student_id: "stu_1", class_id: "cls_group", status: "Active" },
    ],
    parents: [],
    "parent-contacts": [],
    "student-parents": [],
  });
}

vi.mock("@/lib/api", () => ({
  api: {
    get: async (path: string) => {
      if (path === "auth/me") return { userAccountId: "usr_admin" };
      return (db[path] ?? []).map((row) => ({ ...row }));
    },
    patch: async (path: string, body: Row) => {
      if (refuseAccountWrite && path.startsWith("user-accounts/")) throw new Error(refuseAccountWrite);
      writes.push({ verb: "PATCH", path, body });
      const [collection, id] = path.split("/");
      const row = (db[collection] ?? []).find((r) => Object.values(r).includes(id));
      if (row) Object.assign(row, body);
      return row ?? {};
    },
    post: async (path: string, body: Row) => {
      writes.push({ verb: "POST", path, body });
      (db[path] ??= []).push({ ...body });
      return { ...body };
    },
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
const { SignedInAs } = await import("./signed-in-as");

beforeEach(reset);

async function openTheChild(role: JtraxRole) {
  const user = userEvent.setup();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <SignedInAs role={role}>
          <DataProvider>
            <StudentsPage />
          </DataProvider>
        </SignedInAs>
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  await waitFor(() => expect(screen.getByText("Penny Ward")).toBeTruthy());
  await user.click(screen.getByText("Penny Ward"));
  await waitFor(() => expect(screen.getByText(en.students.backToStudents)).toBeTruthy());
  return user;
}

const resetButton = () => screen.queryByRole("button", { name: en.resetPassword.action });
const accountWrites = () => writes.filter((w) => w.path.startsWith("user-accounts/"));

describe("an admin looking at a child", () => {
  it("is offered the reset, because a child's ID cannot be sent a link", async () => {
    await openTheChild("Admin");
    expect(resetButton()).toBeTruthy();
  });

  /* Confirmed first: the old password is a hash and is gone the moment this
     runs, so there is nothing to undo it with. */
  it("is asked to confirm before anything is written", async () => {
    const user = await openTheChild("Admin");
    await user.click(resetButton()!);
    expect(screen.getByText(en.resetPassword.confirmTitle)).toBeTruthy();
    expect(accountWrites()).toHaveLength(0);
  });

  it("can back out, and nothing has changed", async () => {
    const user = await openTheChild("Admin");
    await user.click(resetButton()!);
    await user.click(screen.getByRole("button", { name: en.resetPassword.cancel }));
    expect(accountWrites()).toHaveLength(0);
  });

  it("writes the new password to the child's own account", async () => {
    const user = await openTheChild("Admin");
    await user.click(resetButton()!);
    await user.click(screen.getByRole("button", { name: en.resetPassword.confirm }));

    await waitFor(() => expect(accountWrites()).toHaveLength(1));
    const [write] = accountWrites();
    /* The account, not the student row. They are different ids and the
       password lives on only one of them. */
    expect(write.path).toBe("user-accounts/usr_penny");
    expect(typeof write.body?.password).toBe("string");
    expect(String(write.body?.password).length).toBeGreaterThanOrEqual(8);
    /* Nothing else rides along. A reset that also rewrote the identifier
       would lock the child out by fixing their lock-out. */
    expect(Object.keys(write.body ?? {})).toEqual(["password"]);
  });

  /* A password on its own is half of what the family needs to write down, and
     the desk cannot look the other half up afterwards — the password is never
     shown again. */
  it("shows the new password beside the ID it goes with", async () => {
    const user = await openTheChild("Admin");
    await user.click(resetButton()!);
    await user.click(screen.getByRole("button", { name: en.resetPassword.confirm }));

    await waitFor(() => expect(screen.getByText(en.resetPassword.doneTitle)).toBeTruthy());
    /* Scoped to the dialog: the ID is on the card behind it too, and finding
       that one would pass with the dialog showing a password on its own. */
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("stu_penny_ward")).toBeTruthy();
    const written = String(accountWrites()[0].body?.password);
    expect(dialog.getByText(written)).toBeTruthy();
  });

  it("does not claim success when the server refused", async () => {
    refuseAccountWrite = "not allowed";
    const user = await openTheChild("Admin");
    await user.click(resetButton()!);
    await user.click(screen.getByRole("button", { name: en.resetPassword.confirm }));

    await waitFor(() => expect(screen.queryByText(en.resetPassword.confirmTitle)).toBeNull());
    /* The important half: no password is shown. A dialog reading "new password
       set" over a write that failed sends the family away with a string that
       does not work, and the desk has no reason to doubt it. */
    expect(screen.queryByText(en.resetPassword.doneTitle)).toBeNull();
  });
});

describe("a receptionist looking at the same child", () => {
  /* Hidden rather than disabled: a disabled control invites asking why, and
     the answer is not something the front desk can fix. */
  it("is not offered the reset at all", async () => {
    await openTheChild("Receptionist");
    expect(resetButton()).toBeNull();
  });

  it("keeps the edits that are theirs to make", async () => {
    await openTheChild("Receptionist");
    expect(screen.getByRole("button", { name: en.common.edit })).toBeTruthy();
  });
});

/**
 * The guardian's own address, which is now their login.
 *
 * It used to fall back to a made-up `@parent.jca.ac.th` when the box was left
 * empty — the same fiction the children have just been rid of, and with less
 * excuse, because a parent *has* a mailbox. What it cost was the reset link: an
 * adult who could have let themselves back in was quietly given an address that
 * receives nothing.
 */
describe("registering a child with a new guardian", () => {
  async function openTheWizard() {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ErrorToastProvider>
          <SignedInAs role="Receptionist">
            <DataProvider>
              <StudentsPage />
            </DataProvider>
          </SignedInAs>
        </ErrorToastProvider>
      </NextIntlClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("Penny Ward")).toBeTruthy());
    await user.click(screen.getAllByRole("button", { name: en.students.registerTitle })[0]);
    await user.click(await screen.findByRole("button", { name: /manual/i }));
    return user;
  }

  const submit = () => screen.getByRole("button", { name: en.students.registerTitle });

  it("will not submit on a name and a phone number alone", async () => {
    const user = await openTheWizard();
    await user.type(screen.getByLabelText(en.students.fullName), "New Child");
    await user.type(screen.getByLabelText(en.common.name), "A Parent");
    await user.type(screen.getByLabelText(en.common.phone), "0801234567");
    expect((submit() as HTMLButtonElement).disabled).toBe(true);
  });

  it("submits once the guardian's address is there", async () => {
    const user = await openTheWizard();
    await user.type(screen.getByLabelText(en.students.fullName), "New Child");
    await user.type(screen.getByLabelText(en.common.name), "A Parent");
    await user.type(screen.getByLabelText(en.common.phone), "0801234567");
    await user.type(screen.getByLabelText(en.students.emailRequired), "a.parent@gmail.com");
    expect((submit() as HTMLButtonElement).disabled).toBe(false);

    await user.click(submit());
    await waitFor(() =>
      expect(writes.some((w) => w.path === "user-accounts" && w.body?.role === "Parent")).toBe(true),
    );
    const account = writes.find((w) => w.path === "user-accounts" && w.body?.role === "Parent");
    /* The address the family gave, not one the console made up. This is the
       whole change: `a.parent@parent.jca.ac.th` used to land here. */
    expect(account?.body?.email).toBe("a.parent@gmail.com");
  });

  /* The field says so, rather than leaving the desk to discover it by finding
     the button greyed out with nothing explaining which box is missing. */
  it("labels the address as required", async () => {
    await openTheWizard();
    expect(screen.getByLabelText(en.students.emailRequired)).toBeTruthy();
    expect(en.students.guardianEmailHelp).toMatch(/required/i);
  });
});
