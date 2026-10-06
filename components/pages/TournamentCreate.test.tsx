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
import { starred } from "@/lib/starred-label";

const create = vi.fn();

/* The wizard writes through the API directly: a draft first, then its
   categories, the preview link, and Publish. */
const post = vi.fn(async (path: string, _body: Record<string, unknown>) => {
  if (path === "tournaments") return { tournament_id: "trn_new" };
  if (path === "tournament-categories") return { tournament_category_id: `cat_${post.mock.calls.length}` };
  if (path.endsWith("/preview")) return { token: "tok" };
  return {};
});
const patch = vi.fn(async () => ({}));
const del = vi.fn(async () => ({}));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { post, patch, del, get: vi.fn(async () => ({})), put: vi.fn(), upload: vi.fn(async () => ({})) },
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

/** The draft the wizard saved — hidden, not yet open to registration. */
const tournamentWrite = () => post.mock.calls.find((c) => c[0] === "tournaments")?.[1];

/** Every category name the wizard created, in order. */
const categoryWrites = () =>
  post.mock.calls.filter((c) => c[0] === "tournament-categories").map((c) => String(c[1].name));

const published = () => post.mock.calls.some((c) => c[0] === "tournaments/trn_new/publish");

describe("the create wizard", () => {
  it("sends the categories and the discount with the tournament it creates", async () => {
    post.mockClear();
    const user = openWizard();
    await user.click(screen.getByText(en.tournament.create));
    // The form opens straight away — there is no upload step first.

    await user.type(screen.getByLabelText(starred(en.tournament.fieldName)), "JCA Open");

    // Both controls are here, before the tournament exists.
    const pct = screen.getByLabelText(starred(en.tournament.discountLabel));
    await user.clear(pct);
    await user.type(pct, "20");

    const cat = screen.getByLabelText(starred(en.tournament.categoryPlaceholder));
    await user.type(cat, "U8 Boys{Enter}");
    await user.type(cat, "U12 Girls{Enter}");
    expect(screen.getByText("U8 Boys")).toBeTruthy();

    await user.click(screen.getByText(en.tournament.continueToReview));

    await waitFor(() => expect(tournamentWrite()).toBeTruthy());
    expect(tournamentWrite()!.student_discount_pct).toBe(20);
    expect(categoryWrites()).toEqual(["U8 Boys", "U12 Girls"]);
  });

  /* The same name twice would be two sections on the form and one in
     everybody's head, and there is no unique index behind this. */
  it("does not add the same category twice, whatever the casing", async () => {
    post.mockClear();
    const user = openWizard();
    await user.click(screen.getByText(en.tournament.create));

    const cat = screen.getByLabelText(starred(en.tournament.categoryPlaceholder));
    await user.type(cat, "U8 Boys{Enter}");
    await user.type(cat, "u8 boys{Enter}");

    await user.type(screen.getByLabelText(starred(en.tournament.fieldName)), "JCA Open");
    await user.click(screen.getByText(en.tournament.continueToReview));

    /* Asserted on the writes rather than the chips: a chip and the div
       wrapping it both have the same textContent, so counting rendered text
       would find two of a deduplicated single category. */
    await waitFor(() => expect(tournamentWrite()).toBeTruthy());
    expect(categoryWrites()).toEqual(["U8 Boys"]);
  });

  /* Review is a real step: nothing goes live until Publish at its foot. */
  it("saves a hidden draft for review and publishes only on Publish", async () => {
    post.mockClear();
    const user = openWizard();
    await user.click(screen.getByText(en.tournament.create));
    await user.type(screen.getByLabelText(starred(en.tournament.fieldName)), "JCA Open");
    await user.click(screen.getByText(en.tournament.continueToReview));

    await waitFor(() => expect(screen.getByText(en.tournament.reviewTitle)).toBeTruthy());
    expect(tournamentWrite()).toMatchObject({ draft: true, public_registration: false });
    expect(published()).toBe(false);

    await user.click(screen.getByText(en.tournament.publishAction));
    await waitFor(() => expect(published()).toBe(true));
    expect(await screen.findByText(en.tournament.viewTournament)).toBeTruthy();
  });

  it("reviews each section in words, with an Edit for each and no framed preview", async () => {
    const user = openWizard();
    await user.click(screen.getByText(en.tournament.create));
    await user.type(screen.getByLabelText(starred(en.tournament.fieldName)), "JCA Open");
    const cat = screen.getByLabelText(starred(en.tournament.categoryPlaceholder));
    await user.type(cat, "U8 Boys{Enter}");
    await user.click(screen.getByText(en.tournament.continueToReview));
    await waitFor(() => expect(screen.getByText(en.tournament.reviewTitle)).toBeTruthy());

    expect(document.querySelector("iframe[title]:not([title*='map' i])")).toBeNull();
    expect(screen.getByTitle("JCA Open")).toBeTruthy();
    expect(screen.getByText("1 category")).toBeTruthy();
    expect(screen.getByText(en.tournament.reviewNoRegulation)).toBeTruthy();
    /* One Edit per section. */
    expect(screen.getAllByRole("button", { name: /^Edit / }).length).toBeGreaterThanOrEqual(6);
  });

  it("throws the draft away when the organiser leaves before publishing", async () => {
    post.mockClear();
    del.mockClear();
    const user = openWizard();
    await user.click(screen.getByText(en.tournament.create));
    await user.type(screen.getByLabelText(starred(en.tournament.fieldName)), "JCA Open");
    await user.click(screen.getByText(en.tournament.continueToReview));
    await waitFor(() => expect(screen.getByText(en.tournament.reviewTitle)).toBeTruthy());

    await user.click(screen.getByText(en.tournament.backToTournaments));
    await waitFor(() => expect(del).toHaveBeenCalledWith("tournaments/trn_new/draft"));
    expect(published()).toBe(false);
  });
});
