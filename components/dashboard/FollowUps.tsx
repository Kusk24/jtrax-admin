"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { buildFollowUps, type FollowUpBucket } from "@/lib/derive";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { useData } from "../DataProvider";
import { Card, SectionTitle } from "../ui";

const ROW_CLASS: Record<FollowUpBucket, string> = {
  low: "jt-follow-low",
  expiring: "jt-follow-exp",
  inactive: "jt-follow-inactive",
};

const LABEL_KEY: Record<FollowUpBucket, string> = {
  low: "lowCredit",
  expiring: "expiringSoon",
  inactive: "inactiveStudents",
};

export function FollowUps({ style, wide = false }: { style?: React.CSSProperties; wide?: boolean }) {
  const router = useRouter();
  const { creditRules, students } = useData();
  const t = useTranslations("dashboard");
  /* Real students against the saved thresholds — this card used to count the
     design fixtures, so the numbers never moved when the roster did. */
  const followUps = buildFollowUps(creditRules, students);

  const description = (key: FollowUpBucket) =>
    key === "low"
      ? t("lowCreditDesc", { count: creditRules.lowCredit })
      : key === "expiring"
        ? t("expiringSoonDesc", { days: creditRules.expiringDays })
        : t("inactiveStudentsDesc", { days: creditRules.inactiveDays });

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12, ...style }}>
      <SectionTitle>{t("needsFollowUp")}</SectionTitle>
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
            onClick={() => router.push(`/students?followUp=${fu.key}`)}
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
    </Card>
  );
}
