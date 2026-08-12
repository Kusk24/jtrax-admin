"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { type AdminPerson } from "@/lib/data";
import type { JtraxRole } from "@/lib/theme";

/* Who is signed in, resolved once from the session and never changed in the
   browser — the role comes from the backend account, so seeing another role
   means signing in as someone who has it.

   Credit rules used to live here as React state. They are academy settings, not
   session state, so they moved to system_configuration behind DataProvider. */
type JtraxContextValue = {
  person: AdminPerson;
  role: JtraxRole;
};

const JtraxContext = createContext<JtraxContextValue | null>(null);

export function JtraxProvider({
  children,
  /* Whoever signed in, resolved from the session cookie by app/(app)/layout. */
  person,
}: {
  children: ReactNode;
  person: AdminPerson;
}) {
  const value = useMemo<JtraxContextValue>(
    () => ({ person, role: person.role }),
    [person],
  );

  return <JtraxContext.Provider value={value}>{children}</JtraxContext.Provider>;
}

export function useJtrax(): JtraxContextValue {
  const ctx = useContext(JtraxContext);
  if (!ctx) throw new Error("useJtrax must be used inside <JtraxProvider>");
  return ctx;
}
