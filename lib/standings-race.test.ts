/**
 * The standings race is a ranking the console works out itself — chess-results
 * only publishes the current one — so what is tested is the working out: points
 * added up round by round from the arbiter's own result strings, a shared score
 * as a shared place, and nothing charted before its results are in.
 */
import { describe, expect, it } from "vitest";
import type { LinkedPairing, LinkedRound } from "./chess-results";
import { roundViews } from "./tournament-rounds";
import { standingsRace } from "./standings-race";

const board = (n: number, white: string, black: string, result = "", extra: Partial<LinkedPairing> = {}): LinkedPairing => ({
  board: n,
  white,
  black,
  result,
  ...extra,
});

const round = (n: number, played: boolean, pairings: LinkedPairing[]): LinkedRound => ({ round: n, played, pairings });

const row = (race: ReturnType<typeof standingsRace>, name: string) => {
  const found = race.rows.find((r) => r.name === name);
  if (!found) throw new Error(`${name} is not in the race`);
  return found;
};

describe("the standings race", () => {
  it("ranks by points after each round, and a shared score is a shared place", () => {
    const race = standingsRace(
      roundViews([
        round(1, true, [board(1, "Ann", "Bea", "1 - 0"), board(2, "Cat", "Dee", "½ - ½")]),
        round(2, true, [board(1, "Cat", "Ann", "1 - 0"), board(2, "Bea", "Dee", "0 - 1")]),
      ]),
    );

    expect(race.rounds).toEqual([1, 2]);
    expect(race.field).toBe(4);
    // After round 1: Ann 1, Cat ½, Dee ½, Bea 0.
    expect(row(race, "Ann").positions[0]).toBe(1);
    expect(row(race, "Cat").positions[0]).toBe(2);
    expect(row(race, "Dee").positions[0]).toBe(2);
    expect(row(race, "Cat").tied[0]).toBe(true);
    expect(row(race, "Bea").positions[0]).toBe(4);
    // After round 2: Cat 1½, Dee 1½, Ann 1, Bea 0.
    expect(row(race, "Cat").points).toEqual([0.5, 1.5]);
    expect(row(race, "Cat").positions[1]).toBe(1);
    expect(row(race, "Dee").positions[1]).toBe(1);
    expect(row(race, "Ann").positions[1]).toBe(3);
    expect(row(race, "Ann").tied[1]).toBe(false);
    // Ordered by the latest position, then by name.
    expect(race.rows.map((r) => r.name)).toEqual(["Cat", "Dee", "Ann", "Bea"]);
  });

  it("scores a forfeit and a bye the way the arbiter printed them", () => {
    const race = standingsRace(
      roundViews([
        round(1, true, [board(1, "Ann", "Bea", "+ - -"), board(2, "Cat", "", "1")]),
        round(2, true, [board(1, "Bea", "Cat", "- - +"), board(2, "Ann", "", "½")]),
      ]),
    );
    expect(row(race, "Ann").points).toEqual([1, 1.5]);
    expect(row(race, "Cat").points).toEqual([1, 2]);
    expect(row(race, "Bea").points).toEqual([0, 0]);
  });

  it("does not chart a round that is only paired", () => {
    const race = standingsRace(
      roundViews(
        [
          round(1, true, [board(1, "Ann", "Bea", "1 - 0")]),
          round(2, false, [board(1, "Bea", "Ann")]),
        ],
        5,
      ),
    );
    expect(race.rounds).toEqual([1]);
    expect(row(race, "Ann").positions).toEqual([1]);
  });

  it("keeps a player's points through a round they missed", () => {
    const race = standingsRace(
      roundViews([
        round(1, true, [board(1, "Ann", "Bea", "1 - 0"), board(2, "Cat", "Dee", "1 - 0")]),
        round(2, true, [board(1, "Cat", "Bea", "1 - 0")]),
      ]),
    );
    expect(row(race, "Ann").points).toEqual([1, 1]);
    expect(row(race, "Dee").points).toEqual([0, 0]);
    expect(row(race, "Cat").positions).toEqual([1, 1]);
    expect(row(race, "Ann").positions).toEqual([1, 2]);
  });

  it("marks the academy's own players from the mirrored boards", () => {
    const race = standingsRace(
      roundViews([round(1, true, [board(1, "Ann", "Bea", "0 - 1", { blackStudentId: "stu_bea" })])]),
    );
    expect(row(race, "Bea").studentId).toBe("stu_bea");
    expect(row(race, "Ann").studentId).toBeUndefined();
  });

  it("ranks only one group's players when the screen is one group", () => {
    const race = standingsRace(
      roundViews([
        round(1, true, [board(1, "Ann", "Zed", "1 - 0"), board(2, "Bea", "Cat", "½ - ½")]),
      ]),
      ["Ann", "Bea", "Cat"],
    );
    expect(race.rows.map((r) => r.name)).toEqual(["Ann", "Bea", "Cat"]);
    expect(race.field).toBe(3);
    // Ann's point against a player from another group still counts.
    expect(row(race, "Ann").points).toEqual([1]);
  });

  it("is empty before any round has a result", () => {
    const race = standingsRace(roundViews([round(1, false, [board(1, "Ann", "Bea")])], 5));
    expect(race.rounds).toEqual([]);
    expect(race.rows).toEqual([]);
  });
});
