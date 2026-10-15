/**
 * Voiding a payment: a reason is required, "Other" asks for words, only an
 * admin is offered it, and a voided payment is shown as such and not edited.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const { post, get, refresh } = vi.hoisted(() => ({
  post: vi.fn(async (_path: string, _body: unknown) => ({})),
  get: vi.fn(async (_path: string) => [] as unknown[]),
  refresh: vi.fn(async () => undefined),
}));
/* The ledger keeps its filters in the address (lib/url-state). */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/payment",
}));

vi.mock("@/lib/api", () => ({ api: { post, get }, ApiError: class extends Error {} }));

const payments = [
  { id: "p1", name: "Mini", className: "King Slayer", credits: "+20", amount: "THB 12,000", date: "1 Sep", isoDate: "2026-09-01", method: "Cash", status: "Paid", kind: "course" },
  { id: "p2", name: "Uri", className: "King Slayer", credits: "+10", amount: "THB 6,000", date: "2 Sep", isoDate: "2026-09-02", method: "Cash", status: "Voided", kind: "course", voidedAt: "2026-09-03T04:00:00Z" },
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
    refresh,
  }),
}));

const { VoidPaymentModal, voidReady } = await import("./VoidPaymentModal");
const { PaymentPage } = await import("../pages/PaymentPage");
const { ErrorToastProvider } = await import("@/components/ErrorToast");
const { SignedInAs } = await import("../pages/signed-in-as");

const tv = en.voidPayment;
const intl = (ui: React.ReactNode) => <NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>;

beforeEach(() => {
  post.mockClear();
  refresh.mockClear();
});

describe("voidReady", () => {
  it("needs a reason, and five characters of words for Other", () => {
    expect(voidReady("", "")).toBe(false);
    expect(voidReady("duplicate", "")).toBe(true);
    expect(voidReady("other", "   ")).toBe(false);
    expect(voidReady("other", "typo ")).toBe(false);
    expect(voidReady("other", "Typed twice")).toBe(true);
  });
});

describe("the Void payment dialog", () => {
  function open() {
    const onVoided = vi.fn();
    render(intl(<VoidPaymentModal paymentId="p1" label="THB 12,000 · Mini" onClose={() => undefined} onVoided={onVoided} />));
    return { user: userEvent.setup(), onVoided };
  }
  const confirm = () => screen.getByRole("button", { name: tv.confirm }) as HTMLButtonElement;

  it("offers Duplicate record, Wrong student or payer and Other", () => {
    open();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.queryByLabelText("Incorrect amount")).toBeNull();
  });

  it("cannot be confirmed until a reason is chosen", async () => {
    const { user } = open();
    expect(confirm().disabled).toBe(true);
    await user.click(screen.getByLabelText(tv.reason_duplicate));
    expect(confirm().disabled).toBe(false);
  });

  it("asks for words only for Other, and waits for them", async () => {
    const { user } = open();
    expect(screen.queryByLabelText(tv.otherLabel)).toBeNull();
    await user.click(screen.getByLabelText(tv.reason_other));
    const box = screen.getByLabelText(tv.otherLabel);
    expect(confirm().disabled).toBe(true);
    await user.type(box, "Entered for the wrong family");
    expect(confirm().disabled).toBe(false);
    await user.click(screen.getByLabelText(tv.reason_wrong_payer));
    expect(screen.queryByLabelText(tv.otherLabel)).toBeNull();
  });

  it("sends the reason and the words", async () => {
    const { user, onVoided } = open();
    await user.click(screen.getByLabelText(tv.reason_other));
    await user.type(screen.getByLabelText(tv.otherLabel), "  Entered twice by mistake ");
    await user.click(confirm());
    await waitFor(() => expect(post).toHaveBeenCalledWith("payments/p1/void", { reason: "other", note: "Entered twice by mistake" }));
    expect(onVoided).toHaveBeenCalled();
  });
});

describe("the Payments page", () => {
  function show(role: "Admin" | "Receptionist") {
    render(intl(<ErrorToastProvider><SignedInAs role={role}><PaymentPage /></SignedInAs></ErrorToastProvider>));
    return userEvent.setup();
  }

  it("offers an admin Void beside Edit, and nothing on a voided payment", async () => {
    const user = show("Admin");
    const voidButtons = screen.getAllByRole("button", { name: /^Void / });
    expect(voidButtons).toHaveLength(1);
    expect(screen.getAllByText(tv.voidedNote).length).toBeGreaterThan(0);
    await user.click(voidButtons[0]);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText(tv.reason_duplicate)).toBeTruthy();
    expect(dialog.getByRole("button", { name: tv.confirm })).toBeTruthy();
  });

  it("does not offer a receptionist Void", () => {
    show("Receptionist");
    expect(screen.queryAllByRole("button", { name: /^Void / })).toHaveLength(0);
  });

  it("leaves voided payments out of the total", () => {
    show("Admin");
    // 12,000 paid; the voided 6,000 is not added to it.
    const sub = en.payment.sub.replace("{count}", "2").replace("{total}", "12,000");
    expect(screen.getByText(sub)).toBeTruthy();
  });
});
