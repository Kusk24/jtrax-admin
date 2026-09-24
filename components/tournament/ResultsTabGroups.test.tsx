/**
 * Category tabs built from a single chess-results link.
 *
 * An arbiter publishes an age-group event one of two ways. Either each group
 * is its own tournament with its own tnr number — five links for OPEN, U18,
 * U12, U10, U08 — or the whole thing is one tournament with each player's
 * group in the ranking table's "Typ" column, which is how "WCIB CHESS
 * CHAMPIONSHIP 2025 [U14 + G14]" is published.
 *
 * The console only understood the first. Given the second it had one link,
 * nothing to divide it by, and showed twenty children of two age groups as one
 * undivided list. These tests are the second shape.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { LinkedResults } from "@/lib/chess-results";

vi.mock("@/components/DataProvider", () => ({ useData: () => ({ students: [] }) }));

/* One event, two groups, sharing a pairing pool — a G14 plays a U14 in round
   one, exactly as the real event does. */
const LINK: LinkedResults = {
  source: "chess-results",
  url: "https://s3.chess-results.com/tnr1193905.aspx?lan=1",
  chessResultsId: 1193905,
  stage: "Rank after Round 2",
  standings: [
    { rank: 1, name: "Uapongkitikul, Pavatt", points: 2, type: "U14", club: "EIS" },
    { rank: 2, name: "Udomjitpithaya, Kritthad", points: 1, type: "U14", club: "Wellington" },
    { rank: 3, name: "Manasompong, Napak", points: 1, type: "G14", club: "St. Andrews, 71" },
    { rank: 4, name: "Seng, Rosslyn", points: 0, type: "G14", club: "Wellington" },
  ],
  rounds: [
    {
      round: 1,
      played: true,
      pairings: [
        { board: 1, white: "Seng, Rosslyn", black: "Uapongkitikul, Pavatt", result: "0 - 1" },
        { board: 2, white: "Udomjitpithaya, Kritthad", black: "Manasompong, Napak", result: "1 - 0" },
      ],
    },
    {
      round: 2,
      played: true,
      pairings: [
        { board: 1, white: "Uapongkitikul, Pavatt", black: "Udomjitpithaya, Kritthad", result: "1 - 0" },
      ],
    },
  ],
};

const getWholeEvent = vi.fn(async () => LINK);
const getCategory = vi.fn(async () => null);

vi.mock("@/lib/chess-results", async (actual) => ({
  ...(await actual<typeof import("@/lib/chess-results")>()),
  getChessResultsLink: (...a: unknown[]) => getWholeEvent(...(a as [])),
  getCategoryResultsLink: (...a: unknown[]) => getCategory(...(a as [])),
}));

const { ResultsTab } = await import("./ResultsTab");

function renderTab(categories: Array<{ id: string; name: string }> = []) {
  getWholeEvent.mockClear();
  getCategory.mockClear();
  const tree = (cats: Array<{ id: string; name: string }>) => (
    <NextIntlClientProvider locale="en" messages={en}>
      <ResultsTab
        tournamentId="t1"
        tournamentName="WCIB Chess Championship 2025"
        categories={cats}
        totalRounds={2}
        resultsPublic
        onPublishChange={async () => undefined}
      />
    </NextIntlClientProvider>
  );
  const view = render(tree(categories));
  /* Re-rendering with new categories is how the organiser's edit on the
     Overview tab reaches this one: the page reloads its collections and hands
     the tab a longer list. */
  return { rerender: (cats: Array<{ id: string; name: string }>) => view.rerender(tree(cats)) };
}

const tabs = () => screen.getByRole("tablist");
const tab = (name: string) => within(tabs()).getByRole("tab", { name });

/* The ranked list under the boards. Scoped, because a name appears both on a
   board and in this table, and an unscoped query cannot tell which it found. */
const ranked = () => within(screen.getByRole("region", { name: en.common.tableRegion }));

const roundToggle = (n: number) =>
  screen.getAllByRole("button").find((b) => b.textContent?.includes(`Round ${n}`))!;

describe("tabs from one link", () => {
  it("builds a tab per group the event names", async () => {
    renderTab();
    await waitFor(() => expect(tabs()).toBeDefined());
    expect(within(tabs()).getAllByRole("tab").map((b) => b.textContent)).toEqual([
      en.results.wholeEvent,
      "U14",
      "G14",
    ]);
  });

  /* The event has one link. Asking the server for a per-category link on a
     group tab would 404 and blank the boards that were already in hand. */
  it("does not refetch when a group tab is chosen", async () => {
    renderTab();
    await waitFor(() => expect(tab("U14")).toBeDefined());
    getWholeEvent.mockClear();

    fireEvent.click(tab("G14"));
    await waitFor(() => expect(tab("G14").getAttribute("aria-selected")).toBe("true"));
    expect(getCategory).not.toHaveBeenCalled();
    expect(getWholeEvent).not.toHaveBeenCalled();
  });

  it("narrows the ranked list to the chosen group", async () => {
    renderTab();
    await waitFor(() => expect(tab("G14")).toBeDefined());
    fireEvent.click(tab("G14"));

    await waitFor(() => expect(screen.getAllByText("Manasompong, Napak").length).toBeGreaterThan(0));
    /* Only as an opponent on a board a G14 played, never as a row of the
       G14 list itself. */
    expect(ranked().queryByText("Uapongkitikul, Pavatt")).toBeNull();
    expect(ranked().getByText("Seng, Rosslyn")).toBeDefined();
  });

  /* A cross-group game is a game to both players. Round 1 board 1 is a G14
     against a U14 and belongs in both tabs. */
  it("keeps a board the group played against the other one", async () => {
    renderTab();
    await waitFor(() => expect(tab("G14")).toBeDefined());
    fireEvent.click(tab("G14"));

    /* Round 1 is not the round the event is at, so it opens closed. */
    await waitFor(() => expect(roundToggle(1)).toBeDefined());
    fireEvent.click(roundToggle(1));
    const round1 = document.getElementById("round-1-panel")!;
    /* Board 1 is a G14 against a U14 and belongs to both tabs; board 2 is a
       U14 against a G14, so it belongs here too. */
    expect(within(round1).getByText("Seng, Rosslyn")).toBeDefined();
    expect(within(round1).getByText("Manasompong, Napak")).toBeDefined();

    /* Round 2 is U14 against U14 — nothing of this group in it. It is the
       round the event is at, so it is already open, and what it shows is an
       empty round rather than somebody else's board. */
    expect(within(document.getElementById("round-2-panel")!).queryAllByRole("row")).toHaveLength(0);
  });

  /* Renumbering a group 1..n would read better and would be the console
     inventing a placing, so it says what the numbers actually are instead. */
  it("says the ranks beside a group are the event's own", async () => {
    renderTab();
    await waitFor(() => expect(tab("G14")).toBeDefined());
    fireEvent.click(tab("G14"));
    await waitFor(() =>
      expect(screen.getByText(/numbered by their place in the whole event/)).toBeDefined(),
    );
  });

  /* The whole event stays available: it is the arbiter's actual table, and
     the groups are a reading of it. */
  it("still offers the undivided event", async () => {
    renderTab();
    await waitFor(() => expect(tab("G14")).toBeDefined());
    fireEvent.click(tab("G14"));
    fireEvent.click(tab(en.results.wholeEvent));
    await waitFor(() => expect(ranked().getByText("Uapongkitikul, Pavatt")).toBeDefined());
    expect(ranked().getByText("Seng, Rosslyn")).toBeDefined();
  });

  /**
   * The office's categories and the arbiter's groups are not alternatives —
   * they are the same age groups named twice, by two different people.
   *
   * Building the strip from one *or* the other was the bug: a linked event
   * named its own groups, so a category added on the Overview tab afterwards
   * appeared nowhere and looked as though the edit had not saved.
   */
  it("shows the tournament's own categories as well as the link's groups", async () => {
    renderTab([{ id: "c1", name: "Under 18" }]);
    await waitFor(() => expect(tabs()).toBeDefined());
    const labels = within(tabs()).getAllByRole("tab").map((b) => b.textContent);
    expect(labels).toEqual([en.results.wholeEvent, "Under 18", "U14", "G14"]);
  });

  /* Named twice is still one age group. Two tabs reading "U14" would be two
     ways to ask the same question, and the second would answer it worse. */
  it("does not repeat a category the link also names", async () => {
    renderTab([{ id: "c1", name: "U14" }]);
    await waitFor(() => expect(tabs()).toBeDefined());
    const labels = within(tabs()).getAllByRole("tab").map((b) => b.textContent);
    expect(labels).toEqual([en.results.wholeEvent, "U14", "G14"]);
  });

  /* And that surviving tab is the office's category, so it has to find its
     results in the group of the same name inside the whole event — there is
     no separate link for it to fetch. */
  it("answers a category from the matching group inside the event", async () => {
    renderTab([{ id: "c1", name: "U14" }]);
    await waitFor(() => expect(tab("U14")).toBeDefined());
    fireEvent.click(tab("U14"));

    await waitFor(() => expect(ranked().getByText("Uapongkitikul, Pavatt")).toBeDefined());
    expect(ranked().queryByText("Seng, Rosslyn")).toBeNull();
    expect(screen.getByText(/numbered by their place in the whole event/)).toBeDefined();
  });
});

/**
 * The regression, from the organiser's side.
 *
 * Add an age group on the Overview tab of an event that is already linked, come
 * back to Results, and the tab was not there. The strip had been built from the
 * link's own groups *instead of* the categories, so the office's edit had
 * nowhere to land and read as not having saved.
 */
describe("a category added after the event was linked", () => {
  it("appears in the strip", async () => {
    const { rerender } = renderTab([]);
    await waitFor(() => expect(tabs()).toBeDefined());
    expect(within(tabs()).queryByRole("tab", { name: "U19" })).toBeNull();

    rerender([{ id: "c9", name: "U19" }]);
    await waitFor(() => expect(tab("U19")).toBeDefined());
  });

  /* It has no link of its own and no group of that name in the event, so it
     honestly has nothing to show — and says so by offering the link, rather
     than showing the whole event's boards under a U19 heading. */
  it("offers to link it rather than showing somebody else's boards", async () => {
    const { rerender } = renderTab([]);
    await waitFor(() => expect(tabs()).toBeDefined());
    rerender([{ id: "c9", name: "U19" }]);

    await waitFor(() => expect(tab("U19")).toBeDefined());
    fireEvent.click(tab("U19"));
    await waitFor(() => expect(screen.getByLabelText(en.external.urlLabel)).toBeDefined());
    expect(ranked).toThrow(); // no ranked list at all — nothing to rank
  });
});

describe("an event that names no groups", () => {
  it("falls back to a link per category", async () => {
    /* The ordinary event: no Typ column, so no groups to read. */
    const plain = {
      ...LINK,
      standings: LINK.standings.map((row) => ({ ...row, type: undefined })),
    };
    getWholeEvent.mockImplementation(async () => plain);
    renderTab([{ id: "c1", name: "Under 18" }]);

    await waitFor(() => expect(tabs()).toBeDefined());
    expect(within(tabs()).getAllByRole("tab").map((b) => b.textContent)).toEqual([
      en.results.wholeEvent,
      "Under 18",
    ]);

    /* That tab really is a separate chess-results event, so choosing it asks
       for that event's own link. */
    fireEvent.click(tab("Under 18"));
    await waitFor(() => expect(getCategory).toHaveBeenCalledWith("c1"));
    getWholeEvent.mockImplementation(async () => LINK);
  });
});
