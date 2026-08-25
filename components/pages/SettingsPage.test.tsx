/**
 * Settings is open to both roles, and shows each of them a different page.
 *
 * The theme is a per-account preference that lives here, so shutting the
 * receptionist out of the whole section shut them out of their own screen's
 * appearance. The academy's rules and the LINE credentials stay the admin's —
 * the nav opening up must not open those with it.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { AdminPerson } from "@/lib/data";

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    creditRules: { lowCredit: 3, expiringDays: 7, inactiveDays: 30, certSessions: 50 },
    saveCreditRules: vi.fn(async () => undefined),
  }),
}));

/* The card fetches its channel on mount; this test is about who sees it. */
vi.mock("@/lib/line", () => ({
  getChannel: vi.fn(async () => null),
  saveChannel: vi.fn(async () => undefined),
  removeChannel: vi.fn(async () => undefined),
}));

const { SettingsPage } = await import("./SettingsPage");
const { JtraxProvider } = await import("@/components/JtraxContext");

function renderAs(role: "Admin" | "Receptionist") {
  const person = { id: "p1", name: "Test", role, email: "t@jca.ac.th", initials: "T" } as AdminPerson;
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <JtraxProvider person={person}>
        <SettingsPage />
      </JtraxProvider>
    </NextIntlClientProvider>,
  );
}

describe("the receptionist's Settings", () => {
  it("offers the theme", () => {
    renderAs("Receptionist");
    expect(screen.getByText(en.settings.themeTitle)).toBeDefined();
    expect(screen.getByRole("group", { name: en.nav.theme })).toBeDefined();
  });

  it("does not offer the academy's rules", () => {
    renderAs("Receptionist");
    expect(screen.queryByText(en.settings.title)).toBeNull();
    expect(screen.queryByText(en.settings.lowCreditTitle)).toBeNull();
    expect(screen.queryByText(en.settings.certTitle)).toBeNull();
  });

  it("does not offer the LINE credentials", () => {
    renderAs("Receptionist");
    expect(screen.queryByText(en.settings.lineTitle)).toBeNull();
  });
});

describe("the admin's Settings", () => {
  it("offers all three", () => {
    renderAs("Admin");
    expect(screen.getByText(en.settings.themeTitle)).toBeDefined();
    expect(screen.getByText(en.settings.title)).toBeDefined();
    expect(screen.getByText(en.settings.lineTitle)).toBeDefined();
  });
});
