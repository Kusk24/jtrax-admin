/**
 * The card-link section of a payment's detail. Three rules worth pinning:
 * a session is only ever minted by a press (opening the detail to read a
 * payment must not create something chargeable), only a pending payment
 * offers one, and "the server has no Stripe keys" reads as configuration,
 * not as a crash.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { Payment } from "@/lib/data";

const post = vi.fn();
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { ...real.api, post: (...a: unknown[]) => post(...a) } };
});

const { PaymentDetail } = await import("./PaymentPage");

function payment(over: Partial<Payment> = {}): Payment {
  return {
    id: "pay_x", name: "Penny", className: "Beginner", credits: "+20",
    amount: "12,000 THB", date: "9 Sept 2026", method: "CreditCard",
    status: "Pending", ...over,
  };
}

function renderDetail(p: Payment) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PaymentDetail payment={p} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />
    </NextIntlClientProvider>,
  );
}

/* No reset hook on purpose: each test sets its own implementation, and the
   only call-count assertion runs in the first test before anything has
   clicked. (A vi.fn touched from beforeEach here trips a vitest 4 quirk
   where the component's caught rejection is re-reported as unhandled.) */

describe("the card payment link", () => {
  it("offers a link for a pending payment, but mints nothing until pressed", async () => {
    post.mockResolvedValue({ url: "https://checkout.stripe.test/cs_1" });
    renderDetail(payment());
    expect(post).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /get card payment link/i }));
    expect(post).toHaveBeenCalledWith("payments/pay_x/stripe-link", {});
    expect(await screen.findByText("https://checkout.stripe.test/cs_1")).toBeTruthy();
  });

  it("does not offer one for a settled payment", () => {
    renderDetail(payment({ status: "Paid" }));
    expect(screen.queryByText(/card payment link/i)).toBeNull();
  });

  it("says card payments are not set up when the server answers 503", async () => {
    const { ApiError } = await import("@/lib/api");
    post.mockImplementation(async () => { throw new ApiError(503, "x"); });
    renderDetail(payment());
    await userEvent.click(screen.getByRole("button", { name: /get card payment link/i }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("not set up");
  });
});
