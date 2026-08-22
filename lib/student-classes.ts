/**
 * Which classes a child is in — for filtering the roster by one.
 *
 * The student row carries a single `className`, picked as the first active
 * enrolment, because the list needs one thing to put in a column. A child in
 * two classes is in both, though, so filtering on that one name would hide
 * them from the class they are second-listed in — the filter would look
 * broken in exactly the case it exists for.
 *
 * These read the enrolments instead, which are the record of who is in what.
 */
import { isActiveEnrolment, type Row } from "./live";

const s = (row: Row, key: string): string => String(row[key] ?? "");

/** The classes a child is in right now, in the order they enrolled. */
export function classIdsOfStudent(enrollments: Row[], studentId: string): string[] {
  return enrollments
    .filter((e) => s(e, "student_id") === studentId && isActiveEnrolment(e))
    .map((e) => s(e, "class_id"))
    .filter(Boolean);
}

/**
 * Whether a child belongs in the list under this filter.
 *
 * `""` is "All Classes" — the filter's off, so everyone passes. Withdrawn and
 * completed enrolments do not count: the point of the filter is who is in the
 * room, not who once was.
 */
export function isInClass(enrollments: Row[], studentId: string, classId: string): boolean {
  if (!classId) return true;
  return classIdsOfStudent(enrollments, studentId).includes(classId);
}

/**
 * The classes worth offering in the filter, each with its roster size.
 *
 * Only live ones: a retired class is not somewhere anybody is now, and
 * offering it hands the desk a filter that always comes back empty. The count
 * is of children actually on the list — a class whose only enrolments belong
 * to deleted students reads 0 rather than 3.
 */
export function classFilterOptions(
  c: { classes: Row[]; enrollments: Row[] },
  studentIds: string[],
): { id: string; name: string; count: number }[] {
  const listed = new Set(studentIds);
  return c.classes
    .filter((k) => !s(k, "archived_at"))
    .map((k) => {
      const id = s(k, "class_id");
      const count = new Set(
        c.enrollments
          .filter((e) => s(e, "class_id") === id && isActiveEnrolment(e))
          .map((e) => s(e, "student_id"))
          .filter((sid) => listed.has(sid)),
      ).size;
      return { id, name: s(k, "name"), count };
    });
}

/**
 * Every class a child is in, for the roster's Class column.
 *
 * Written out in full rather than the first one alone, so a row that turns up
 * under a class filter says why it did.
 */
export function classNamesOfStudent(
  c: { classes: Row[]; enrollments: Row[] },
  studentId: string,
): string[] {
  return classIdsOfStudent(c.enrollments, studentId)
    .map((id) => c.classes.find((k) => s(k, "class_id") === id))
    .map((k) => (k ? s(k, "name") : ""))
    .filter(Boolean);
}
