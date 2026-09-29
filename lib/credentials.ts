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

/* Short, plain words a child can spell and an office can read out without
   "capital P, exclamation mark". Nothing rude, nothing that reads as a name. */
const WORDS = [
  "apple", "bear", "bird", "boat", "cake", "cloud", "corn", "crab", "desk", "dog",
  "drum", "duck", "fish", "flag", "frog", "gold", "grape", "hill", "horse", "kite",
  "lake", "lamp", "leaf", "lemon", "lion", "mango", "moon", "nest", "owl", "panda",
  "pear", "plum", "rain", "river", "rock", "rose", "sand", "seal", "ship", "snow",
  "star", "sun", "tiger", "tree", "wave", "whale", "wind", "wolf", "zebra", "maple",
];

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

/**
 * A password to read out at the counter: "tiger-lamp-42". Two words from fifty
 * and a number to 99 is a quarter of a million choices — against a sign-in that
 * locks after a handful of tries, that is plenty, and unlike the old
 * "a7#Kp2!x" a seven-year-old can type it.
 */
export function generateReadablePassword(): string {
  const first = WORDS[randomInt(WORDS.length)];
  let second = WORDS[randomInt(WORDS.length)];
  while (second === first) second = WORDS[randomInt(WORDS.length)];
  return `${first}-${second}-${10 + randomInt(90)}`;
}

/**
 * A password nobody is ever told: the account needs one to exist, and the
 * parent replaces it from their invite link. Long and random because it is
 * never typed.
 */
export function generateHiddenPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 30; i++) out += chars[randomInt(chars.length)];
  return `${out}7a`;
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
