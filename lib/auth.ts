/**
 * Mock authentication.
 *
 * There is no backend yet (see `data.ts`), so the seed admins *are* the account
 * list and they all share one demo password, printed on the sign-in screen.
 * Only this module knows that: the session cookie and the route guard above it
 * stay the same once a real credential check replaces `verifyCredentials`.
 *
 * Kept free of `next/headers` on purpose — the sign-in screen imports
 * `DEMO_PASSWORD` on the client for its quick-fill chips.
 */
import { ADMIN_SEED, type AdminPerson } from "./data";

export const SESSION_COOKIE = "jtrax_session";

/** "Keep me signed in" swaps the browser-session cookie for a week-long one. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export const DEMO_PASSWORD = "jca2026";

export function findAdminById(id: string | undefined): AdminPerson | undefined {
  return id ? ADMIN_SEED.find((person) => person.id === id) : undefined;
}

export function verifyCredentials(email: string, password: string): AdminPerson | undefined {
  const match = ADMIN_SEED.find(
    (person) => person.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!match || password !== DEMO_PASSWORD) return undefined;
  return match;
}
