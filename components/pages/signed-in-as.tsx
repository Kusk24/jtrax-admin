/**
 * A signed-in person, for tests that render a whole page.
 *
 * The console always has one — `app/(app)/layout` resolves them from the session
 * cookie — and screens read their role to decide what to offer. A test that
 * renders without a provider is testing a state production never reaches, and
 * `useJtrax` throws rather than guessing, so the provider has to be here too.
 *
 * Role is a parameter because that is the interesting axis: the same screen
 * shows a different set of actions to an admin and to a receptionist, and both
 * are worth asserting.
 */
import type { ReactNode } from "react";
import type { AdminPerson } from "@/lib/data";
import type { JtraxRole } from "@/lib/theme";
import { JtraxProvider } from "../JtraxContext";

export function personWithRole(role: JtraxRole): AdminPerson {
  return {
    id: "adm_test",
    accountId: "usr_test",
    name: "Test Office",
    role,
    phone: "",
    email: "office@jca.ac.th",
    lineId: "",
    branch: "Bangkok",
    lastLogin: "—",
    createdDate: "",
    createdBy: "",
    status: "Active",
    initials: "TO",
  };
}

export function SignedInAs({ role = "Admin", children }: { role?: JtraxRole; children: ReactNode }) {
  return <JtraxProvider person={personWithRole(role)}>{children}</JtraxProvider>;
}
