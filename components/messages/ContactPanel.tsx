"use client";

/* The right-hand panel of the Messages screen: who the chat is with, their
   LINE user ID, and the JTrax parent or student it is linked to. The link is
   what puts this chat on that record's page; pressing it goes there. */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { chatTime, linkConversation, type LineConversation } from "@/lib/line";
import { COLORS, FONT } from "@/lib/theme";
import { ErrorNote, errorText } from "../crud";
import { InfoGrid, secondaryButtonStyle } from "../page-kit";
import { Badge, SectionTitle } from "../ui";
import { LinkAccountModal, type LinkTarget } from "./LinkAccountModal";

export function ContactPanel({
  contact,
  conversations,
  onRelinked,
}: {
  contact: LineConversation;
  conversations: LineConversation[];
  onRelinked: (c: LineConversation) => void;
}) {
  const t = useTranslations("messages");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");

  /* Records another chat already holds — the picker greys them out. */
  const taken = useMemo(
    () =>
      new Set(
        conversations
          .filter((c) => c.lineUserId !== contact.lineUserId)
          .flatMap((c) => [c.parentId, c.studentId].filter((x): x is string => !!x)),
      ),
    [conversations, contact.lineUserId],
  );

  async function copyId() {
    try {
      await navigator.clipboard.writeText(contact.lineUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard access can be refused; the id is on screen either way. */
    }
  }

  async function link(to: LinkTarget) {
    const next = await linkConversation(contact.lineUserId, to);
    onRelinked(next);
    setPicking(false);
  }

  async function unlink() {
    setError("");
    try {
      await link({});
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    }
  }

  const linkedHref = contact.parentId
    ? `/parents?id=${encodeURIComponent(contact.parentId)}`
    : contact.studentId
      ? `/students?id=${encodeURIComponent(contact.studentId)}`
      : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionTitle style={{ marginBottom: -3 }}>{t("contact")}</SectionTitle>
      {error && <ErrorNote>{error}</ErrorNote>}
      <InfoGrid
        rows={[
          { label: tCommon("name"), value: contact.displayName || t("unnamedContact") },
          {
            label: t("lineUserId"),
            value: (
              <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <code
                  title={contact.lineUserId}
                  style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: COLORS.textSecondary }}
                >
                  {contact.lineUserId}
                </code>
                <button
                  type="button"
                  onClick={() => void copyId()}
                  aria-label={t("copyId")}
                  title={t("copyId")}
                  style={{ display: "inline-flex", padding: 4, border: "none", background: "transparent", cursor: "pointer", flexShrink: 0 }}
                >
                  <Icon name={copied ? "check" : "copy"} size={13} color={copied ? COLORS.success : COLORS.textSecondary} />
                </button>
              </span>
            ),
          },
          {
            label: tCommon("status"),
            /* The short form: this column is narrow and InfoGrid's label track
               is fixed. The thread header says it in full. */
            value: (
              <Badge
                color={contact.followed ? COLORS.success : COLORS.textSecondary}
                bg={contact.followed ? COLORS.successBg : COLORS.neutralBg}
              >
                {t(contact.followed ? "statusFollowingShort" : "statusBlockedShort")}
              </Badge>
            ),
          },
          { label: t("lastMessage"), value: chatTime(contact.lastMessageAt) },
        ]}
      />

      {linkedHref ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("linkedTo")}</span>
          <button
            type="button"
            onClick={() => router.push(linkedHref)}
            aria-label={t("openLinked", { name: contact.linkedName ?? "" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: FONT,
            }}
          >
            <Icon name={contact.parentId ? "parents" : "students"} size={16} color={COLORS.blue} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {contact.linkedName}
            </span>
            <Badge color={COLORS.blue} bg={COLORS.light}>{t(contact.parentId ? "roleParent" : "roleStudent")}</Badge>
            <Icon name="chevronRight" size={14} color={COLORS.textSecondary} />
          </button>
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" className="jt-btn-ghost" style={{ ...secondaryButtonStyle, padding: "5px 10px", fontSize: 12.5 }} onClick={() => setPicking(true)}>
              {t("changeLink")}
            </button>
            <button type="button" className="jt-btn-ghost" style={{ ...secondaryButtonStyle, padding: "5px 10px", fontSize: 12.5 }} onClick={() => void unlink()}>
              {t("unlink")}
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          className="jt-btn-ghost"
          onClick={() => setPicking(true)}
          style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Icon name="link" size={14} /> {t("linkAccount")}
        </button>
      )}

      {picking && (
        <LinkAccountModal
          chatName={contact.displayName || t("unnamedContact")}
          taken={taken}
          onLink={link}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
