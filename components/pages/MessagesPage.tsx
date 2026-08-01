"use client";

import { useMemo, useState } from "react";
import { CONVERSATIONS_SEED, type ChatMessage, type Conversation } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import { InfoGrid, SearchInput } from "../page-kit";
import { Avatar, Badge, Card, SectionTitle } from "../ui";

const FILTERS = ["All", "Unread", "Starred"] as const;
type Filter = (typeof FILTERS)[number];

export function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS_SEED);
  const [selectedId, setSelectedId] = useState(CONVERSATIONS_SEED[0]?.id ?? "");
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === "Unread" && c.unread === 0) return false;
      if (filter === "Starred" && !c.starred) return false;
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
    <div className="jt-chat-grid">
      {/* ---- conversation list ---- */}
      <Card style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 11, borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <SectionTitle>Conversations</SectionTitle>
            <Badge color={COLORS.line} bg="#E8F9EE">
              Synced with LINE
            </Badge>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search parents" label="Search conversations" />
          <div style={{ display: "flex", gap: 7 }}>
            {FILTERS.map((f) => {
              const activeTab = f === filter;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
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
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {f}
                  {f === "Unread" && unreadTotal > 0 && (
                    <span
                      style={{
                        padding: "0 6px",
                        borderRadius: 999,
                        background: COLORS.danger,
                        color: "#fff",
                        fontSize: 10.5,
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
            <p style={{ padding: 20, margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary, textAlign: "center" }}>
              No conversations match.
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
                        fontSize: 13.5,
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
                    <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textSecondary }}>{c.time}</span>
                  </span>
                  {c.student && (
                    <span style={{ display: "block", marginTop: 2, fontFamily: FONT, fontSize: 11.5, color: COLORS.blue }}>
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
                      fontSize: 12,
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
                          fontSize: 10.5,
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
                <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text }}>{active.name}</div>
                <div style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary }}>
                  {active.student ? `Parent of ${active.student}` : "No linked student"}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
              <div style={{ textAlign: "center", fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary }}>
                Today
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
                          fontSize: 13,
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
                          fontSize: 10.5,
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
                placeholder="Write a reply…"
                aria-label="Message"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: `1px solid ${COLORS.border}`,
                  outline: "none",
                  fontFamily: FONT,
                  fontSize: 13.5,
                  color: COLORS.text,
                }}
              />
              <button
                type="button"
                onClick={send}
                aria-label="Send message"
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
          <p style={{ padding: 28, margin: 0, textAlign: "center", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
            Select a conversation.
          </p>
        )}
      </Card>

      {/* ---- info panel ---- */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 18, overflowY: "auto", minHeight: 0 }}>
        {active && (
          <>
            <div>
              <SectionTitle style={{ marginBottom: 11 }}>Parent Information</SectionTitle>
              <InfoGrid
                rows={[
                  { label: "Name", value: active.name },
                  { label: "Phone", value: active.phone },
                  { label: "Email", value: active.email },
                  ...(active.memberType ? [{ label: "Member", value: active.memberType }] : []),
                ]}
              />
            </div>

            {active.student ? (
              <div>
                <SectionTitle style={{ marginBottom: 11 }}>Student Information</SectionTitle>
                <InfoGrid
                  rows={[
                    { label: "Student", value: active.student },
                    ...(active.level ? [{ label: "Level", value: active.level }] : []),
                    ...(active.enrolledClass ? [{ label: "Class", value: active.enrolledClass }] : []),
                    ...(active.credits != null ? [{ label: "Credits", value: active.credits }] : []),
                    ...(active.streakDays != null ? [{ label: "Streak", value: `${active.streakDays} days` }] : []),
                    ...(active.lastClassDate ? [{ label: "Last class", value: active.lastClassDate }] : []),
                  ]}
                />
              </div>
            ) : (
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                This conversation isn&apos;t linked to a student yet.
              </p>
            )}

            {active.tournament && (
              <div>
                <SectionTitle style={{ marginBottom: 11 }}>Tournament</SectionTitle>
                <InfoGrid
                  rows={[
                    { label: "Event", value: active.tournament.name },
                    { label: "Category", value: active.tournament.category },
                    { label: "Status", value: active.tournament.status },
                    { label: "Payment", value: active.tournament.paymentStatus },
                  ]}
                />
              </div>
            )}

            {active.lastPayment && (
              <div>
                <SectionTitle style={{ marginBottom: 11 }}>Recent Payment</SectionTitle>
                <InfoGrid
                  rows={[
                    { label: "For", value: active.lastPayment.name },
                    { label: "Amount", value: active.lastPayment.amount },
                    { label: "Date", value: active.lastPayment.date },
                    {
                      label: "Status",
                      value: (
                        <Badge
                          color={statusChipColors(active.lastPayment.status).color}
                          bg={statusChipColors(active.lastPayment.status).bg}
                        >
                          {active.lastPayment.status}
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
  );
}
