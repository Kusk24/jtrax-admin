/**
 * Real authentication against jtrax-backend.
 *
 * The session cookie stores the backend's opaque bearer token (httpOnly, so
 * client code never sees it). Server components resolve the signed-in admin
 * with `fetchMe`; browser CRUD calls go through the /api proxy route which
 * attaches the token server-side.
 */
import type { AdminPerson } from "./data";
import type { JtraxRole } from "./theme";

export const SESSION_COOKIE = "jtrax_session";

/** "Keep me signed in" swaps the browser-session cookie for a week-long one. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export const API_BASE = process.env.JTRAX_API_URL ?? "http://localhost:8790";

/** Identity shape returned by the backend's /auth endpoints. */
export type BackendIdentity = {
  userAccountId: string;
  email: string;
  role: string;
  displayName: string;
  languagePreference: string;
  themePreference: string;
  adminId?: string;
};

/* Roles map one-to-one, so the role on the sign-in matches the role the Admins
   page shows for the same person. */
function toConsoleRole(backendRole: string): JtraxRole {
  return backendRole === "Receptionist" ? "Receptionist" : "Admin";
}

export function identityToPerson(id: BackendIdentity): AdminPerson {
  const initials = id.displayName
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return {
    id: id.adminId ?? id.userAccountId,
    name: id.displayName,
    role: toConsoleRole(id.role),
    phone: "",
    email: id.email,
    lineId: "",
    branch: "Bangkok",
    lastLogin: "",
    createdDate: "",
    createdBy: "",
    status: "Active",
    initials,
  };
}

/**
 * Resolves a session token to the raw identity, or undefined.
 *
 * Separate from `fetchMe` because the root layout needs one field the console's
 * display type does not carry — the saved theme, which has to be on <html>
 * before anything paints.
 */
export async function fetchIdentity(token: string | undefined): Promise<BackendIdentity | undefined> {
  if (!token) return undefined;
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    const id = (await res.json()) as BackendIdentity;
    if (id.role !== "Admin" && id.role !== "Receptionist") return undefined; // console is staff-only
    return id;
  } catch {
    return undefined;
  }
}

/** Resolves a session token to the signed-in admin, or undefined. */
export async function fetchMe(token: string | undefined): Promise<AdminPerson | undefined> {
  try {
    const id = await fetchIdentity(token);
    if (!id) return undefined;
    return identityToPerson(id);
  } catch {
    return undefined;
  }
}
