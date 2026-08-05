import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JtraxProvider } from "@/components/JtraxContext";
import { JtraxShell } from "@/components/JtraxShell";
import { SESSION_COOKIE, findAdminById } from "@/lib/auth";

/**
 * The guard for every signed-in screen: no session cookie, no shell — straight
 * to /login. `/login` sits outside this group, so it renders on its own.
 *
 * The signed-in admin also seeds the role switcher, so the app opens as whoever
 * actually signed in rather than always as the first seed admin.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const person = findAdminById(store.get(SESSION_COOKIE)?.value);
  if (!person) redirect("/login");

  return (
    <JtraxProvider initialPerson={person}>
      <JtraxShell>{children}</JtraxShell>
    </JtraxProvider>
  );
}
