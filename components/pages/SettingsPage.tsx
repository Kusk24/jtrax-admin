"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_CREDIT_RULES, type CreditRules } from "@/lib/derive";
import { Icon, type IconName } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { useData } from "../DataProvider";
import { useJtrax } from "../JtraxContext";
import { ErrorNote, errorText } from "../crud";
import { PageHeader, primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { LineChannelCard } from "../settings/LineChannelCard";
import { ThemeToggle } from "../ThemeToggle";
import { Card, SectionTitle } from "../ui";
import { AdminsPage } from "./AdminsPage";

type RuleKey = keyof CreditRules;

const RULES: Array<{ key: RuleKey; icon: IconName; titleKey: string; descKey: string; unitKey: string }> = [
  { key: "lowCredit", icon: "wallet", titleKey: "lowCreditTitle", descKey: "lowCreditDesc", unitKey: "unitCredits" },
  { key: "expiringDays", icon: "calendar", titleKey: "expiringTitle", descKey: "expiringDesc", unitKey: "unitDays" },
  { key: "inactiveDays", icon: "userX", titleKey: "inactiveTitle", descKey: "inactiveDesc", unitKey: "unitDays" },
  { key: "certSessions", icon: "trophy", titleKey: "certTitle", descKey: "certDesc", unitKey: "unitClasses" },
];

export function SettingsPage() {
  const { creditRules, saveCreditRules } = useData();
  const { role } = useJtrax();
  const isAdmin = role === "Admin";
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  /* null until the user types. The saved values only arrive after the first
     render, and a draft that copies them in an effect would either render the
     defaults over what is stored or trip the cascading-render rule; falling
     through to `creditRules` needs neither. */
  const [edited, setEdited] = useState<CreditRules | null>(null);
  const draft = edited ?? creditRules;
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function flash() {
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2200);
  }

  async function persist(rules: CreditRules) {
    setBusy(true);
    setError(null);
    try {
      await saveCreditRules(rules);
      setEdited(null);
      flash();
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <PageHeader title={t("pageTitle")} sub={isAdmin ? t("sub") : t("subStaff")} />

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* Two columns, the way the parent portal lays its settings out: one
          scroll of unrelated blocks became two, side by side, so what is on
          the page is visible at once instead of found by scrolling.

          `jt-duo` is the console's own two-column grid — one column until
          880px, two above it — so this matches every other split screen here
          rather than inventing a second responsive rule.

          The 820px reading cap that used to wrap all of this is gone: it
          existed so lines of prose stayed short, and a half-width column does
          that on its own. Keeping both would have made each column 410px.

          A receptionist sees only Appearance, so for them the left column has
          nothing in it — `duo` collapses to a single flow rather than leaving
          a blank half beside one card. */}
      {isAdmin ? (
        <div className="jt-duo">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <SectionTitle>{t("title")}</SectionTitle>
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
                style={{ display: "block", fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text }}
              >
                {t(rule.titleKey)}
              </label>
              <p style={{ margin: "3px 0 0", fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
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
                  setEdited({ ...draft, [rule.key]: Number.isNaN(next) ? 0 : Math.max(0, next) });
                }}
                style={{
                  width: 78,
                  padding: "8px 10px",
                  borderRadius: 9,
                  border: `1px solid ${COLORS.border}`,
                  fontFamily: FONT,
                  fontSize: 15,
                  fontWeight: 600,
                  color: COLORS.text,
                  outline: "none",
                }}
              />
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
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
              fontSize: 14,
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
              style={{ ...secondaryButtonStyle, opacity: busy ? 0.75 : 1 }}
              disabled={busy}
              onClick={() => persist(DEFAULT_CREDIT_RULES)}
            >
              {t("reset")}
            </button>
            <button
              type="button"
              className="jt-btn-primary"
              style={{ ...primaryButtonStyle, opacity: busy ? 0.75 : 1, cursor: busy ? "wait" : "pointer" }}
              disabled={busy}
              onClick={() => persist(draft)}
            >
              {t("save")}
            </button>
          </div>
        </div>
            </Card>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <ThemeCard />
            <LineChannelCard />
          </div>
        </div>
      ) : (
        /* Nothing else on this page is theirs, so there is no second column to
           put beside it — one column, capped where prose stays readable. */
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 820 }}>
          <ThemeCard />
        </div>
      )}

      {/* Admin only, and the reason the whole section is not: the theme above
          belongs to whoever is signed in, but who *can* sign in is the office's
          to decide. A receptionist reaching Settings must not reach this.

          Full width, below both columns: it is a table and a card grid, not
          prose, and halving it would put a roster in a 400px box. */}
      {isAdmin && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 24 }}>
          <AdminsPage level={2} />
        </div>
      )}
    </div>
  );
}

/* Appearance is a preference, not an academy rule, so it gets its own card
   rather than a row among the thresholds — and it lives here rather than in the
   header, where a control nobody changes twice a year sat beside the date and
   the account.

   Its own component because it is now rendered from two places: beside the
   LINE card for an admin, alone for a receptionist. */
function ThemeCard() {
  const t = useTranslations("settings");
  return (
    <>
      {/* Above the card, not inside it, so this column reads the same way as
          the one beside it: a heading, then what it names. It used to sit in
          the card's own flex row because it had no column to head. */}
      <SectionTitle>{t("themeTitle")}</SectionTitle>
      <Card style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
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
          <Icon name="settings" size={18} color={COLORS.blue} />
        </span>
        <p style={{ flex: "1 1 260px", minWidth: 0, margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
          {t("themeDesc")}
        </p>
        <ThemeToggle />
      </Card>
    </>
  );
}
