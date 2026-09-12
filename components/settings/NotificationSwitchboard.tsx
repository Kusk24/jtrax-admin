"use client";

/**
 * The school's notification switchboard — which notification types JTrax
 * sends at all. Admin-only, because who the academy messages is the academy's
 * decision, not each parent's: a parent's own Settings can mute a type for
 * themselves, but only this switch stops it being sent to anyone.
 *
 * Stored as `notify_<type>` in system_configuration, "off" or absent — the
 * backend treats an absent key as on, so a new notification type works before
 * anyone has visited this screen, and this card only writes when a switch is
 * actually flipped.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Icon, type IconName } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { ErrorNote, errorText } from "../crud";
import { useData } from "../DataProvider";
import { Card } from "../ui";

/* The backend's notification catalogue (notify.Type*). Low credit is listed
   like the rest: this switch is whether the school sends it at all — each
   parent still has to opt in on their own settings before they receive it. */
const TYPES: Array<{ type: string; icon: IconName; titleKey: string; descKey: string }> = [
  { type: "check_in", icon: "userCheck", titleKey: "notifyCheckIn", descKey: "notifyCheckInDesc" },
  { type: "credit_deducted", icon: "wallet", titleKey: "notifyDeducted", descKey: "notifyDeductedDesc" },
  { type: "low_credit", icon: "alertTriangle", titleKey: "notifyLowCredit", descKey: "notifyLowCreditDesc" },
  { type: "credit_expiry", icon: "clockSmall", titleKey: "notifyExpiry", descKey: "notifyExpiryDesc" },
  { type: "announcement", icon: "announcement", titleKey: "notifyAnnounce", descKey: "notifyAnnounceDesc" },
  { type: "payment_received", icon: "payment", titleKey: "notifyPayment", descKey: "notifyPaymentDesc" },
];

/**
 * `fill` lets the card grow into the slack under it, so the column it is the
 * last thing in ends level with the one beside it. Off by default: a card that
 * stretches when nothing is holding it to a height would just be a tall card.
 *
 * When it fills, the extra height goes into the *rows* rather than around
 * them. Two earlier tries put it around them: pooled under the last switch
 * (which reads as a list cut short) and then split evenly above and below
 * (which reads as padding nobody asked for). Either way the card was a fixed
 * amount of content with a band of nothing attached to it.
 *
 * The rows are the right place for it because they were the tight ones. The
 * rules card beside this one runs about 80px a row and these were about 65;
 * sharing the slack out lands them around 85, so the two columns end up with
 * the same rhythm instead of one looking compressed next to the other.
 */
export function NotificationSwitchboard({ fill = false }: { fill?: boolean } = {}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const { raw, refresh } = useData();
  const [busyType, setBusyType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Optional-chained: while collections are still loading the config list is
     not there yet, and every switch honestly reads as its default (on). */
  const rowFor = (type: string) =>
    raw.systemConfig?.find((r) => String(r.config_key) === "notify_" + type);
  const isOn = (type: string) => String(rowFor(type)?.config_value ?? "on") !== "off";

  async function flip(type: string) {
    setBusyType(type);
    setError(null);
    const next = isOn(type) ? "off" : "on";
    try {
      const existing = rowFor(type);
      if (existing) await api.patch(`system-configuration/notify_${type}`, { config_value: next });
      else await api.post("system-configuration", { config_key: "notify_" + type, config_value: next });
      await refresh();
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusyType(null);
    }
  }

  return (
    <Card
      style={
        fill
          ? { padding: 0, flex: 1, display: "flex", flexDirection: "column" }
          : { padding: 0 }
      }
    >
      {error && (
        <div style={{ padding: "12px 18px 0" }}>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {TYPES.map((row, i) => {
        const on = isOn(row.type);
        return (
          <div
            key={row.type}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
              /* An equal share of whatever the column is taller than this card
                 — growing from its natural height rather than from zero, so a
                 description that wraps to two lines keeps the room it needs
                 instead of being levelled with the one-line rows. */
              ...(fill ? { flexGrow: 1 } : {}),
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
              <Icon name={row.icon} size={18} color={on ? COLORS.blue : COLORS.textSecondary} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                {t(row.titleKey)}
              </div>
              <p style={{ margin: "3px 0 0", fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t(row.descKey)}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={t(row.titleKey)}
              disabled={busyType === row.type}
              onClick={() => flip(row.type)}
              style={{
                width: 46,
                height: 26,
                borderRadius: 999,
                border: "none",
                padding: 3,
                display: "flex",
                justifyContent: on ? "flex-end" : "flex-start",
                background: on ? COLORS.successFill : COLORS.disabled,
                cursor: busyType === row.type ? "wait" : "pointer",
                flexShrink: 0,
                transition: "background 160ms ease",
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                }}
              />
            </button>
          </div>
        );
      })}
    </Card>
  );
}
