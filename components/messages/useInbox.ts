"use client";

/* Live state for the LINE inbox.

   Two rules, learned the hard way on the game board:

   1. **Never re-read what the server just told us.** Every inbox event carries
      the whole conversation list, so an event is applied directly — there is no
      follow-up GET. Only the open thread, which the event does not carry, is
      fetched, and only when its last message actually moved.
   2. **Never let a stale response win.** The open thread is reloaded only when
      the snapshot's `lastMessageAt` differs from what is already on screen,
      which is also what stops a mark-read from looping: clearing the badge
      publishes an event, and without that guard the event would clear it
      again, for ever. */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  getThread, listConversations, markRead, sendMessage, sortConversations,
  type LineConversation, type LineFailureReason, type LineMessage, type LineThread,
} from "@/lib/line";

export type SendResult = "" | LineFailureReason;

export function useInbox() {
  const [conversations, setConversations] = useState<LineConversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [thread, setThread] = useState<LineThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<"connecting" | "live" | "offline">("connecting");

  // Refs, not state: the stream handler is created once and would otherwise
  // close over the selection as it was when the stream opened.
  const selectedRef = useRef("");
  const lastAtRef = useRef("");

  const loadThread = useCallback(async (id: string) => {
    if (!id) {
      setThread(null);
      return;
    }
    try {
      const next = await getThread(id);
      lastAtRef.current = next.conversation.lastMessageAt;
      setThread(next);
    } catch {
      /* The list is still usable; the banner reports a broken connection. */
    }
  }, []);

  const open = useCallback(
    (id: string) => {
      selectedRef.current = id;
      setSelectedId(id);
      setThread(null);
      void loadThread(id);
      // Clear the badge locally as well as on the server, so the row responds
      // to the click rather than to the round trip.
      setConversations((prev) => prev.map((c) => (c.lineUserId === id ? { ...c, unread: 0 } : c)));
      void markRead(id).catch(() => {});
    },
    [loadThread],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = sortConversations(await listConversations());
        if (cancelled) return;
        setConversations(list);
        setError("");
        if (list.length > 0) open(list[0].lineUserId);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once: `open` is stable and re-selecting on every change would fight
    // the user's own choice of thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/line/events");

    source.addEventListener("inbox", (ev) => {
      const snapshot = JSON.parse((ev as MessageEvent).data) as {
        conversations: LineConversation[];
        changed: string;
      };
      setConnection("live");
      setConversations(sortConversations(snapshot.conversations ?? []));

      if (!snapshot.changed || snapshot.changed !== selectedRef.current) return;
      const conv = snapshot.conversations?.find((c) => c.lineUserId === snapshot.changed);
      if (!conv) return;
      if (conv.lastMessageAt !== lastAtRef.current) {
        lastAtRef.current = conv.lastMessageAt;
        void loadThread(snapshot.changed);
      }
      // Reading a thread that is already open should not leave a badge behind.
      // Guarded on the incoming count so the resulting event does not come
      // back round and trigger this again.
      if (conv.unread > 0) void markRead(snapshot.changed).catch(() => {});
    });

    source.onopen = () => setConnection("live");
    // EventSource reconnects on its own; this only reflects the gap in the UI.
    source.onerror = () => setConnection("offline");
    return () => source.close();
  }, [loadThread]);

  /** Sends a reply. Returns "" on success, or why it could not be delivered. */
  const send = useCallback(
    async (text: string): Promise<SendResult> => {
      const id = selectedRef.current;
      if (!id || !text.trim()) return "";
      const append = (m: LineMessage) =>
        setThread((t) => (t && t.conversation.lineUserId === id ? { ...t, messages: [...t.messages, m] } : t));
      try {
        const sent = await sendMessage(id, text.trim());
        append(sent);
        // The server will publish this same message; recording its instant here
        // stops the echo from causing a redundant re-read of the thread.
        lastAtRef.current = sent.sentAt;
        return "";
      } catch (e) {
        if (e instanceof ApiError) {
          const body = e.body as { reason?: LineFailureReason; message?: LineMessage } | undefined;
          // A message that could not be delivered is still shown, marked
          // failed. "Did she get it?" is what this screen is for, and a reply
          // that quietly vanished answers it wrongly.
          if (body?.message) {
            append(body.message);
            lastAtRef.current = body.message.sentAt;
          }
          return body?.reason ?? "network";
        }
        return "network";
      }
    },
    [],
  );

  const unreadTotal = conversations.reduce((n, c) => n + c.unread, 0);

  return { conversations, selectedId, thread, loading, error, connection, unreadTotal, open, send };
}
