/**
 * The Results table, which is a reading of the arbiter's pages and nothing
 * else. What is worth asserting is therefore the reading, not the styling: a
 * round labelled with the state it is actually in, a search that narrows the
 * boards to one player, and a panel whose numbers add back up to the boards
 * they were derived from.
 *
 * The screen it replaced showed every round at once in a sideways scroller.
 * The default here is deliberately not that — an event opens on the round it
 * is at — so that default is asserted too.
 */
import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { ExternalStanding, LinkedRound } from "@/lib/chess-results";

/* The player panel looks a matched student up to show who to ring. One row is
   enough; the rest of the console's data is not involved. */
vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    students: [
      { id: "s1", name: "Nikolaus Stancec", parentName: "Elena Stancec", parentPhone: "+66 81 234 5678" },
    ],
  }),
}));

const { ResultsTable } = await import("./ResultsTable");

const ROUNDS: LinkedRound[] = [
  {
    round: 1,
    played: true,
    pairings: [
      { board: 1, white: "Stancec, Nikolaus", black: "Karasevych, Andrii", result: "1 - 0", whiteStudentId: "s1" },
      { board: 2, white: "Ernst, Roman", black: "Balinov, Ilia", result: "½ - ½" },
    ],
  },
  {
    round: 2,
    played: true,
    pairings: [
      { board: 1, white: "Leisch, Lukas", black: "Stancec, Nikolaus", result: "½ - ½", blackStudentId: "s1" },
      { board: 2, white: "Ernst, Roman", black: "Karasevych, Andrii", result: "0 - 1" },
    ],
  },
  /* Paired but not yet played — the state that only exists because the
     backend stores the next round the moment the site publishes it. */
  {
    round: 3,
    played: false,
    pairings: [{ board: 1, white: "Stancec, Nikolaus", black: "Ernst, Roman", whiteStudentId: "s1" }],
  },
];

const STANDINGS: ExternalStanding[] = [
  { rank: 3, name: "Stancec, Nikolaus", rating: 2460, points: 1.5, club: "Wellington College Intl", studentId: "s1", studentName: "Nikolaus Stancec" },
  { rank: 5, name: "Ernst, Roman", rating: 2210, points: 0.5, club: "Harrow Bangkok" },
];

function renderTable(rounds = ROUNDS, totalRounds = 4) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ResultsTable
        rounds={rounds}
        standings={STANDINGS}
        totalRounds={totalRounds}
        eventName="Wellington College Chess Championship 2026"
        categoryName="U14"
      />
    </NextIntlClientProvider>,
  );
}

/** A round card's toggle, which is its whole header — the heading is the
    control, so there is nothing else to find it by. */
function roundHeader(n: number) {
  return screen
    .getAllByRole("button")
    .find((b) => b.textContent?.includes(`Round ${n}`) || b.textContent?.startsWith(`R${n}`))!;
}

describe("what state each round is in", () => {
  it("labels completed, paired and unpublished rounds apart", () => {
    renderTable();
    expect(roundHeader(1).textContent).toContain(en.results.roundCompleted);
    /* Round 2 is the last one played, and that is worth its own word: it is
       the round a question at the venue is almost always about. */
    expect(roundHeader(2).textContent).toContain(en.results.roundCompletedLatest);
    expect(roundHeader(3).textContent).toContain(en.results.roundPaired);
    expect(roundHeader(4).textContent).toContain(en.results.roundScheduled);
  });

  /* chess-results has no page for a round it has not published, so without the
     tournament's own count a live event ends at whatever was uploaded. */
  it("shows the rounds the arbiter has not published yet", () => {
    renderTable();
    expect(roundHeader(4)).toBeDefined();
    expect(roundHeader(4).textContent).toContain("(final)");
  });

  it("counts the boards and the games finished on them", () => {
    renderTable();
    expect(roundHeader(1).textContent).toContain("2 boards");
    expect(roundHeader(1).textContent).toContain("2 games finished");
  });
});

describe("which rounds are open", () => {
  /* Not all of them: a five-round event opened flat is a page nobody reads.
     Not none either — that is a list of headings. The event opens where it
     is. */
  it("opens on the round the event is at", () => {
    renderTable();
    expect(roundHeader(1).getAttribute("aria-expanded")).toBe("false");
    expect(roundHeader(2).getAttribute("aria-expanded")).toBe("true");
    expect(roundHeader(3).getAttribute("aria-expanded")).toBe("true");
  });

  it("opens and closes one round on its own", () => {
    renderTable();
    fireEvent.click(roundHeader(1));
    expect(roundHeader(1).getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(roundHeader(1));
    expect(roundHeader(1).getAttribute("aria-expanded")).toBe("false");
  });

  it("opens and closes all of them at once", () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: en.results.expandAll }));
    for (const n of [1, 2, 3, 4]) expect(roundHeader(n).getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: en.results.collapseAll }));
    for (const n of [1, 2, 3, 4]) expect(roundHeader(n).getAttribute("aria-expanded")).toBe("false");
  });

  /* A round with no pairings has nothing to show, so it says what it is
     waiting for instead of opening onto an empty table. */
  it("explains an unpublished round rather than showing an empty table", () => {
    renderTable();
    fireEvent.click(roundHeader(4));
    expect(screen.getByText(/Pairings for round 4 are calculated in Swiss-Manager/)).toBeDefined();
  });
});

describe("the boards themselves", () => {
  it("prints the arbiter's own result text", () => {
    renderTable();
    fireEvent.click(roundHeader(1));
    expect(screen.getAllByText("1 - 0").length).toBeGreaterThan(0);
    expect(screen.getAllByText("½ - ½").length).toBeGreaterThan(0);
  });

  /* An unplayed board is not a nil-nil draw. It has no result and says so. */
  it("says vs on a board that has not been played", () => {
    renderTable();
    expect(screen.getAllByText(en.results.versus).length).toBe(1);
  });

  /* The club is on the ranking page and the rating is on the pairing page;
     a row needs both to identify a player across a hall of them. */
  it("joins each name to its club from the ranking page", () => {
    renderTable();
    fireEvent.click(roundHeader(1));
    expect(screen.getAllByText(/2460 · Wellington College Intl/).length).toBeGreaterThan(0);
  });
});

describe("narrowing the table to one player", () => {
  const search = () => screen.getByLabelText(en.results.searchPlayer);

  it("filters the boards to the ones that player sits at", () => {
    renderTable();
    fireEvent.change(search(), { target: { value: "Stancec" } });

    /* Round 1 has two boards; only one of them is theirs. It is already open
       — searching opens the rounds that player played. */
    const panel = document.getElementById("round-1-panel")!;
    expect(within(panel).getAllByRole("row")).toHaveLength(2); // header + one board
    expect(within(panel).queryByText(/Ernst, Roman/)).toBeNull();
  });

  /* Typing has to behave like clicking a name. It did not: the rounds kept
     the default set, so a search for a child left their earlier rounds shut
     and the filter read as having found nothing in them. */
  it("opens the rounds that player actually played", () => {
    renderTable();
    expect(roundHeader(1).getAttribute("aria-expanded")).toBe("false");
    fireEvent.change(search(), { target: { value: "Stancec" } });
    for (const n of [1, 2, 3]) expect(roundHeader(n).getAttribute("aria-expanded")).toBe("true");
    /* Round 4 is not one of theirs — nothing to open. */
    expect(roundHeader(4).getAttribute("aria-expanded")).toBe("false");
  });

  /* The heading counts stay true of the round, not of what survived the
     filter — "2 boards" is a fact about round 1. */
  it("leaves the round's own counts alone", () => {
    renderTable();
    fireEvent.change(search(), { target: { value: "Stancec" } });
    expect(roundHeader(1).textContent).toContain("2 boards");
  });

  it("says what it is filtered by and how much is showing", () => {
    renderTable();
    fireEvent.change(search(), { target: { value: "Stancec" } });
    expect(screen.getByText("Stancec, Nikolaus (2460)")).toBeDefined();
    expect(screen.getByText("Showing 3 matches")).toBeDefined();
    expect(screen.getByText(/Category: U14/)).toBeDefined();
  });

  it("puts the whole table back when the filter is reset", () => {
    renderTable();
    fireEvent.change(search(), { target: { value: "Stancec" } });
    fireEvent.click(screen.getByRole("button", { name: /Reset filter/ }));
    expect(screen.queryByText("Showing 3 matches")).toBeNull();
    fireEvent.click(roundHeader(1));
    expect(within(document.getElementById("round-1-panel")!).getAllByRole("row")).toHaveLength(3);
  });

  /* Two people called Chen is the ordinary case at a junior event. Guessing
     one of them would silently show the wrong child. */
  it("asks which one when several names match", () => {
    renderTable();
    fireEvent.change(search(), { target: { value: "an" } });
    expect(screen.getByText(/players match/)).toBeDefined();
    expect(screen.queryByText(en.results.roundResults)).toBeNull();
  });

  it("says so when nobody matches", () => {
    renderTable();
    fireEvent.change(search(), { target: { value: "Zzz" } });
    expect(screen.getByText(/No player on these boards matches/)).toBeDefined();
  });
});

describe("one player's own card", () => {
  function openPlayer() {
    renderTable();
    fireEvent.change(screen.getByLabelText(en.results.searchPlayer), { target: { value: "Stancec" } });
  }

  /* 1 + ½ = 1½ over two played rounds; the third is paired but unplayed and
     must not count as a loss. */
  it("adds their games up", () => {
    openPlayer();
    expect(screen.getByText("1½")).toBeDefined();
    expect(screen.getByText("1–1–0")).toBeDefined();
  });

  /* The rank comes off the ranking page rather than being counted here: the
     tie-breaks that separate two players on the same score are the arbiter's. */
  it("takes the standing from the published ranking", () => {
    openPlayer();
    expect(screen.getByText("#3")).toBeDefined();
  });

  it("lists every round with the colour they had", () => {
    openPlayer();
    expect(screen.getByText("vs Karasevych, Andrii")).toBeDefined();
    expect(screen.getByText("Board 1 · Black")).toBeDefined();
  });

  /* The one thing on the card that is not in the arbiter's tables, and the
     reason an organiser opens it mid-event. */
  it("shows who to ring for one of the academy's own", () => {
    openPlayer();
    expect(screen.getByText("Elena Stancec")).toBeDefined();
    expect(screen.getByText("+66 81 234 5678")).toBeDefined();
    expect(screen.getByText(en.results.academyStudent)).toBeDefined();
  });

  it("says which colour they have next", () => {
    openPlayer();
    expect(screen.getByText(en.results.whiteNext)).toBeDefined();
  });

  /* An outside player's family is not the academy's to show, and there is
     nothing to show it from. */
  it("shows no contact details for a player who is not ours", () => {
    renderTable();
    fireEvent.change(screen.getByLabelText(en.results.searchPlayer), { target: { value: "Ernst" } });
    expect(screen.queryByText(en.results.guardian)).toBeNull();
    expect(screen.queryByText(en.results.academyStudent)).toBeNull();
  });
});

describe("the standings race", () => {
  /** The race card, found by its heading — the board rows name the same
      players, so the chips are only findable inside it. */
  const raceCard = () => within(screen.getByText(en.results.raceTitle).closest("section")!);

  /* An addition above the rounds, never in place of them: the rounds are the
     record, and the race is one picture of it. */
  it("is drawn above the rounds once two rounds are played, with our student named", () => {
    renderTable();
    expect(raceCard().getByText(en.results.raceOursColoured, { exact: false })).toBeDefined();
    const chip = raceCard().getByRole("button", { name: /Stancec, Nikolaus/ });
    // A win in round 1 and a draw in round 2: 1½, first of the two in the group.
    expect(chip.textContent).toContain("1st");
    expect(chip.textContent).toContain("1½ pts");
    // The rounds are all still there under it.
    expect(roundHeader(1)).toBeDefined();
  });

  it("opens that player's event when their name is clicked", () => {
    renderTable();
    fireEvent.click(raceCard().getByRole("button", { name: /Stancec, Nikolaus/ }));
    expect(screen.getByText(en.results.filteredBy)).toBeDefined();
  });

  /* Remembered through `useShown`, which writes localStorage in a browser; the
     assertion here is the behaviour, a fresh render keeping the choice. */
  it("can be switched off, and stays off until switched back on", () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: en.results.raceHide }));
    expect(screen.queryByText(en.results.raceTitle)).toBeNull();

    cleanup();
    renderTable();
    expect(screen.queryByText(en.results.raceTitle)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: en.results.raceShow }));
    expect(screen.getByText(en.results.raceTitle)).toBeDefined();
  });

  it("is not offered before two rounds have results", () => {
    renderTable([ROUNDS[0], ROUNDS[2]]);
    expect(screen.queryByText(en.results.raceTitle)).toBeNull();
    expect(screen.queryByRole("button", { name: en.results.raceHide })).toBeNull();
    expect(screen.queryByRole("button", { name: en.results.raceShow })).toBeNull();
  });
});
