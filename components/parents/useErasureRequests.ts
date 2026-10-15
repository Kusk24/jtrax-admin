"use client";

/**
 * The guardians whose families have asked to be erased and are still waiting,
 * for the indicators outside a guardian's page: the nav badge on Parents and
 * the marks in the list. Re-read every minute, when the tab comes back into
 * view, and straight after the office acts on one.
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DATA_REQUESTS_CHANGED, openErasureParents, type DataRequest } from "@/lib/data-requests";

const EVERY_MS = 60_000;

export function useErasureRequests(enabled = true): Set<string> {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () => {
      api
        .get<DataRequest[]>("data-requests")
        .then((rows) => alive && setOpen(openErasureParents(rows)))
        .catch(() => {
          /* The badge is a convenience; a failed read leaves the last count. */
        });
    };
    load();
    const timer = setInterval(load, EVERY_MS);
    const onFocus = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener(DATA_REQUESTS_CHANGED, load);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener(DATA_REQUESTS_CHANGED, load);
    };
  }, [enabled]);
  return open;
}
