/**
 * Rounds, pairings and standings for one tournament.
 *
 * Kept out of `live.ts` because a result is not a row in the ER model that file
 * maps — it is a thing the product grew, with its own endpoints and its own
 * camelCase shape.
 */
import { api } from "./api";

/** The results a board may be given, mirroring the backend's fixed list. */
export const RESULTS = ["Pending", "1-0", "0-1", "1/2-1/2", "+/-", "-/+", "bye"] as const;
export type ResultCode = (typeof RESULTS)[number];

export type Pairing = {
  pairingId: string;
  board: number;
  round: number;
  whiteRegistrationId: string;
  white: string;
  blackRegistrationId?: string;
  black?: string;
  result: ResultCode;
  recordedAt?: string;
};

export type Round = {
  roundId: string;
  round: number;
  status: "Pending" | "Playing" | "Completed";
  pairings: Pairing[];
};

export type Standing = {
  registrationId: string;
  name: string;
  category?: string;
  rating?: number;
  rank: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  buchholz: number;
};

export type Results = { rounds: Round[]; standings: Standing[] };

/** A proposed board, before an arbiter has agreed to it. */
export type Proposed = {
  board: number;
  whiteRegistrationId: string;
  white: string;
  blackRegistrationId: string;
  black: string;
  result: ResultCode;
};

export const getResults = (tournamentId: string) =>
  api.get<Results>(`tournaments/${tournamentId}/results`);

export const addRound = (tournamentId: string) =>
  api.post<{ roundId: string; round: number }>(`tournaments/${tournamentId}/rounds`, {});

export const proposePairings = (tournamentId: string) =>
  api.get<{ pairings: Proposed[] }>(`tournaments/${tournamentId}/proposed-pairings`);

export const savePairings = (roundId: string, pairings: Array<Partial<Proposed>>) =>
  api.put<{ roundId: string; boards: number }>(`tournaments/rounds/${roundId}/pairings`, { pairings });

export const recordResult = (pairingId: string, result: ResultCode) =>
  api.patch<{ result: string }>(`tournaments/pairings/${pairingId}`, { result });

/** Points as a chess score reads them: 1, ½, 1½ — not 0.5 and 1.5. */
export function formatPoints(points: number): string {
  const whole = Math.floor(points);
  const half = points - whole >= 0.5;
  if (whole === 0) return half ? "½" : "0";
  return half ? `${whole}½` : String(whole);
}

/** What a result reads as from one player's side of the board. */
export function resultFor(p: Pairing, registrationId: string): "win" | "draw" | "loss" | "bye" | "" {
  if (p.result === "Pending") return "";
  if (p.result === "bye") return "bye";
  const isWhite = p.whiteRegistrationId === registrationId;
  if (p.result === "1/2-1/2") return "draw";
  const whiteWon = p.result === "1-0" || p.result === "+/-";
  return whiteWon === isWhite ? "win" : "loss";
}

/* ------------------------------------------------- standings by category --- */

/** The minimum of an entrant this module needs to place a standing. */
export type CategorisedEntrant = {
  name: string;
  studentId?: string;
  categoryId?: string;
};

/** The minimum of a standing row this module needs. */
export type PlaceableStanding = {
  name: string;
  studentId?: string;
};

export type CategoryRef = { id: string; name: string };

/** One tab's worth: a section and the rows that belong to it. */
export type StandingsGroup<S> = {
  /** Null for the "everyone" tab and for the unplaced tab. */
  id: string | null;
  name: string;
  rows: S[];
};

/**
 * Normalised for matching a person by the only other thing we have: a name.
 *
 * chess-results prints "Somchai, Jaidee" where the console holds "Somchai
 * Jaidee", and an arbiter's list is not careful about double spaces or case.
 * The comma is the one that matters — without it a Thai entrant matched
 * nothing at all and every row fell into Unplaced.
 */
function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split the arbiter's standings into the academy's own categories.
 *
 * chess-results.com has no idea what JTrax calls its sections, so the section
 * cannot come from the standings — it comes from the entrant the row belongs
 * to. A row is matched to an entrant by `studentId` where the backend already
 * recognised one, and by name otherwise.
 *
 * Rows that match nobody are kept, in a section of their own. An open event is
 * mostly people the academy has never met, and dropping them would turn "the
 * results" into "the results for our pupils" without saying so.
 *
 * Empty categories are kept too: a tab that disappears when nobody in it has a
 * result yet is a tab that comes and goes during a tournament.
 */
export function groupStandingsByCategory<S extends PlaceableStanding>(
  standings: S[],
  entrants: CategorisedEntrant[],
  categories: CategoryRef[],
  unplacedLabel: string,
): StandingsGroup<S>[] {
  const byStudent = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const e of entrants) {
    if (!e.categoryId) continue;
    if (e.studentId) byStudent.set(e.studentId, e.categoryId);
    if (e.name) byName.set(nameKey(e.name), e.categoryId);
  }

  const categoryOf = (row: S): string | undefined =>
    (row.studentId && byStudent.get(row.studentId)) || byName.get(nameKey(row.name));

  const groups: StandingsGroup<S>[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    rows: [],
  }));
  const index = new Map(groups.map((g) => [g.id, g]));
  const unplaced: S[] = [];

  for (const row of standings) {
    const id = categoryOf(row);
    const group = id ? index.get(id) : undefined;
    if (group) group.rows.push(row);
    else unplaced.push(row);
  }

  /* Only when it has something in it — unlike the real categories, this one is
     not a section of the tournament, it is a leftover. An always-present empty
     "Unplaced" would read as a section nobody entered. */
  if (unplaced.length > 0) {
    groups.push({ id: null, name: unplacedLabel, rows: unplaced });
  }
  return groups;
}
