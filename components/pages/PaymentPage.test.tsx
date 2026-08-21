/**
 * Record Payment: the student and the payer keep each other in step.
 *
 * The rule itself is tested in `lib/payment-pairing.test.ts`. This is the other
 * half — that the form is actually wired to it: that changing the "Paid by"
 * select really does name the child, narrow the picker, and reprice the form.
 * A correct rule the screen never calls is what this file exists to catch.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/* Malee has three children, Nid has one, Wichai has none — and Eak has no
   guardian, which is what deleting a parent leaves behind. */
const STUDENTS = [
  { id: "anong", name: "Anong", className: "Group Class" },
  { id: "boon", name: "Boon", className: "Group Class" },
  { id: "chai", name: "Chai", className: "Group Class" },
  { id: "dao", name: "Dao", className: "Master Class" },
  { id: "eak", name: "Eak", className: "Group Class" },
];

const LINKS = [
  { student_id: "anong", parent_id: "malee" },
  { student_id: "boon", parent_id: "malee" },
  { student_id: "chai", parent_id: "malee" },
  { student_id: "dao", parent_id: "nid" },
];

const raw = {
  studentParents: LINKS,
  parents: [
    { parent_id: "malee", name: "Malee" },
    { parent_id: "nid", name: "Nid" },
    { parent_id: "wichai", name: "Wichai" },
  ],
  classes: [
    { class_id: "c1", name: "Group Class" },
    { class_id: "c2", name: "Master Class" },
  ],
  creditPackages: [
    { credit_package_id: "p1", class_id: "c1", credit_amount: 20, standard_price: 12000 },
    { credit_package_id: "p2", class_id: "c2", credit_amount: 10, standard_price: 20000 },
  ],
  enrollments: [],
};

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({ students: STUDENTS, raw }),
}));

const { RecordPaymentForm } = await import("./PaymentPage");

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RecordPaymentForm onCancel={() => {}} onSave={async () => {}} />
    </NextIntlClientProvider>,
  );
  return {
    student: screen.getByLabelText("Student") as HTMLInputElement,
    payer: screen.getByLabelText("Paid by") as HTMLSelectElement,
    amount: screen.getByLabelText("Amount (THB)") as HTMLInputElement,
  };
}

/** The names the student picker is offering right now. */
async function openPicker(user: ReturnType<typeof userEvent.setup>, student: HTMLInputElement) {
  await user.click(student);
  const list = await screen.findByRole("listbox", { hidden: true }).catch(() => null);
  const box = list ?? document.getElementById("pay-student-list");
  if (!box) return [];
  return within(box as HTMLElement)
    .getAllByRole("button")
    .map((b) => b.textContent?.replace(/\s+/g, " ").trim() ?? "");
}

describe("picking a child", () => {
  it("names their guardian", async () => {
    const user = userEvent.setup();
    const { student, payer } = renderForm();

    await user.click(student);
    await user.click(await screen.findByRole("button", { name: /Boon/ }));

    expect(student.value).toBe("Boon");
    expect(payer.value).toBe("malee");
  });

  it("leaves the payer blank for a child linked to nobody", async () => {
    const user = userEvent.setup();
    const { student, payer } = renderForm();

    await user.click(student);
    await user.click(await screen.findByRole("button", { name: /Eak/ }));

    expect(student.value).toBe("Eak");
    expect(payer.value).toBe("");
    expect(screen.getByText(/No guardian is linked to Eak/)).toBeTruthy();
  });
});

describe("picking a guardian", () => {
  it("names their only child, and reprices for that child's class", async () => {
    const user = userEvent.setup();
    const { student, payer, amount } = renderForm();

    await user.selectOptions(payer, "nid");

    expect(student.value).toBe("Dao");
    expect(payer.value).toBe("nid");
    /* Dao is in Master Class, so the form must move off the Group Class price
       it opened on. */
    expect(amount.value).toBe("20000");
  });

  it("narrows the picker to their children when there are several", async () => {
    const user = userEvent.setup();
    const { student, payer } = renderForm();

    await user.selectOptions(payer, "malee");
    expect(student.value).toBe("");

    const offered = await openPicker(user, student);
    expect(offered.some((n) => n.includes("Anong"))).toBe(true);
    expect(offered.some((n) => n.includes("Boon"))).toBe(true);
    expect(offered.some((n) => n.includes("Chai"))).toBe(true);
    /* Dao and Eak are not Malee's, and must not be on offer. */
    expect(offered.some((n) => n.includes("Dao"))).toBe(false);
    expect(offered.some((n) => n.includes("Eak"))).toBe(false);
    expect(screen.getByText(/Malee’s children/)).toBeTruthy();
  });

  it("leaves the child blank for a guardian linked to nobody, without emptying the picker", async () => {
    const user = userEvent.setup();
    const { student, payer } = renderForm();

    await user.selectOptions(payer, "wichai");
    expect(student.value).toBe("");

    /* Not narrowed to nothing: blank is a state the desk can work out of, an
       empty dropdown with no way to widen it is not. */
    const offered = await openPicker(user, student);
    expect(offered.length).toBe(STUDENTS.length);
  });

  it("drops a child who is not the newly chosen guardian's", async () => {
    const user = userEvent.setup();
    const { student, payer } = renderForm();

    await user.selectOptions(payer, "nid");
    expect(student.value).toBe("Dao");

    await user.selectOptions(payer, "malee");
    expect(student.value).toBe("");
  });

  it("keeps a child who is the newly chosen guardian's", async () => {
    const user = userEvent.setup();
    const { student, payer } = renderForm();

    await user.click(student);
    await user.click(await screen.findByRole("button", { name: /Chai/ }));
    expect(student.value).toBe("Chai");

    /* Re-choosing the guardian they already have must not throw the child away. */
    await user.selectOptions(payer, "malee");
    expect(student.value).toBe("Chai");
  });

  it("clearing the payer keeps the child", async () => {
    const user = userEvent.setup();
    const { student, payer } = renderForm();

    await user.click(student);
    await user.click(await screen.findByRole("button", { name: /Boon/ }));
    expect(payer.value).toBe("malee");

    await user.selectOptions(payer, "");
    expect(payer.value).toBe("");
    expect(student.value).toBe("Boon");
  });
});
