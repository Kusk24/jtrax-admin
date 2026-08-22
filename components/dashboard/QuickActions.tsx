"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/lib/icons";
import { createHref } from "@/lib/quick-actions";
import { ACCENTS, ACCENT_TINTS, COLORS, FONT } from "@/lib/theme";

export type QuickAction = {
  key: string;
  /** Message key under the `dashboard` namespace. */
  labelKey: string;
  icon: IconName;
  color: string;
  bg: string;
  href: string;
};

/* The four hero pills, in the accent order the .qa-pill-N classes expect:
   0 olive, 1 brick, 2 rust, 3 plum.

   Every one of them is named after an act, so every one of them lands on that
   act rather than on the section's list: "Register Student" opens the
   registration form, not the roster with a button on it somewhere. */
export const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  { key: "register", labelKey: "registerStudent", icon: "usersPlus", color: COLORS.success, bg: ACCENT_TINTS.green, href: createHref("students") },
  { key: "payment", labelKey: "recordPayment", icon: "wallet", color: ACCENTS.red, bg: ACCENT_TINTS.red, href: createHref("payment") },
  { key: "announce", labelKey: "newAnnouncement", icon: "announcement", color: ACCENTS.amber, bg: ACCENT_TINTS.amber, href: createHref("announcement") },
  { key: "tournament", labelKey: "createTournament", icon: "trophy", color: ACCENTS.plum, bg: ACCENT_TINTS.plum, href: createHref("tournament") },
];

export const RECEPTIONIST_QUICK_ACTIONS: QuickAction[] = ADMIN_QUICK_ACTIONS.slice(0, 2);

export function QuickActionPill({ action, index }: { action: QuickAction; index: number }) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  return (
    <button
      type="button"
      className={`qa-pill qa-pill-${index}`}
      onClick={() => router.push(action.href)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 16px",
        background: COLORS.surface,
        cursor: "pointer",
        flex: 1,
        minWidth: 0,
        textAlign: "left",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: action.bg,
          flexShrink: 0,
        }}
      >
        <Icon name={action.icon} size={16} color={action.color} />
      </span>
      <span
        className="qa-label"
        style={{
          fontFamily: FONT,
          fontSize: 14.5,
          fontWeight: 600,
          color: COLORS.text,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {t(action.labelKey)}
      </span>
    </button>
  );
}
