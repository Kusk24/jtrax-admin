/**
 * Which enrolment a payment's credits actually land on.
 *
 * The reported bug: a child enrolled in two classes, paid for the second
 * one's package, and the credits landed on the first — `onSave` picked "the
 * student's first active enrolment", full stop, never asking which class the
 * chosen package was even for. Confirmed live against the real dev database
 * before this fix: three payments correctly priced and packaged for Master
 * all recorded with `class_name: "King Slayer"` and King Slayer's own
 * `enrollment_id`.
 *
 * `RecordPaymentForm` (covered by `PaymentPage.test.tsx`) only produces the
 * draft — student, package, amount. The bug lived one level up, in the
 * `onSave` this file exercises by rendering the whole `PaymentPage`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

type Row = Record<string, unknown>;
const create = vi.fn<(path: string, body: Row) => Promise<Row>>(async (path) =>
  path === "enrollments" ? { enrollment_id: "enr_new" } : { payment_id: "pay_new" },
);
const update = vi.fn(async () => ({}));
const remove = vi.fn(async () => undefined);
const batch = vi.fn(async (job: () => Promise<unknown>) => job());

/* Mini, enrolled in King Slayer first and Master second — King Slayer has to
   come first in the array, or a bug that returns "the first match" and a fix
   that matches correctly both happen to land on the same row. */
const STUDENTS = [{ id: "mini", name: "Mini", className: "King Slayer" }];

const BOTH_ENROLLED: Row[] = [
  { enrollment_id: "enr_king", student_id: "mini", class_id: "king", status: "Active" },
  { enrollment_id: "enr_master", student_id: "mini", class_id: "master", status: "Active" },
];

const raw: { enrollments: Row[]; [key: string]: unknown } = {
  studentParents: [] as Row[],
  parents: [] as Row[],
  classes: [
    { class_id: "king", name: "King Slayer" },
    { class_id: "master", name: "Master" },
  ],
  creditPackages: [
    { credit_package_id: "pkg_king", class_id: "king", credit_amount: 20, standard_price: 12000 },
    { credit_package_id: "pkg_master", class_id: "master", credit_amount: 10, standard_price: 75000, validity_days: 90 },
  ],
  enrollments: BOTH_ENROLLED,
  payments: [] as Row[],
  creditTransactions: [] as Row[],
};

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    students: STUDENTS,
    payments: [],
    raw,
    loading: false,
    batch,
    create,
    update,
    remove,
  }),
}));

const { PaymentPage } = await import("./PaymentPage");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

function renderPaymentFor(studentId: string) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <PaymentPage startStudentId={studentId} />
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

/** Reads back what `create` actually wrote for one collection's single call. */
function bodyOf(path: string): Row {
  const call = create.mock.calls.find((c) => c[0] === path);
  if (!call) throw new Error(`create() was never called with "${path}"`);
  return call[1];
}

beforeEach(() => {
  create.mockClear();
  raw.enrollments = BOTH_ENROLLED;
});

describe("crediting the class the package was actually for", () => {
  it("lands the credits on the second class, not the first, when the office pays for it", async () => {
    const user = renderPaymentFor("mini");

    /* The form opens priced for Mini's roster class (King Slayer). Switching
       the package to Master is the whole point of the test. */
    await user.selectOptions(screen.getByLabelText("Credit Package"), "pkg_master");
    await user.click(screen.getByRole("button", { name: "Save Payment" }));

    expect(create).not.toHaveBeenCalledWith("enrollments", expect.anything());
    expect(bodyOf("payments").enrollment_id).toBe("enr_master");
    expect(bodyOf("credit-transactions").enrollment_id).toBe("enr_master");
    expect(bodyOf("credit-transactions").class_id).toBe("master");
  });

  it("still lands correctly the other way round — the first class, second package", async () => {
    const user = renderPaymentFor("mini");

    await user.selectOptions(screen.getByLabelText("Credit Package"), "pkg_king");
    await user.click(screen.getByRole("button", { name: "Save Payment" }));

    expect(bodyOf("payments").enrollment_id).toBe("enr_king");
    expect(bodyOf("credit-transactions").enrollment_id).toBe("enr_king");
  });

  it("names the paid-for course on the receipt, not the roster's primary one", async () => {
    const user = renderPaymentFor("mini");

    await user.selectOptions(screen.getByLabelText("Credit Package"), "pkg_master");
    await user.click(screen.getByRole("button", { name: "Save Payment" }));

    /* Mini's own className is "King Slayer" — the receipt must say what was
       actually bought, not what the roster shows as their main class. */
    expect(bodyOf("payments").class_name).toBe("Master");
  });

  /**
   * Paying for a course with no matching enrolment creates one — the same
   * act "Add Enrolment" used to do on its own, with no money behind it. A
   * course with no priced package (a tournament fee, say) still falls back
   * to whatever active enrolment the student has, exactly as before.
   */
  it("enrols the child when paying for a class they are not yet in", async () => {
    /* Only King Slayer this time — genuinely nothing to match Master
       against. */
    raw.enrollments = [{ enrollment_id: "enr_king", student_id: "mini", class_id: "king", status: "Active" }];
    const user = renderPaymentFor("mini");

    await user.selectOptions(screen.getByLabelText("Credit Package"), "pkg_master");
    await user.click(screen.getByRole("button", { name: "Save Payment" }));

    expect(bodyOf("enrollments")).toEqual(
      expect.objectContaining({ student_id: "mini", class_id: "master", status: "Active" }),
    );
    expect(bodyOf("payments").enrollment_id).toBe("enr_new");
    expect(bodyOf("credit-transactions").enrollment_id).toBe("enr_new");
  });
});
