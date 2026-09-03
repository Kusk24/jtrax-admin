/**
 * The two pages Settings became: yours, and the academy's.
 *
 * It used to be one scroll holding four unrelated blocks — the credit
 * thresholds, the LINE credentials, the staff accounts, and the theme. Only the
 * last is a personal preference, and it was the whole reason the section had to
 * be open to the front desk: shutting them out of Settings shut them out of
 * their own screen's appearance.
 *
 * So the theme moved to Profile and Settings became admin-only. That makes the
 * nav the gate now, where it used to be `isAdmin` inside the page — which is
 * why these tests care about both halves. A receptionist must not reach the
 * Create Admin button, and the thing standing in the way is no longer a
 * conditional in the component.
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

/* The card fetches its channel on mount; these tests are about who sees it. */
vi.mock("@/lib/line", () => ({
  getChannel: vi.fn(async () => null),
  saveChannel: vi.fn(async () => undefined),
  removeChannel: vi.fn(async () => undefined),
}));

const { SectionRouter } = await import("@/components/SectionRouter");
const { JtraxProvider } = await import("@/components/JtraxContext");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

/* Rendered through the router rather than the component directly, because the
   router is where the gate lives now. Reaching past it would test a page
   nobody in that role can open. */
function open(section: string, role: "Admin" | "Receptionist") {
  const person = {
    id: "p1",
    name: "Dao Srisai",
    role,
    email: "dao@jca.ac.th",
    phone: "081-222-3333",
    branch: "Bangkok",
    initials: "DS",
  } as AdminPerson;
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <JtraxProvider person={person}>
          <SectionRouter section={section} />
        </JtraxProvider>
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
}

describe("the academy's Settings", () => {
  it("holds the three things that are the academy's", () => {
    open("settings", "Admin");
    expect(screen.getByText(en.settings.title)).toBeDefined();
    expect(screen.getByText(en.settings.lineTitle)).toBeDefined();
    expect(screen.getByText(en.admins.title)).toBeDefined();
  });

  /* The move, asserted from the side that lost it. */
  it("no longer holds the theme, which is nobody's business but yours", () => {
    open("settings", "Admin");
    expect(screen.queryByText(en.profile.appearanceTitle)).toBeNull();
    expect(screen.queryByRole("group", { name: en.nav.theme })).toBeNull();
  });

  it("keeps its own heading as the page's h1", () => {
    open("settings", "Admin");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(en.settings.pageTitle);
    expect(screen.getByRole("heading", { level: 2, name: en.admins.title })).toBeDefined();
  });
});

describe("a receptionist aiming at Settings", () => {
  /* The one that would matter most if it broke: staff accounts were an
     `adminOnly` tab, then a block behind `isAdmin`, and are now behind the nav
     again. Three arrangements, one thing that must stay true. */
  it("never reaches the staff accounts", () => {
    open("settings", "Receptionist");
    expect(screen.queryByText(en.admins.title)).toBeNull();
    expect(screen.queryByText(en.admins.create)).toBeNull();
    expect(screen.queryByText("Office Admin")).toBeNull();
  });

  it("never reaches the academy's rules or the LINE credentials", () => {
    open("settings", "Receptionist");
    expect(screen.queryByText(en.settings.title)).toBeNull();
    expect(screen.queryByText(en.settings.lowCreditTitle)).toBeNull();
    expect(screen.queryByText(en.settings.lineTitle)).toBeNull();
  });

  /* They could open this address yesterday, for the theme. Refusing them is
     true and useless when the screen they wanted still exists. */
  it("lands on Profile rather than a refusal", () => {
    open("settings", "Receptionist");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(en.profile.pageTitle);
    expect(screen.getByText(en.profile.appearanceTitle)).toBeDefined();
  });
});

describe("Profile", () => {
  it.each(["Admin", "Receptionist"] as const)("is open to a %s", (role) => {
    open("profile", role);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(en.profile.pageTitle);
  });

  it("carries the theme, which is the reason it exists", () => {
    open("profile", "Receptionist");
    expect(screen.getByText(en.profile.appearanceTitle)).toBeDefined();
    expect(screen.getByRole("group", { name: en.nav.theme })).toBeDefined();
  });

  it("shows who is signed in and how they sign in", () => {
    open("profile", "Receptionist");
    expect(screen.getByText("Dao Srisai")).toBeDefined();
    expect(screen.getByText("dao@jca.ac.th")).toBeDefined();
    expect(screen.getByText(en.roles.Receptionist)).toBeDefined();
  });

  /* A profile page is exactly where somebody looks for a password field, and
     this console has never had one. Saying so beats leaving them to hunt. */
  it("says where a new password comes from, since it is not here", () => {
    open("profile", "Admin");
    expect(screen.getByText(en.profile.passwordHint)).toBeDefined();
  });

  it("does not leak the academy's configuration onto a personal page", () => {
    open("profile", "Admin");
    expect(screen.queryByText(en.settings.lowCreditTitle)).toBeNull();
    expect(screen.queryByText(en.settings.lineTitle)).toBeNull();
    expect(screen.queryByText(en.admins.title)).toBeNull();
  });
});
