/**
 * Who pays for whom, on the Record Payment form.
 *
 * The academy's rule: **a child has one guardian; a guardian has any number of
 * children.** Either side can be linked to nobody — deleting a parent leaves
 * their children behind, deleting a child leaves the parent behind — and the
 * desk still has to be able to work with whoever is left.
 *
 * Naming one of the two names the other where a link exists, and leaves it
 * blank where none does. That is the whole rule, and it lives here rather than
 * inside the form's click handlers so it can be read, and run, on its own.
 */

/** One row of `student_parent`. */
export type FamilyLink = { studentId: string; parentId: string };

/** The two fields the form keeps in step. `""` means nobody is named. */
export type Pair = { studentId: string; payerId: string };

/** The guardian linked to a child, or `""` when none is. */
export function guardianOf(links: FamilyLink[], studentId: string): string {
  if (!studentId) return "";
  return links.find((l) => l.studentId === studentId)?.parentId ?? "";
}

/** Every child linked to a guardian, in link order. */
export function childIdsOf(links: FamilyLink[], parentId: string): string[] {
  if (!parentId) return [];
  return links.filter((l) => l.parentId === parentId).map((l) => l.studentId);
}

/**
 * What the pair becomes when a **child** is named.
 *
 * One guardian per child, so there is nothing to choose between: their
 * guardian is named, or the payer goes blank. Blank rather than left alone on
 * purpose — `parent_name` is snapshotted onto the payment, so the last family
 * looked at would be wrong on the receipt for good.
 */
export function pairFromStudent(links: FamilyLink[], studentId: string): Pair {
  return { studentId, payerId: guardianOf(links, studentId) };
}

/**
 * What the pair becomes when a **guardian** is named.
 *
 * One child and there is nothing left to choose, so it is chosen. Several, and
 * the desk picks from theirs. None, and there is nothing to prefill. In the
 * last two a child already named who is not this guardian's is dropped rather
 * than paired with someone they have no link to.
 *
 * Clearing the payer — "Not recorded", usually for a child with no guardian —
 * is a decision about the payer alone and leaves the child where it is.
 */
export function pairFromPayer(links: FamilyLink[], parentId: string, currentStudentId: string): Pair {
  if (!parentId) return { studentId: currentStudentId, payerId: "" };
  const kids = childIdsOf(links, parentId);
  if (kids.length === 1) return { studentId: kids[0], payerId: parentId };
  if (currentStudentId && !kids.includes(currentStudentId)) return { studentId: "", payerId: parentId };
  return { studentId: currentStudentId, payerId: parentId };
}
