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

/* Typed by their arguments, not just their return: the tests read
   `create.mock.calls` to check which collection each write went to, and an
   untyped mock makes those an empty tuple. */
type Row = Record<string, unknown>;
const create = vi.fn<(path: string, body: Row) => Promise<Row>>(async () => ({ enrollment_id: "e_new" }));
const update = vi.fn<(path: string, id: string, body: Row) => Promise<Row>>(async () => ({}));
const remove = vi.fn<(path: string, id: string) => Promise<void>>(async () => undefined);

/* Anong is in two classes — the case the roster's single Class column cannot
   show and the class filter exists for. Boon has left Beginner for
   Intermediate. Chai was enrolled by mistake this morning. */
const STUDENTS = [
  { id: "anong", name: "Anong", className: "Beginner", status: "Normal", branch: "Bangkok", credit: 8, parentPhone: "0801111111", parentName: "Malee", level: "Beginner", expires: "" },
  { id: "boon", name: "Boon", className: "Intermediate", status: "Normal", branch: "Bangkok", credit: 4, parentPhone: "0802222222", parentName: "Nid", level: "Intermediate", expires: "" },
  { id: "chai", name: "Chai", className: "Beginner", status: "Normal", branch: "Bangkok", credit: 0, parentPhone: "0803333333", parentName: "Wichai", level: "Beginner", expires: "" },
];

const ENROLMENTS: Row[] = [
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
  payments: [] as Row[],
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
/* The row carries exactly two actions now: move them somewhere else, or take
   the record away. Withdraw is gone — the office asked for it to go, because
   the only reason to end an enrolment without starting another is that the
   record should not be there, and that is Delete. */
describe("an enrolment row", () => {
  it("offers Change course and Delete", async () => {
    const user = renderList();
    await openStudent(user, "Anong");
    const row = enrolmentRow("Beginner");
    expect(within(row).getByRole("button", { name: "Change Beginner to another course" })).toBeDefined();
    expect(within(row).getByRole("button", { name: "Delete the enrolment in Beginner" })).toBeDefined();
  });

  it("no longer offers Withdraw", async () => {
    const user = renderList();
    await openStudent(user, "Anong");
    expect(within(enrolmentRow("Beginner")).queryByRole("button", { name: /Withdraw/ })).toBeNull();
  });

  /* Retyping the class on a row with a term of credits behind it moves that
     ledger to a class the money was never spent in. */
  it("no longer offers Edit", async () => {
    const user = renderList();
    await openStudent(user, "Anong");
    expect(within(enrolmentRow("Beginner")).queryByRole("button", { name: "Edit Beginner" })).toBeNull();
  });

  /* There is no moving out of a course they already left. */
  it("does not offer Change on a course already left", async () => {
    const user = renderList();
    await openStudent(user, "Boon");
    expect(within(enrolmentRow("Beginner")).queryByRole("button", { name: /Change/ })).toBeNull();
  });

  /* Delete is the tidy-up, and the rows most in need of tidying are exactly
     the ones a change leaves behind — each carrying the ledger entry that
     moved its credits out. Hiding Delete where anything hung off the row hid
     it on all of them. */
  it("offers Delete on a course already left", async () => {
    const user = renderList();
    await openStudent(user, "Boon");
    expect(within(enrolmentRow("Beginner")).getByRole("button", { name: "Delete the enrolment in Beginner" })).toBeDefined();
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


/**
 * Changing course.
 *
 * One act, and the only way a child now leaves a course while staying at the
 * academy. It carries the credits with the same arithmetic the old Move
 * Credits dialog used — the conversion is computed at both courses' rates,
 * rounded to the half-credit grid the academy charges on, and the office can
 * type over it. The incoming entry carries an expiry, prefilled from the
 * balance being moved; it used to write none at all, so moved credits quietly
 * stopped expiring.
 */
describe("changing course", () => {
  const changeButton = (className: string) =>
    within(enrolmentRow(className)).getByRole("button", { name: `Change ${className} to another course` });
  const amountField = () => screen.getByLabelText("Credits to add") as HTMLInputElement;
  const expiryField = () => screen.getByLabelText("Expires") as HTMLInputElement;
  const confirmChange = () => screen.getByRole("button", { name: "Change course", hidden: true }) as HTMLButtonElement;
  const ledger = () => create.mock.calls.filter(([path]) => path === "credit-transactions");
  const incoming = () => ledger()[1]?.[1];
  const outgoing = () => ledger()[0]?.[1];

  async function openChange(user: ReturnType<typeof userEvent.setup>, who = "Anong", from = "Beginner") {
    await openStudent(user, who);
    await user.click(changeButton(from));
  }

  it("offers the courses they are not already in, and no retired one", async () => {
    const user = renderList();
    await openChange(user);
    const options = Array.from(
      (screen.getByLabelText("Move them to") as HTMLSelectElement).options,
    ).map((o) => o.textContent);
    expect(options).toEqual(["Advanced"]);
  });

  it("writes the new enrolment with the course they came from", async () => {
    const user = renderList();
    await openChange(user);
    await user.click(confirmChange());

    expect(create).toHaveBeenCalledWith(
      "enrollments",
      expect.objectContaining({ student_id: "anong", class_id: "adv", moved_from_class_id: "beg" }),
    );
  });

  /* The outgoing entry gives the old row a ledger, so it is withdrawn and
     kept rather than deleted — a receipt still points at it. */
  it("leaves the old course behind it as a record", async () => {
    const user = renderList();
    await openChange(user);
    await user.click(confirmChange());

    expect(update).toHaveBeenCalledWith("enrollments", "e_anong_beg", { status: "Withdrawn" });
  });

  /* Beginner is 12,000 for 20 credits and Advanced 20,000 for 20, so eight
     credits of Beginner is 4,800 baht, which buys 4.8 credits of Advanced —
     5 on the half-credit grid the academy charges on, rounded to the nearest
     half rather than down. */
  it("converts the balance at both courses' rates, on the half-credit grid", async () => {
    raw.creditPackages.push({ credit_package_id: "p_adv", class_id: "adv", credit_amount: 20, standard_price: 20000 });
    try {
      const user = renderList();
      await openChange(user);
      expect(amountField().value).toBe("5");
      await user.click(confirmChange());

      expect(outgoing()).toMatchObject({ enrollment_id: "e_anong_beg", amount: -8 });
      expect(incoming()).toMatchObject({ enrollment_id: "e_new", amount: 5 });
    } finally {
      raw.creditPackages.pop();
    }
  });

  it("carries the old balance's expiry onto the incoming entry", async () => {
    const user = renderList();
    await openChange(user);
    expect(expiryField().value).toBe("2026-12-31");
    await user.click(confirmChange());

    expect(incoming()).toMatchObject({ expiry_date: "2026-12-31" });
    /* Only the incoming entry: an expiry says how long added credits are good
       for, which a removal is not. */
    expect(outgoing()).not.toHaveProperty("expiry_date");
  });

  it("writes a hand-typed amount over the computed one", async () => {
    const user = renderList();
    await openChange(user);
    await user.clear(amountField());
    await user.type(amountField(), "6");
    await user.click(confirmChange());

    expect(incoming()).toMatchObject({ amount: 6 });
  });

  it("takes a changed expiry", async () => {
    const user = renderList();
    await openChange(user);
    await user.clear(expiryField());
    await user.type(expiryField(), "2027-06-30");
    await user.click(confirmChange());

    expect(incoming()).toMatchObject({ expiry_date: "2027-06-30" });
  });

  /* Advanced has no priced package in this fixture, so there is no rate to
     convert at — the hours carry across as they stand rather than the dialog
     refusing to proceed. The office came here to move a child. */
  it("carries the balance unconverted when no rate says otherwise", async () => {
    const user = renderList();
    await openChange(user);
    expect(amountField().value).toBe("8");
    expect(screen.getByText(en.students.changeCourseNoRate)).toBeDefined();
  });

  it("will not move an amount it cannot read", async () => {
    const user = renderList();
    await openChange(user);
    await user.clear(amountField());
    expect(confirmChange().disabled).toBe(true);
  });

  it("leaves the balance where it is when the office unticks it", async () => {
    const user = renderList();
    await openChange(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(confirmChange());

    expect(ledger()).toHaveLength(0);
    /* The row still carries the term already spent against it, so it is
       withdrawn and kept — unticking moves no credits, it does not make the
       history go away. */
    expect(update).toHaveBeenCalledWith("enrollments", "e_anong_beg", { status: "Withdrawn" });
  });

  /* Chai was enrolled by mistake this morning: nothing bought, nothing
     attended, so there is no balance to decide about. */
  it("asks nothing about credits when there are none", async () => {
    const user = renderList();
    await openChange(user, "Chai");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("shows where a moved enrolment came from", async () => {
    raw.enrollments.push({
      enrollment_id: "e_chai_int", student_id: "chai", class_id: "int",
      status: "Active", enrolled_date: "2026-09-01", moved_from_class_id: "beg",
    });
    try {
      const user = renderList();
      await openStudent(user, "Chai");
      expect(screen.getByText(/Moved from Beginner/)).toBeDefined();
    } finally {
      raw.enrollments.pop();
    }
  });
});

/**
 * Deleting an enrolment.
 *
 * The list's tidy-up. It has to work on the rows a change leaves behind, and
 * every one of those carries the ledger entry that moved its credits out —
 * `credit_transaction.enrollment_id` is NOT NULL, so a plain delete is refused
 * by the database. The dependants go first: payments are *detached* (they
 * carry their own names and were built to outlive what they point at), credit
 * entries are deleted with the row.
 */
describe("deleting an enrolment", () => {
  const deleteButton = (className: string) =>
    within(enrolmentRow(className)).getByRole("button", { name: `Delete the enrolment in ${className}` });
  const confirmDelete = async (user: ReturnType<typeof userEvent.setup>) =>
    /* The detail header carries a Delete for the child themselves; the
       dialog's confirm is the one that mounted last. */
    user.click(screen.getAllByRole("button", { name: "Delete", hidden: true }).at(-1)!);

  it("removes a row nothing hangs off", async () => {
    const user = renderList();
    await openStudent(user, "Chai");
    await user.click(deleteButton("Beginner"));
    await confirmDelete(user);

    expect(remove).toHaveBeenCalledWith("enrollments", "e_chai_beg");
  });

  it("takes the credit entries with it", async () => {
    const user = renderList();
    await openStudent(user, "Anong");
    await user.click(deleteButton("Beginner"));
    await confirmDelete(user);

    expect(remove).toHaveBeenCalledWith("credit-transactions", "t1");
    expect(remove).toHaveBeenCalledWith("credit-transactions", "t2");
    expect(remove).toHaveBeenCalledWith("enrollments", "e_anong_beg");
  });

  /* Money is never deleted here. A payment carries its own student_name and
     class_name and was built to outlive the rows it points at, so the receipt
     still reads afterwards. */
  it("detaches payments instead of deleting them", async () => {
    raw.payments.push({ payment_id: "pay_1", enrollment_id: "e_anong_beg", student_id: "anong", final_amount: 12000 });
    try {
      const user = renderList();
      await openStudent(user, "Anong");
      await user.click(deleteButton("Beginner"));
      await confirmDelete(user);

      expect(update).toHaveBeenCalledWith("payments", "pay_1", { enrollment_id: null });
      expect(remove).not.toHaveBeenCalledWith("payments", "pay_1");
    } finally {
      raw.payments.pop();
    }
  });

  /* "Tidying up the list" and "deleting a term of credit history" are the
     same click, and only one of them is what the office had in mind. */
  it("says what goes with the row before it goes", async () => {
    const user = renderList();
    await openStudent(user, "Anong");
    await user.click(deleteButton("Beginner"));

    expect(screen.getByText(/2 credit entries/)).toBeDefined();
  });

  it("says nothing alarming about a row that is already empty", async () => {
    const user = renderList();
    await openStudent(user, "Chai");
    await user.click(deleteButton("Beginner"));

    expect(screen.getByText(en.students.enrolmentDeleteNote)).toBeDefined();
  });
});

/**
 * The rate the conversion is computed against.
 *
 * Reported: moving credits from a dearer course to a cheaper one stopped
 * producing more credits. The arithmetic was never wrong — `planTransfer` is
 * covered in lib/credit-transfer.test.ts and converts in the right direction —
 * what was wrong is which package it was handed for the course being moved
 * *into*.
 *
 * A course being moved into has no enrolment yet, so its rate was asked for
 * with an empty enrolment id. `String(p["enrollment_id"] ?? "") === ""` is
 * true of every payment that has no enrolment, so the lookup matched the first
 * *detached* payment on file and returned whatever package that one bought.
 *
 * Detached payments are not rare: deleting an enrolment nulls `enrollment_id`
 * on its payments so the receipt survives, which means the longer the office
 * tidies the list, the more wrong the next conversion gets.
 */
describe("what a change converts against", () => {
  const amountField = () => screen.getByLabelText("Credits to add") as HTMLInputElement;

  async function openChangeFrom(user: ReturnType<typeof userEvent.setup>, who: string, from: string) {
    await openStudent(user, who);
    await user.click(
      within(enrolmentRow(from)).getByRole("button", { name: `Change ${from} to another course` }),
    );
  }

  /* Beginner is 12,000 for 20 (600 an hour), Intermediate 20,000 for 20
     (1,000 an hour). Four credits of Intermediate is 4,000 baht, which buys
     6.67 hours of Beginner — 6.5 on the half-credit grid. More hours for the
     same money, which is the whole point of converting rather than copying a
     number across. */
  it("gives more credits moving to a cheaper course", async () => {
    raw.enrollments.length = 0;
    raw.enrollments.push({
      enrollment_id: "e_solo_int", student_id: "chai", class_id: "int",
      status: "Active", enrolled_date: "2026-02-01",
    });
    raw.creditTransactions.push({
      credit_transaction_id: "t_solo", enrollment_id: "e_solo_int", amount: 4,
      transaction_date: "2026-02-01", transaction_type: "purchase",
    });
    try {
      const user = renderList();
      await openChangeFrom(user, "Chai", "Intermediate");
      await user.selectOptions(screen.getByLabelText("Move them to"), "beg");
      expect(amountField().value).toBe("6.5");
    } finally {
      raw.creditTransactions.pop();
      raw.enrollments.length = 0;
      raw.enrollments.push(...ENROLMENTS);
    }
  });

  /* The regression, exactly: a payment left over from a deleted enrolment must
     not become the price list for a course it was never bought for. */
  it("is not thrown off by a payment detached from a deleted enrolment", async () => {
    raw.enrollments.length = 0;
    raw.enrollments.push({
      enrollment_id: "e_solo_int", student_id: "chai", class_id: "int",
      status: "Active", enrolled_date: "2026-02-01",
    });
    raw.creditTransactions.push({
      credit_transaction_id: "t_solo", enrollment_id: "e_solo_int", amount: 4,
      transaction_date: "2026-02-01", transaction_type: "purchase",
    });
    /* Bought for Intermediate, and its enrolment has since been deleted. */
    raw.payments.push({
      payment_id: "pay_orphan", enrollment_id: null, student_id: "chai",
      credit_package_id: "p_int", status: "Paid", final_amount: 20000,
    });
    try {
      const user = renderList();
      await openChangeFrom(user, "Chai", "Intermediate");
      await user.selectOptions(screen.getByLabelText("Move them to"), "beg");
      /* Beginner's own package, not the orphan's. Reading the orphan would
         price Beginner at 1,000 an hour and hand back 4 credits instead of
         6.5 — the "moving to a cheaper course gave fewer credits" the office
         reported. */
      expect(amountField().value).toBe("6.5");
    } finally {
      raw.payments.pop();
      raw.creditTransactions.pop();
      raw.enrollments.length = 0;
      raw.enrollments.push(...ENROLMENTS);
    }
  });
});
