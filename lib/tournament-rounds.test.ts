/**
 * The Results table is a reading of the arbiter's pages, so what is tested
 * here is the reading: a result string scored the way chess-results meant it,
 * a round's state inferred from how it arrived, and a player's totals adding
 * back up to the boards they came from.
 *
 * The result strings carry the weight. They are the arbiter's own text and
 * come in shapes a naive split gets wrong in silence — "+ - -" is a forfeit,
 * not four empty halves — and a mis-scored board does not throw, it just
 * quietly puts the wrong player on top.
 */
import { describe, expect, it } from "vitest";
import type { LinkedPairing, LinkedRound } from "./chess-results";
import {
  gamesFor,
  groupsIn,
  initialsOf,
  matchPlayers,
  progression,
  recordOf,
  roundViews,
  roundsForPlayer,
  roundsInGroup,
  scoresOf,
  standingsInGroup,
} from "./tournament-rounds";

const board = (n: number, white: string, black: string, result = ""): LinkedPairing => ({
  board: n,
  white,
  black,
  result,
});

const round = (n: number, played: boolean, pairings: LinkedPairing[]): LinkedRound => ({
  round: n,
  played,
  pairings,
});

describe("scoring a result as the arbiter printed it", () => {
  it("scores the ordinary three", () => {
    expect(scoresOf("1 - 0")).toEqual({ white: 1, black: 0 });
    expect(scoresOf("0 - 1")).toEqual({ white: 0, black: 1 });
    expect(scoresOf("½ - ½")).toEqual({ white: 0.5, black: 0.5 });
  });

  /* The trap this file exists for: a dash is both the separator and a token,
     so splitting on every dash turns a forfeit into nonsense. */
  it("scores a forfeit without mistaking the dash for the separator", () => {
    expect(scoresOf("+ - -")).toEqual({ white: 1, black: 0 });
    expect(scoresOf("- - +")).toEqual({ white: 0, black: 1 });
    expect(scoresOf("- - -")).toEqual({ white: 0, black: 0 });
  });

  it("scores the spaceless form", () => {
    expect(scoresOf("1-0")).toEqual({ white: 1, black: 0 });
    expect(scoresOf("½-½")).toEqual({ white: 0.5, black: 0.5 });
  });

  /* One number because there is one player. It is white's, because white is
     the seat the site fills on a bye row. */
  it("scores a bye to the only player on the board", () => {
    expect(scoresOf("1")).toEqual({ white: 1, black: null });
  });

  /* An unplayed board and a lost one are different answers, and the table
     draws them differently. Null must not collapse to zero. */
  it("leaves an unplayed board unscored", () => {
    expect(scoresOf("")).toEqual({ white: null, black: null });
    expect(scoresOf(undefined)).toEqual({ white: null, black: null });
    expect(scoresOf("   ")).toEqual({ white: null, black: null });
  });

  /* Better to show a board as unplayed than to score it from a string we do
     not recognise. A wrong number is worse than a missing one. */
  it("refuses a result it does not recognise", () => {
    expect(scoresOf("adjourned")).toEqual({ white: null, black: null });
    expect(scoresOf("2 - 0")).toEqual({ white: null, black: null });
  });
});

describe("what state a round is in", () => {
  const rounds = [
    round(1, true, [board(1, "A", "B", "1 - 0")]),
    round(2, true, [board(1, "A", "C", "½ - ½")]),
    round(3, false, [board(1, "A", "D")]),
  ];

  it("reads completed, paired and not-yet-paired apart", () => {
    const views = roundViews(rounds, 5);
    expect(views.map((v) => v.state)).toEqual([
      "completed",
      "completed",
      "pairings",
      "scheduled",
      "scheduled",
    ]);
  });

  /* The mirror has no page for a round the site has not published, so an event
     three rounds into five looks finished from outside. The declared total is
     the only thing that says otherwise. */
  it("pads out to the tournament's own round count", () => {
    expect(roundViews(rounds, 5).map((v) => v.round)).toEqual([1, 2, 3, 4, 5]);
    expect(roundViews(rounds, 5).at(-1)).toMatchObject({ round: 5, final: true, boards: 0 });
  });

  /* The organiser's number is a plan; the arbiter's pages are what happened. */
  it("keeps a mirrored round the declared total does not allow for", () => {
    const views = roundViews(rounds, 2);
    expect(views.map((v) => v.round)).toEqual([1, 2, 3]);
    expect(views.at(-1)!.final).toBe(true);
  });

  it("marks exactly one round as the latest completed one", () => {
    const views = roundViews(rounds, 5);
    expect(views.filter((v) => v.latest).map((v) => v.round)).toEqual([2]);
  });

  it("counts boards and the games finished on them", () => {
    const views = roundViews(
      [round(1, true, [board(1, "A", "B", "1 - 0"), board(2, "C", "D")])],
      1,
    );
    expect(views[0]).toMatchObject({ boards: 2, finished: 1 });
  });

  it("has no latest round before anything is played", () => {
    expect(roundViews([round(1, false, [board(1, "A", "B")])], 3).some((v) => v.latest)).toBe(false);
  });
});

describe("one player's games", () => {
  const rounds = roundViews(
    [
      round(1, true, [board(1, "Stancec, Nikolaus", "Karasevych, Andrii", "1 - 0")]),
      round(2, true, [board(3, "Leisch, Lukas", "Stancec, Nikolaus", "½ - ½")]),
      round(3, true, [board(1, "Stancec, Nikolaus", "", "1")]),
      round(4, false, [board(1, "Stancec, Nikolaus", "Radnaev, Lubsan")]),
    ],
    4,
  );
  const games = gamesFor("Stancec, Nikolaus", rounds);

  it("finds them on either side of the board", () => {
    expect(games.map((g) => g.side)).toEqual(["white", "black", "white", "white"]);
  });

  /* Black's score is the other half of the same string — the half a
     white-only reading throws away. */
  it("scores a game from that player's side", () => {
    expect(games.map((g) => g.score)).toEqual([1, 0.5, 1, null]);
  });

  it("names the opponent, whichever seat the player is in", () => {
    expect(games[0].opponent).toBe("Karasevych, Andrii");
    expect(games[1].opponent).toBe("Leisch, Lukas");
  });

  it("calls a board with no opponent a bye", () => {
    expect(games[2]).toMatchObject({ bye: true, opponent: "", score: 1 });
    expect(games[0].bye).toBe(false);
  });

  it("is case- and spacing-insensitive about the name", () => {
    expect(gamesFor("stancec,  nikolaus", rounds)).toHaveLength(4);
  });

  /* An unplayed round is not a loss. Counting it as one would show a player
     mid-event as though they had already dropped those games. */
  it("adds up only the games that were played", () => {
    expect(recordOf(games)).toEqual({
      played: 3,
      wins: 2,
      draws: 1,
      losses: 0,
      points: 2.5,
      rate: 2.5 / 3,
    });
  });

  /* Reaches the screen as "NaN%" otherwise. */
  it("rates a player with nothing played at zero, not NaN", () => {
    expect(recordOf([]).rate).toBe(0);
  });

  it("runs the score up round by round", () => {
    expect(progression(games)).toEqual([1, 1.5, 2.5]);
  });
});

describe("filtering the table to one player", () => {
  const rounds = roundViews(
    [
      round(1, true, [board(1, "Stancec, Nikolaus", "Ernst, Roman", "1 - 0"), board(2, "Gold, Toby", "Kim, David", "0 - 1")]),
      round(2, true, [board(1, "Gold, Toby", "Ernst, Roman", "½ - ½")]),
    ],
    2,
  );

  it("keeps only the boards that player sits at", () => {
    const filtered = roundsForPlayer("Stancec, Nikolaus", rounds);
    expect(filtered[0].pairings.map((p) => p.board)).toEqual([1]);
  });

  /* The rounds they are not in stay, empty. Dropping them would renumber the
     event around one player — "Round 1, Round 3" reads as a missing round. */
  it("keeps the rounds that player is absent from", () => {
    const filtered = roundsForPlayer("Stancec, Nikolaus", rounds);
    expect(filtered.map((r) => r.round)).toEqual([1, 2]);
    expect(filtered[1].pairings).toEqual([]);
  });

  it("matches players on any part of the name", () => {
    expect(matchPlayers("stancec", rounds)).toEqual(["Stancec, Nikolaus"]);
    /* A first name, not just a surname — the site prints both in one cell. */
    expect(matchPlayers("roman", rounds)).toEqual(["Ernst, Roman"]);
    expect(matchPlayers("gol", rounds)).toEqual(["Gold, Toby"]);
  });

  /* The table is already showing everything; "all 32 matched" is not a
     filter, and it would open the panel on an arbitrary player. */
  it("matches nobody on an empty query", () => {
    expect(matchPlayers("", rounds)).toEqual([]);
    expect(matchPlayers("  ", rounds)).toEqual([]);
  });

  /* Withdrawn after round one: off the standings, still on the boards we
     mirrored, and a search for them should still find those. */
  it("finds a player who is on a board but not in the standings", () => {
    expect(matchPlayers("kim", rounds)).toEqual(["Kim, David"]);
  });
});

describe("initials for the avatar", () => {
  /* Swiss-Manager prints surname first. Read the comma or the same player
     gets different initials depending which page named them. */
  it("reads the surname-first form the site uses", () => {
    expect(initialsOf("Stancec, Nikolaus")).toBe("NS");
    expect(initialsOf("Nikolaus Stancec")).toBe("NS");
  });

  it("copes with one name and with none", () => {
    expect(initialsOf("Magnus")).toBe("M");
    expect(initialsOf("  ")).toBe("?");
  });
});

/**
 * An age-group event published as ONE chess-results tournament.
 *
 * The other shape — a separate tournament per group, each with its own link —
 * is divided by linking. This one cannot be: there is a single link, and the
 * only thing telling U14 from G14 is the ranking table's "Typ" column. These
 * are the functions that divide it by reading, and the fixture is the shape of
 * the real tnr1193905, where the two groups share a pairing pool.
 */
describe("dividing one event by the groups it names", () => {
  const standings = [
    { rank: 1, name: "Uapongkitikul, Pavatt", points: 6, type: "U14" },
    { rank: 2, name: "Udomjitpithaya, Kritthad", points: 5, type: "U14" },
    { rank: 4, name: "Manasompong, Napak", points: 4, type: "G14" },
    { rank: 7, name: "Seng, Rosslyn", points: 3, type: "G14" },
  ];

  it("finds the groups in the order the ranking introduces them", () => {
    expect(groupsIn(standings)).toEqual(["U14", "G14"]);
  });

  /* Most events have no Typ column, and an empty string is not a group — a tab
     strip built from one would show a nameless tab beside "Whole event". */
  it("finds no groups in an event that names none", () => {
    expect(groupsIn([{ rank: 1, name: "Solo", points: 1 }])).toEqual([]);
    expect(groupsIn([{ rank: 1, name: "Solo", points: 1, type: "  " }])).toEqual([]);
  });

  /* The ranks stay the arbiter's. Renumbering the group 1..n would read
     better and would be the console inventing a placing. */
  it("keeps the published ranks when filtering to a group", () => {
    expect(standingsInGroup("G14", standings).map((r) => [r.name, r.rank])).toEqual([
      ["Manasompong, Napak", 4],
      ["Seng, Rosslyn", 7],
    ]);
  });

  describe("and the boards they played", () => {
    /* One pairing pool: in WCIB's round one a G14 played a U14. */
    const rounds: LinkedRound[] = [
      round(1, true, [
        board(1, "Seng, Rosslyn", "Uapongkitikul, Pavatt", "0 - 1"),
        board(2, "Udomjitpithaya, Kritthad", "Manasompong, Napak", "1 - 0"),
      ]),
      round(2, true, [board(1, "Uapongkitikul, Pavatt", "Udomjitpithaya, Kritthad", "1 - 0")]),
    ];

    /* Either seat, not both. A cross-group game is a game to both players, and
       requiring both to match would hide most of a child's event from the tab
       that is meant to be about them. */
    it("keeps a board when either side is in the group", () => {
      const g14 = roundsInGroup("G14", standings, rounds);
      expect(g14[0].pairings.map((p) => p.board)).toEqual([1, 2]);
    });

    it("drops a board neither side is in", () => {
      const g14 = roundsInGroup("G14", standings, rounds);
      expect(g14[1].pairings).toEqual([]);
    });

    /* Dropping the empty round would renumber the event around one group —
       "Round 1, Round 3" reads as a round having gone missing. */
    it("keeps a round the group did not play in", () => {
      expect(roundsInGroup("G14", standings, rounds).map((r) => r.round)).toEqual([1, 2]);
    });

    it("leaves the other group's own boards alone", () => {
      const u14 = roundsInGroup("U14", standings, rounds);
      expect(u14.flatMap((r) => r.pairings).length).toBe(3);
    });
  });
});
