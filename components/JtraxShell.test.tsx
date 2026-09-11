/**
 * The sidebar's resting state.
 *
 * It shipped collapsed to the icon rail, which made the first act of every
 * session decoding eleven icons. The labels are the navigation, so the shell
 * opens expanded; the rail is a choice made with the chevron, and it still
 * works both ways.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { JtraxShell } from "./JtraxShell";

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
