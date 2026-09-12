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

  /* The columns are the academy's two lists of policy: what the thresholds
     are on the left, what gets sent on the right. */
  it("puts the rules and Appearance against the notification switches", () => {
    renderAs("Admin");
    const [left, right] = [...duo()!.children] as HTMLElement[];
    expect(left.textContent).toContain(en.settings.title);
    expect(left.textContent).toContain(en.settings.lowCreditTitle);
    expect(left.textContent).toContain(en.settings.themeTitle);
    expect(right.textContent).toContain(en.settings.notifyTitle);
    /* And Appearance really did leave the right column, rather than being
       rendered into both. */
    expect(right.textContent).not.toContain(en.settings.themeTitle);
  });

  /* The LINE form is a credentials form beside two lists of switches, and it
     set the right column's height wherever in it it sat. Below both columns
     it stops driving the comparison — and its webhook URL gets the full width
     it needs to be copyable. */
  it("keeps the LINE credentials out of the columns", () => {
    renderAs("Admin");
    expect(duo()!.textContent).not.toContain(en.settings.lineTitle);
    expect(screen.getByText(en.settings.lineTitle)).toBeDefined();
  });

  /* Order on the page: the two columns, then LINE, then the roster. */
  it("puts LINE below the columns and above the roster", () => {
    renderAs("Admin");
    const text = document.body.textContent ?? "";
    expect(text.indexOf(en.settings.notifyTitle)).toBeLessThan(text.indexOf(en.settings.lineTitle));
    expect(text.indexOf(en.settings.lineTitle)).toBeLessThan(text.indexOf(en.admins.title));
  });

  /* jsdom has no layout, so "same height" is asserted as the structure the
     stylesheet acts on: the grid stretches its columns instead of aligning
     them to the start, and the last card in each column grows into the slack.
     Without both, one column still ends above the other. */
  it("stretches the two columns to a common height", () => {
    renderAs("Admin");
    expect((duo() as HTMLElement).style.alignItems).toBe("stretch");
    for (const column of [...duo()!.children] as HTMLElement[]) {
      const last = column.lastElementChild as HTMLElement;
      expect(last.style.flexGrow).toBe("1");
    }
  });

  /* Growing a card moves its border down without moving what is inside, so the
     switches pooled the whole difference underneath themselves and read as a
     list cut short. Centred, the slack splits above and below. */
  it("centres the notification switches in the height the card takes", () => {
    renderAs("Admin");
    const card = (duo()!.children[1] as HTMLElement).lastElementChild as HTMLElement;
    expect(card.style.display).toBe("flex");
    expect(card.style.flexDirection).toBe("column");
    expect(card.style.justifyContent).toBe("center");
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

  /* The LINE card still drops the title it used to print inside itself — a
     heading above a card that starts with the same heading reads as two
     sections that happen to share a name. Moving the block is exactly the
     change that ends up printing it in both places. */
  it("names LINE once", () => {
    renderAs("Admin");
    expect(screen.getAllByText(en.settings.lineTitle)).toHaveLength(1);
  });

  /* Both columns open the same way: a heading, then the card it names. */
  it("gives both columns a heading", () => {
    renderAs("Admin");
    const [left, right] = [...duo()!.children] as HTMLElement[];
    for (const [column, title] of [[left, en.settings.title], [right, en.settings.notifyTitle]] as const) {
      const heading = column.querySelector("h2, h3");
      expect(heading?.textContent).toBe(title);
    }
  });
});
