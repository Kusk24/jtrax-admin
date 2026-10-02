/** The arrival reminder's days as the API wants them: a whole number, or null for off. */
export function reminderDays(value: string | undefined): number | null {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(365, n) : null;
}

/** Days a sent reminder reads "Sent" before it becomes "No response". */
export const NO_RESPONSE_AFTER_DAYS = 2;

export type ArrivalState = "notSent" | "sent" | "attending" | "notAttending" | "noResponse";

/** Where one entrant stands with the arrival reminder. */
export function arrivalState(
  answer: "Pending" | "Confirmed" | "NotAttending" | undefined,
  remindedAt: string | undefined,
  now: Date = new Date(),
): ArrivalState {
  if (answer === "Confirmed") return "attending";
  if (answer === "NotAttending") return "notAttending";
  if (!remindedAt) return "notSent";
  const sent = new Date(remindedAt).getTime();
  if (Number.isNaN(sent)) return "sent";
  return now.getTime() - sent >= NO_RESPONSE_AFTER_DAYS * 86_400_000 ? "noResponse" : "sent";
}

/** The day the reminder goes out: `days` before `startISO` (YYYY-MM-DD), or "". */
export function reminderDay(startISO: string, days: number | undefined): string {
  if (!startISO || !days || days <= 0) return "";
  const d = new Date(`${startISO.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
