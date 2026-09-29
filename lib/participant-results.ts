/**
 * One tournament participant, whichever tab they are opened from.
 *
 * A participant is their registration. Their results live on chess-results.com
 * under the name the arbiter typed into Swiss-Manager, so the two are joined
 * here — and only here, so the Participants tab and the Results tab can never
 * disagree about who a row is.
 *
 * In order:
 *   1. the chess-results player staff picked by hand, when the names differ;
 *   2. the same JCA student, which the backend has already recognised;
 *   3. the same name, ignoring order, commas and capitals — the entry form's
 *      "Pavatt Uapongkitikul" is chess-results' "Uapongkitikul, Pavatt".
 *
 * A guess is never made: a name that fits two rows, or a row that fits two
 * entries, is left unlinked for staff to pick.
 */
import type { ExternalStanding, LinkedResults, ResultSection } from "./chess-results";
import type { Participant } from "./data";

/** One results category with what was read from it. */
export type SectionResults = { section: ResultSection; results: LinkedResults };

/** Where a participant sits in the results. */
export type ResultMatch = {
  sectionId: number;
  sectionName: string;
  standing: ExternalStanding;
  results: LinkedResults;
  /** Picked by staff rather than matched by name. */
  manual: boolean;
};

/** A name as a set of words: order, punctuation and case do not count. */
export function nameWords(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,()'"-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

const rowKey = (sectionId: number, name: string) => `${sectionId}|${nameWords(name)}`;

type Row = { sectionId: number; sectionName: string; standing: ExternalStanding; results: LinkedResults };

function rowsOf(data: SectionResults[]): Row[] {
  return data.flatMap(({ section, results }) =>
    results.standings.map((standing) => ({
      sectionId: section.chessResultsId,
      sectionName: section.name,
      standing,
      results,
    })),
  );
}

/** Every participant that could be linked, by registration id. */
export function matchParticipants(participants: Participant[], data: SectionResults[]): Map<string, ResultMatch> {
  const rows = rowsOf(data);
  const out = new Map<string, ResultMatch>();
  const taken = new Set<string>();
  const link = (p: Participant, r: Row, manual: boolean) => {
    out.set(p.id!, { ...r, manual });
    taken.add(rowKey(r.sectionId, r.standing.name));
  };
  const withId = participants.filter((p) => p.id);

  // 1. Picked by hand. A pick pointing at a section or a name the event no
  //    longer has is ignored, and the entry falls back to matching.
  for (const p of withId) {
    if (!p.resultsSectionId || !p.resultsPlayerName) continue;
    const want = rowKey(p.resultsSectionId, p.resultsPlayerName);
    const r = rows.find((x) => rowKey(x.sectionId, x.standing.name) === want);
    if (r) link(p, r, true);
  }

  // 2 and 3. Only a match that is unique both ways counts.
  const free = (r: Row) => !taken.has(rowKey(r.sectionId, r.standing.name));
  const pending = withId.filter((p) => !out.has(p.id!));
  const tries: Array<(p: Participant, r: Row) => boolean> = [
    (p, r) => !!p.studentId && r.standing.studentId === p.studentId,
    (p, r) => nameWords(r.standing.name) === nameWords(p.name),
  ];
  for (const fits of tries) {
    for (const p of pending) {
      if (out.has(p.id!)) continue;
      const hits = rows.filter((r) => free(r) && fits(p, r));
      if (hits.length !== 1) continue;
      const rivals = pending.filter((q) => q !== p && !out.has(q.id!) && fits(q, hits[0]));
      if (rivals.length === 0) link(p, hits[0], false);
    }
  }
  return out;
}

/** The participant a results row belongs to, if any. */
export function participantForRow(
  matches: Map<string, ResultMatch>,
  participants: Participant[],
  sectionId: number,
  name: string,
): Participant | undefined {
  const want = rowKey(sectionId, name);
  for (const [id, m] of matches) {
    if (rowKey(m.sectionId, m.standing.name) === want) return participants.find((p) => p.id === id);
  }
  return undefined;
}

/** The results row for one category and name. */
export function rowFor(data: SectionResults[], sectionId: number, name: string): Omit<ResultMatch, "manual"> | undefined {
  const want = rowKey(sectionId, name);
  return rowsOf(data).find((r) => rowKey(r.sectionId, r.standing.name) === want);
}

/** Players still free to be picked for an entry, by category. */
export function unlinkedRows(data: SectionResults[], matches: Map<string, ResultMatch>) {
  const taken = new Set([...matches.values()].map((m) => rowKey(m.sectionId, m.standing.name)));
  return data.map(({ section, results }) => ({
    section,
    players: results.standings.filter((s) => !taken.has(rowKey(section.chessResultsId, s.name))),
  }));
}
