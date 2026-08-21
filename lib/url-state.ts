/** Keeps a piece of screen state in the address bar.
 *
 * The console is one route per section with everything below it held in React
 * state, so opening a tournament, switching to its Results tab and pressing
 * reload used to land back on the list — the address never changed, so there
 * was nothing to come back to. Anything a person would expect a refresh (or a
 * shared link, or the Back button) to preserve belongs here.
 *
 * The initial value is threaded down from the server component's
 * `searchParams`, not read with `useSearchParams`: that hook would bail the
 * whole route out of server rendering, which is why `SectionRouter` already
 * passes its parameters down by hand. Writes go through `router.replace` —
 * opening a detail is not a page to be walked back through one control at a
 * time — and read the live query string at call time so two of these can
 * coexist without clobbering each other.
 */
"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function useUrlBackedState<T extends string>(
  key: string,
  initial: T,
  /** Parameters that only mean anything while this one is set — a detail's
      open tab is nonsense once the detail is closed. Cleared with it. */
  clearWith: string[] = [],
  /** "push" for things that feel like going somewhere (opening a row), so the
      browser Back button returns to the list. "replace" for sub-state within a
      screen (which tab is showing), or Back would walk back through every tab
      the person glanced at. */
  history: "push" | "replace" = "replace",
): [T, (next: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState<T>(initial);
  /* The URL can change without this component asking — the Back and Forward
     buttons do exactly that. When the value threaded down from the route
     differs from what is held here, the route wins: otherwise Back rewrites
     the address bar and leaves the detail sitting open on screen, which is
     worse than not supporting Back at all. (React's documented "adjust state
     when a prop changes" pattern; an effect would render the stale UI first.) */
  const [seen, setSeen] = useState<T>(initial);
  if (initial !== seen) {
    setSeen(initial);
    setValue(initial);
  }

  const set = useCallback(
    (next: T) => {
      setValue(next);
      const q = new URLSearchParams(
        typeof window === "undefined" ? "" : window.location.search,
      );
      if (!next) {
        q.delete(key);
        for (const k of clearWith) q.delete(k);
      } else q.set(key, next);
      const qs = q.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (history === "push") router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [router, pathname, key, clearWith, history],
  );

  return [value, set];
}
