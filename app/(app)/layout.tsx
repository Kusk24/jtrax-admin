import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JtraxProvider } from "@/components/JtraxContext";
import { ErrorToastProvider } from "@/components/ErrorToast";
import { DataProvider } from "@/components/DataProvider";
import { JtraxShell } from "@/components/JtraxShell";
import { SESSION_COOKIE, fetchIdentity, identityToPerson } from "@/lib/auth";
import { toTheme } from "@/lib/theme";

/**
 * The guard for every signed-in screen: no session cookie, no shell — straight
 * to /login. `/login` sits outside this group, so it renders on its own.
 *
 * The account resolved here is the one the whole console runs as, name, role
 * and all — there is no way to become anyone else without signing in again.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  /* The identity rather than just the person, because the account's saved
     theme has to reach the picker from the server. Resolving it in the browser
     is what left the pill stuck on Auto: see JtraxContext. */
  const me = await fetchIdentity(store.get(SESSION_COOKIE)?.value).catch(() => undefined);
  if (!me) redirect("/login");
  const person = identityToPerson(me);

  return (
    <JtraxProvider person={person} theme={toTheme(me.themePreference)}>
      <ErrorToastProvider>
        <DataProvider>
          <JtraxShell>{children}</JtraxShell>
        </DataProvider>
      </ErrorToastProvider>
    </JtraxProvider>
  );
}
