/**
 * Settings is open to both roles, and shows each of them a different page.
 *
 * The theme is a per-account preference that lives here, so shutting the
 * receptionist out of the whole section shut them out of their own screen's
 * appearance. The academy's rules, the LINE credentials and the staff accounts
 * stay the admin's — the nav opening up must not open those with it.
 *
 * Staff accounts matter most of the three: it used to be its own `adminOnly`
 * tab, so the nav alone kept the desk out of it. Now it is a block inside a
 * section the desk can open, and `isAdmin` in the page is the only thing left
 * standing between a receptionist and the Create Admin button.
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
    /* The staff-accounts block reads these; one row is enough to render it. */
    admins: [
      {
        id: "a1",
        name: "Office Admin",
        initials: "OA",
        role: "Admin",
        email: "office@jca.ac.th",
        phone: "",
        lineId: "",
        branch: "",
        status: "Active",
        lastLogin: "",
        createdDate: "",
        createdBy: "",
      },
    ],
    raw: { admins: [] },
    batch: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
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
/* The staff-accounts block reports failed writes through the toast, so the
   page now needs its provider to render at all. */
const { ErrorToastProvider } = await import("@/components/ErrorToast");

function renderAs(role: "Admin" | "Receptionist") {
  const person = { id: "p1", name: "Test", role, email: "t@jca.ac.th", initials: "T" } as AdminPerson;
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <JtraxProvider person={person}>
          <SettingsPage />
        </JtraxProvider>
      </ErrorToastProvider>
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

  it("does not offer the staff accounts", () => {
    renderAs("Receptionist");
    expect(screen.queryByText(en.admins.title)).toBeNull();
    expect(screen.queryByText(en.admins.create)).toBeNull();
    /* Not just the button — the roster itself must not be on the page. */
    expect(screen.queryByText("Office Admin")).toBeNull();
  });
});

describe("the admin's Settings", () => {
  it("offers all four", () => {
    renderAs("Admin");
    expect(screen.getByText(en.settings.themeTitle)).toBeDefined();
    expect(screen.getByText(en.settings.title)).toBeDefined();
    expect(screen.getByText(en.settings.lineTitle)).toBeDefined();
    expect(screen.getByText(en.admins.title)).toBeDefined();
  });

  it("keeps Settings' own heading as the page's h1", () => {
    renderAs("Admin");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(en.settings.pageTitle);
    expect(screen.getByRole("heading", { level: 2, name: en.admins.title })).toBeDefined();
  });
});
