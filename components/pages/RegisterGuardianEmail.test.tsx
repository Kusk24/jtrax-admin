/**
 * A new guardian whose email already has an account.
 *
 * It used to surface as "could not create account (that sign-in ID or email is
 * already taken)" after the student had already been written — a child with no
 * guardian and a login nobody would use. Now the form catches the email before
 * anything is saved, offers the guardian who already has it, and if only the
 * server knows, writes nothing and says so on the form.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { todayISO } from "@/lib/live";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

vi.mock("@/components/JtraxContext", () => ({ useJtrax: () => ({ role: "Admin" }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/students",
}));

type Row = Record<string, unknown>;
const COLLECTIONS = [
  "students", "parents", "parentContacts", "studentParents", "classes",
  "classSessions", "attendance", "enrollments", "creditTransactions",
  "creditPackages", "payments", "teachers", "admins", "accounts",
  "announcements", "tournaments", "tournamentCategories",
  "tournamentRegistrations", "practiceActivities", "systemConfig",
];
const raw: Record<string, Row[]> = Object.fromEntries(COLLECTIONS.map((k) => [k, []]));

const create = vi.fn<(path: string, body: Row) => Promise<Row>>(async () => ({}));

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    raw,
    creditRules: { lowCredit: 3, expiringDays: 7, inactiveDays: 30, certHours: 50, maxNegativeCredit: 0, checkoutRoundMinutes: 15 },
    students: [],
    loading: false,
    error: null,
    batch: async (job: () => Promise<unknown>) => job(),
    create,
    update: async () => ({}),
    remove: async () => undefined,
    removePerson: async () => undefined,
  }),
}));

const post = vi.fn(async () => ({ email: "sandy@example.com", delivered: true }));
vi.mock("@/lib/api", async (real) => {
  const actual = await real<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, post: (...args: unknown[]) => post(...(args as [])) } };
});

const { StudentsPage } = await import("./StudentsPage");
const { ErrorToastProvider } = await import("@/components/ErrorToast");
const { ApiError } = await import("@/lib/api");

beforeEach(() => {
  create.mockReset();
  create.mockImplementation(async () => ({}));
  raw.accounts = [];
  raw.parents = [];
});

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <StudentsPage startWizard="Uri Tan" />
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

async function fillGuardian(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.type(screen.getByLabelText(/^Name( \*)?$/), "Sandy Jones");
  await user.type(screen.getByLabelText(/^Phone( \*)?$/), "0812345678");
  await user.type(screen.getByLabelText(/^Email( \*)?$/), email);
}

const submit = () => screen.getByRole("button", { name: "Register Student" }) as HTMLButtonElement;

describe("a guardian email that already has an account", () => {
  it("names the guardian who has it, blocks saving, and offers to link them", async () => {
    raw.accounts = [{ user_account_id: "usr_sandy", email: "Sandy@Example.com", role: "Parent", display_name: "Sandy Jones" }];
    raw.parents = [{ parent_id: "par_sandy", user_account_id: "usr_sandy", name: "Sandy Jones" }];
    const user = renderForm();
    await fillGuardian(user, "sandy@example.com");

    expect(screen.getByText("This email already belongs to Sandy Jones, who is a guardian here.")).toBeDefined();
    expect(submit().disabled).toBe(true);

    await user.click(screen.getByRole("button", { name: "Link Sandy Jones as the guardian instead" }));
    expect((screen.getByLabelText(/^Guardian( \*)?$/) as HTMLSelectElement).value).toBe("par_sandy");
    expect(submit().disabled).toBe(false);
  });

  it("says plainly when it is some other account's", async () => {
    raw.accounts = [{ user_account_id: "usr_staff", email: "office@jca.ac.th", role: "Admin", display_name: "Office" }];
    const user = renderForm();
    await fillGuardian(user, "office@jca.ac.th");
    expect(screen.getByText("This email is already used by another account. Use a different email.")).toBeDefined();
    expect(submit().disabled).toBe(true);
  });

  it("writes nothing when only the server knows, and says so on the form", async () => {
    create.mockImplementation(async (path: string) => {
      if (path === "user-accounts") throw new ApiError(409, "could not create account (that sign-in ID or email is already taken)", {});
      return {};
    });
    const user = renderForm();
    await fillGuardian(user, "sandy@example.com");
    await user.click(submit());

    /* The guardian's account is the first write, so the refusal stops everything. */
    expect(create.mock.calls.map((c) => c[0])).toEqual(["user-accounts"]);
    expect(await screen.findByText("This email is already used by another account. Use a different email.")).toBeDefined();
    /* Still on the form, with what was typed. */
    expect((screen.getByLabelText(/^Full Name( \*)?$/) as HTMLInputElement).value).toBe("Uri Tan");
  });
});

describe("a new guardian's invite", () => {
  it("carries the child's student login in the same email", async () => {
    create.mockImplementation(async (path: string, body: Row) => {
      if (path === "user-accounts") return { user_account_id: body.role === "Parent" ? "usr_sandy" : "usr_uri", ...body };
      if (path === "students") return { student_id: "stu_uri" };
      if (path === "parents") return { parent_id: "par_sandy" };
      return {};
    });
    post.mockClear();
    const user = renderForm();
    await fillGuardian(user, "sandy@example.com");
    await user.click(submit());

    const call = post.mock.calls.find((c) => String((c as unknown[])[0]).endsWith("/invite")) as unknown[] | undefined;
    expect(call?.[0]).toBe("user-accounts/usr_sandy/invite");
    const logins = (call?.[1] as { studentLogins: { name: string; loginId: string; password: string }[] }).studentLogins;
    expect(logins).toHaveLength(1);
    expect(logins[0].name).toBe("Uri Tan");
    expect(logins[0].loginId).toMatch(/^stu_uri_tan/);
    expect(logins[0].password).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
    expect(await screen.findByText(/with Uri Tan's student login/)).toBeDefined();
  });
});

describe("the course a new student joins", () => {
  it("is the one picked, even when two courses share a name", async () => {
    raw.classes = [
      { class_id: "nxt_group", name: "JCA NXT", class_type: "Group" },
      { class_id: "nxt_private", name: "JCA NXT", class_type: "Private" },
    ];
    create.mockImplementation(async (path: string, body: Row) => {
      if (path === "user-accounts") return { user_account_id: body.role === "Parent" ? "usr_sandy" : "usr_uri", ...body };
      if (path === "students") return { student_id: "stu_uri" };
      if (path === "parents") return { parent_id: "par_sandy" };
      return {};
    });
    const user = renderForm();
    const course = screen.getByLabelText(/^Course( \*)?$/) as HTMLSelectElement;
    expect(Array.from(course.options).map((o) => o.textContent)).toEqual(["JCA NXT · Group", "JCA NXT · Private"]);
    await user.selectOptions(course, "nxt_private");
    await fillGuardian(user, "sandy@example.com");
    await user.click(submit());

    const enrol = create.mock.calls.find((c) => c[0] === "enrollments");
    expect(enrol?.[1].class_id).toBe("nxt_private");
    raw.classes = [];
  });
});

describe("the student's own email", () => {
  it("signs them in with it, instead of a username", async () => {
    create.mockImplementation(async (path: string, body: Row) => {
      if (path === "user-accounts") return { user_account_id: body.role === "Parent" ? "usr_sandy" : "usr_uri", ...body };
      if (path === "students") return { student_id: "stu_uri" };
      if (path === "parents") return { parent_id: "par_sandy" };
      return {};
    });
    const user = renderForm();
    await user.type(screen.getByLabelText(/^Student email/), "Uri.Tan@school.th");
    await fillGuardian(user, "sandy@example.com");
    await user.click(submit());

    const student = create.mock.calls.find((c) => c[0] === "user-accounts" && c[1].role === "Student");
    expect(student?.[1].email).toBe("uri.tan@school.th");
  });

  it("cannot be the guardian's, nor not an address", async () => {
    const user = renderForm();
    await fillGuardian(user, "sandy@example.com");
    await user.type(screen.getByLabelText(/^Student email/), "sandy@example.com");
    expect(screen.getByText("This email already has an account")).toBeDefined();
    expect(submit().disabled).toBe(true);
    await user.clear(screen.getByLabelText(/^Student email/));
    await user.type(screen.getByLabelText(/^Student email/), "not-an-email");
    expect(screen.getByText("Enter a valid email address")).toBeDefined();
    expect(submit().disabled).toBe(true);
  });
});

describe("the date of birth", () => {
  it("must be at least a year ago", async () => {
    const user = renderForm();
    await fillGuardian(user, "sandy@example.com");
    fireEvent.change(screen.getByLabelText(/^Date of birth/i), { target: { value: todayISO() } });
    expect(screen.getByText("Date of birth must be at least 1 year ago.")).toBeDefined();
    expect(submit().disabled).toBe(true);
    void user;
  });
});
