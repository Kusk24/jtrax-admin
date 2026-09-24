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
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ResultsTab
        tournamentId="t1"
        tournamentName="WCIB Chess Championship 2025"
        categories={categories}
        totalRounds={2}
        resultsPublic
        onPublishChange={async () => undefined}
      />
    </NextIntlClientProvider>,
  );
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

  /* The groups are the arbiter's division of the event; the categories are the
     office's guess at it before anyone played. Where both exist the arbiter
     wins — and a category tab may have no link behind it at all. */
  it("prefers the link's own groups over the tournament's categories", async () => {
    renderTab([{ id: "c1", name: "Under 18" }]);
    await waitFor(() => expect(tabs()).toBeDefined());
    const labels = within(tabs()).getAllByRole("tab").map((b) => b.textContent);
    expect(labels).toContain("U14");
    expect(labels).not.toContain("Under 18");
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
