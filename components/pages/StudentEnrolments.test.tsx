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
    /* Somewhere to move to. Anong is in Beginner and Intermediate, so Advanced
       is the only course a change can offer them. */
    { class_id: "adv", name: "Advanced" },
    { class_id: "gone", name: "Saturday Camp", archived_at: "2026-02-01" },
  ],
  classSessions: [],
  attendance: [],
  enrollments: ENROLMENTS,
  /* Anong has spent credits in Beginner; Chai has spent nothing anywhere.
     The purchase carries an expiry, because a moved balance has to keep one. */
  creditTransactions: [
    { credit_transaction_id: "t1", enrollment_id: "e_anong_beg", amount: 20, transaction_date: "2026-01-06", transaction_type: "purchase", expiry_date: "2026-12-31" },
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

/**
 * The enrolment row for a class, on the open detail page.
 *
 * Found by walking up from the name to the element that holds the row's
 * buttons, rather than by a fixed number of `parentElement` steps — the name
 * gained a "Moved from …" line beneath it when Change course landed, and a
 * count of levels would have silently started returning the wrong element.
 */
function enrolmentRow(className: string): HTMLElement {
  const heading = screen.getByText("Enrolments");
  const card = heading.closest("div")!.parentElement!;
  const name = within(card).getAllByText(className)[0];
  let node: HTMLElement | null = name.parentElement;
  while (node && node !== card && node.querySelectorAll("button").length === 0) {
    node = node.parentElement;
  }
  return (node ?? name.parentElement) as HTMLElement;
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
  const filter = () => screen.getByLabelText("Course") as HTMLSelectElement;
  const namesOnScreen = () =>
    STUDENTS.filter((s) => screen.queryByText(s.name) !== null).map((s) => s.name);

  it("offers the live classes with how many are in each", () => {
    renderList();
    const labels = Array.from(filter().options).map((o) => o.textContent);
    /* Advanced is live and has nobody in it — a course the academy runs is a
       filter you can pick even when it is empty. */
    expect(labels).toEqual(["All Courses", "Beginner (2)", "Intermediate (2)", "Advanced (0)"]);
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

/* Moving a balance between classes. The dialog computes the conversion, but
   what is written is what is in the field — the office can type over it — and
   the incoming entry carries an expiry, prefilled from the balance being
   moved. It used to write none at all, so moved credits quietly stopped
   expiring. */
describe("moving credits", () => {
  async function openMoveDialog(user: ReturnType<typeof userEvent.setup>) {
    await openStudent(user, "Anong");
    await user.click(screen.getByRole("button", { name: /Move 8 credits/ }));
  }
  const confirm = () => screen.getByRole("button", { name: "Move credits" });
  const amountField = () => screen.getByLabelText("Credits to add") as HTMLInputElement;
  const expiryField = () => screen.getByLabelText("Expires") as HTMLInputElement;
  /* The mock is argless to vitest, so the call tuples need their real shape
     back before the payloads can be read. */
  const payloads = () =>
    (create.mock.calls as unknown as [string, Record<string, unknown>][]).map((c) => c[1]);
  const incomingEntry = () => payloads().find((p) => Number(p.amount) > 0)!;

  it("writes the computed conversion, with the old balance's expiry", async () => {
    const user = renderList();
    await openMoveDialog(user);
    /* 8 credits at ฿600 an hour are ฿4,800 — 4.8 hours at Intermediate's
       ฿1,000, landed on the next half credit because a session costs 0.5 or
       1 and nothing can spend a 0.3. The field starts on the sum's answer. */
    expect(amountField().value).toBe("5");
    expect(expiryField().value).toBe("2026-12-31");
    await user.click(confirm());
    expect(create).toHaveBeenCalledTimes(2);
    expect(incomingEntry()).toMatchObject({
      enrollment_id: "e_anong_int",
      amount: 5,
      expiry_date: "2026-12-31",
    });
  });

  it("a hand-typed amount is what lands", async () => {
    const user = renderList();
    await openMoveDialog(user);
    await user.clear(amountField());
    await user.type(amountField(), "5");
    await user.click(confirm());
    expect(incomingEntry()).toMatchObject({ enrollment_id: "e_anong_int", amount: 5 });
    /* The outgoing side always clears the whole balance, typed or not. */
    const outgoing = payloads().find((p) => Number(p.amount) < 0)!;
    expect(outgoing).toMatchObject({ enrollment_id: "e_anong_beg", amount: -8 });
  });

  it("the expiry can be changed before it moves", async () => {
    const user = renderList();
    await openMoveDialog(user);
    await user.clear(expiryField());
    await user.type(expiryField(), "2027-01-31");
    await user.click(confirm());
    expect(incomingEntry()).toMatchObject({ expiry_date: "2027-01-31" });
  });

  it("an emptied amount cannot be saved", async () => {
    const user = renderList();
    await openMoveDialog(user);
    await user.clear(amountField());
    expect((confirm() as HTMLButtonElement).disabled).toBe(true);
  });

  /* A class with no payment and no priced package has no rate. The automatic
     path refuses to guess; a figure the office types is a decision, not a
     guess, and goes through. */
  it("still moves into a class with no rate, once an amount is typed", async () => {
    raw.classes.push({ class_id: "priv", name: "Private Coaching" });
    raw.enrollments.push({ enrollment_id: "e_anong_priv", student_id: "anong", class_id: "priv", status: "Active", enrolled_date: "2026-07-01" });
    try {
      const user = renderList();
      await openMoveDialog(user);
      await user.selectOptions(screen.getByLabelText("Move them to"), "e_anong_priv");
      expect(amountField().value).toBe("");
      expect((confirm() as HTMLButtonElement).disabled).toBe(true);
      await user.type(amountField(), "6");
      await user.click(confirm());
      expect(incomingEntry()).toMatchObject({ enrollment_id: "e_anong_priv", amount: 6 });
    } finally {
      raw.classes.pop();
      raw.enrollments.pop();
    }
  });
});

/**
 * Changing course.
 *
 * Moving a child up a level was two acts done by hand — withdraw, then
 * remember to enrol them again — and the result was two unrelated rows: a
 * Withdrawn enrolment in the old course and an Active one in the new, with
 * nothing saying the second happened because of the first. Months later, "why
 * did this child stop attending Beginner" could not be told apart from "they
 * left the academy".
 */
describe("changing course", () => {
  const changeButton = (className: string) =>
    within(enrolmentRow(className)).getByRole("button", { name: `Change ${className} to another course` });

  async function openChange(user: ReturnType<typeof userEvent.setup>, who = "Anong", from = "Beginner") {
    await openStudent(user, who);
    await user.click(changeButton(from));
  }
  const confirmChange = () => screen.getByRole("button", { name: "Change course", hidden: true });

  it("is offered on a course the child is in", async () => {
    const user = renderList();
    await openStudent(user, "Anong");
    expect(changeButton("Beginner")).toBeDefined();
  });

  /* A course they already left is not one they can move out of. */
  it("is not offered on a course already left", async () => {
    const user = renderList();
    await openStudent(user, "Boon");
    expect(within(enrolmentRow("Beginner")).queryByRole("button", { name: /Change/ })).toBeNull();
  });

  /* Moving them into a course they already attend would make a second
     enrolment for the same pair — two balances and two rosters for one child
     in one room. Anong is in Beginner and Intermediate, so neither is offered. */
  it("does not offer a course they are already in", async () => {
    const user = renderList();
    await openChange(user);
    const options = Array.from(
      (screen.getByLabelText("Move them to") as HTMLSelectElement).options,
    ).map((o) => o.textContent);
    expect(options).not.toContain("Intermediate");
    expect(options).not.toContain("Beginner");
  });

  it("does not offer a retired course", async () => {
    const user = renderList();
    await openChange(user);
    const options = Array.from(
      (screen.getByLabelText("Move them to") as HTMLSelectElement).options,
    ).map((o) => o.textContent);
    expect(options).not.toContain("Saturday Camp");
  });

  it("writes the new enrolment with the course they came from", async () => {
    {
      const user = renderList();
      await openChange(user);
      await user.selectOptions(screen.getByLabelText("Move them to"), "adv");
      await user.click(confirmChange());

      expect(create).toHaveBeenCalledWith(
        "enrollments",
        expect.objectContaining({ student_id: "anong", class_id: "adv", moved_from_class_id: "beg" }),
      );
    }
  });

  /* The outgoing entry gives the old row a ledger, so it is withdrawn and
     kept rather than deleted — a receipt still points at it. */
  it("leaves the old course behind it", async () => {
    {
      const user = renderList();
      await openChange(user);
      await user.selectOptions(screen.getByLabelText("Move them to"), "adv");
      await user.click(confirmChange());

      expect(update).toHaveBeenCalledWith("enrollments", "e_anong_beg", { status: "Withdrawn" });
    }
  });

  /* An hour paid for is an hour owed whichever course it is taken in. */
  it("carries the balance across, as a matching pair of entries", async () => {
    {
      const user = renderList();
      await openChange(user);
      await user.selectOptions(screen.getByLabelText("Move them to"), "adv");
      await user.click(confirmChange());

      const ledger = create.mock.calls.filter(([path]) => path === "credit-transactions");
      expect(ledger).toHaveLength(2);
      expect(ledger[0][1]).toMatchObject({ enrollment_id: "e_anong_beg", amount: -8 });
      expect(ledger[1][1]).toMatchObject({ enrollment_id: "e_new" });
    }
  });

  it("leaves the balance where it is when the office unticks it", async () => {
    {
      const user = renderList();
      await openChange(user);
      await user.selectOptions(screen.getByLabelText("Move them to"), "adv");
      await user.click(screen.getByRole("checkbox"));
      await user.click(confirmChange());

      expect(create.mock.calls.filter(([path]) => path === "credit-transactions")).toHaveLength(0);
      /* The row still carries the term that was already spent against it, so
         it is withdrawn and kept — unticking moves no credits, it does not
         make the history go away. */
      expect(update).toHaveBeenCalledWith("enrollments", "e_anong_beg", { status: "Withdrawn" });
    }
  });

  /* Chai was enrolled by mistake this morning: nothing bought, nothing
     attended, so there is no balance to decide about. */
  it("asks nothing about credits when there are none", async () => {
    {
      const user = renderList();
      await openChange(user, "Chai");
      expect(screen.queryByRole("checkbox")).toBeNull();
    }
  });

  it("shows where a moved enrolment came from", async () => {
    raw.enrollments.push({
      enrollment_id: "e_chai_int", student_id: "chai", class_id: "int",
      status: "Active", enrolled_date: "2026-09-01", moved_from_class_id: "beg",
    });
    try {
      const user = renderList();
      await openStudent(user, "Chai");
      expect(screen.getByText("Moved from Beginner")).toBeDefined();
    } finally {
      raw.enrollments.pop();
    }
  });
});

/**
 * Deleting an enrolment.
 *
 * Distinct from withdrawing, which is what happens to a term that really ran.
 * This is for a row that should never have existed — a course picked by
 * mistake — and it is offered only where nothing hangs off it, because
 * `credit_transaction` and `payment` both point at the row and the database
 * refuses to drop one they reference.
 */
describe("deleting an enrolment", () => {
  const deleteButton = (className: string) =>
    within(enrolmentRow(className)).queryByRole("button", { name: `Delete the enrolment in ${className}` });

  it("is offered on a row nothing has happened against", async () => {
    const user = renderList();
    await openStudent(user, "Chai");
    expect(deleteButton("Beginner")).not.toBeNull();
  });

  /* Eight credits and a term of attendance hang off Anong's Beginner row. */
  it("is not offered where a ledger points at the row", async () => {
    const user = renderList();
    await openStudent(user, "Anong");
    expect(deleteButton("Beginner")).toBeNull();
  });

  it("removes the row outright", async () => {
    const user = renderList();
    await openStudent(user, "Chai");
    await user.click(deleteButton("Beginner")!);
    /* The detail header carries a Delete for the child themselves; the
       dialog's confirm is the one that mounted last. */
    await user.click(screen.getAllByRole("button", { name: "Delete", hidden: true }).at(-1)!);

    expect(remove).toHaveBeenCalledWith("enrollments", "e_chai_beg");
    expect(update).not.toHaveBeenCalled();
  });
});
