"use client";

/* Which of a tournament's entries this desk has already looked at — the
   Participants tab's badge, and the public sign-up queue above the roster,
   each keep their own record of this under their own namespace so marking
   one seen does not clear the other's. Kept in the browser: it is one
   person's "unread" set, not a fact about the tournament.

   The first time a tournament is opened here, everything already entered
   counts as seen — a badge reading 120 on a tournament nobody has opened on
   this computer says nothing useful. */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

const eventOf = (namespace: string) => `jt-seen-${namespace}`;
const keyOf = (namespace: string, tournamentId: string) => `jt-seen-${namespace}:${tournamentId}`;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(namespace: string, key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* Private window or storage off: the badge just never clears. */
  }
  window.dispatchEvent(new Event(eventOf(namespace)));
}

function subscribeTo(namespace: string) {
  return (onChange: () => void) => {
    const event = eventOf(namespace);
    window.addEventListener(event, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(event, onChange);
      window.removeEventListener("storage", onChange);
    };
  };
}

/** Which of `ids` are new to this browser under `namespace`, their count,
    and a way to mark them seen. Two namespaces for the same tournament and
    the same ids track independently — the Participants tab badge marking
    itself seen does not clear the sign-up queue's own "new" list, and the
    other way round.

    `baselineOnFirstVisit` is the badge's own rule — a number is alarming the
    first time it is ever seen, so the first visit counts everything present
    as already seen rather than as 120 new. A list has the opposite problem:
    showing nothing the first time a tournament is opened would look like a
    bug, not a courtesy, so the sign-up queue passes `false` and starts from
    an empty seen set instead — everything shows once, same as before this
    existed, and only entries that arrive after the office's first look count
    as new on the next one. */
export function useNewParticipants(
  tournamentId: string,
  ids: string[],
  namespace = "participants",
  baselineOnFirstVisit = true,
) {
  const key = keyOf(namespace, tournamentId);
  const subscribe = useMemo(() => subscribeTo(namespace), [namespace]);
  const raw = useSyncExternalStore(subscribe, () => read(key), () => "[]");
  const idsKey = ids.join(",");

  useEffect(() => {
    if (raw === null && baselineOnFirstVisit) write(namespace, key, idsKey ? idsKey.split(",") : []);
  }, [raw, namespace, key, idsKey, baselineOnFirstVisit]);

  const newIds = useMemo(() => {
    if (raw === null) return baselineOnFirstVisit ? [] : ids;
    let seen: string[] = [];
    try {
      seen = JSON.parse(raw) as string[];
    } catch {
      return baselineOnFirstVisit ? [] : ids;
    }
    const set = new Set(seen);
    return ids.filter((id) => !set.has(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey stands for ids
  }, [raw, idsKey, baselineOnFirstVisit]);

  const markSeen = useCallback(() => {
    write(namespace, key, idsKey ? idsKey.split(",") : []);
  }, [namespace, key, idsKey]);

  return { count: newIds.length, newIds, markSeen };
}
