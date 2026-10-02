/**
 * Whether an optional part of a screen is shown — a chart a user can switch
 * off and expect to stay off.
 *
 * The same shape as `view-mode.ts`: stored per key in localStorage and read
 * through `useSyncExternalStore`, so the stored choice lands without a frame of
 * the wrong state and without a setState called out of an effect.
 */
import { useCallback, useSyncExternalStore } from "react";

const PREFIX = "jtrax.shown.";

const listeners = new Set<() => void>();
const cache = new Map<string, boolean | null>();

function notify() {
  for (const listener of listeners) listener();
}

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

function snapshot(key: string): boolean | null {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let stored: boolean | null = null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === "on") stored = true;
    else if (raw === "off") stored = false;
  } catch {
    /* Private-mode Safari throws on localStorage; the default is fine. */
  }
  cache.set(key, stored);
  return stored;
}

function write(key: string, shown: boolean) {
  cache.set(key, shown);
  try {
    window.localStorage.setItem(PREFIX + key, shown ? "on" : "off");
  } catch {
    /* Not persisting is survivable; not switching is not. */
  }
  notify();
}

/** Whether the part is shown, and a setter that remembers the choice. */
export function useShown(key: string, byDefault = true): [boolean, (shown: boolean) => void] {
  const stored = useSyncExternalStore(subscribe, () => snapshot(key), () => null);
  const set = useCallback((next: boolean) => write(key, next), [key]);
  return [stored ?? byDefault, set];
}
