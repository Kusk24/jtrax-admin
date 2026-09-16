/**
 * Splitting the arbiter's standings into the academy's own sections.
 *
 * chess-results.com has no idea what JTrax calls its categories, so a section
 * cannot come from the standings row — it comes from the entrant that row
 * belongs to. Which makes the join the whole feature, and the join is by name
 * for anybody who is not one of our students.
 *
 * The failure this guards against is quiet: a matcher that is slightly too
 * strict does not throw, it drops everybody into "Not in a section" and the
 * tabs look real while being empty.
 */
import { describe, expect, it } from "vitest";
import { groupStandingsByCategory } from "./tournament-results";

const CATEGORIES = [
  { id: "c_u8", name: "U8 Boys" },
  { id: "c_u12", name: "U12 Girls" },
];

const UNPLACED = "Not in a section";

const group = (
  standings: Array<{ name: string; studentId?: string }>,
  entrants: Array<{ name: string; studentId?: string; categoryId?: string }>,
  categories = CATEGORIES,
) => groupStandingsByCategory(standings, entrants, categories, UNPLACED);

/** The sections, in order, as `name: [rows]`. */
const shape = (groups: ReturnType<typeof group>) =>
  groups.map((g) => [g.name, g.rows.map((r) => r.name)] as const);

describe("placing a standing in a section", () => {
  it("matches one of ours by student id", () => {
    const groups = group(
      [{ name: "Penny Tan", studentId: "stu_penny" }],
      [{ name: "Anything Else", studentId: "stu_penny", categoryId: "c_u8" }],
    );
    expect(shape(groups)).toEqual([["U8 Boys", ["Penny Tan"]], ["U12 Girls", []]]);
  });

  /* The id wins: the arbiter's spelling of a name is not authoritative about
     which child it is when the backend has already recognised them. */
  it("prefers the student id over a name that says otherwise", () => {
    const groups = group(
      [{ name: "Penny Tan", studentId: "stu_penny" }],
      [
        { name: "Penny Tan", categoryId: "c_u12" },
        { name: "Someone", studentId: "stu_penny", categoryId: "c_u8" },
      ],
    );
    expect(shape(groups)).toEqual([["U8 Boys", ["Penny Tan"]], ["U12 Girls", []]]);
  });

  it("falls back to the name for somebody we have no student record for", () => {
    const groups = group(
      [{ name: "Mali Chai" }],
      [{ name: "Mali Chai", categoryId: "c_u12" }],
    );
    expect(shape(groups)).toEqual([["U8 Boys", []], ["U12 Girls", ["Mali Chai"]]]);
  });
});

/* How chess-results actually prints a name versus how the console holds it.
   The comma is the one that matters: without handling it a Thai entrant
   matched nothing and every row fell into Unplaced. */
describe("matching the arbiter's spelling of a name", () => {
  for (const [printed, held] of [
    ["Somchai, Jaidee", "Somchai Jaidee"],
    ["SOMCHAI JAIDEE", "Somchai Jaidee"],
    ["Somchai  Jaidee", "Somchai Jaidee"],
    ["  Somchai Jaidee  ", "Somchai Jaidee"],
  ] as const) {
    it(`matches ${JSON.stringify(printed)} to ${JSON.stringify(held)}`, () => {
      const groups = group([{ name: printed }], [{ name: held, categoryId: "c_u8" }]);
      expect(groups[0].rows.map((r) => r.name)).toEqual([printed]);
    });
  }

  it("does not match two different people", () => {
    const groups = group([{ name: "Somchai Jaidee" }], [{ name: "Somchai Prasert", categoryId: "c_u8" }]);
    expect(shape(groups)).toEqual([
      ["U8 Boys", []], ["U12 Girls", []], [UNPLACED, ["Somchai Jaidee"]],
    ]);
  });
});

describe("rows that belong to no section", () => {
  /* An open event is mostly people the academy has never met. Dropping them
     would turn "the results" into "the results for our pupils" silently. */
  it("keeps a stranger rather than dropping them", () => {
    const groups = group([{ name: "A Visitor" }], []);
    expect(shape(groups)).toEqual([
      ["U8 Boys", []], ["U12 Girls", []], [UNPLACED, ["A Visitor"]],
    ]);
  });

  it("keeps an entrant we know but never put in a section", () => {
    const groups = group([{ name: "Mali Chai" }], [{ name: "Mali Chai" }]);
    expect(groups.at(-1)).toMatchObject({ id: null, rows: [{ name: "Mali Chai" }] });
  });

  /* Unlike the real categories this one is a leftover, not a section of the
     tournament — an always-present empty "Not in a section" would read as a
     section nobody entered. */
  it("does not offer the leftover section when there is no leftover", () => {
    const groups = group([{ name: "Mali" }], [{ name: "Mali", categoryId: "c_u8" }]);
    expect(groups.map((g) => g.name)).toEqual(["U8 Boys", "U12 Girls"]);
  });
});

describe("the sections themselves", () => {
  /* A tab that vanishes when nobody in it has a result yet is a tab that comes
     and goes while the arbiter uploads rounds. */
  it("keeps a category with nothing in it", () => {
    const groups = group([{ name: "Mali" }], [{ name: "Mali", categoryId: "c_u8" }]);
    expect(groups.find((g) => g.name === "U12 Girls")?.rows).toEqual([]);
  });

  it("keeps the organiser's order", () => {
    const groups = group([], []);
    expect(groups.map((g) => g.name)).toEqual(["U8 Boys", "U12 Girls"]);
  });

  it("returns nothing to tab when the event has no categories", () => {
    // The caller uses length > 1 to decide whether to draw tabs at all.
    expect(group([{ name: "Solo" }], [], [])).toHaveLength(1);
  });

  it("preserves the order the arbiter ranked people in", () => {
    const groups = group(
      [{ name: "First" }, { name: "Second" }, { name: "Third" }],
      [
        { name: "First", categoryId: "c_u8" },
        { name: "Second", categoryId: "c_u8" },
        { name: "Third", categoryId: "c_u8" },
      ],
    );
    expect(groups[0].rows.map((r) => r.name)).toEqual(["First", "Second", "Third"]);
  });
});
