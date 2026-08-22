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
 * How a class is taught. `class.class_type` in the ER model.
 *
 * NOT NULL with `CHECK (class_type IN ('Private','Group','Master'))` since the
 * first migration, and the console never asked for it. Worse, the Add form
 * seeded its draft with "Beginner" — which is a *level*, not one of the three —
 * so the guard on save fell through to "Group" every time. Every class the
 * academy has ever created through this screen is a Group class, whatever it
 * actually is, and the edit form never sent the column at all.
 *
 * It was labelled "Category" on screen, which is the rest of the reason nobody
 * could tell where it came from: one column, two names, and neither screen used
 * the database's.
 */
export const CLASS_TYPES = ["Private", "Group", "Master"] as const;
export type ClassType = (typeof CLASS_TYPES)[number];

/**
 * A stored class type, or the one the database would have defaulted to.
 *
 * Anything unrecognised becomes Group rather than being shown as-is: the column
 * is a closed set, and a form that opens on a value the picker cannot offer
 * silently rewrites it on the next save.
 */
export function classTypeOf(stored: unknown): ClassType {
  const value = String(stored ?? "");
  return (CLASS_TYPES as readonly string[]).includes(value) ? (value as ClassType) : "Group";
}

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
