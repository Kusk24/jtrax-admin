"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { type AdminPerson } from "@/lib/data";
import { DEFAULT_CREDIT_RULES, type CreditRules } from "@/lib/derive";
import { canRoleAccess } from "@/lib/nav";
import type { JtraxRole } from "@/lib/theme";

/* The mockup switches "role" by switching to a specific person, each of whom
   carries a role — hence people, not a bare role enum.

   Credit rules live here too: Settings edits them and the dashboard's Needs
   Follow-up card reads them, so they have to outlive either page. */
type JtraxContextValue = {
  person: AdminPerson;
  role: JtraxRole;
  people: AdminPerson[];
  setPerson: (person: AdminPerson, currentSection: string) => void;
  creditRules: CreditRules;
  setCreditRules: (rules: CreditRules) => void;
};

const JtraxContext = createContext<JtraxContextValue | null>(null);

export function JtraxProvider({
  children,
  /* Whoever signed in, resolved from the session cookie by app/(app)/layout. */
  initialPerson,
}: {
  children: ReactNode;
  initialPerson: AdminPerson;
}) {
  const router = useRouter();
  const [person, setPersonState] = useState<AdminPerson>(initialPerson);
  const [creditRules, setCreditRules] = useState<CreditRules>(DEFAULT_CREDIT_RULES);

  const setPerson = useCallback(
    (next: AdminPerson, currentSection: string) => {
      setPersonState(next);
      /* Ported from setUserRole: if the new role can't see where you are, go home. */
      if (!canRoleAccess(next.role, currentSection)) router.push("/");
    },
    [router],
  );

  const value = useMemo<JtraxContextValue>(
    () => ({ person, role: person.role, people: [person], setPerson, creditRules, setCreditRules }),
    [person, setPerson, creditRules],
  );

  return <JtraxContext.Provider value={value}>{children}</JtraxContext.Provider>;
}

export function useJtrax(): JtraxContextValue {
  const ctx = useContext(JtraxContext);
  if (!ctx) throw new Error("useJtrax must be used inside <JtraxProvider>");
  return ctx;
}
