/**
 * The sidebar's resting state.
 *
 * It shipped collapsed to the icon rail, which made the first act of every
 * session decoding eleven icons. The labels are the navigation, so the shell
 * opens expanded; the rail is a choice made with the chevron, and it still
 * works both ways.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { JtraxShell } from "./JtraxShell";
import { DashboardDateProvider, useDashboardDate } from "./DashboardDate";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/app/actions/auth", () => ({ signOut: vi.fn() }));
vi.mock("./JtraxContext", () => ({
  useJtrax: () => ({ person: { name: "JCA Head Office", role: "Admin" }, role: "Admin" }),
}));

function renderShell() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <JtraxShell>
        <div />
      </JtraxShell>
    </NextIntlClientProvider>,
  );
}

describe("the sidebar", () => {
  it("arrives expanded, labels showing", () => {
    const { container } = renderShell();
    expect(container.querySelector(".jt-sidebar")?.classList.contains("is-expanded")).toBe(true);
  });

  it("still collapses to the rail on the chevron, and comes back", async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    await user.click(screen.getByRole("button", { name: en.nav.collapseNav }));
    expect(container.querySelector(".jt-sidebar")?.classList.contains("is-expanded")).toBe(false);
    await user.click(screen.getByRole("button", { name: en.nav.expandNav }));
    expect(container.querySelector(".jt-sidebar")?.classList.contains("is-expanded")).toBe(true);
  });
});

/* The chip in the top bar is the dashboard's date: pick a day and the
   dashboard follows; Today brings it back. */
function ShownDay() {
  return <output aria-label="shown day">{useDashboardDate().day}</output>;
}

describe("the date chip", () => {
  it("moves the dashboard to the day picked, and back with Today", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <DashboardDateProvider>
          <JtraxShell>
            <ShownDay />
          </JtraxShell>
        </DashboardDateProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole("button", { name: "Today" })).toBeNull();

    /* The browser's own picker writes the field; the field itself is hidden. */
    fireEvent.change(screen.getByLabelText("Dashboard date"), { target: { value: "2026-01-15" } });
    expect(screen.getByLabelText("shown day").textContent).toBe("2026-01-15");

    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByLabelText("shown day").textContent).not.toBe("2026-01-15");
    expect(screen.queryByRole("button", { name: "Today" })).toBeNull();
  });
});
