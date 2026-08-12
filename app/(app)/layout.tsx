import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JtraxProvider } from "@/components/JtraxContext";
import { DataProvider } from "@/components/DataProvider";
import { JtraxShell } from "@/components/JtraxShell";
import { SESSION_COOKIE, fetchMe } from "@/lib/auth";

/**
 * The guard for every signed-in screen: no session cookie, no shell — straight
 * to /login. `/login` sits outside this group, so it renders on its own.
 *
 * The account resolved here is the one the whole console runs as, name, role
 * and all — there is no way to become anyone else without signing in again.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const person = await fetchMe(store.get(SESSION_COOKIE)?.value);
  if (!person) redirect("/login");

  return (
    <JtraxProvider person={person}>
      <DataProvider>
        <JtraxShell>{children}</JtraxShell>
      </DataProvider>
    </JtraxProvider>
  );
}
