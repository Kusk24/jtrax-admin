/**
 * The targeted credit-reminder send.
 *
 * The academy's rule is unchanged — nothing fires on its own — but the button
 * no longer fires blind either. The tests pin the new shape: opening the
 * dialog asks the backend who would be reached (a dry run, nothing sent),
 * the list names the parents, unticking a family keeps them out of the send,
 * and the send carries exactly the ticked ids with the academy's own window.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { DEFAULT_CREDIT_RULES } from "@/lib/derive";

const post = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ api: { post: (...args: unknown[]) => post(...args) } }));
vi.mock("../DataProvider", () => ({
  useData: () => ({ creditRules: { ...DEFAULT_CREDIT_RULES, expiringDays: 9 } }),
}));

const { CreditReminders } = await import("./CreditReminders");

const TARGETS = [
  { student_id: "stu_penny", student_name: "Penny", parents: ["Sandy Jones"], expires: "2026-09-18" },
  { student_id: "stu_uri", student_name: "Uri", parents: ["Sandy Jones"], expires: "2026-09-15" },
];

function show(kind: "expiry" | "lowCredit" = "expiry") {
  /* Clear counts only — the tests queue their responses before rendering,
     and mockReset would wipe that queue along with the calls. */
  post.mockClear();
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CreditReminders kind={kind} />
    </NextIntlClientProvider>,
  );
}

describe("the credit-reminder dialog", () => {
  it("sends nothing on render, and opening it only asks who would be reached", async () => {
    const user = userEvent.setup();
    post.mockResolvedValueOnce({ targets: TARGETS });
    show();
    expect(post).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /remind: credits expiring/i }));
    await screen.findByText("Penny");

    // One call, a dry run, carrying the academy's own window — not a send.
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("notifications/credit-expiry?days=9", { dry_run: true });
    expect(screen.getAllByText("Sandy Jones")).toHaveLength(2);
  });

  it("sends only the families left ticked", async () => {
    const user = userEvent.setup();
    post.mockResolvedValueOnce({ targets: TARGETS });
    post.mockResolvedValueOnce({ students_notified: 1 });
    show();

    await user.click(screen.getByRole("button", { name: /remind: credits expiring/i }));
    await screen.findByText("Uri");

    // Untick Uri; the send should carry Penny alone.
    await user.click(screen.getByRole("checkbox", { name: /uri/i }));
    await user.click(screen.getByRole("button", { name: /send to 1 family/i }));

    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith("notifications/credit-expiry?days=9", {
        student_ids: ["stu_penny"],
      }),
    );
    expect((await screen.findByRole("status")).textContent).toContain("1 family notified");
  });

  it("cannot send to nobody — unticking everyone disables the button", async () => {
    const user = userEvent.setup();
    post.mockResolvedValueOnce({ targets: TARGETS });
    show();
    await user.click(screen.getByRole("button", { name: /remind: credits expiring/i }));
    await screen.findByText("Penny");
    await user.click(screen.getByRole("checkbox", { name: /penny/i }));
    await user.click(screen.getByRole("checkbox", { name: /uri/i }));
    expect((screen.getByRole("button", { name: /send to 0 families/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("says so plainly when nobody's credits are expiring", async () => {
    const user = userEvent.setup();
    post.mockResolvedValueOnce({ targets: [] });
    show();
    await user.click(screen.getByRole("button", { name: /remind: credits expiring/i }));
    expect(await screen.findByText(/no credits expire within the next 9 days/i)).toBeDefined();
  });
});

/* Low credit used to go out by itself at every check-out. Now it is a button,
   with the same preview-then-send shape as the expiry reminder. */
describe("the low-credit reminder", () => {
  const LOW = [
    { student_id: "stu_uri", student_name: "Uri", parents: ["Sandy Jones"], balance: 0.5 },
    { student_id: "stu_penny", student_name: "Penny", parents: [], balance: 2 },
  ];

  it("previews who is low and how much they have left, and sends nothing", async () => {
    const user = userEvent.setup();
    post.mockResolvedValueOnce({ targets: LOW, line: 3 });
    show("lowCredit");
    expect(post).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /remind: low credit/i }));
    await screen.findByText("Uri");
    expect(post).toHaveBeenCalledWith("notifications/low-credit", { dry_run: true });
    expect(screen.getByText("0.5 credits left")).toBeDefined();
    expect(screen.getByText(/3 credits or fewer/)).toBeDefined();
    // A child with no parent account is flagged to call, not silently dropped.
    expect(screen.getByText(en.dashboard.reminderNoParent)).toBeDefined();
  });

  it("sends only the families left ticked", async () => {
    const user = userEvent.setup();
    post.mockResolvedValueOnce({ targets: LOW, line: 3 });
    post.mockResolvedValueOnce({ students_notified: 1 });
    show("lowCredit");
    await user.click(screen.getByRole("button", { name: /remind: low credit/i }));
    await screen.findByText("Penny");
    await user.click(screen.getByRole("checkbox", { name: /penny/i }));
    await user.click(screen.getByRole("button", { name: /send to 1 family/i }));
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith("notifications/low-credit", { student_ids: ["stu_uri"] }),
    );
  });

  it("says so when nobody is low", async () => {
    const user = userEvent.setup();
    post.mockResolvedValueOnce({ targets: [], line: 3 });
    show("lowCredit");
    await user.click(screen.getByRole("button", { name: /remind: low credit/i }));
    expect(await screen.findByText("No student has 3 credits or fewer.")).toBeDefined();
  });
});
