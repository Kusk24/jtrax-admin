/**
 * Enrolling and leaving — the two things that happen to an enrolment.
 *
 * The row used to offer Edit and Delete. Both were wrong for what an enrolment
 * is: editing one retypes the class on a row with a term of credits behind it,
 * moving that ledger to a class the money was never spent in, and "Delete" is
 * the wrong word for what already happened — the class stays on file, the
 * child leaves it. Withdrawing is the act the academy actually performs, and
 * `leaveClass` has done it since #72; the row just did not say so.
 *
 * The list's class filter is here too, because the rule it is built on lives
 * in `lib/student-classes.ts` and this is the half that proves the screen
 * calls it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const create = vi.fn(async () => ({ enrollment_id: "e_new" }));
const update = vi.fn(async () => ({}));
const remove = vi.fn(async () => undefined);

/* Anong is in two classes — the case the roster's single Class column cannot
   show and the class filter exists for. Boon has left Beginner for
   Intermediate. Chai was enrolled by mistake this morning. */
const STUDENTS = [
  { id: "anong", name: "Anong", className: "Beginner", status: "Normal", branch: "Bangkok", credit: 8, parentPhone: "0801111111", parentName: "Malee", level: "Beginner", expires: "" },
  { id: "boon", name: "Boon", className: "Intermediate", status: "Normal", branch: "Bangkok", credit: 4, parentPhone: "0802222222", parentName: "Nid", level: "Intermediate", expires: "" },
  { id: "chai", name: "Chai", className: "Beginner", status: "Normal", branch: "Bangkok", credit: 0, parentPhone: "0803333333", parentName: "Wichai", level: "Beginner", expires: "" },
];

const ENROLMENTS = [
  { enrollment_id: "e_anong_beg", student_id: "anong", class_id: "beg", status: "Active", enrolled_date: "2026-01-06" },
  { enrollment_id: "e_anong_int", student_id: "anong", class_id: "int", status: "Active", enrolled_date: "2026-05-04" },
  { enrollment_id: "e_boon_beg", student_id: "boon", class_id: "beg", status: "Withdrawn", enrolled_date: "2025-09-01" },
  { enrollment_id: "e_boon_int", student_id: "boon", class_id: "int", status: "Active", enrolled_date: "2026-06-01" },
  { enrollment_id: "e_chai_beg", student_id: "chai", class_id: "beg", status: "Active", enrolled_date: "2026-08-22" },
];

const raw = {
  students: [],
  parents: [],
  parentContacts: [],
  studentParents: [],
  classes: [
    { class_id: "beg", name: "Beginner" },
    { class_id: "int", name: "Intermediate" },
    { class_id: "gone", name: "Saturday Camp", archived_at: "2026-02-01" },
  ],
  classSessions: [],
  attendance: [],
  enrollments: ENROLMENTS,
  /* Anong has spent credits in Beginner; Chai has spent nothing anywhere. */
  creditTransactions: [
    { credit_transaction_id: "t1", enrollment_id: "e_anong_beg", amount: 20, transaction_date: "2026-01-06", transaction_type: "purchase" },
    { credit_transaction_id: "t2", enrollment_id: "e_anong_beg", amount: -12, transaction_date: "2026-06-02", transaction_type: "consumption" },
  ],
  creditPackages: [
    { credit_package_id: "p_beg", class_id: "beg", credit_amount: 20, standard_price: 12000 },
    { credit_package_id: "p_int", class_id: "int", credit_amount: 20, standard_price: 20000 },
  ],
  payments: [],
  teachers: [],
  admins: [],
  accounts: [],
  announcements: [],
  tournaments: [],
  tournamentCategories: [],
  tournamentRegistrations: [],
  practiceActivities: [],
  systemConfig: [],
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/students",
}));

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    raw,
    students: STUDENTS,
    loading: false,
    error: null,
    batch: async (job: () => Promise<unknown>) => job(),
    create,
    update,
    remove,
    removePerson: async () => undefined,
    refresh: async () => undefined,
  }),
}));

const { StudentsPage } = await import("./StudentsPage");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

function renderList() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <StudentsPage />
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

/** Opens a child's detail page from the roster. */
async function openStudent(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByText(name));
}

/** The enrolment row for a class, on the open detail page. */
function enrolmentRow(className: string): HTMLElement {
  const heading = screen.getByText("Enrolments");
  const card = heading.closest("div")!.parentElement!;
  const name = within(card).getAllByText(className)[0];
  return name.parentElement as HTMLElement;
}

beforeEach(() => {
  create.mockClear();
  update.mockClear();
  remove.mockClear();
});

describe("an enrolment row", () => {
  it("offers Withdraw", async () => {
    const user = renderList();
    await openStudent(user, "Anong");
    expect(within(enrolmentRow("Beginner")).getByRole("button", { name: "Withdraw from Beginner" })).toBeDefined();
  });

  /* Retyping the class on a row with a term of credits behind it moves that
     ledger to a class the money was never spent in. */
  it("no longer offers Edit", async () => {
    const user = renderList();
    await openStudent(user, "Anong");
    expect(within(enrolmentRow("Beginner")).queryByRole("button", { name: "Edit Beginner" })).toBeNull();
  });

  it("does not offer to withdraw from a class already left", async () => {
    const user = renderList();
    await openStudent(user, "Boon");
    expect(within(enrolmentRow("Beginner")).queryByRole("button", { name: /Withdraw/ })).toBeNull();
  });
});

describe("withdrawing", () => {
  it("keeps the record and the ledger with it", async () => {
    const user = renderList();
    await openStudent(user, "Anong");
    await user.click(within(enrolmentRow("Beginner")).getByRole("button", { name: "Withdraw from Beginner" }));
    await user.click(screen.getByRole("button", { name: "Withdraw", hidden: true }));

    /* Eight credits and a term of attendance hang off this row; deleting it
       would take a receipt's meaning with it. */
    expect(update).toHaveBeenCalledWith("enrollments", "e_anong_beg", { status: "Withdrawn" });
    expect(remove).not.toHaveBeenCalled();
  });

  it("removes one nothing has happened against", async () => {
    const user = renderList();
    await openStudent(user, "Chai");
    await user.click(within(enrolmentRow("Beginner")).getByRole("button", { name: "Withdraw from Beginner" }));
    await user.click(screen.getByRole("button", { name: "Withdraw", hidden: true }));

    expect(remove).toHaveBeenCalledWith("enrollments", "e_chai_beg");
    expect(update).not.toHaveBeenCalled();
  });

  it("says which of the two is about to happen", async () => {
    const user = renderList();
    await openStudent(user, "Chai");
    await user.click(within(enrolmentRow("Beginner")).getByRole("button", { name: "Withdraw from Beginner" }));
    expect(screen.getByText(en.students.enrolmentDeleteNote)).toBeDefined();
  });
});

describe("enrolling", () => {
  it("puts the child in the class, not out of it", async () => {
    const user = renderList();
    await openStudent(user, "Chai");
    await user.click(screen.getByRole("button", { name: "Add Enrolment" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(create).toHaveBeenCalledWith(
      "enrollments",
      expect.objectContaining({ student_id: "chai", status: "Active" }),
    );
  });

  /* The form used to offer Active / Completed / Withdrawn, so the desk could
     enrol a child as Withdrawn — in the class and out of it at once. */
  it("does not ask what status to enrol them at", async () => {
    const user = renderList();
    await openStudent(user, "Chai");
    await user.click(screen.getByRole("button", { name: "Add Enrolment" }));
    expect(screen.queryByLabelText(/^Status/)).toBeNull();
  });
});

describe("filtering the roster by class", () => {
  const filter = () => screen.getByLabelText("Class") as HTMLSelectElement;
  const namesOnScreen = () =>
    STUDENTS.filter((s) => screen.queryByText(s.name) !== null).map((s) => s.name);

  it("offers the live classes with how many are in each", () => {
    renderList();
    const labels = Array.from(filter().options).map((o) => o.textContent);
    expect(labels).toEqual(["All Classes", "Beginner (2)", "Intermediate (2)"]);
  });

  it("does not offer a class the academy has retired", () => {
    renderList();
    expect(Array.from(filter().options).map((o) => o.textContent)).not.toContain("Saturday Camp (0)");
  });

  it("narrows the list to that class", async () => {
    const user = renderList();
    await user.selectOptions(filter(), "int");
    /* Chai is only in Beginner. */
    expect(namesOnScreen()).toEqual(["Anong", "Boon"]);
  });

  /* The roster's Class column names Anong's first class only, so a filter
     built on that column would lose her here. */
  it("finds a child under the second class they attend", async () => {
    const user = renderList();
    await user.selectOptions(filter(), "int");
    expect(namesOnScreen()).toContain("Anong");
  });

  it("leaves out a child who withdrew from it", async () => {
    const user = renderList();
    await user.selectOptions(filter(), "beg");
    expect(namesOnScreen()).not.toContain("Boon");
  });

  it("names every class a child is in, so a row says why it is there", async () => {
    const user = renderList();
    await user.selectOptions(filter(), "int");
    expect(screen.getByText("Beginner, Intermediate")).toBeDefined();
  });
});
