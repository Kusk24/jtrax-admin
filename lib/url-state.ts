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

import { useCallback, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

/* The query string the last write asked for, until the address catches up.
   router.replace lands after the click handler returns, so a handler that
   sets a filter and then resets the page would build the second address from
   the stale one and drop the filter. Forgotten once the address matches, and
   on Back/Forward, which make the address the truth again. */
let pending: { path: string; search: string } | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    pending = null;
  });
}

/** The query string to build the next address from. Exported for tests. */
export function liveSearch(path: string, current: string): string {
  if (pending && pending.path === path && pending.search !== current) return pending.search;
  pending = null;
  return current;
}

/** Records the query string a write just asked for. Exported for tests. */
export function rememberWrite(path: string, search: string) {
  pending = { path, search };
}

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
): [T, (next: T, how?: "push" | "replace") => void] {
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
    /* `how` overrides the default for one write: opening a game is a place
       Back should return from, stepping to the next game in it is not. */
    (next: T, how: "push" | "replace" = history) => {
      setValue(next);
      const q = new URLSearchParams(
        typeof window === "undefined" ? "" : liveSearch(pathname, window.location.search),
      );
      if (!next) {
        q.delete(key);
        for (const k of clearWith) q.delete(k);
      } else q.set(key, next);
      const qs = q.toString();
      rememberWrite(pathname, qs ? `?${qs}` : "");
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (how === "push") router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [router, pathname, key, clearWith, history],
  );

  return [value, set];
}

/** A page number from the address — 1-based there, 0-based on screen; junk
    reads as the first page. */
export function pageFrom(raw: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 1 ? n - 1 : 0;
}

/** The address form of a page: "" for the first, so the plain address stays
    plain. */
export function pageParam(page: number): string {
  return page > 0 ? String(page + 1) : "";
}

/* What is typed into a list's search box, kept for this tab across a reload.
   Never the address: it is usually a child's name, and addresses end up in
   server logs and browser history. Read through useSyncExternalStore, as
   view-mode reads its preferences, because the console's lint rules reject an
   effect copying storage into state. */
const TYPED = "jtrax.typed.";
const typedListeners = new Set<() => void>();
const typedCache = new Map<string, string>();

function subscribeTyped(onChange: () => void): () => void {
  typedListeners.add(onChange);
  return () => typedListeners.delete(onChange);
}

function typedSnapshot(key: string): string {
  const hit = typedCache.get(key);
  if (hit !== undefined) return hit;
  let stored = "";
  try {
    stored = window.sessionStorage.getItem(TYPED + key) ?? "";
  } catch {
    /* Storage refused: the box starts empty, as it always did. */
  }
  typedCache.set(key, stored);
  return stored;
}

/** A search box's text, kept for this tab. */
export function useSessionText(key: string): [string, (next: string) => void] {
  const value = useSyncExternalStore(subscribeTyped, () => typedSnapshot(key), () => "");
  const set = useCallback(
    (next: string) => {
      typedCache.set(key, next);
      try {
        if (next) window.sessionStorage.setItem(TYPED + key, next);
        else window.sessionStorage.removeItem(TYPED + key);
      } catch {
        /* Not persisting is survivable; not updating the box is not. */
      }
      for (const listener of typedListeners) listener();
    },
    [key],
  );
  return [value, set];
}
