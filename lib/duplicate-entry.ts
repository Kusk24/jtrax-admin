/**
 * Whether a tournament entry would repeat one already there.
 *
 * The database allows one entry per JCA student, and one per player — the
 * same email, name and date of birth (backend 0070) — in a tournament,
 * counting every entry that has not been Rejected: approved, waiting for
 * approval, or released for non-payment. One email may enter several
 * children. Checked here first so the desk is told which, in words, instead
 * of a refused save.
 */
type Row = Record<string, unknown>;

export type DuplicateEntry =
  | { state: "entered" | "pending" | "released"; name: string }
  | null;

const str = (r: Row, k: string) => String(r[k] ?? "").trim();

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function duplicateEntry(
  registrations: Row[],
  entry: { tournamentId: string; studentId?: string; email?: string; name?: string; dateOfBirth?: string; id?: string },
): DuplicateEntry {
  const email = (entry.email ?? "").trim();
  for (const r of registrations) {
    if (str(r, "tournament_id") !== entry.tournamentId) continue;
    if (entry.id && str(r, "tournament_registration_id") === entry.id) continue;
    const status = str(r, "status") || "Approved";
    if (status === "Rejected") continue;
    const sameStudent = !!entry.studentId && str(r, "student_id") === entry.studentId;
    const samePlayer =
      email !== "" &&
      same(str(r, "contact_email"), email) &&
      same(str(r, "participant_name"), entry.name ?? "") &&
      str(r, "participant_date_of_birth").slice(0, 10) === (entry.dateOfBirth ?? "").slice(0, 10);
    if (!sameStudent && !samePlayer) continue;
    const state = status === "Withdrawn" ? "released" : status === "Approved" ? "entered" : "pending";
    return { state, name: str(r, "participant_name") };
  }
  return null;
}
