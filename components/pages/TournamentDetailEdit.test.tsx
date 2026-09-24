/**
 * Inline editing on the Tournament Details page.
 *
 * Editing a tournament used to open a separate "Edit Tournament" modal. That
 * modal is gone: clicking Edit now turns the details page itself into a form,
 * in place, and Save Changes / Cancel replace Edit / Delete at the top while
 * it is open. This file is the trap that pattern is prone to — a draft that
 * silently keeps last session's values, a Cancel that does not actually
 * discard anything, a category edit that fires immediately instead of
 * waiting for Save — each proven by driving the real component rather than
 * reading the code.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { AdminPerson, Tournament } from "@/lib/data";

const TOURNAMENT_ID = "trn_1";

const rawTournamentRow: Record<string, unknown> = {
  tournament_id: TOURNAMENT_ID,
  name: "JCA Open",
  tournament_status: "Upcoming",
  organizer_name: "JCA Chess Academy",
  start_date: "2026-06-07",
  end_date: "2026-06-08",
  venue_name: "Wellington College",
  venue_address: "Bangkok",
  venue_map_url: "https://www.google.com/maps/search/?api=1&query=Wellington+College",
  registration_deadline: "2026-05-30",
  max_participants: "150",
  regular_fee: "300",
  early_bird_fee: "250",
  early_bird_deadline: "2026-05-01",
  student_discount_pct: "20",
};

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: TOURNAMENT_ID,
    name: "JCA Open",
    status: "Ongoing",
    date: "07 Jun 2026",
    endDate: "08 Jun 2026",
    venue: "Wellington College",
    venueMapUrl: "https://www.google.com/maps/search/?api=1&query=Wellington+College",
    format: "Swiss",
    published: false,
    publicRegistration: false,
    studentDiscountPct: 20,
    entryFeeAmount: 300,
    categories: ["U8 Boys"],
    categoryRows: [{ id: "cat_1", name: "U8 Boys" }],
    organizer: "JCA Chess Academy",
    chiefArbiter: "—",
    registrationDeadline: "30 May 2026",
    timeControl: "—",
    entryFeeMember: "THB 300",
    entryFeeNonMember: "THB 300",
    earlyBirdFeeMember: "THB 250",
    earlyBirdEnd: "01 May 2026",
    address: "Bangkok",
    contactPerson: "JCA Chess Academy",
    maxParticipants: 150,
    currentParticipants: 0,
    rounds: 0,
    revenue: "THB 0",
    participants: [],
    ...overrides,
  };
}

const create = vi.fn(async (collection: string, row: Record<string, unknown>) => ({
  tournament_category_id: "cat_new",
  ...row,
  __collection: collection,
}));
const update = vi.fn(async (_collection: string, _id: string, _body: Record<string, unknown>) => ({}));
const remove = vi.fn(async (_collection: string, _id: string) => undefined);
const batch = vi.fn(async (job: () => Promise<unknown>) => job());

let tournaments: Tournament[] = [makeTournament()];

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    raw: { tournaments: [rawTournamentRow], tournamentCategories: [], tournamentRegistrations: [], students: [] },
    tournaments,
    students: [],
    create,
    update,
    remove,
    batch,
    refresh: vi.fn(),
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

/* RegulationCard HEAD-checks for an attached file on mount, on every render
   of the details page — never mocked at the DataProvider level, since it
   talks to the same-origin API proxy directly. */
vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

const { TournamentPage } = await import("./TournamentPage");
const { JtraxProvider } = await import("@/components/JtraxContext");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

function openDetail(props: Partial<{ detailId: string }> = { detailId: TOURNAMENT_ID }) {
  const person = { id: "p1", name: "T", role: "Admin", email: "t@jca.ac.th", initials: "T" } as AdminPerson;
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <JtraxProvider person={person}>
          <TournamentPage {...props} />
        </JtraxProvider>
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

const tournamentWrite = () => update.mock.calls.at(-1)?.[2] as Record<string, unknown> | undefined;
const categoryWrites = () => create.mock.calls.filter((c) => c[0] === "tournament-categories").map((c) => c[1].name);
const categoryRemovals = () => remove.mock.calls.filter((c) => c[0] === "tournament-categories").map((c) => c[1]);

describe("editing a tournament in place", () => {
  it("turns the read-only values into pre-filled fields, and Save writes the tournament row plus the category diff", async () => {
    update.mockClear(); create.mockClear(); remove.mockClear();
    tournaments = [makeTournament()];
    const user = openDetail();

    // Read-only first — nothing editable yet, and the map link is real. The
    // name appears twice by design: the page title, and the Tournament
    // Information row underneath it.
    expect(screen.getAllByText("JCA Open").length).toBeGreaterThan(0);
    expect(screen.getByText(en.tournament.viewOnMap)).toBeTruthy();
    expect(screen.queryByLabelText(en.tournament.fieldName)).toBeNull();

    await user.click(screen.getByText(en.common.edit));

    // The existing values, not blanks — this is what "convert the displayed
    // values into editable fields" means; a form that resets to empty is not
    // the same feature.
    const nameInput = screen.getByLabelText(en.tournament.fieldName) as HTMLInputElement;
    expect(nameInput.value).toBe("JCA Open");
    const venueInput = screen.getByLabelText(en.tournament.fieldVenue) as HTMLInputElement;
    expect(venueInput.value).toBe("Wellington College");
    expect(screen.getByText("U8 Boys")).toBeTruthy();

    await user.clear(nameInput);
    await user.type(nameInput, "JCA Winter Open");

    // Stage a category change: drop the existing one, add a new one. Neither
    // should touch the API until Save.
    await user.click(screen.getByLabelText(en.common.deleteThing.replace("{what}", "U8 Boys")));
    const catInput = screen.getByLabelText(en.tournament.categoryPlaceholder);
    await user.type(catInput, "U10 Boys{Enter}");
    expect(create).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();

    await user.click(screen.getByText(en.common.saveChanges));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(tournamentWrite()?.name).toBe("JCA Winter Open");
    // Recomputed from the venue name, not just carried over unchanged.
    expect(tournamentWrite()?.venue_map_url).toContain("Wellington%20College");
    expect(categoryRemovals()).toEqual(["cat_1"]);
    expect(categoryWrites()).toEqual(["U10 Boys"]);

    // Back to a read-only page — the edit surface is gone, not just disabled.
    await waitFor(() => expect(screen.queryByLabelText(en.tournament.fieldName)).toBeNull());
  });

  it("Cancel discards every staged change, category edits included", async () => {
    update.mockClear(); create.mockClear(); remove.mockClear();
    tournaments = [makeTournament()];
    const user = openDetail();

    await user.click(screen.getByText(en.common.edit));
    const nameInput = screen.getByLabelText(en.tournament.fieldName) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, "Something Else Entirely");
    await user.click(screen.getByLabelText(en.common.deleteThing.replace("{what}", "U8 Boys")));

    await user.click(screen.getByText(en.common.cancel));

    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    // The original name is back on screen, not the abandoned draft.
    expect(screen.getAllByText("JCA Open").length).toBeGreaterThan(0);
    expect(screen.queryByText("Something Else Entirely")).toBeNull();
    // And the category survived the aborted edit.
    expect(screen.getByText("U8 Boys")).toBeTruthy();
  });

  it("the list's Edit shortcut opens the tournament already in edit mode, no modal involved", async () => {
    update.mockClear(); create.mockClear(); remove.mockClear();
    tournaments = [makeTournament()];
    const user = openDetail({}); // no detailId: start on the list

    const card = screen.getByText("JCA Open").closest(".jt-course-card") as HTMLElement;
    await user.click(within(card).getByLabelText(en.common.editThing.replace("{what}", "JCA Open")));

    // Landed on the detail page, already editing — not a modal, and not the
    // read-only view first.
    const nameInput = await screen.findByLabelText(en.tournament.fieldName) as HTMLInputElement;
    expect(nameInput.value).toBe("JCA Open");
    expect(screen.getByText(en.common.saveChanges)).toBeTruthy();
  });
});

/**
 * Taking an age group off a tournament somebody has already entered.
 *
 * The backend no longer refuses this — it clears the group off the entries and
 * leaves the children in the event — so the console has to say what that means
 * before it happens. "Your three U19s are now uncategorised" is a consequence
 * to agree to, not to discover.
 */
describe("removing an age group with entrants", () => {
  const entered = () =>
    makeTournament({
      categories: ["U8 Boys", "U19"],
      categoryRows: [
        { id: "cat_1", name: "U8 Boys" },
        { id: "cat_2", name: "U19" },
      ],
      participants: [
        { name: "Alice", categoryId: "cat_2", rating: 0, category: "U19", score: "", rank: 1, prize: "", paymentStatus: "Paid", age: 12, guardian: "", contact: "", wins: 0 },
        { name: "Bishop", categoryId: "cat_2", rating: 0, category: "U19", score: "", rank: 2, prize: "", paymentStatus: "Paid", age: 12, guardian: "", contact: "", wins: 0 },
      ] as Tournament["participants"],
    });

  async function startEditing(user: ReturnType<typeof openDetail>) {
    await user.click(screen.getByText(en.common.edit));
  }

  /* Before the × is pressed, not only in the dialog after it. */
  it("shows how many are in each group on its chip", async () => {
    tournaments = [entered()];
    const user = openDetail();
    await startEditing(user);

    const chip = screen.getByLabelText(en.common.deleteThing.replace("{what}", "U19")).parentElement!;
    expect(chip.textContent).toContain("2");
    /* The empty one says nothing — a zero beside every other group is noise.
       Compared whole rather than searched for a digit: the group is called
       "U8 Boys" and carries one of its own. */
    const empty = screen.getByLabelText(en.common.deleteThing.replace("{what}", "U8 Boys")).parentElement!;
    expect(empty.textContent).toBe("U8 Boys");
  });

  it("asks before taking it off, and says what happens to them", async () => {
    tournaments = [entered()];
    const user = openDetail();
    await startEditing(user);

    await user.click(screen.getByLabelText(en.common.deleteThing.replace("{what}", "U19")));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeDefined());
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(/2 entrants are in this group/)).toBeDefined();
    expect(dialog.getByText(/stay entered in the tournament/)).toBeDefined();
    /* And it must not claim to be irreversible: nothing is deleted until
       Save, and Cancel on the edit discards it. */
    expect(dialog.queryByText(/cannot be undone/)).toBeNull();
  });

  /* Cancelling leaves it exactly where it was. */
  it("keeps the group when the ask is refused", async () => {
    tournaments = [entered()];
    const user = openDetail();
    await startEditing(user);

    await user.click(screen.getByLabelText(en.common.deleteThing.replace("{what}", "U19")));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeDefined());
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: en.common.cancel }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByLabelText(en.common.deleteThing.replace("{what}", "U19"))).toBeDefined();
  });

  /* Agreeing stages it like every other field. Nothing reaches the API until
     Save, so the dialog is an agreement rather than the deletion itself. */
  it("removes it on Save once agreed", async () => {
    tournaments = [entered()];
    remove.mockClear();
    const user = openDetail();
    await startEditing(user);

    await user.click(screen.getByLabelText(en.common.deleteThing.replace("{what}", "U19")));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeDefined());
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: en.tournament.removeCategoryConfirm }));

    await waitFor(() =>
      expect(screen.queryByLabelText(en.common.deleteThing.replace("{what}", "U19"))).toBeNull(),
    );
    expect(categoryRemovals()).toEqual([]); // still only staged

    await user.click(screen.getByText(en.common.saveChanges));
    await waitFor(() => expect(categoryRemovals()).toEqual(["cat_2"]));
  });

  /* A group nobody is in goes without a word. A confirmation nobody could
     answer wrongly is a click, not a safeguard. */
  it("removes an empty group without asking", async () => {
    tournaments = [entered()];
    const user = openDetail();
    await startEditing(user);

    await user.click(screen.getByLabelText(en.common.deleteThing.replace("{what}", "U8 Boys")));
    await waitFor(() =>
      expect(screen.queryByLabelText(en.common.deleteThing.replace("{what}", "U8 Boys"))).toBeNull(),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
