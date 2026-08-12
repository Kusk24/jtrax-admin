/**
 * Temporary sign-in credentials handed out when the office creates an account.
 *
 * Shared because every screen that creates a `user_account` — admins, parents,
 * students — has to show the same thing once and never again: the backend
 * stores only the hash, so a password not copied here is gone.
 */

/** Mirrors the mockup's generateTempPassword: 8 chars mixing the four classes. */
export function generateTempPassword(): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%&*"];
  const out: string[] = [];
  for (let i = 0; i < 8; i++) {
    const set = sets[i % sets.length];
    out.push(set[Math.floor(Math.random() * set.length)]);
  }
  /* Shuffle so the class order isn't predictable. */
  return out.sort(() => Math.random() - 0.5).join("");
}

/**
 * A DELETE whose 404 is not a failure — clearing rows that may never have
 * existed (a parent with no notification preference row, a student with no
 * parent link) is part of tearing an account down.
 */
export async function removeIfPresent(
  remove: (path: string, id: string) => Promise<void>,
  path: string,
  id: string,
): Promise<void> {
  try {
    await remove(path, id);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 404) throw e;
  }
}
