"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { todayISO } from "@/lib/live";

/**
 * Which day the dashboard is showing.
 *
 * Picked from the date chip in the top bar, read by the dashboard's classes,
 * check-ins and Create Class. `null` means "today" rather than a stored date,
 * so a console left open overnight moves on to the new day by itself.
 */
type DashboardDateValue = {
  /** The day shown, `YYYY-MM-DD`. */
  day: string;
  isToday: boolean;
  /** Before today: read-only. */
  isPast: boolean;
  /** After today: classes can be scheduled, nobody can be checked in yet. */
  isFuture: boolean;
  /** A day, or null to go back to today. */
  setDay: (day: string | null) => void;
};

const DashboardDateContext = createContext<DashboardDateValue | null>(null);

export function DashboardDateProvider({
  children,
  initialDay = null,
}: {
  children: ReactNode;
  /* Where to open; tests use it to land on another day. */
  initialDay?: string | null;
}) {
  const [chosen, setChosen] = useState<string | null>(initialDay);
  const today = todayISO();
  const day = chosen ?? today;
  const value = useMemo<DashboardDateValue>(
    () => ({
      day,
      isToday: day === today,
      isPast: day < today,
      isFuture: day > today,
      setDay: (next) => setChosen(next && next !== todayISO() ? next : null),
    }),
    [day, today],
  );
  return <DashboardDateContext.Provider value={value}>{children}</DashboardDateContext.Provider>;
}

/* Outside the provider — a component rendered on its own in a test — the
   dashboard simply shows today, as it always did. */
const TODAY_ONLY = (): DashboardDateValue => ({
  day: todayISO(),
  isToday: true,
  isPast: false,
  isFuture: false,
  setDay: () => {},
});

export function useDashboardDate(): DashboardDateValue {
  return useContext(DashboardDateContext) ?? TODAY_ONLY();
}
