"use client";

/* Unread LINE messages across every chat, live, for the sidebar's badge.

   Reads the list once, then follows the same stream the Messages screen uses:
   each new message raises the count, and opening a chat (which marks it read)
   lowers it. Off for a role that cannot open Messages, and quietly 0 when
   LINE is not set up. */
import { useEffect, useState } from "react";
import { listConversations, type LineConversation } from "@/lib/line";

const total = (list: LineConversation[]) => list.reduce((n, c) => n + (c.unread || 0), 0);

export function useLineUnread(enabled: boolean): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    listConversations()
      .then((list) => alive && setCount(total(list)))
      .catch(() => {});
    if (typeof EventSource === "undefined") return () => {
      alive = false;
    };
    const source = new EventSource("/api/line/events");
    source.addEventListener("inbox", (ev) => {
      try {
        const snapshot = JSON.parse((ev as MessageEvent).data) as { conversations?: LineConversation[] };
        if (alive) setCount(total(snapshot.conversations ?? []));
      } catch {
        /* A malformed frame changes nothing. */
      }
    });
    return () => {
      alive = false;
      source.close();
    };
  }, [enabled]);
  return enabled ? count : 0;
}
