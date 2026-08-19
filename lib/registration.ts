/**
 * Public tournament registration, from the console's side.
 *
 * Two halves. The *settings* are ordinary columns on the tournament, changed
 * through the registry like any other field. The *queue* is its own endpoint,
 * because it carries one thing the table cannot: whether the email somebody
 * registered with belongs to a student the academy already knows.
 *
 * That match is deliberately withheld from the public reply — quoting a
 * discount only to addresses that matched would turn the public form into a way
 * to test whether a given child is a pupil here — so this is the only place it
 * appears, and judging it is what the desk is for.
 */
import { api } from "./api";

export type RegistrationStatus = "Pending" | "Approved" | "Rejected" | "Withdrawn";

export type QueueEntry = {
  id: string;
  participantName: string;
  contactEmail: string;
  contactPhone: string;
  dateOfBirth?: string;
  category?: string;
  status: RegistrationStatus;
  /** "Public" for a self sign-up, "Staff" for one the desk typed in. */
  source: "Public" | "Staff";
  registeredAt: string;
  feeQuoted: number | null;
  feeCharged: number | null;
  /** What the registrant said about themselves. */
  claimedStudent: boolean;
  /** What our own records say. The two disagreeing is the interesting case. */
  matchedStudentId?: string;
  matchedStudentName?: string;
};

export const listRegistrations = (tournamentId: string) =>
  api
    .get<{ registrations: QueueEntry[] }>(`tournaments/${tournamentId}/registrations`)
    .then((r) => r.registrations);

/** Approve an entry. `fee` overrides the quote when a claimed discount did not
    hold up — the desk is the authority on that, not the form. */
export const approveRegistration = (id: string, fee?: number) =>
  api.post<{ status: string }>(`tournaments/registrations/${id}/approve`,
    fee === undefined ? {} : { fee });

export const rejectRegistration = (id: string) =>
  api.post<{ status: string }>(`tournaments/registrations/${id}/reject`, {});

/**
 * Where the public form for a tournament lives.
 *
 * The page is served by the portal, not by the console, so it is built from
 * NEXT_PUBLIC_PORTAL_URL rather than the address bar — the same lesson the
 * published-results link learned the hard way, where window.location.origin
 * produced a link to the admin domain that 404'd for everyone who scanned it.
 *
 * Returns "" when unconfigured, so callers can say so rather than print a
 * broken link.
 */
export function registrationUrl(tournamentId: string): string {
  const origin = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").replace(/\/$/, "");
  return origin ? `${origin}/register/${tournamentId}` : "";
}

/** The fee one of the academy's own students would pay, rounded the way the
    server rounds it so the two never disagree on a printed poster. */
export function studentFee(fee: number, discountPct: number): number {
  if (!discountPct || fee <= 0) return fee;
  return Math.round((fee * (100 - discountPct)) / 100);
}
