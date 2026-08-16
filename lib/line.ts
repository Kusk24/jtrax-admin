/**
 * LINE Official Account inbox: types and reads for the Messages screen.
 *
 * Kept out of `live.ts` for the same reason `games.ts` is — a LINE thread is
 * not part of the ER model that file maps. It is a conversation with people who
 * may have no JTrax account at all, with its own endpoints and its own
 * camelCase shape rather than raw table columns.
 */
import { api } from "./api";

/** One person's 1:1 chat with the academy's LINE account. */
export type LineConversation = {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  /** False once they block the account. Sending to a blocked contact fails. */
  followed: boolean;
  lastMessageAt: string;
  unread: number;
  preview: string;
  previewKind?: LineMessageKind;
  previewFrom?: "In" | "Out";
};

export type LineMessageKind =
  | "text" | "sticker" | "image" | "video" | "audio" | "file" | "location" | "other";

export type LineMessage = {
  id: string;
  direction: "In" | "Out";
  kind: LineMessageKind;
  body: string;
  sentAt: string;
  /** Which member of staff sent it. Absent on inbound. */
  sentBy?: string;
  /** How it went out: a free reply, or a metered push. Absent on inbound. */
  channel?: "reply" | "push";
  delivery: "Sent" | "Failed";
  failureReason?: LineFailureReason;
};

export type LineFailureReason = "quota" | "blocked" | "invalid" | "network";

export type LineThread = { conversation: LineConversation; messages: LineMessage[] };

export type LineChannel = {
  configured: boolean;
  /** Whether the server holds a key to encrypt credentials with. */
  sealingKeySet: boolean;
  webhookUrl: string;
  tokenHint?: string;
  updatedAt?: string;
  /** Live from LINE. Absent when LINE could not be reached. */
  quota?: { limited: boolean; limit: number; used: number };
};

export const listConversations = () => api.get<LineConversation[]>("line/conversations");
export const getThread = (id: string) => api.get<LineThread>(`line/conversations/${id}`);
export const sendMessage = (id: string, text: string) =>
  api.post<LineMessage>(`line/conversations/${id}/messages`, { text });
export const markRead = (id: string) => api.post(`line/conversations/${id}/read`, {});

export const getChannel = () => api.get<LineChannel>("line/channel");
export const saveChannel = (accessToken: string, channelSecret: string) =>
  api.put<{ configured: boolean; tokenHint: string }>("line/channel", { accessToken, channelSecret });
export const removeChannel = () => api.del<{ configured: boolean }>("line/channel");

/** Newest first, with anything unread pulled to the top. */
export function sortConversations(list: LineConversation[]): LineConversation[] {
  return [...list].sort(
    (a, b) =>
      Number(b.unread > 0) - Number(a.unread > 0) ||
      b.lastMessageAt.localeCompare(a.lastMessageAt),
  );
}

/** "9:58 AM" for today, "12 Aug" before that — a thread runs for months. */
export function chatTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).format(d)
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d);
}

/** The day heading a message belongs under. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toDateString();
}
