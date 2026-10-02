"use client";

/* Which of a tournament's entries this desk has already looked at, so the
   Participants tab can show how many came in since. Kept in the browser: it
   is one person's "unread" count, not a fact about the tournament.

   The first time a tournament is opened here, everything already entered
   counts as seen — a badge reading 120 on a tournament nobody has opened on
   this computer says nothing useful. */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

const EVENT = "jt-seen-participants";
const keyOf = (tournamentId: string) => `jt-seen-participants:${tournamentId}`;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* Private window or storage off: the badge just never clears. */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** How many of `ids` are new to this browser, and a way to mark them seen. */
export function useNewParticipants(tournamentId: string, ids: string[]) {
  const key = keyOf(tournamentId);
  const raw = useSyncExternalStore(subscribe, () => read(key), () => "[]");
  const idsKey = ids.join(",");

  /* First visit: everything present now is the baseline. */
  useEffect(() => {
    if (raw === null) write(key, idsKey ? idsKey.split(",") : []);
  }, [raw, key, idsKey]);

  const count = useMemo(() => {
    if (raw === null) return 0;
    let seen: string[] = [];
    try {
      seen = JSON.parse(raw) as string[];
    } catch {
      return 0;
    }
    const set = new Set(seen);
    return ids.filter((id) => !set.has(id)).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey stands for ids
  }, [raw, idsKey]);

  const markSeen = useCallback(() => {
    write(key, idsKey ? idsKey.split(",") : []);
  }, [key, idsKey]);

  return { count, markSeen };
}
