/**
 * Inviting a parent to choose their own password.
 *
 * The backend emails them a one-time link (7 days). Where no mail server is
 * configured — a laptop — it writes the link to its own log instead and says
 * nothing was delivered, which the console passes on rather than claiming an
 * email went out.
 */
import { api } from "./api";

export type InviteResult = { email: string; delivered: boolean };

/** A child's student-app login, emailed to their parent with the invite. */
export type StudentLogin = { name: string; loginId: string; password: string };

export function sendInvite(accountId: string, studentLogins: StudentLogin[] = []): Promise<InviteResult> {
  return api.post<InviteResult>(
    `user-accounts/${encodeURIComponent(accountId)}/invite`,
    studentLogins.length ? { studentLogins } : {},
  );
}
