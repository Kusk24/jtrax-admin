/**
 * Who a participant is on chess-results: one answer, used by both tabs.
 */
import { describe, expect, it } from "vitest";
import type { LinkedResults, ResultSection } from "./chess-results";
import type { Participant } from "./data";
import { matchParticipants, nameWords, participantForRow, unlinkedRows, type SectionResults } from "./participant-results";

const section = (id: number, name: string): ResultSection => ({
  chessResultsId: id, name, position: 0, url: "", players: 0, academyPlayers: 0, tracked: true,
});
const results = (id: number, names: Array<[string, string?]>): LinkedResults => ({
  source: "chess-results", url: "", chessResultsId: id,
  standings: names.map(([name, studentId], i) => ({ rank: i + 1, name, points: 0, studentId })),
});
const entry = (id: string, name: string, extra: Partial<Participant> = {}) => ({ id, name, ...extra }) as Participant;

const DATA: SectionResults[] = [
  { section: section(10, "U10 + G10"), results: results(10, [["Uapongkitikul, Pavatt"], ["Srisuk, Kittipong"], ["Chen, Wei"]]) },
  { section: section(12, "U12 + G12"), results: results(12, [["Chen, Wei"], ["Stancec, Nikolaus", "stu_n"]]) },
];

describe("matching an entry to its chess-results row", () => {
  it("reads a name the same in either order, with or without the comma", () => {
    expect(nameWords("Pavatt Uapongkitikul")).toBe(nameWords("Uapongkitikul, Pavatt"));
    expect(nameWords("  PAVATT   uapongkitikul ")).toBe(nameWords("Uapongkitikul, Pavatt"));
  });

  it("matches by name", () => {
    const m = matchParticipants([entry("r1", "Pavatt Uapongkitikul")], DATA);
    expect(m.get("r1")).toMatchObject({ sectionId: 10, sectionName: "U10 + G10", manual: false });
    expect(m.get("r1")!.standing.name).toBe("Uapongkitikul, Pavatt");
  });

  it("matches a JCA student by who they are, whatever the spelling", () => {
    const m = matchParticipants([entry("r1", "Niko Stancec", { studentId: "stu_n" })], DATA);
    expect(m.get("r1")!.standing.name).toBe("Stancec, Nikolaus");
  });

  /* Two Wei Chens: guessing would show one child the other's games. */
  it("does not guess when a name is on two rows", () => {
    expect(matchParticipants([entry("r1", "Wei Chen")], DATA).has("r1")).toBe(false);
  });

  it("leaves a different spelling for staff to pick", () => {
    expect(matchParticipants([entry("r1", "Kitipong Srisuk")], DATA).has("r1")).toBe(false);
  });

  it("follows a hand-picked link over the name", () => {
    const p = entry("r1", "Kitipong Srisuk", { resultsSectionId: 10, resultsPlayerName: "Srisuk, Kittipong" });
    expect(matchParticipants([p], DATA).get("r1")).toMatchObject({ manual: true, sectionId: 10 });
  });

  /* The event was re-connected and the picked section is gone: match again. */
  it("ignores a link to a section the event no longer has", () => {
    const p = entry("r1", "Pavatt Uapongkitikul", { resultsSectionId: 99, resultsPlayerName: "Someone" });
    expect(matchParticipants([p], DATA).get("r1")).toMatchObject({ manual: false, sectionId: 10 });
  });

  it("never gives one row to two entries", () => {
    const a = entry("r1", "Kitipong Srisuk", { resultsSectionId: 10, resultsPlayerName: "Srisuk, Kittipong" });
    const b = entry("r2", "Kittipong Srisuk");
    const m = matchParticipants([a, b], DATA);
    expect(m.get("r1")!.manual).toBe(true);
    expect(m.has("r2")).toBe(false);
  });

  it("finds the entry from the row, and offers only unclaimed rows to pick", () => {
    const people = [entry("r1", "Pavatt Uapongkitikul")];
    const m = matchParticipants(people, DATA);
    expect(participantForRow(m, people, 10, "Uapongkitikul, Pavatt")?.id).toBe("r1");
    expect(participantForRow(m, people, 12, "Chen, Wei")).toBeUndefined();
    const free = unlinkedRows(DATA, m).find((x) => x.section.chessResultsId === 10)!.players.map((p) => p.name);
    expect(free).toEqual(["Srisuk, Kittipong", "Chen, Wei"]);
  });
});
