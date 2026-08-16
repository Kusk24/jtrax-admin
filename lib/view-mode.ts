/**
 * The list / card / calendar preference each list screen remembers.
 *
 * Stored per screen in localStorage and read through `useSyncExternalStore`.
 * An effect that copied the stored value into state would paint the wrong view
 * for a frame on every visit, and the console's lint rules reject a setState
 * called straight out of an effect.
 */
import { useCallback, useSyncExternalStore } from "react";

export type ViewMode = "list" | "card" | "calendar";

const PREFIX = "jtrax.view.";

const listeners = new Set<() => void>();
/* `getSnapshot` has to return the same value until something actually changes,
   so the parsed preference is cached rather than re-read on every render. */
const cache = new Map<string, ViewMode | null>();

function isMode(value: string | null): value is ViewMode {
  return value === "list" || value === "card" || value === "calendar";
}

function notify() {
  for (const listener of listeners) listener();
}

/* Another tab changing the preference should move this one too. Bound once,
   lazily, so importing the module on the server touches no browser API. */
let bound = false;
function bindStorage() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  window.addEventListener("storage", (e) => {
    if (!e.key?.startsWith(PREFIX)) return;
    cache.delete(e.key.slice(PREFIX.length));
    notify();
  });
}

function subscribe(onChange: () => void): () => void {
  bindStorage();
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function snapshot(key: string): ViewMode | null {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let stored: ViewMode | null = null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (isMode(raw)) stored = raw;
  } catch {
    /* Private-mode Safari throws on localStorage; the default view is fine. */
  }
  cache.set(key, stored);
  return stored;
}

function write(key: string, mode: ViewMode) {
  cache.set(key, mode);
  try {
    window.localStorage.setItem(PREFIX + key, mode);
  } catch {
    /* Not persisting is survivable; not switching the view is not. */
  }
  notify();
}

/**
 * The view this screen is in, and a setter that remembers the choice.
 * `options` is what the screen offers — the first is its default, and a stored
 * value the screen no longer offers falls back to it.
 */
export function useViewMode(
  key: string,
  options: readonly ViewMode[],
): [ViewMode, (mode: ViewMode) => void] {
  /* null on the server and during hydration: the first paint is the default
     view for everyone, and the stored choice lands in the render after. */
  const stored = useSyncExternalStore(subscribe, () => snapshot(key), () => null);
  const mode = stored && options.includes(stored) ? stored : options[0];
  const set = useCallback((next: ViewMode) => write(key, next), [key]);
  return [mode, set];
}
