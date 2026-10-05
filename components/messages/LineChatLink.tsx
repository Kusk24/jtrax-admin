"use client";

/* A record's LINE chat, for an InfoGrid row on a parent's or student's page:
   the chat the office linked from Messages, which opens there. A student
   without one of their own shows their parent's. "Not linked" when there is
   none; nothing at all when the LINE inbox cannot be read (not set up, or no
   access), so the row is never an error. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { chatFor, listConversations, type LineConversation } from "@/lib/line";
import { COLORS, FONT } from "@/lib/theme";

export function useLineChat(who: { studentId?: string; parentId?: string }) {
  const [state, setState] = useState<{ ready: boolean; chat: LineConversation | null }>({ ready: false, chat: null });
  const { studentId, parentId } = who;
  useEffect(() => {
    let alive = true;
    listConversations()
      .then((list) => alive && setState({ ready: true, chat: chatFor(list, { studentId, parentId }) }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [studentId, parentId]);
  return state;
}

export function LineChatLink({ chat }: { chat: LineConversation | null }) {
  const t = useTranslations("messages");
  const router = useRouter();
  if (!chat) return <span style={{ color: COLORS.textSecondary }}>{t("notLinked")}</span>;
  return (
    <button
      type="button"
      onClick={() => router.push(`/chat?id=${encodeURIComponent(chat.lineUserId)}`)}
      aria-label={t("openChat")}
      title={t("openChat")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontFamily: FONT,
        fontSize: "inherit",
        fontWeight: 600,
        color: COLORS.blue,
      }}
    >
      <Icon name="chat" size={14} color={COLORS.blue} />
      {chat.displayName || t("unnamedContact")}
    </button>
  );
}
