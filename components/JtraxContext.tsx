"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { type AdminPerson } from "@/lib/data";
import { DEFAULT_CREDIT_RULES, type CreditRules } from "@/lib/derive";
import type { JtraxRole } from "@/lib/theme";

/* Who is signed in, resolved once from the session and never changed in the
   browser — the role comes from the backend account, so seeing another role
   means signing in as someone who has it.

   Credit rules live here too: Settings edits them and the dashboard's Needs
   Follow-up card reads them, so they have to outlive either page. */
type JtraxContextValue = {
  person: AdminPerson;
  role: JtraxRole;
  creditRules: CreditRules;
  setCreditRules: (rules: CreditRules) => void;
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
  const [creditRules, setCreditRules] = useState<CreditRules>(DEFAULT_CREDIT_RULES);

  const value = useMemo<JtraxContextValue>(
    () => ({ person, role: person.role, creditRules, setCreditRules }),
    [person, creditRules],
  );

  return <JtraxContext.Provider value={value}>{children}</JtraxContext.Provider>;
}

export function useJtrax(): JtraxContextValue {
  const ctx = useContext(JtraxContext);
  if (!ctx) throw new Error("useJtrax must be used inside <JtraxProvider>");
  return ctx;
}
