/**
 * A student's own email, on the edit form whether or not they had one: added
 * later, it becomes how they sign in; taken off, they get a sign-in ID again.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

type Row = Record<string, unknown>;
const db: Record<string, Row[]> = {};
const patches: Array<{ path: string; body: Row }> = [];
const posts: Array<{ path: string; body: Row }> = [];

function reset() {
  for (const key of Object.keys(db)) delete db[key];
  patches.length = 0;
  posts.length = 0;
  Object.assign(db, {
    students: [
      { student_id: "stu_1", name: "Anong Sri", user_account_id: "usr_1", email: "stu_anong_sri", branch: "Bangkok" },
      { student_id: "stu_2", name: "Boon Chai", branch: "Bangkok" },
      { student_id: "stu_3", name: "Chai Lee", user_account_id: "usr_3", email: "chai@example.com", branch: "Bangkok" },
    ],
  });
}

vi.mock("@/lib/api", () => ({
  api: {
    get: async (path: string) => {
      if (path === "auth/me") return { userAccountId: "usr_admin" };
      return (db[path] ?? []).map((row) => ({ ...row }));
    },
    patch: async (path: string, body: Row) => {
      patches.push({ path, body });
      const [collection, id] = path.split("/");
      const row = (db[collection] ?? []).find((r) => Object.values(r).includes(id));
      if (row) Object.assign(row, body);
      return { ...(row ?? body) };
    },
    post: async (path: string, body: Row) => {
      posts.push({ path, body });
      return path === "user-accounts" ? { user_account_id: "usr_new", ...body } : { ...body };
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

async function editStudent(name: string) {
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
  await waitFor(() => expect(screen.getByText(name)).toBeTruthy());
  await user.click(screen.getByText(name));
  await waitFor(() => expect(screen.getByText(en.students.backToStudents)).toBeTruthy());
  await user.click(screen.getByRole("button", { name: en.common.edit }));
  return user;
}

const emailField = () => screen.getByLabelText(en.students.studentEmail) as HTMLInputElement;

describe("a student's own email on the edit form", () => {
  it("is there, blank, for a child who signs in with an ID", async () => {
    await editStudent("Anong Sri");
    expect(emailField().value).toBe("");
  });

  it("becomes their sign-in when added", async () => {
    const user = await editStudent("Anong Sri");
    await user.type(emailField(), "anong@example.com");
    expect(screen.getByText(/instead of stu_anong_sri/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: en.common.save }));
    await waitFor(() =>
      expect(patches).toContainEqual({ path: "user-accounts/usr_1", body: { email: "anong@example.com" } }),
    );
  });

  it("gives a student with no account one, signed in by that email", async () => {
    const user = await editStudent("Boon Chai");
    expect(emailField().value).toBe("");
    await user.type(emailField(), "boon@example.com");
    await user.click(screen.getByRole("button", { name: en.common.save }));
    await waitFor(() => expect(posts.find((p) => p.path === "user-accounts")?.body).toMatchObject({ email: "boon@example.com", role: "Student" }));
    await waitFor(() =>
      expect(patches).toContainEqual({ path: "students/stu_2", body: { user_account_id: "usr_new" } }),
    );
  });

  it("shows the email they have, and gives back an ID when it is taken off", async () => {
    const user = await editStudent("Chai Lee");
    expect(emailField().value).toBe("chai@example.com");
    await user.clear(emailField());
    await user.click(screen.getByRole("button", { name: en.common.save }));
    await waitFor(() =>
      expect(patches).toContainEqual({ path: "user-accounts/usr_3", body: { email: "stu_chai_lee" } }),
    );
  });

  it("refuses an address that is not one", async () => {
    const user = await editStudent("Anong Sri");
    await user.type(emailField(), "not-an-email");
    await user.click(screen.getByRole("button", { name: en.common.save }));
    expect(await screen.findByText(en.students.studentEmailInvalid)).toBeTruthy();
    expect(patches.some((p) => p.path.startsWith("user-accounts"))).toBe(false);
  });
});
