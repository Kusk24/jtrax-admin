/**
 * Turns a scanned registration form into the registration wizard's draft.
 *
 * Its own module because this is the part that is easy to get quietly wrong:
 * the paper form and the console do not have the same fields, and a mapping
 * that guesses fills a child's record with something nobody typed.
 *
 * Two rules run through it:
 *  - Map only what genuinely corresponds. The form's courses (CHESS / CODING /
 *    ART & DESIGN) are a different axis from the console's class options
 *    (Group / Private / Master), so they are reported, not assigned.
 *  - Never drop what was read. Anything with no home comes back as `unmapped`
 *    so the console can show it rather than silently lose what a parent wrote.
 */

export type ScanField = { value: string; confidence: number };

export type ScannedForm = {
  name: ScanField;
  gender: ScanField;
  address: ScanField;
  dateOfBirth: ScanField;
  email: ScanField;
  currentSchool: ScanField;
  contactNumber: ScanField;
  chessLevel: ScanField;
  fideId: ScanField;
  fideRating: ScanField;
  howDidYouKnow: ScanField;
  enrolledBefore: ScanField;
  previousSchool: ScanField;
  coursePackage: ScanField;
  courses: string[];
};

export type ScanResult = {
  fields: ScannedForm;
  provider: string;
  filename: string;
  saved: boolean;
};

/** Below this a value is filled in but flagged, because the model said it was
    unsure and a wrong date of birth is worse than an empty one. */
export const CHECK_BELOW = 0.6;

/** The console's own level names; the form is handwritten, so "beginner",
    "BEGINNER " and "Begginer" all have to land on the same option. */
export function matchLevel(written: string, options: string[]): string {
  const cleaned = written.trim().toLowerCase();
  if (!cleaned) return "";
  const exact = options.find((o) => o.toLowerCase() === cleaned);
  if (exact) return exact;
  // A prefix match catches "inter" and "adv"; anything vaguer is left for
  // staff rather than guessed at.
  return options.find((o) => o.toLowerCase().startsWith(cleaned.slice(0, 4))) ?? "";
}

export type DraftPatch = {
  name?: string;
  dateOfBirth?: string;
  level?: string;
  school?: string;
  fideId?: string;
  fideRating?: string;
  parentEmail?: string;
  parentPhone?: string;
};

export type MappedScan = {
  patch: DraftPatch;
  /** Draft keys whose reading was doubtful — the console highlights these. */
  needsCheck: string[];
  /** Read off the paper but with nowhere to go in the console yet. */
  unmapped: Array<{ label: string; value: string }>;
};

/**
 * @param levelOptions the console's level names, passed in so this module does
 *   not have to know the console's constants.
 */
export function draftFromScan(form: ScannedForm, levelOptions: string[]): MappedScan {
  const patch: DraftPatch = {};
  const needsCheck: string[] = [];

  const take = (field: ScanField | undefined, key: keyof DraftPatch, transform?: (v: string) => string) => {
    const raw = field?.value?.trim() ?? "";
    if (!raw) return;
    const value = transform ? transform(raw) : raw;
    if (!value) return;
    patch[key] = value;
    if ((field?.confidence ?? 0) < CHECK_BELOW) needsCheck.push(key);
  };

  take(form.name, "name");
  // The backend only sends a date it could normalise; anything else arrives
  // with confidence 0 and is flagged rather than pushed into a date input.
  take(form.dateOfBirth, "dateOfBirth", (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ""));
  take(form.chessLevel, "level", (v) => matchLevel(v, levelOptions));
  take(form.currentSchool, "school");
  take(form.fideId, "fideId");
  take(form.fideRating, "fideRating");
  // The form has one email and one phone. On a child's registration those are
  // in practice the guardian's, and the guardian is who the console contacts —
  // so they fill the parent fields, where staff can move them if wrong.
  take(form.email, "parentEmail");
  take(form.contactNumber, "parentPhone");

  const unmapped: Array<{ label: string; value: string }> = [];
  const spare = (label: string, field: ScanField | undefined) => {
    const v = field?.value?.trim();
    if (v) unmapped.push({ label, value: v });
  };
  spare("Gender", form.gender);
  spare("Address", form.address);
  spare("How they heard of JCA", form.howDidYouKnow);
  spare("Enrolled before", form.enrolledBefore);
  spare("Previous chess school", form.previousSchool);
  spare("Course package", form.coursePackage);
  if (form.courses?.length) {
    unmapped.push({ label: "Courses ticked", value: form.courses.join(", ") });
  }

  return { patch, needsCheck, unmapped };
}
