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
import { fireEvent, render, screen, within } from "@testing-library/react";
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
  it("starts with every round collapsed", () => {
    renderTable();
    for (const n of [1, 2, 3, 4]) expect(roundHeader(n).getAttribute("aria-expanded")).toBe("false");
  });

  it("no longer says Click to expand", () => {
    renderTable();
    expect(screen.queryByText(en.results.clickToExpand)).toBeNull();
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
    fireEvent.click(screen.getByRole("button", { name: en.results.expandAll }));
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

/* The player's profile is the shared participant drawer now
   (ParticipantProfile.test.tsx); the table's part is to ask for it. */
describe("clicking a player", () => {
  it("asks for that player's profile, and narrows the boards to them", () => {
    const onOpenPlayer = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ResultsTable rounds={ROUNDS} standings={STANDINGS} totalRounds={4} eventName="E" categoryName="U14" onOpenPlayer={onOpenPlayer} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(roundHeader(1));
    fireEvent.click(within(document.getElementById("round-1-panel")!).getByText(/Ernst, Roman/));
    expect(onOpenPlayer).toHaveBeenCalledWith("Ernst, Roman");
    expect(screen.getByText("Showing 3 matches")).toBeDefined();
  });

  /* Typing narrows the boards but does not throw a drawer over them. */
  it("does not open a profile from typing alone", () => {
    const onOpenPlayer = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ResultsTable rounds={ROUNDS} standings={STANDINGS} totalRounds={4} eventName="E" onOpenPlayer={onOpenPlayer} />
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByLabelText(en.results.searchPlayer), { target: { value: "Stancec" } });
    expect(onOpenPlayer).not.toHaveBeenCalled();
  });
});

/* The second view: every round side by side, the list kept as it was. */
describe("the columns view", () => {
  function columns(rounds = ROUNDS, onOpenPlayer = vi.fn()) {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ResultsTable rounds={rounds} standings={STANDINGS} totalRounds={4} eventName="E" onOpenPlayer={onOpenPlayer} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: en.view.columns }));
    return { strip: within(screen.getByRole("region", { name: en.results.columnsRegion })), onOpenPlayer };
  }

  it("shows every round at once, next to the list it switches from", () => {
    expect(screen.queryByRole("region", { name: en.results.columnsRegion })).toBeNull();
    const { strip } = columns();
    for (const n of [1, 2, 3]) expect(strip.getByRole("region", { name: `Round ${n}` })).toBeDefined();
    expect(strip.queryByRole("region", { name: "Round 4" })).toBeNull(); // not paired yet
    expect(within(strip.getByRole("region", { name: "Round 1" })).getByText("2 games")).toBeDefined();
    // Back to the list, which is untouched.
    fireEvent.click(screen.getByRole("button", { name: en.view.list }));
    expect(screen.queryByRole("region", { name: en.results.columnsRegion })).toBeNull();
    expect(screen.getByRole("button", { name: en.results.expandAll })).toBeDefined();
  });

  it("opens a player's profile from any column", () => {
    const { strip, onOpenPlayer } = columns();
    fireEvent.click(within(strip.getByRole("region", { name: "Round 2" })).getByRole("button", { name: "Leisch, Lukas" }));
    expect(onOpenPlayer).toHaveBeenCalledWith("Leisch, Lukas");
  });

  it("folds long rounds to eight boards, and one button shows them all", () => {
    const many: LinkedRound[] = [
      {
        round: 1,
        played: true,
        pairings: Array.from({ length: 12 }, (_, i) => ({ board: i + 1, white: `White${i + 1}, A`, black: `Black${i + 1}, B`, result: "1 - 0" })),
      },
    ];
    const { strip } = columns(many);
    const round = within(strip.getByRole("region", { name: "Round 1" }));
    expect(round.queryByRole("button", { name: "White9, A" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: en.results.colShowAllGames }));
    expect(round.getByRole("button", { name: "White12, A" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: en.results.colShowFewer }));
    expect(round.queryByRole("button", { name: "White12, A" })).toBeNull();
  });
});

describe("the columns view, before every round is paired", () => {
  it("gives no column to a round with nothing in it yet", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ResultsTable rounds={ROUNDS} standings={STANDINGS} totalRounds={5} eventName="E" />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: en.view.columns }));
    const strip = within(screen.getByRole("region", { name: en.results.columnsRegion }));
    // Rounds 1–3 are paired; 4 and 5 are only scheduled.
    expect(strip.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual(["Round 1", "Round 2", "Round 3"]);
  });
});

describe("a column's names and what is folded away", () => {
  const many: LinkedRound[] = [
    {
      round: 1,
      played: true,
      pairings: Array.from({ length: 12 }, (_, i) => ({ board: i + 1, white: i === 0 ? "Liu, Xi Feng" : `White${i + 1}, A`, black: `Black${i + 1}, B`, result: "1 - 0" })),
    },
  ];
  function open() {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ResultsTable rounds={many} standings={STANDINGS} totalRounds={1} eventName="E" />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: en.view.columns }));
    return within(screen.getByRole("region", { name: "Round 1" }));
  }

  it("shows both parts of a name, the second smaller underneath", () => {
    const liu = open().getByRole("button", { name: "Liu, Xi Feng" });
    expect(within(liu).getByText("Liu")).toBeDefined();
    expect(within(liu).getByText("Xi Feng")).toBeDefined();
  });

  it("says how many games are folded below, and opens them", () => {
    const round = open();
    fireEvent.click(round.getByRole("button", { name: /\+4 more games/ }));
    expect(round.getByRole("button", { name: "White12, A" })).toBeDefined();
    expect(round.queryByRole("button", { name: /more games/ })).toBeNull();
  });
});
