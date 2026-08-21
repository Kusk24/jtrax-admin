/**
 * What the front desk should do for a student they just looked up.
 *
 * Encodes the Find-a-Student action matrix from the client's spec: the
 * suggestion is a function of where the student is in the check-in cycle
 * *and* what their credit standing is, so a walk-in with expiring credits
 * gets "Check In + Contact" rather than a bare "Check In".
 */

/** Where the student is in the check-in → class → dismissed cycle. */
export type DeskStatus = "none" | "checked_in" | "in_class" | "dismissed";

export type DeskAction = "checkIn" | "assignClass" | "dismiss" | "contact" | "addCredits";

/** The four credit standings the matrix distinguishes. */
type Standing = "normal" | "expiring" | "lowCredit" | "inactive";

function standingOf(studentStatus: string): Standing {
  switch (studentStatus) {
    case "Expiring":
    case "Expired":
      return "expiring";
    case "Low Credit":
      return "lowCredit";
    case "Inactive":
      return "inactive";
    default:
      return "normal";
  }
}

/* The spec's table, verbatim. `checked_in` is not in it — it is the step
   between checking in and sitting in a class, so it carries the same
   standing-driven follow-up plus the assignment that moves it along.

   Since the desk started writing to the database, no student reaches it.
   `attendance` records a student *at a session*: there is no row for "here,
   but not in a class yet", so checking in and being in a class are one act.
   The row is kept because it is the client's table and costs nothing, and
   because a session-less attendance row would be the wrong way to earn it
   back — see lib/desk-state.ts. */
const MATRIX: Record<DeskStatus, Record<Standing, DeskAction[]>> = {
  none: {
    normal: ["checkIn"],
    expiring: ["checkIn", "contact"],
    lowCredit: ["checkIn", "addCredits"],
    inactive: ["contact"],
  },
  checked_in: {
    normal: ["assignClass"],
    expiring: ["assignClass", "contact"],
    lowCredit: ["assignClass", "addCredits"],
    inactive: ["assignClass", "contact"],
  },
  in_class: {
    normal: ["dismiss"],
    expiring: ["dismiss", "contact"],
    lowCredit: ["dismiss", "addCredits"],
    /* The table has no In Class + Inactive row — someone sitting in a class
       is by definition not inactive — so it falls back to the plain dismiss. */
    inactive: ["dismiss"],
  },
  dismissed: {
    normal: [],
    expiring: ["contact"],
    lowCredit: ["addCredits"],
    inactive: ["contact"],
  },
};

export function suggestedActions(desk: DeskStatus, studentStatus: string): DeskAction[] {
  return MATRIX[desk][standingOf(studentStatus)];
}
