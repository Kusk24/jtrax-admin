"use client";

import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/lib/jtrax/icons";
import { COLORS, FONT } from "@/lib/jtrax/theme";

export type QuickAction = {
  key: string;
  label: string;
  icon: IconName;
  color: string;
  bg: string;
  href: string;
};

/* The four hero pills, in the accent order the .qa-pill-N classes expect:
   0 green, 1 red, 2 gold, 3 purple. */
export const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  { key: "register", label: "Register Student", icon: "usersPlus", color: "#1A7F37", bg: "#EAF6EE", href: "/jtrax/students" },
  { key: "payment", label: "Record Payment", icon: "wallet", color: "#C0392B", bg: "#FBEAEA", href: "/jtrax/payment" },
  { key: "announce", label: "New Announcement", icon: "announcement", color: "#B7791F", bg: "#FDF3E0", href: "/jtrax/announcement" },
  { key: "tournament", label: "Create Tournament", icon: "trophy", color: "#6B46C1", bg: "#F1EAFA", href: "/jtrax/tournament" },
];

export const RECEPTIONIST_QUICK_ACTIONS: QuickAction[] = [
  { key: "register", label: "Register Student", icon: "usersPlus", color: "#1A7F37", bg: "#EAF6EE", href: "/jtrax/students" },
  { key: "payment", label: "Record Payment", icon: "wallet", color: "#C0392B", bg: "#FBEAEA", href: "/jtrax/payment" },
];

export function QuickActionPill({ action, index }: { action: QuickAction; index: number }) {
  const router = useRouter();
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
          fontSize: 13.5,
          fontWeight: 600,
          color: COLORS.text,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {action.label}
      </span>
    </button>
  );
}
