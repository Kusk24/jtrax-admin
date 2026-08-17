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
