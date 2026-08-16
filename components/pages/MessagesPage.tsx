"use client";

/* The LINE Official Account inbox.
 *
 * This screen ran on fixtures from the first build — the ER model has no
 * message table, so there was nothing to read, and a banner said so. It now
 * reads the academy's real LINE conversations: someone writes to the Official
 * Account, and the front desk answers here without opening the LINE app.
 *
 * Threads are LINE people, by their LINE name. Nothing links them to a parent
 * row — the `line_id` the ER model carries is a display handle and cannot be
 * used to send, so the right-hand panel shows the contact rather than a family.
 */
import { Fragment, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { chatTime, dayKey, type LineConversation, type LineMessage } from "@/lib/line";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf } from "@/lib/theme";
import { InfoGrid, SearchInput } from "../page-kit";
import { Avatar, Badge, Card, SectionTitle } from "../ui";
import { useInbox, type SendResult } from "../messages/useInbox";

const FILTERS = [
  { key: "all", labelKey: "filterAll" },
  { key: "unread", labelKey: "filterUnread" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

/* A LINE profile picture, falling back to initials.
   A plain <img>: the host is LINE's CDN, which would otherwise have to be
   allow-listed in the image config, and no referrer is sent with it.

   The fallback covers a *broken* URL as well as a missing one. LINE's picture
   URLs expire and the CDN is a third party we do not control, so a dead link is
   an ordinary state — and without onError it renders as a broken-image icon in
   the middle of the conversation list. */
function ContactAvatar({ contact, size }: { contact: LineConversation; size: number }) {
  const [broken, setBroken] = useState(false);
  const initials = <Avatar initials={initialsOf(contact.displayName || "?")} size={size} />;
  if (!contact.pictureUrl || broken) return initials;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={contact.pictureUrl}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    />
  );
}

export function MessagesPage() {
  const t = useTranslations("messages");
  const tCommon = useTranslations("common");
  const { conversations, selectedId, thread, loading, error, connection, unreadTotal, open, send } = useInbox();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<SendResult>("");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === "unread" && c.unread === 0) return false;
      if (q && !c.displayName.toLowerCase().includes(q) && !c.preview.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [conversations, filter, search]);

  const active = thread?.conversation ?? conversations.find((c) => c.lineUserId === selectedId) ?? null;
  const messages = thread?.messages ?? [];
  /* How many replies in this thread came out of the monthly allowance. The
     free ones did not, and the difference is the running cost of the feature. */
  const metered = messages.filter((m) => m.channel === "push" && m.delivery === "Sent").length;

  /* Non-text messages arrive with no body; the thread says what was sent
     rather than showing an empty bubble. */
  function bodyOf(m: LineMessage): string {
    if (m.kind === "text") return m.body;
    const key = `kind${m.kind[0].toUpperCase()}${m.kind.slice(1)}`;
    return t(key);
  }

  async function submit() {
    const text = draft.trim();
    if (!text || sending || !active?.followed) return;
    setSending(true);
    setSendError("");
    const reason = await send(text);
    setSending(false);
    if (reason) setSendError(reason);
    else setDraft("");
  }

  async function copyId() {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.lineUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard access can be refused; the id is on screen either way. */
    }
  }

  return (
    <div className="jt-chat-grid">
      {/* ---- conversation list ---- */}
      <Card style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 11, borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <SectionTitle>{t("conversations")}</SectionTitle>
            <Badge
              color={connection === "live" ? COLORS.line : COLORS.textSecondary}
              bg={connection === "live" ? "#E8F9EE" : COLORS.neutralBg}
            >
              {t(connection === "live" ? "live" : "offline")}
            </Badge>
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("searchPlaceholder")}
            label={t("searchLabel")}
          />
          <div style={{ display: "flex", gap: 7 }}>
            {FILTERS.map((f) => {
              const activeTab = f.key === filter;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 11px",
                    borderRadius: 999,
                    border: `1px solid ${activeTab ? COLORS.blue : COLORS.border}`,
                    background: activeTab ? COLORS.light : COLORS.surface,
                    color: activeTab ? COLORS.blue : COLORS.textSecondary,
                    fontFamily: FONT,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t(f.labelKey)}
                  {f.key === "unread" && unreadTotal > 0 && (
                    <span
                      style={{
                        padding: "0 6px",
                        borderRadius: 999,
                        background: COLORS.danger,
                        color: "#fff",
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      {unreadTotal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {loading && (
            <p style={{ padding: 20, margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary, textAlign: "center" }}>
              {tCommon("loading")}
            </p>
          )}
          {!loading && conversations.length === 0 && (
            <div style={{ padding: "26px 20px", textAlign: "center" }}>
              <Icon name="chat" size={26} color={COLORS.border} />
              <p style={{ margin: "10px 0 0", fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text }}>
                {t("emptyTitle")}
              </p>
              <p style={{ margin: "5px 0 0", fontFamily: FONT, fontSize: 13, lineHeight: 1.5, color: COLORS.textSecondary }}>
                {t("emptyBody")}
              </p>
            </div>
          )}
          {!loading && conversations.length > 0 && filtered.length === 0 && (
            <p style={{ padding: 20, margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary, textAlign: "center" }}>
              {t("noConversations")}
            </p>
          )}
          {filtered.map((c) => {
            const isActive = selectedId === c.lineUserId;
            return (
              <button
                key={c.lineUserId}
                type="button"
                onClick={() => open(c.lineUserId)}
                className="jt-find-row"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  width: "100%",
                  padding: "12px 14px",
                  border: "none",
                  borderBottom: `1px solid ${COLORS.border}`,
                  background: isActive ? COLORS.light : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <ContactAvatar contact={c} size={36} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        flex: 1,
                        fontFamily: FONT,
                        fontSize: 14.5,
                        fontWeight: c.unread > 0 ? 700 : 600,
                        color: COLORS.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.displayName || t("unnamedContact")}
                    </span>
                    {!c.followed && <Icon name="x" size={13} color={COLORS.textSecondary} />}
                    <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary, flexShrink: 0 }}>
                      {chatTime(c.lastMessageAt)}
                    </span>
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 4,
                      fontFamily: FONT,
                      fontSize: 13,
                      color: COLORS.textSecondary,
                    }}
                  >
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.previewFrom === "Out" ? `${t("youPrefix")} ` : ""}
                      {c.preview || (c.previewKind ? t(`kind${c.previewKind[0].toUpperCase()}${c.previewKind.slice(1)}`) : "")}
                    </span>
                    {c.unread > 0 && (
                      <span
                        style={{
                          padding: "1px 7px",
                          borderRadius: 999,
                          background: COLORS.danger,
                          color: "#fff",
                          fontSize: 11.5,
                          fontWeight: 700,
                        }}
                      >
                        {c.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ---- active thread ---- */}
      <Card style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        {active ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderBottom: `1px solid ${COLORS.border}` }}>
              <ContactAvatar contact={active} size={36} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
                  {active.displayName || t("unnamedContact")}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                  {t(active.followed ? "statusFollowing" : "statusBlocked")}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
              {messages.length === 0 && (
                <p style={{ margin: "auto", fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                  {t("noMessages")}
                </p>
              )}
              {messages.map((m, i) => {
                const mine = m.direction === "Out";
                const failed = m.delivery === "Failed";
                const newDay = i === 0 || dayKey(m.sentAt) !== dayKey(messages[i - 1].sentAt);
                return (
                  <Fragment key={m.id}>
                    {newDay && (
                      <div style={{ textAlign: "center", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary, margin: "4px 0" }}>
                        {dayLabel(m.sentAt, t)}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                      {!mine && <ContactAvatar contact={active} size={26} />}
                      <div style={{ maxWidth: "72%" }}>
                        <div
                          style={{
                            padding: "9px 13px",
                            borderRadius: 14,
                            borderBottomRightRadius: mine ? 4 : 14,
                            borderBottomLeftRadius: mine ? 14 : 4,
                            background: failed ? COLORS.dangerBg : mine ? COLORS.blue : COLORS.neutralBg,
                            color: failed ? COLORS.danger : mine ? "#fff" : COLORS.text,
                            border: failed ? `1px solid ${COLORS.danger}` : "none",
                            fontFamily: FONT,
                            fontSize: 14,
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                            fontStyle: m.kind === "text" ? "normal" : "italic",
                          }}
                        >
                          {bodyOf(m)}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            marginTop: 3,
                            justifyContent: mine ? "flex-end" : "flex-start",
                            fontFamily: FONT,
                            fontSize: 11.5,
                            color: failed ? COLORS.danger : COLORS.textSecondary,
                          }}
                        >
                          <span>{chatTime(m.sentAt)}</span>
                          {failed ? (
                            <>
                              <Icon name="alertTriangle" size={11} color={COLORS.danger} />
                              <span>{t(reasonKey(m.failureReason))}</span>
                            </>
                          ) : (
                            mine && m.channel && <span>· {t(m.channel === "reply" ? "viaReply" : "viaPush")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>

            {!active.followed && (
              <div
                role="note"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderTop: `1px solid ${COLORS.border}`,
                  background: COLORS.warningBg,
                  color: COLORS.warning,
                  fontFamily: FONT,
                  fontSize: 13,
                }}
              >
                <Icon name="alertTriangle" size={15} color={COLORS.warning} />
                {t("blockedNotice")}
              </div>
            )}

            {sendError && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderTop: `1px solid ${COLORS.border}`,
                  background: COLORS.dangerBg,
                  color: COLORS.danger,
                  fontFamily: FONT,
                  fontSize: 13,
                }}
              >
                <Icon name="alertTriangle" size={15} color={COLORS.danger} />
                {t(reasonKey(sendError))}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: 12, borderTop: `1px solid ${COLORS.border}` }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                disabled={!active.followed || sending}
                placeholder={t("replyPlaceholder")}
                aria-label={t("messageLabel")}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: `1px solid ${COLORS.border}`,
                  outline: "none",
                  fontFamily: FONT,
                  fontSize: 14.5,
                  color: COLORS.text,
                  background: active.followed ? COLORS.surface : COLORS.neutralBg,
                }}
              />
              <button
                type="button"
                onClick={() => void submit()}
                aria-label={t("send")}
                disabled={!draft.trim() || sending || !active.followed}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "none",
                  background: draft.trim() && !sending && active.followed ? COLORS.blue : COLORS.border,
                  cursor: draft.trim() && !sending && active.followed ? "pointer" : "not-allowed",
                  flexShrink: 0,
                }}
              >
                <Icon name="send" size={17} color="#fff" />
              </button>
            </div>
          </>
        ) : (
          <p style={{ padding: 28, margin: "auto", textAlign: "center", fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
            {error ? error : t("selectConversation")}
          </p>
        )}
      </Card>

      {/* ---- contact panel ---- */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 18, overflowY: "auto", minHeight: 0 }}>
        {active && (
          <>
            <div>
              <SectionTitle style={{ marginBottom: 11 }}>{t("contact")}</SectionTitle>
              <InfoGrid
                rows={[
                  { label: tCommon("name"), value: active.displayName || t("unnamedContact") },
                  {
                    label: tCommon("status"),
                    /* The short form: this column is ~110px wide in the
                       narrowest layout, and InfoGrid's label track is fixed, so
                       "Following the account" is clipped rather than wrapped.
                       The thread header above says it in full. */
                    value: (
                      <Badge
                        color={active.followed ? COLORS.success : COLORS.textSecondary}
                        bg={active.followed ? COLORS.successBg : COLORS.neutralBg}
                      >
                        {t(active.followed ? "statusFollowingShort" : "statusBlockedShort")}
                      </Badge>
                    ),
                  },
                  { label: t("lastMessage"), value: chatTime(active.lastMessageAt) },
                ]}
              />
            </div>

            <div>
              <SectionTitle style={{ marginBottom: 9 }}>{t("lineUserId")}</SectionTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "7px 10px",
                    borderRadius: 8,
                    background: COLORS.neutralBg,
                    fontSize: 12,
                    color: COLORS.textSecondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {active.lineUserId}
                </code>
                <button
                  type="button"
                  onClick={() => void copyId()}
                  aria-label={t("copyId")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.surface,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={copied ? "check" : "copy"} size={14} color={copied ? COLORS.success : COLORS.textSecondary} />
                </button>
              </div>
            </div>

            {/* Where the monthly allowance is going. Replies sent while the
                free window is open cost nothing; the rest are billed. */}
            <div>
              <SectionTitle style={{ marginBottom: 9 }}>{t("costTitle")}</SectionTitle>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, lineHeight: 1.55, color: COLORS.textSecondary }}>
                {t("costBody")}
              </p>
              <p style={{ margin: "8px 0 0", fontFamily: FONT, fontSize: 13, color: COLORS.text }}>
                {t("meteredInThread", { count: metered })}
              </p>
            </div>

            <div>
              <SectionTitle style={{ marginBottom: 9 }}>{t("notLinkedTitle")}</SectionTitle>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, lineHeight: 1.55, color: COLORS.textSecondary }}>
                {t("notLinkedBody")}
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function reasonKey(reason?: string): string {
  switch (reason) {
    case "quota":
      return "reasonQuota";
    case "blocked":
      return "reasonBlocked";
    case "invalid":
      return "reasonInvalid";
    default:
      return "reasonNetwork";
  }
}

/** "Today" / "Yesterday" / a date, as the heading between days in a thread. */
function dayLabel(iso: string, t: (key: string) => string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t("today");
  if (d.toDateString() === yesterday.toDateString()) return t("yesterday");
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
}
