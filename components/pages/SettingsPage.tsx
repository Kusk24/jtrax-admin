"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_CREDIT_RULES, type CreditRules } from "@/lib/derive";
import { Icon, type IconName } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { useJtrax } from "../JtraxContext";
import { PageHeader, primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Card } from "../ui";

type RuleKey = keyof CreditRules;

const RULES: Array<{ key: RuleKey; icon: IconName; titleKey: string; descKey: string; unitKey: string }> = [
  { key: "lowCredit", icon: "wallet", titleKey: "lowCreditTitle", descKey: "lowCreditDesc", unitKey: "unitCredits" },
  { key: "expiringDays", icon: "calendar", titleKey: "expiringTitle", descKey: "expiringDesc", unitKey: "unitDays" },
  { key: "inactiveDays", icon: "userX", titleKey: "inactiveTitle", descKey: "inactiveDesc", unitKey: "unitDays" },
];

export function SettingsPage() {
  const { creditRules, setCreditRules } = useJtrax();
  const t = useTranslations("settings");
  const [draft, setDraft] = useState<CreditRules>(creditRules);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function flash() {
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 820 }}>
      <PageHeader title={t("title")} sub={t("sub")} />

      <Card style={{ padding: 0 }}>
        {RULES.map((rule, i) => (
          <div
            key={rule.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 18px",
              borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: COLORS.light,
                flexShrink: 0,
              }}
            >
              <Icon name={rule.icon} size={18} color={COLORS.blue} />
            </span>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <label
                htmlFor={`jtrax-rule-${rule.key}`}
                style={{ display: "block", fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text }}
              >
                {t(rule.titleKey)}
              </label>
              <p style={{ margin: "3px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                {t(rule.descKey)}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <input
                id={`jtrax-rule-${rule.key}`}
                type="number"
                min={0}
                value={draft[rule.key]}
                onChange={(e) => {
                  /* Empty input parses to NaN; clamp to 0 so the field stays controlled. */
                  const next = Number.parseInt(e.target.value, 10);
                  setDraft({ ...draft, [rule.key]: Number.isNaN(next) ? 0 : Math.max(0, next) });
                }}
                style={{
                  width: 78,
                  padding: "8px 10px",
                  borderRadius: 9,
                  border: `1px solid ${COLORS.border}`,
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.text,
                  outline: "none",
                }}
              />
              <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                {t(rule.unitKey)}
              </span>
            </div>
          </div>
        ))}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 18px",
            borderTop: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
            flexWrap: "wrap",
          }}
        >
          <span
            /* Kept mounted so the row doesn't jump when the flash appears. */
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.success,
              opacity: saved ? 1 : 0,
              transition: "opacity 180ms ease",
            }}
            aria-live="polite"
          >
            <Icon name="check" size={15} color={COLORS.success} />
            {saved ? t("saved") : ""}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="jt-btn-ghost"
              style={secondaryButtonStyle}
              onClick={() => {
                setDraft(DEFAULT_CREDIT_RULES);
                setCreditRules(DEFAULT_CREDIT_RULES);
                flash();
              }}
            >
              {t("reset")}
            </button>
            <button
              type="button"
              className="jt-btn-primary"
              style={primaryButtonStyle}
              onClick={() => {
                setCreditRules(draft);
                flash();
              }}
            >
              {t("save")}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
