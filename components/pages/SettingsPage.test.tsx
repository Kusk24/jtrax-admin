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

/**
 * The shape of the page, not just what is on it.
 *
 * Settings was one long scroll of unrelated blocks; the parent portal lays the
 * same kind of page out in two columns, and that is what was asked for. jsdom
 * has no CSS, so this asserts the structure the stylesheet acts on — `jt-duo`
 * is the console's own two-column grid — rather than trying to measure pixels.
 */
describe("the shape of Settings", () => {
  const duo = () => document.querySelector(".jt-duo");

  it("puts the admin's blocks in two columns", () => {
    renderAs("Admin");
    const grid = duo();
    expect(grid).not.toBeNull();
    expect(grid!.children.length).toBe(2);
  });

  /* The rules and Appearance are both short; the LINE form is tall. Splitting
     them the other way — one short card beside the tall one — left a hole
     under the rules and finished the two sides a long way apart. */
  it("stacks the two short blocks against the tall one", () => {
    renderAs("Admin");
    const [left, right] = [...duo()!.children] as HTMLElement[];
    expect(left.textContent).toContain(en.settings.title);
    expect(left.textContent).toContain(en.settings.lowCreditTitle);
    expect(left.textContent).toContain(en.settings.themeTitle);
    expect(right.textContent).toContain(en.settings.lineTitle);
    /* And Appearance really did leave the right column, rather than being
       rendered into both. */
    expect(right.textContent).not.toContain(en.settings.themeTitle);
  });

  /* Appearance sits under the rules, not above them: the academy's thresholds
     are what the page is for, and a personal preference should not be the
     first thing an admin scrolls past to reach them. */
  it("puts Appearance below the rules, not above", () => {
    renderAs("Admin");
    const left = duo()!.children[0] as HTMLElement;
    const text = left.textContent ?? "";
    expect(text.indexOf(en.settings.title)).toBeLessThan(text.indexOf(en.settings.themeTitle));
  });

  /* A table halved is a roster in a 400px box. It belongs under both columns,
     not inside one. */
  it("keeps the staff roster out of the columns", () => {
    renderAs("Admin");
    expect(duo()!.textContent).not.toContain(en.admins.title);
    expect(screen.getByRole("heading", { level: 2, name: en.admins.title })).toBeDefined();
  });

  /* Only Appearance is theirs, and one card beside an empty half is worse
     than one column. */
  it("gives the receptionist a single column", () => {
    renderAs("Receptionist");
    expect(duo()).toBeNull();
    expect(screen.getByText(en.settings.themeTitle)).toBeDefined();
  });

  /* The heading is above the card now rather than inside its flex row, so both
     columns read the same way: a heading, then what it names. Two elements
     with the same text would mean it is being printed twice. */
  it("names Appearance once", () => {
    renderAs("Admin");
    expect(screen.getAllByText(en.settings.themeTitle)).toHaveLength(1);
  });
});
