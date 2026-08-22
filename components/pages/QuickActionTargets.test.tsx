/**
 * The other half of the Quick Actions: that each section acts on the request.
 *
 * `lib/quick-actions.test.ts` proves the link carries `?new=` and that the
 * reader understands it. This proves the four sections do something with it —
 * that the form is actually on screen when the pill is clicked, rather than
 * the list the pill was meant to skip.
 *
 * The trap each of these guards is the same one line: `useState(startNew ? …)`
 * against a value that is an empty string when nothing has been typed. It
 * type-checks, it lints, and it opens nothing.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

vi.mock("@/components/JtraxContext", () => ({
  useJtrax: () => ({ role: "Admin" }),
}));

const EMPTY_COLLECTIONS = [
  "students", "parents", "parentContacts", "studentParents", "classes",
  "classSessions", "attendance", "enrollments", "creditTransactions",
  "creditPackages", "payments", "teachers", "admins", "accounts",
  "announcements", "tournaments", "tournamentCategories",
  "tournamentRegistrations", "practiceActivities", "systemConfig",
];
const raw = Object.fromEntries(EMPTY_COLLECTIONS.map((k) => [k, []]));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    raw,
    students: [],
    payments: [],
    announcements: [],
    tournaments: [],
    meAccountId: "acct_me",
    loading: false,
    error: null,
    batch: async (job: () => Promise<unknown>) => job(),
    create: async () => ({}),
    update: async () => ({}),
    remove: async () => undefined,
    removePerson: async () => undefined,
    refresh: async () => undefined,
  }),
}));

const { StudentsPage } = await import("./StudentsPage");
const { PaymentPage } = await import("./PaymentPage");
const { AnnouncementPage } = await import("./AnnouncementPage");
const { TournamentPage } = await import("./TournamentPage");
const { SectionRouter } = await import("@/components/SectionRouter");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

function show(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>{ui}</ErrorToastProvider>
    </NextIntlClientProvider>,
  );
}

describe("a section arrived at from a Quick Action", () => {
  /* Each assertion names something only the create form renders — a
     sub-heading or a field — never a button that opens it, which is on the
     list screen too and would pass with the bug present. */
  it("opens the registration wizard", () => {
    show(<StudentsPage startWizard="" />);
    expect(
      screen.getByText("Upload a registration form or enter the details manually."),
    ).toBeDefined();
  });

  it("opens the payment form", () => {
    show(<PaymentPage startNew />);
    expect(screen.getByText("Log a credit purchase against a student.")).toBeDefined();
  });

  it("opens the announcement composer", () => {
    show(<AnnouncementPage startNew />);
    expect(screen.getByLabelText(/^Message/)).toBeDefined();
  });

  it("opens the tournament wizard", () => {
    show(<TournamentPage startNew />);
    expect(
      screen.getByText("Upload the regulation and we'll pre-fill the details."),
    ).toBeDefined();
  });
});

describe("a section arrived at any other way", () => {
  /* Navigating to the tab from the nav still lands on the list. */
  it("shows the students list", () => {
    show(<StudentsPage />);
    expect(
      screen.queryByText("Upload a registration form or enter the details manually."),
    ).toBeNull();
  });

  it("shows the payment list", () => {
    show(<PaymentPage />);
    expect(screen.queryByText("Log a credit purchase against a student.")).toBeNull();
  });

  it("shows the announcements", () => {
    show(<AnnouncementPage />);
    expect(screen.queryByLabelText(/^Message/)).toBeNull();
  });

  it("shows the tournaments", () => {
    show(<TournamentPage />);
    expect(
      screen.queryByText("Upload the regulation and we'll pre-fill the details."),
    ).toBeNull();
  });
});

describe("the name typed into the dashboard search", () => {
  it("arrives in the registration form", () => {
    show(<StudentsPage startWizard="Anong Suk" />);
    expect((screen.getByLabelText("Full Name") as HTMLInputElement).value).toBe("Anong Suk");
  });
});

/**
 * Clicking a pill for a section that is already mounted.
 *
 * The whole console is one route with the sections held in client state, so
 * going from /payment to /payment?new= re-renders the same PaymentPage rather
 * than mounting a new one — and the initial state that reads the flag never
 * runs a second time. The pill would do nothing at all, which is a worse
 * version of the bug it was meant to fix.
 */
describe("arriving at a section that is already on screen", () => {
  const sections = [
    { section: "payment", opens: "Log a credit purchase against a student." },
    { section: "students", opens: "Upload a registration form or enter the details manually." },
    { section: "tournament", opens: "Upload the regulation and we'll pre-fill the details." },
  ];

  for (const { section, opens } of sections) {
    it(`still opens the ${section} form`, () => {
      const { rerender } = show(<SectionRouter section={section} />);
      expect(screen.queryByText(opens)).toBeNull();

      rerender(
        <NextIntlClientProvider locale="en" messages={en}>
          <ErrorToastProvider>
            <SectionRouter section={section} startNew="" />
          </ErrorToastProvider>
        </NextIntlClientProvider>,
      );
      expect(screen.getByText(opens)).toBeDefined();
    });
  }

  it("still opens the announcement composer", () => {
    const { rerender } = show(<SectionRouter section="announcement" />);
    expect(screen.queryByLabelText(/^Message/)).toBeNull();

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <ErrorToastProvider>
          <SectionRouter section="announcement" startNew="" />
        </ErrorToastProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getByLabelText(/^Message/)).toBeDefined();
  });
});
