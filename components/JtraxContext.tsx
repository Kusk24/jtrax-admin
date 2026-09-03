"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { type AdminPerson } from "@/lib/data";
import type { JtraxRole, Theme } from "@/lib/theme";

/* Who is signed in, resolved once from the session and never changed in the
   browser — the role comes from the backend account, so seeing another role
   means signing in as someone who has it.

   Credit rules used to live here as React state. They are academy settings, not
   session state, so they moved to system_configuration behind DataProvider. */
type JtraxContextValue = {
  person: AdminPerson;
  role: JtraxRole;
  /* The account's saved appearance, resolved on the server.

     It has to arrive this way rather than be read off `<html data-theme>` in
     the browser: a client component is server-rendered too, so a `useState`
     initialiser that reaches for `document` returns the fallback there — and
     React does not repair attribute mismatches when it hydrates. It says so:
     *"some attributes of the server rendered HTML didn't match the client
     properties. This won't be patched up."* The picker was left showing Auto
     over a dark screen, for ever. */
  theme: Theme;
};

const JtraxContext = createContext<JtraxContextValue | null>(null);

export function JtraxProvider({
  children,
  /* Both resolved from the session cookie by app/(app)/layout, so the first
     HTML the browser gets already has the right pill pressed. */
  person,
  theme = "System",
}: {
  children: ReactNode;
  person: AdminPerson;
  theme?: Theme;
}) {
  const value = useMemo<JtraxContextValue>(
    () => ({ person, role: person.role, theme }),
    [person, theme],
  );

  return <JtraxContext.Provider value={value}>{children}</JtraxContext.Provider>;
}

export function useJtrax(): JtraxContextValue {
  const ctx = useContext(JtraxContext);
  if (!ctx) throw new Error("useJtrax must be used inside <JtraxProvider>");
  return ctx;
}
