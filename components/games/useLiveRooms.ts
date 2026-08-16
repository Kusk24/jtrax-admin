"use client";

/* Live data for the games console.

   `useLiveRooms` keeps the list fresh with a slow poll — a list has no single
   room to subscribe to, and a class produces a handful of rooms an hour, so a
   poll every few seconds costs nothing and avoids a stream per row.

   `useLiveRoom` uses the room's own event stream, because watching one board
   is exactly what SSE is for: the move appears as it is played. */
import { useCallback, useEffect, useRef, useState } from "react";
import { getRoom, listRooms, sortRooms, type GameDetail, type GameRoom } from "@/lib/games";

const LIST_POLL_MS = 5000;

export function useLiveRooms() {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setRooms(sortRooms(await listRooms()));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const id = setInterval(reload, LIST_POLL_MS);
    // Polling a hidden tab is pure waste; the next focus reloads anyway.
    const onVisible = () => document.visibilityState === "visible" && void reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  return { rooms, loading, error, reload };
}

export function useLiveRoom(roomId: string | null) {
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [connection, setConnection] = useState<"connecting" | "live" | "offline">("connecting");
  const plyRef = useRef(-1);

  const reload = useCallback(async () => {
    if (!roomId) return;
    try {
      const next = await getRoom(roomId);
      plyRef.current = next.moves.length;
      setDetail(next);
    } catch {
      /* The stream reports the connection; a failed read is not fatal here. */
    }
  }, [roomId]);

  useEffect(() => {
    setDetail(null);
    plyRef.current = -1;
    void reload();
  }, [roomId, reload]);

  useEffect(() => {
    if (!roomId) return;
    const source = new EventSource(`/api/game-rooms/${roomId}/events`);
    source.addEventListener("room", (ev) => {
      const snapshot = JSON.parse((ev as MessageEvent).data);
      setConnection("live");
      // The event carries the position but not the move list, so a change in
      // ply is what triggers the authorized read that fills the panel.
      if (snapshot.ply !== plyRef.current) {
        plyRef.current = snapshot.ply;
        void reload();
      } else {
        setDetail((d) => (d ? { ...d, room: { ...d.room, ...snapshot } } : d));
      }
    });
    source.onopen = () => setConnection("live");
    source.onerror = () => setConnection("offline");
    return () => source.close();
  }, [roomId, reload]);

  return { detail, connection, reload };
}
