"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_SEED, type AdminPerson } from "@/lib/jtrax/data";
import { DEFAULT_CREDIT_RULES, type CreditRules } from "@/lib/jtrax/derive";
import { canRoleAccess } from "@/lib/jtrax/nav";
import type { JtraxRole } from "@/lib/jtrax/theme";

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

export function JtraxProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [person, setPersonState] = useState<AdminPerson>(ADMIN_SEED[0]);
  const [creditRules, setCreditRules] = useState<CreditRules>(DEFAULT_CREDIT_RULES);

  const setPerson = useCallback(
    (next: AdminPerson, currentSection: string) => {
      setPersonState(next);
      /* Ported from setUserRole: if the new role can't see where you are, go home. */
      if (!canRoleAccess(next.role, currentSection)) router.push("/jtrax");
    },
    [router],
  );

  const value = useMemo<JtraxContextValue>(
    () => ({ person, role: person.role, people: ADMIN_SEED, setPerson, creditRules, setCreditRules }),
    [person, setPerson, creditRules],
  );

  return <JtraxContext.Provider value={value}>{children}</JtraxContext.Provider>;
}

export function useJtrax(): JtraxContextValue {
  const ctx = useContext(JtraxContext);
  if (!ctx) throw new Error("useJtrax must be used inside <JtraxProvider>");
  return ctx;
}
