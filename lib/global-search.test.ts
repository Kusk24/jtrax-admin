/**
 * The header search's ranking and routing.
 *
 * The tests pin what a person at the desk relies on: a name's start beats a
 * substring, a student is findable by the ID on their card, every hit carries
 * the route that opens the exact record, and one stray letter doesn't dump
 * the whole academy into the dropdown.
 */
import { describe, expect, it } from "vitest";
import { globalSearch, matchRank } from "./global-search";

const POOLS = {
  students: [
    { id: "stu_penny", name: "Penny", className: "Beginner" },
    { id: "stu_uri", name: "Uri", className: "Intermediate" },
    { id: "stu_openmind", name: "Openmind", className: "Beginner" },
  ],
  parents: [{ id: "par_sandy", name: "Sandy Jones", phone: "+66 12 345 6789" }],
  classes: [{ id: "cls_beg", name: "Beginner Chess (Sec 101)", category: "Group" }],
  tournaments: [{ id: "t_open", name: "JCA Open 2026", date: "2026-10-04" }],
};

describe("matchRank", () => {
  it("prefers the start of the text, then a word start, then anywhere", () => {
    expect(matchRank("Penny", "pen")).toBe(0);
    expect(matchRank("JCA Open 2026", "open")).toBe(1);
    expect(matchRank("Openmind", "pen")).toBe(2);
    expect(matchRank("Uri", "pen")).toBeNull();
  });
});

describe("globalSearch", () => {
  it("needs two characters — one keystroke is not a question yet", () => {
    expect(globalSearch("p", POOLS)).toEqual([]);
    expect(globalSearch("  ", POOLS)).toEqual([]);
  });

  it("groups hits by kind and ranks the name-start first", () => {
    const hits = globalSearch("pen", POOLS);
    expect(hits.map((h) => h.title)).toEqual(["Penny", "Openmind", "JCA Open 2026"]);
    expect(hits[0].href).toBe("/students?id=stu_penny");
  });

  it("finds a student by the ID on their card", () => {
    const hits = globalSearch("stu_uri", POOLS);
    expect(hits).toHaveLength(1);
    expect(hits[0].title).toBe("Uri");
  });

  it("routes each kind to the screen that opens it", () => {
    expect(globalSearch("sandy", POOLS)[0].href).toBe("/parents?id=par_sandy");
    expect(globalSearch("jca open", POOLS)[0].href).toBe("/tournament?id=t_open");
    expect(globalSearch("beginner chess", POOLS)[0].href).toBe("/academy");
  });

  it("caps each kind so a common letter cannot flood the list", () => {
    const many = {
      ...POOLS,
      students: Array.from({ length: 12 }, (_, i) => ({ id: `stu_${i}`, name: `Anna ${i}` })),
    };
    expect(globalSearch("anna", many).filter((h) => h.kind === "student")).toHaveLength(5);
  });
});
