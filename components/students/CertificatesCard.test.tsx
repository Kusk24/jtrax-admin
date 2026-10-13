/**
 * The admin's Certificates card: hours per course against the requirement,
 * In Progress or Certified, and Mark as Certified only once the hours are in.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get, post }, ApiError: class extends Error {} }));
/* One attendance list, as the app holds between refetches: a new one on every
   render would read as attendance changing and reload each time. */
const { RAW } = vi.hoisted(() => ({ RAW: { attendance: [] as unknown[] } }));
vi.mock("@/components/DataProvider", () => ({ useData: () => ({ raw: RAW }) }));

const { CertificatesCard } = await import("./CertificatesCard");

const DATA = {
  required_hours: 50,
  courses: [
    { course: "starters", hours: 50, status: "in_progress" },
    { course: "juniors", hours: 12.25, status: "in_progress" },
    { course: "nxt", hours: 51, status: "certified", certificate_id: "cert_1", certified_at: "2026-10-01" },
  ],
};

function show() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CertificatesCard studentId="stu_1" studentName="Anong" />
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  get.mockReset().mockResolvedValue(DATA);
  post.mockReset();
});

describe("the Certificates card", () => {
  it("shows each course's hours, bar and status", async () => {
    show();
    expect(await screen.findByText("JCA Starters")).toBeTruthy();
    expect(get).toHaveBeenCalledWith("students/stu_1/certificates");
    expect(screen.getByText("50 h / 50 h")).toBeTruthy();
    // 12.25 credits used: 12 h 15 min.
    expect(screen.getByText("12 h 15 min / 50 h")).toBeTruthy();
    expect(screen.getAllByText(en.certificates.inProgress)).toHaveLength(2);
    expect(screen.getByText(en.certificates.certified)).toBeTruthy();
    expect(screen.getByText("Certified 1 Oct 2026")).toBeTruthy();
    expect(screen.getAllByRole("progressbar")).toHaveLength(3);
  });

  it("offers Mark as Certified only once the bar is full", async () => {
    show();
    await screen.findByText("JCA Starters");
    // Starters has its 50 h; Juniors (12 h) does not; NXT is already certified.
    expect(screen.getAllByRole("button", { name: en.certificates.markCertified })).toHaveLength(1);
  });

  it("asks first, then certifies and shows the result", async () => {
    post.mockResolvedValue({
      ...DATA,
      courses: DATA.courses.map((c) => (c.course === "starters" ? { ...c, status: "certified", certified_at: "2026-10-12" } : c)),
    });
    const user = show();
    await screen.findByText("JCA Starters");
    await user.click(screen.getAllByRole("button", { name: en.certificates.markCertified })[0]);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(/JCA Starters: 50 h/)).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: en.certificates.confirm }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("students/stu_1/certificates", { course: "starters" }));
    await waitFor(() => expect(document.body.textContent).toContain("Certified 12 Oct 2026"));
  });
});
