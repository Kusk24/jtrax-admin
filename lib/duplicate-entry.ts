/**
 * Whether a tournament entry would repeat one already there.
 *
 * The database allows one entry per child and one per contact email in a
 * tournament, counting every entry that has not been Rejected — approved,
 * waiting for approval, or released for non-payment. Checked here first so the
 * desk is told which, in words, instead of a refused save.
 */
type Row = Record<string, unknown>;

export type DuplicateEntry =
  | { by: "student" | "email"; state: "entered" | "pending" | "released"; name: string }
  | null;

const str = (r: Row, k: string) => String(r[k] ?? "").trim();

export function duplicateEntry(
  registrations: Row[],
  entry: { tournamentId: string; studentId?: string; email?: string; id?: string },
): DuplicateEntry {
  const email = (entry.email ?? "").trim().toLowerCase();
  for (const r of registrations) {
    if (str(r, "tournament_id") !== entry.tournamentId) continue;
    if (entry.id && str(r, "tournament_registration_id") === entry.id) continue;
    const status = str(r, "status") || "Approved";
    if (status === "Rejected") continue;
    const by =
      entry.studentId && str(r, "student_id") === entry.studentId
        ? "student"
        : email && str(r, "contact_email").toLowerCase() === email
          ? "email"
          : null;
    if (!by) continue;
    const state = status === "Withdrawn" ? "released" : status === "Approved" ? "entered" : "pending";
    return { by, state, name: str(r, "participant_name") };
  }
  return null;
}
