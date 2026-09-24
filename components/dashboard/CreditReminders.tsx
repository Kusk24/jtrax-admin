"use client";

/**
 * The two manual credit reminders, sent to chosen families: credits expiring
 * soon, and a balance at or under the academy's low-credit line.
 *
 * Neither fires on its own. Pressing the button asks the backend who it would
 * reach — each child, the parents behind them, and when the credits run out or
 * how many are left — and sends only to the rows left ticked. The server stays
 * the authority: the selection can only narrow its eligible set.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { DEFAULT_CREDIT_RULES } from "@/lib/derive";
import { Icon } from "@/lib/icons";
import { fmtCredits } from "@/lib/live";
import { COLORS, FONT } from "@/lib/theme";
import { useData } from "../DataProvider";
import { Modal } from "../page-kit";

type Target = {
  student_id: string;
  student_name: string;
  parents: string[];
  /** Expiry reminder: the soonest date the credits run out. */
  expires?: string;
  /** Low-credit reminder: what the child has left. */
  balance?: number;
};

/** Which reminder: credits running out by date, or by count. */
export type ReminderKind = "expiry" | "lowCredit";

export function CreditReminders({ kind = "expiry" }: { kind?: ReminderKind }) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { creditRules } = useData();
  /* Optional-chained for the provider's loading state, same as SettingsPage. */
  const days = creditRules?.expiringDays ?? DEFAULT_CREDIT_RULES.expiringDays;
  const low = kind === "lowCredit";
  /* The expiry window rides in the query; the low-credit line is the server's
     own copy of the same Settings value, so it needs nothing. */
  const path = low ? "notifications/low-credit" : `notifications/credit-expiry?days=${days}`;
  const [line, setLine] = useState<number>(creditRules?.lowCredit ?? DEFAULT_CREDIT_RULES.lowCredit);
  const label = t(low ? "remindLowCredit" : "remindExpiring");

  const [open, setOpen] = useState(false);
  /* null while the preview is loading — the list is server truth, not a
     client guess, so there is nothing to show until it answers. */
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openPreview = async () => {
    setOpen(true);
    setTargets(null);
    setExcluded(new Set());
    setSent(null);
    setError(null);
    try {
      const res = await api.post<{ targets: Target[]; line?: number }>(path, { dry_run: true });
      setTargets(res.targets ?? []);
      if (typeof res.line === "number") setLine(res.line);
    } catch {
      setError(tCommon("loadFailed"));
      setTargets([]);
    }
  };

  const chosen = (targets ?? []).filter((x) => !excluded.has(x.student_id));

  const send = async () => {
    if (busy || chosen.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ students_notified: number }>(path, {
        student_ids: chosen.map((x) => x.student_id),
      });
      setSent(res.students_notified);
    } catch {
      setError(t("reminderFailed"));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? iso
      : new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
  };

  const footer =
    sent !== null ? (
      <button type="button" className="jt-btn-primary" style={buttonStyle(true)} onClick={() => setOpen(false)}>
        {tCommon("done")}
      </button>
    ) : targets && targets.length > 0 ? (
      <>
        <button type="button" style={buttonStyle(false)} onClick={() => setOpen(false)}>
          {tCommon("cancel")}
        </button>
        <button
          type="button"
          className="jt-btn-primary"
          style={{ ...buttonStyle(true), opacity: chosen.length === 0 || busy ? 0.55 : 1 }}
          disabled={chosen.length === 0 || busy}
          onClick={send}
        >
          <Icon name="send" size={14} color={COLORS.surface} />
          {t("reminderSendCount", { count: chosen.length })}
        </button>
      </>
    ) : undefined;

  return (
    <>
      <button
        type="button"
        className="jt-btn-ghost"
        onClick={openPreview}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "7px 13px",
          borderRadius: 9,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.surface,
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.text,
          cursor: "pointer",
        }}
      >
        <Icon name="send" size={14} color={COLORS.textSecondary} />
        {label}
      </button>

      {open && (
        <Modal title={label} width={480} onClose={() => setOpen(false)} footer={footer}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sent !== null ? (
              <p role="status" style={noteStyle}>
                {sent > 0 ? t("remindersSent", { count: sent }) : t("nobodyToRemind")}
              </p>
            ) : targets === null ? (
              <p style={noteStyle}>{tCommon("loading")}</p>
            ) : targets.length === 0 ? (
              <p style={noteStyle}>
                {error ?? (low ? t("lowCreditEmpty", { line: fmtCredits(line) }) : t("reminderEmpty", { days }))}
              </p>
            ) : (
              <>
                <p style={noteStyle}>
                  {low ? t("lowCreditPreviewSub", { line: fmtCredits(line) }) : t("reminderPreviewSub", { days })}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {targets.map((x) => (
                    <label
                      key={x.student_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.border}`,
                        background: excluded.has(x.student_id) ? COLORS.light : COLORS.surface,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!excluded.has(x.student_id)}
                        onChange={() => toggle(x.student_id)}
                        style={{ width: 16, height: 16, accentColor: COLORS.blue, flexShrink: 0 }}
                      />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text }}>
                          {x.student_name}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontFamily: FONT,
                            fontSize: 12.5,
                            color: x.parents.length > 0 ? COLORS.textSecondary : COLORS.warning,
                          }}
                        >
                          {x.parents.length > 0 ? x.parents.join(", ") : t("reminderNoParent")}
                        </span>
                      </span>
                      <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary, flexShrink: 0 }}>
                        {low
                          ? t("lowCreditLeft", { credits: fmtCredits(x.balance ?? 0) })
                          : t("reminderExpires", { date: fmtDate(x.expires ?? "") })}
                      </span>
                    </label>
                  ))}
                </div>
                {error && (
                  <p role="alert" style={{ ...noteStyle, color: COLORS.danger }}>
                    {error}
                  </p>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

const noteStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT,
  fontSize: 13.5,
  lineHeight: 1.45,
  color: COLORS.textSecondary,
};

function buttonStyle(primary: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 15px",
    borderRadius: 9,
    border: primary ? "none" : `1px solid ${COLORS.border}`,
    background: primary ? COLORS.blue : COLORS.surface,
    fontFamily: FONT,
    fontSize: 13.5,
    fontWeight: 600,
    color: primary ? COLORS.surface : COLORS.text,
    cursor: "pointer",
  };
}
