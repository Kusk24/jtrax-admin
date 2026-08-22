/**
 * How a class is drawn and labelled.
 *
 * Academy has offered an icon picker and a badge field since it was built, and
 * for as long as it has existed neither was stored. The screen derived both
 * from `class_type` on every render — the badge *was* class_type under a
 * different label, and the icon was a three-way guess on it — so picking a
 * piece set state that the next render immediately overwrote. Pressing Save
 * changed nothing, and nothing said so.
 *
 * Both are columns now (see backend 0022). These are the two rules that decide
 * what to show when a class has not got one yet: every class written before
 * that migration, and any row created through the API without one.
 */
import type { IconName } from "./icons";

/** What the picker offers: the six pieces, plus the trophy a Master class uses. */
export const CLASS_ICONS: IconName[] = ["king", "queen", "rook", "knight", "bishop", "pawn", "trophy"];

/**
 * The icon to draw a class with.
 *
 * The stored choice wins, but only if the picker still offers it. The icon set
 * belongs to the console and moves with the design, so a name retired from it
 * would otherwise draw an empty box that no screen in the console can fix —
 * the picker cannot show a piece it no longer has, so nobody could pick their
 * way out of it. Falling back is recoverable; a blank square is not.
 *
 * The fallback is exactly what the console used to derive, so a class from
 * before 0022 looks the way it has always looked until somebody chooses.
 */
export function iconOf(stored: unknown, classType: string): IconName {
  const name = String(stored ?? "");
  if ((CLASS_ICONS as string[]).includes(name)) return name as IconName;
  return classType === "Master" ? "trophy" : classType === "Private" ? "king" : "queen";
}

/**
 * The badge to label a class with.
 *
 * Free text — "Weekend", "Exam prep", "Sec 101" — and not the class type,
 * though the class type is what it falls back to. Blank counts as absent: an
 * empty badge renders an empty chip, which reads as a rendering fault rather
 * than a deliberate blank.
 */
export function badgeOf(stored: unknown, classType: string): string {
  const badge = String(stored ?? "").trim();
  return badge || classType;
}
