/**
 * External tournaments tracked from chess-results.com.
 *
 * One-way by nature: chess-results.com is published from the arbiter's
 * Swiss-Manager and cannot be written to by anyone. The academy follows —
 * staff paste a link, the backend keeps a copy of the standings and recognises
 * which rows are our students.
 */
import { api } from "./api";

export type ExternalTournament = {
  externalTournamentId: string;
  chessResultsId: number;
  name: string;
  /** The site's own heading, e.g. "Final Ranking after 9 Rounds". Empty while
      the event has not started. */
  stage?: string;
  url: string;
  fetchedAt?: string;
  players: number;
  academyPlayers: number;
};

export type ExternalStanding = {
  rank: number;
  name: string;
  fideId?: string;
  federation?: string;
  rating?: number;
  points: number;
  club?: string;
  /** Present when this row is one of ours — the reason the feature exists. */
  studentId?: string;
  studentName?: string;
};

export type ExternalDetail = {
  tournament: ExternalTournament;
  standings: ExternalStanding[];
};

export const listExternal = () => api.get<ExternalTournament[]>("external-tournaments");
export const trackExternal = (url: string) =>
  api.post<ExternalTournament>("external-tournaments", { url });
export const getExternal = (id: string) => api.get<ExternalDetail>(`external-tournaments/${id}`);
export const refreshExternal = (id: string) =>
  api.post<ExternalTournament>(`external-tournaments/${id}/refresh`, {});
export const untrackExternal = (id: string) =>
  api.del<{ deleted: boolean }>(`external-tournaments/${id}`);

/* ---- linking one of the academy's own tournaments to an event there ---- */

/**
 * A tournament's standings as read from chess-results.com.
 *
 * The academy does not author these. An arbiter pairs the event in
 * Swiss-Manager and uploads; that upload is what players and federations treat
 * as true. Linking a tournament to it means the console stops pretending to own
 * the result and starts showing the real one.
 */
export type LinkedResults = {
  source: "chess-results";
  url: string;
  stage?: string;
  fetchedAt?: string;
  /** The arbiter's per-round pairings, mirrored by the backend. */
  rounds?: { round: number; played: boolean; pairings: unknown[] }[];
  chessResultsId: number;
  standings: ExternalStanding[];
};

export const linkChessResults = (tournamentId: string, url: string) =>
  api.post<LinkedResults>(`tournaments/${tournamentId}/chess-results`, { url });

export const unlinkChessResults = (tournamentId: string) =>
  api.del<{ linked: boolean }>(`tournaments/${tournamentId}/chess-results`);

export const refreshLinkedResults = (tournamentId: string) =>
  api.post<LinkedResults>(`tournaments/${tournamentId}/chess-results/refresh`, {});

/** What a tournament is currently linked to, read without costing
    chess-results.com a request. Null when it is not linked. */
export const getChessResultsLink = (tournamentId: string) =>
  api
    .get<LinkedResults | { linked: false }>(`tournaments/${tournamentId}/chess-results`)
    .then((r) => ("source" in r ? r : null));
