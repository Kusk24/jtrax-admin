/**
 * The manual credit-reminder send.
 *
 * The academy's rule is that this never fires on its own — a person presses
 * the button, reads what will happen, and confirms. So the tests pin the
 * three parts of that: nothing is sent on render or on the first click, the
 * confirmed send carries the academy's own expiring-days window, and the
 * result is reported in families, including when it is nobody.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { DEFAULT_CREDIT_RULES } from "@/lib/derive";
import { FollowUps } from "./FollowUps";

const post = vi.fn();
vi.mock("@/lib/api", () => ({ api: { post: (...args: unknown[]) => post(...args) } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../DataProvider", () => ({
  useData: () => ({
    students: [],
    creditRules: { ...DEFAULT_CREDIT_RULES, expiringDays: 9 },
  }),
}));

function renderCard() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FollowUps />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => post.mockReset());

describe("the manual credit reminder", () => {
  it("sends nothing without a press and a confirmation", async () => {
    renderCard();
    expect(post).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /send credit reminders/i }));
    // The dialog is open; still nothing has gone out.
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText(/Notify the parents of every student/)).toBeTruthy();
  });

  it("sends with the academy's own expiry window once confirmed", async () => {
    post.mockResolvedValue({ students_notified: 3 });
    renderCard();

    await userEvent.click(screen.getByRole("button", { name: /send credit reminders/i }));
    await userEvent.click(screen.getByRole("button", { name: /send now/i }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("notifications/credit-expiry?days=9", {}),
    );
    expect(await screen.findByText("3 families notified")).toBeTruthy();
  });

  it("says so when there was nobody to notify", async () => {
    post.mockResolvedValue({ students_notified: 0 });
    renderCard();

    await userEvent.click(screen.getByRole("button", { name: /send credit reminders/i }));
    await userEvent.click(screen.getByRole("button", { name: /send now/i }));

    expect(await screen.findByText(/no expiring credits to notify/i)).toBeTruthy();
  });
});
