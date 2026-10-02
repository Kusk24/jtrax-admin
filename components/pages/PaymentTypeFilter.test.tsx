/* The payment list holds tournament entry fees as well as course credits;
   the Type filter shows one or the other. */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const payments = [
  { id: "p1", name: "Mini", className: "King Slayer", credits: "+20", amount: "12,000", date: "1 Sep", isoDate: "2026-09-01", method: "Cash", status: "Paid", kind: "course" },
  { id: "p2", name: "Uri", className: "Wellington Open", credits: "—", amount: "500", date: "2 Sep", isoDate: "2026-09-02", method: "Cash", status: "Paid", kind: "tournament" },
];

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    students: [],
    payments,
    raw: { payments: [], creditTransactions: [], creditPackages: [], classes: [], enrollments: [], parents: [], studentParents: [] },
    loading: false,
    batch: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  }),
}));

const { PaymentPage } = await import("./PaymentPage");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

describe("filtering payments by type", () => {
  it("shows only tournament fees, or only course payments", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ErrorToastProvider>
          <PaymentPage />
        </ErrorToastProvider>
      </NextIntlClientProvider>,
    );
    const user = userEvent.setup();
    expect(screen.getAllByText("Mini").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Uri").length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByLabelText("Type"), "tournament");
    expect(screen.queryByText("Mini")).toBeNull();
    expect(screen.getAllByText("Uri").length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByLabelText("Type"), "course");
    expect(screen.getAllByText("Mini").length).toBeGreaterThan(0);
    expect(screen.queryByText("Uri")).toBeNull();
  });
});
