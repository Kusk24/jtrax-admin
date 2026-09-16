/**
 * What the Create Tournament wizard actually writes.
 *
 * Categories and the student discount used to be set on the tournament's own
 * screen, after it existed. Both are things the public registration form asks
 * about — which section are you entering, and what do we quote you — and that
 * form can be open from the moment the event is published. So an event created
 * on Monday and configured on Tuesday spent a day collecting entries with no
 * section and no discount.
 *
 * The wizard already looped over `t.categories` when publishing; it was handed
 * `[]` every time. That is the shape of bug this file exists to catch — the
 * write path was fine and nothing filled it in.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { AdminPerson } from "@/lib/data";

const create = vi.fn(async (collection: string, _row: Record<string, unknown>) => ({
  tournament_id: collection === "tournaments" ? "trn_new" : "cat_new",
}));

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    raw: {
      tournaments: [], tournamentCategories: [], tournamentRegistrations: [],
      students: [], classes: [],
    },
    tournaments: [],
    students: [],
    create,
    update: vi.fn(),
    remove: vi.fn(),
    refresh: vi.fn(),
    batch: vi.fn(async (job: () => Promise<unknown>) => job()),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/tournament",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/chess-results", () => ({
  refreshLinkedResults: vi.fn(),
  listExternal: vi.fn(async () => []),
}));

const { TournamentPage } = await import("./TournamentPage");
const { JtraxProvider } = await import("@/components/JtraxContext");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

function openWizard() {
  const person = { id: "p1", name: "T", role: "Admin", email: "t@jca.ac.th", initials: "T" } as AdminPerson;
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <JtraxProvider person={person}>
          <TournamentPage />
        </JtraxProvider>
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

/** The payload the wizard sent to `create("tournaments", …)`. */
const tournamentWrite = () =>
  create.mock.calls.find((c) => c[0] === "tournaments")?.[1];

/** Every category name the wizard created, in order. */
const categoryWrites = () =>
  create.mock.calls
    .filter((c) => c[0] === "tournament-categories")
    .map((c) => String(c[1].name));

describe("the create wizard", () => {
  it("sends the categories and the discount with the tournament it creates", async () => {
    create.mockClear();
    const user = openWizard();
    await user.click(screen.getByText(en.tournament.create));
    // Step 1 offers the regulation; the fields are on step 2.
    await user.click(screen.getByText(en.tournament.skipManual));

    await user.type(screen.getByLabelText(en.tournament.fieldName), "JCA Open");

    // Both controls are here, before the tournament exists.
    const pct = screen.getByLabelText(en.tournament.discountLabel);
    await user.clear(pct);
    await user.type(pct, "20");

    const cat = screen.getByLabelText(en.tournament.categoryPlaceholder);
    await user.type(cat, "U8 Boys{Enter}");
    await user.type(cat, "U12 Girls{Enter}");
    expect(screen.getByText("U8 Boys")).toBeTruthy();

    await user.click(screen.getByText(en.tournament.publishAction));
    await user.click(screen.getByText(en.tournament.viewTournament));

    await waitFor(() => expect(tournamentWrite()).toBeTruthy());
    expect(tournamentWrite()!.student_discount_pct).toBe(20);
    expect(categoryWrites()).toEqual(["U8 Boys", "U12 Girls"]);
  });

  /* The same name twice would be two sections on the form and one in
     everybody's head, and there is no unique index behind this. */
  it("does not add the same category twice, whatever the casing", async () => {
    create.mockClear();
    const user = openWizard();
    await user.click(screen.getByText(en.tournament.create));
    await user.click(screen.getByText(en.tournament.skipManual));

    const cat = screen.getByLabelText(en.tournament.categoryPlaceholder);
    await user.type(cat, "U8 Boys{Enter}");
    await user.type(cat, "u8 boys{Enter}");

    await user.type(screen.getByLabelText(en.tournament.fieldName), "JCA Open");
    await user.click(screen.getByText(en.tournament.publishAction));
    await user.click(screen.getByText(en.tournament.viewTournament));

    /* Asserted on the writes rather than the chips: a chip and the div
       wrapping it both have the same textContent, so counting rendered text
       would find two of a deduplicated single category. */
    await waitFor(() => expect(tournamentWrite()).toBeTruthy());
    expect(categoryWrites()).toEqual(["U8 Boys"]);
  });
});
