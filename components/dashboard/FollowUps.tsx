"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { BUCKET_STATUS, buildFollowUps, type FollowUpBucket } from "@/lib/derive";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { ConfirmModal } from "../crud";
import { useData } from "../DataProvider";
import { Card, SectionTitle } from "../ui";

const ROW_CLASS: Record<FollowUpBucket, string> = {
  low: "jt-follow-low",
  expiring: "jt-follow-exp",
  expired: "jt-follow-low",
  inactive: "jt-follow-inactive",
};

const LABEL_KEY: Record<FollowUpBucket, string> = {
  low: "lowCredit",
  expiring: "expiringSoon",
  expired: "expiredCredits",
  inactive: "inactiveStudents",
};

export function FollowUps({ style, wide = false }: { style?: React.CSSProperties; wide?: boolean }) {
  const router = useRouter();
  const { creditRules, students } = useData();
  const t = useTranslations("dashboard");
  /* Grouped by the status on each student's own row, so a count here and the
     rows behind it are the same set. */
  const followUps = buildFollowUps(students);

  /* The credit-expiry notification is manual by design: the backend has no
     schedule, so nothing reaches a parent unless a person presses this and
     confirms. The academy asked for a decision, not an automation. */
  const [confirming, setConfirming] = useState(false);
  const [notified, setNotified] = useState<number | null>(null);
  const sendReminders = async () => {
    const res = await api.post<{ students_notified: number }>(
      `notifications/credit-expiry?days=${creditRules.expiringDays}`,
      {},
    );
    setNotified(res.students_notified);
  };

  const description = (key: FollowUpBucket) =>
    key === "low"
      ? t("lowCreditDesc", { count: creditRules.lowCredit })
      : key === "expiring"
        ? t("expiringSoonDesc", { days: creditRules.expiringDays })
        : key === "expired"
          ? t("expiredCreditsDesc")
          : t("inactiveStudentsDesc", { days: creditRules.inactiveDays });

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12, ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <SectionTitle>{t("needsFollowUp")}</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {notified !== null && (
            <span
              role="status"
              style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}
            >
              {notified > 0 ? t("remindersSent", { count: notified }) : t("nobodyToRemind")}
            </span>
          )}
          <button
            type="button"
            className="jt-btn-ghost"
            onClick={() => setConfirming(true)}
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
            {t("sendCreditReminders")}
          </button>
        </div>
      </div>
      {/* Stacked in a narrow column, three across when the card owns the full
          width — otherwise a full-width card leaves two thirds of each row empty. */}
      <div
        className={wide ? "jt-follow-grid" : undefined}
        style={wide ? undefined : { display: "flex", flexDirection: "column", gap: 9 }}
      >
        {followUps.map((fu) => (
          <button
            key={fu.key}
            type="button"
            className={`jt-follow ${ROW_CLASS[fu.key]}`}
            /* Straight to the students who are in this bucket, not to the
               whole roster — the count is the point of the card, and landing
               on 33 unfiltered students throws it away. */
            onClick={() => router.push(`/students?status=${encodeURIComponent(BUCKET_STATUS[fu.key])}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 12px",
              borderRadius: 11,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: fu.bg,
                flexShrink: 0,
              }}
            >
              <Icon name={fu.icon} size={17} color={fu.color} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>
                  {t(LABEL_KEY[fu.key])}
                </span>
                <span
                  style={{
                    padding: "1px 8px",
                    borderRadius: 999,
                    background: fu.bg,
                    color: fu.color,
                    fontFamily: FONT,
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  {fu.count}
                </span>
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 2,
                  fontFamily: FONT,
                  fontSize: 13,
                  color: COLORS.textSecondary,
                }}
              >
                {description(fu.key)}
              </span>
            </span>
          </button>
        ))}
      </div>

      {confirming && (
        <ConfirmModal
          title={t("sendCreditReminders")}
          prompt={t("sendCreditRemindersPrompt", { days: creditRules.expiringDays })}
          note={t("sendCreditRemindersNote")}
          confirmLabel={t("sendNow")}
          failedText={t("sendFailed")}
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await sendReminders();
            setConfirming(false);
          }}
        />
      )}
    </Card>
  );
}
