/**
 * Lichess links and ratings, as the console reads them.
 *
 * Scoped on the server: staff and teachers see the academy, a parent sees their
 * children, a student sees themselves. Nothing here decides that.
 */
import { api } from "./api";

export type LichessRating = {
  perf: string;
  rating: number;
  games: number;
  provisional: boolean;
};

export type LichessLink = {
  studentId: string;
  studentName?: string;
  username: string;
  lichessId: string;
  verified: boolean;
  addedByStaff: boolean;
  linkedAt: string;
  syncedAt?: string;
  ratings: LichessRating[];
  profileUrl: string;
};

export const listLichessLinks = () => api.get<LichessLink[]>("lichess/links");
export const syncLichess = () => api.post<{ synced: number }>("lichess/sync", {});
export const linkStudentLichess = (studentId: string, username: string) =>
  api.post<{ username: string }>("lichess/link", { studentId, username });
export const unlinkStudentLichess = (studentId: string) =>
  api.del<{ linked: boolean }>(`lichess/link?studentId=${encodeURIComponent(studentId)}`);

/** The order a coach reads them in. */
export const PERF_ORDER = ["bullet", "blitz", "rapid", "classical", "puzzle"];

export function ratingOf(link: LichessLink, perf: string): LichessRating | undefined {
  return link.ratings.find((r) => r.perf === perf);
}

/** Sorted by the rating that best represents a school player.
    Rapid first: it is the time control a coach actually discusses. */
export function bestRating(link: LichessLink): LichessRating | undefined {
  for (const perf of ["rapid", "blitz", "classical", "bullet", "puzzle"]) {
    const r = ratingOf(link, perf);
    if (r) return r;
  }
  return undefined;
}
