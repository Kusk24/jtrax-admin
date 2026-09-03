/**
 * The ID a child signs in with, and how the desk gets a free one.
 *
 * A student account used to be given an address — `penny.ward@student.jca.ac.th`
 * — at a domain that receives no mail and never has. A seven-year-old has no
 * mailbox, so inventing one produced a field the desk could not tell from a
 * real address a family had given, and a password-reset link with nowhere to
 * go. An ID says the same thing without the disguise.
 */

/** Lower-case, ASCII, joined by `sep`: "Penny Ward" -> "penny_ward". */
export function slugOf(name: string, sep = "."): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, sep)
    .replace(new RegExp(`^\\${sep}|\\${sep}$`, "g"), "");
}

/** A short random suffix for a name an ASCII ID cannot carry. */
export function randomTail(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * The ID for a child, on the nth attempt at finding a free one.
 *
 * Underscores rather than dots, and a `stu_` prefix, because the office reads
 * these aloud down a phone and a child copies them off a card. Dots vanish in
 * handwriting; a prefix says what kind of thing the string is.
 */
export function studentLoginIdFor(name: string, attempt = 1, tail = randomTail): string {
  /* Trimmed to leave room for the suffix: the ID has 64 characters to live in
     and `_10` is three of them. A name long enough to hit this is rare, and
     truncating beats being refused at the moment of registration. */
  const slug = slugOf(name, "_").slice(0, 55).replace(/_$/, "");
  /* A name an ASCII ID cannot carry — which is every Thai name, and the
     character set has to be ASCII: this is typed on a school laptop and read
     down a phone. Falling back to the word "student" would file the whole Thai
     roster under `stu_student_2`, `_3`, `_4` — unique, and useless to anyone
     reading it. A random tail is no more meaningful, but it is at least the
     child's own. */
  const base = slug.length >= 2 ? `stu_${slug}` : `stu_${tail()}`;
  /* The disambiguator is what makes two children called John Smith two
     accounts. A counted suffix rather than a random one, so the first Smith
     keeps the readable ID, only the second carries a number, and the desk can
     see at a glance that a duplicate name is what happened. */
  return attempt <= 1 ? base : `${base}_${attempt}`;
}

/* How many IDs the loop will try before giving up. Not unbounded: if the suffix
   is not resolving the collision by the tenth attempt, something other than a
   duplicate name is failing — a permission, a validation rule, an outage — and
   retrying it ninety more times turns one clear error into a very slow one. */
export const MAX_LOGIN_ID_ATTEMPTS = 10;

/** Whether a failed create is a name clash, and so worth another attempt. */
export function isTakenIdError(e: unknown): boolean {
  return /taken|unique/i.test(e instanceof Error ? e.message : String(e));
}

type CreateFn = (path: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>;

/**
 * Creates a student's account, stepping the ID along until one is free.
 *
 * Uniqueness lives in the database's UNIQUE index, not in a check here. Reading
 * the account list first and picking an unused name would be a check-then-act:
 * two receptionists registering two John Smiths in the same few seconds would
 * both read "free", and one of them would fail anyway. Trying and catching is
 * the only version that is right when it matters, and it is the same code path
 * as the ordinary duplicate rather than a second one that runs rarely.
 */
export async function createStudentAccount(
  create: CreateFn,
  name: string,
  password: string,
): Promise<{ accountId: string; loginId: string }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_LOGIN_ID_ATTEMPTS; attempt++) {
    const loginId = studentLoginIdFor(name, attempt);
    try {
      const account = await create("user-accounts", {
        email: loginId,
        password,
        role: "Student",
        display_name: name,
      });
      return { accountId: String(account.user_account_id), loginId };
    } catch (e) {
      lastError = e;
      /* Only a taken ID is worth another attempt. A weak password or a lost
         session fails identically on all ten, so those are rethrown at once
         and the desk sees the real reason instead of the tenth copy of it. */
      if (!isTakenIdError(e)) throw e;
    }
  }
  throw lastError;
}
