/**
 * Hours attended are the credits charged for classes: one credit is one hour,
 * so 9.25 credits used is 9 h 15 min. Split here for "9 h 15 min", to the
 * nearest minute.
 */
export function splitHours(h: number): { hours: number; minutes: number } {
  const total = Number.isFinite(h) && h > 0 ? Math.round(h * 60) : 0;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}
