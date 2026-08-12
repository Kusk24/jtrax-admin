"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
/* The only screen still on fixtures: the ER model has no message table, so
   there is nothing to read. Everything here lives in component state and is
   gone on reload — the banner below says so rather than letting the screen
   pass for a working inbox. */
import { CONVERSATIONS_SEED, type ChatMessage, type Conversation } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import { InfoGrid, SearchInput } from "../page-kit";
import { Avatar, Badge, Card, SectionTitle } from "../ui";

const FILTERS = [
  { key: "all", labelKey: "filterAll" },
  { key: "unread", labelKey: "filterUnread" },
  { key: "starred", labelKey: "filterStarred" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

export function MessagesPage() {
  const t = useTranslations("messages");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS_SEED);
  const [selectedId, setSelectedId] = useState(CONVERSATIONS_SEED[0]?.id ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === "unread" && c.unread === 0) return false;
      if (filter === "starred" && !c.starred) return false;
      if (q && !c.name.toLowerCase().includes(q) && !(c.student ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [conversations, filter, search]);

  const active = conversations.find((c) => c.id === selectedId) ?? filtered[0] ?? null;
  const unreadTotal = conversations.reduce((n, c) => n + c.unread, 0);

  function send() {
    if (!draft.trim() || !active) return;
    const message: ChatMessage = {
      from: "me",
      text: draft.trim(),
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, message], unread: 0 } : c)),
    );
    setDraft("");
  }

  function openConversation(id: string) {
    setSelectedId(id);
    /* Opening a thread clears its unread badge, as in the mockup. */
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }

  return (
    <>
      <div
        role="note"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginBottom: 12,
          padding: "10px 13px",
          borderRadius: 10,
          background: COLORS.warningBg,
          color: COLORS.warning,
          fontFamily: FONT,
          fontSize: 13.5,
          lineHeight: 1.45,
        }}
      >
        <Icon name="alertTriangle" size={16} color={COLORS.warning} />
        {t("previewNotice")}
      </div>
    <div className="jt-chat-grid">
      {/* ---- conversation list ---- */}
      <Card style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 11, borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <SectionTitle>{t("conversations")}</SectionTitle>
            <Badge color={COLORS.line} bg="#E8F9EE">
              {t("syncedWithLine")}
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
          {filtered.length === 0 && (
            <p style={{ padding: 20, margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary, textAlign: "center" }}>
              {t("noConversations")}
            </p>
          )}
          {filtered.map((c) => {
            const isActive = active?.id === c.id;
            const last = c.messages[c.messages.length - 1];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => openConversation(c.id)}
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
                <Avatar initials={initialsOf(c.name)} size={36} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        flex: 1,
                        fontFamily: FONT,
                        fontSize: 14.5,
                        fontWeight: 600,
                        color: COLORS.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </span>
                    {c.starred && <Icon name="star" size={13} color="#DDB874" />}
                    <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>{c.time}</span>
                  </span>
                  {c.student && (
                    <span style={{ display: "block", marginTop: 2, fontFamily: FONT, fontSize: 12.5, color: COLORS.blue }}>
                      {c.student}
                    </span>
                  )}
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 3,
                      fontFamily: FONT,
                      fontSize: 13,
                      color: COLORS.textSecondary,
                    }}
                  >
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {last?.text ?? ""}
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
              <Avatar initials={initialsOf(active.name)} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>{active.name}</div>
                <div style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                  {active.student ? t("parentOf", { student: active.student }) : t("noLinkedStudent")}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
              <div style={{ textAlign: "center", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                {t("today")}
              </div>
              {active.messages.map((m, i) => {
                const mine = m.from === "me";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: mine ? "flex-end" : "flex-start",
                      gap: 8,
                      alignItems: "flex-end",
                    }}
                  >
                    {!mine && <Avatar initials={initialsOf(active.name)} size={26} />}
                    <div style={{ maxWidth: "72%" }}>
                      <div
                        style={{
                          padding: "9px 13px",
                          borderRadius: 14,
                          borderBottomRightRadius: mine ? 4 : 14,
                          borderBottomLeftRadius: mine ? 14 : 4,
                          background: mine ? COLORS.blue : COLORS.neutralBg,
                          color: mine ? "#fff" : COLORS.text,
                          fontFamily: FONT,
                          fontSize: 14,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}
                      >
                        {m.text}
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          textAlign: mine ? "right" : "left",
                          fontFamily: FONT,
                          fontSize: 11.5,
                          color: COLORS.textSecondary,
                        }}
                      >
                        {m.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: 12, borderTop: `1px solid ${COLORS.border}` }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
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
                }}
              />
              <button
                type="button"
                onClick={send}
                aria-label={t("send")}
                disabled={!draft.trim()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "none",
                  background: draft.trim() ? COLORS.blue : COLORS.border,
                  cursor: draft.trim() ? "pointer" : "not-allowed",
                  flexShrink: 0,
                }}
              >
                <Icon name="send" size={17} color="#fff" />
              </button>
            </div>
          </>
        ) : (
          <p style={{ padding: 28, margin: 0, textAlign: "center", fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
            {t("selectConversation")}
          </p>
        )}
      </Card>

      {/* ---- info panel ---- */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 18, overflowY: "auto", minHeight: 0 }}>
        {active && (
          <>
            <div>
              <SectionTitle style={{ marginBottom: 11 }}>{t("parentInformation")}</SectionTitle>
              <InfoGrid
                rows={[
                  { label: tCommon("name"), value: active.name },
                  { label: tCommon("phone"), value: active.phone },
                  { label: tCommon("email"), value: active.email },
                  ...(active.memberType ? [{ label: t("member"), value: active.memberType }] : []),
                ]}
              />
            </div>

            {active.student ? (
              <div>
                <SectionTitle style={{ marginBottom: 11 }}>{t("studentInformation")}</SectionTitle>
                <InfoGrid
                  rows={[
                    { label: tCommon("student"), value: active.student },
                    ...(active.level ? [{ label: t("level"), value: active.level }] : []),
                    ...(active.enrolledClass ? [{ label: tCommon("class"), value: active.enrolledClass }] : []),
                    ...(active.credits != null ? [{ label: tCommon("credits"), value: active.credits }] : []),
                    ...(active.streakDays != null
                      ? [{ label: t("streak"), value: t("streakDays", { days: active.streakDays }) }]
                      : []),
                    ...(active.lastClassDate ? [{ label: t("lastClass"), value: active.lastClassDate }] : []),
                  ]}
                />
              </div>
            ) : (
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("notLinked")}
              </p>
            )}

            {active.tournament && (
              <div>
                <SectionTitle style={{ marginBottom: 11 }}>{t("tournament")}</SectionTitle>
                <InfoGrid
                  rows={[
                    { label: t("event"), value: active.tournament.name },
                    { label: t("category"), value: active.tournament.category },
                    { label: tCommon("status"), value: tStatus(active.tournament.status) },
                    { label: t("payment"), value: tStatus(active.tournament.paymentStatus) },
                  ]}
                />
              </div>
            )}

            {active.lastPayment && (
              <div>
                <SectionTitle style={{ marginBottom: 11 }}>{t("recentPayment")}</SectionTitle>
                <InfoGrid
                  rows={[
                    { label: t("for"), value: active.lastPayment.name },
                    { label: tCommon("amount"), value: active.lastPayment.amount },
                    { label: tCommon("date"), value: active.lastPayment.date },
                    {
                      label: tCommon("status"),
                      value: (
                        <Badge
                          color={statusChipColors(active.lastPayment.status).color}
                          bg={statusChipColors(active.lastPayment.status).bg}
                        >
                          {tStatus(active.lastPayment.status)}
                        </Badge>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
    </>
  );
}
