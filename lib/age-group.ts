/* Whether an entry's date of birth fits its age group — the same rule the
   backend registers by (publicregistration.go) and the public form greys
   categories out by: by birth year, so "U10" at an event in 2026 is anybody
   born in 2016 or later. Used by the Participants table to flag an entry the
   desk should look at, because OCR can misread a date and a parent can type
   one wrong. */

/** The age in a category's name — "U8 Boys", "U08" and "Under 8" are 8. 0
    means no age limit. */
export function categoryAgeLimit(name: string): number {
  const m = /\bU(?:nder)?[\s-]?(\d{1,2})\b/i.exec(name);
  return m ? Number(m[1]) : 0;
}

function yearOf(iso: string): number {
  const m = /^(\d{4})-\d{2}-\d{2}/.exec(iso);
  return m ? Number(m[1]) : 0;
}

/** Whole years old on `on` (both YYYY-MM-DD). 0 when either is missing. */
export function ageOn(dob: string, on: string): number {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
  const o = /^(\d{4})-(\d{2})-(\d{2})/.exec(on);
  if (!d || !o) return 0;
  let age = Number(o[1]) - Number(d[1]);
  if (o[2] + o[3] < d[2] + d[3]) age--;
  return Math.max(0, age);
}

export type AgeCheck =
  /** Born before the group's first year, by the date given on the form. */
  | "tooOld"
  /** The form is fine, but the ID card scan read a year the group does not take. */
  | "idTooOld"
  /** The scan read a different date of birth from the one submitted. */
  | "dobDiffers"
  | null;

/**
 * What, if anything, is wrong with this entry's age group. The worst problem
 * wins: a group the player cannot enter by their own form beats one the scan
 * disagrees with.
 */
export function ageCheck(opts: {
  category: string;
  startDate: string;
  dateOfBirth: string;
  scannedDateOfBirth?: string;
}): AgeCheck {
  const limit = categoryAgeLimit(opts.category);
  const year = yearOf(opts.startDate) || new Date().getFullYear();
  const bornFrom = year - limit;
  if (limit > 0 && opts.dateOfBirth && yearOf(opts.dateOfBirth) < bornFrom) return "tooOld";
  if (limit > 0 && opts.scannedDateOfBirth && yearOf(opts.scannedDateOfBirth) < bornFrom) return "idTooOld";
  if (opts.scannedDateOfBirth && opts.dateOfBirth && opts.scannedDateOfBirth !== opts.dateOfBirth) return "dobDiffers";
  return null;
}

/**
 * The category to suggest for a date of birth: the youngest group the player
 * can still enter by birth year. Nothing when two groups tie for that (U8
 * Boys and U8 Girls — the desk knows which) or none fits. A tournament with
 * no age groups at all, and a single open one, suggests that one.
 */
export function suggestCategory(
  categories: Array<{ id: string; name: string }>,
  dob: string,
  startDate: string,
): string {
  if (!yearOf(dob)) return "";
  const year = yearOf(startDate) || new Date().getFullYear();
  const fits = categories.filter((c) => {
    const limit = categoryAgeLimit(c.name);
    return limit > 0 && yearOf(dob) >= year - limit;
  });
  if (fits.length > 0) {
    const youngest = Math.min(...fits.map((c) => categoryAgeLimit(c.name)));
    const best = fits.filter((c) => categoryAgeLimit(c.name) === youngest);
    return best.length === 1 ? best[0].id : "";
  }
  const open = categories.filter((c) => categoryAgeLimit(c.name) === 0);
  return open.length === 1 ? open[0].id : "";
}

/** The latest date of birth accepted: a year before `today` (YYYY-MM-DD). */
export function latestBirthDate(today: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(today);
  if (!m) return "";
  return `${Number(m[1]) - 1}-${m[2]}-${m[3] === "29" && m[2] === "02" ? "28" : m[3]}`;
}

/** A date of birth less than a year ago — or in the future — is a typo. */
export function dobTooYoung(dob: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}/.test(dob)) return false;
  return dob.slice(0, 10) > latestBirthDate(today);
}
