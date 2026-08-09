"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { NAV_STRUCTURE } from "@/lib/nav";
import { COLORS, FONT } from "@/lib/theme";
import { useJtrax } from "./JtraxContext";
import { Card } from "./ui";

/** The design's `isPlaceholder` branch, plus the role-guard refusal. */
export function SectionPlaceholder({ section, noAccess }: { section: string; noAccess?: boolean }) {
  const { role } = useJtrax();
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const tRole = useTranslations("roles");
  const icon = NAV_STRUCTURE.find((item) => item.id === section)?.icon ?? "layers";
  const label = tNav(section);

  return (
    <Card
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 62,
          height: 62,
          borderRadius: "50%",
          background: COLORS.light,
        }}
      >
        <Icon name={noAccess ? "lock" : icon} size={28} color={COLORS.blue} />
      </span>
      <h2 style={{ margin: 0, fontFamily: FONT, fontSize: 19, fontWeight: 700, color: COLORS.text }}>
        {noAccess ? t("noAccessTitle") : label}
      </h2>
      <p style={{ margin: 0, maxWidth: 420, fontFamily: FONT, fontSize: 14.5, color: COLORS.textSecondary }}>
        {noAccess
          ? t("noAccessBody", { role: tRole(role), section: label })
          : t("comingSoon", { role: tRole(role) })}
      </p>
      <Link
        href="/"
        className="jt-btn-primary"
        style={{
          marginTop: 6,
          padding: "9px 18px",
          borderRadius: 999,
          background: COLORS.blue,
          color: "#fff",
          fontFamily: FONT,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {t("backToDashboard")}
      </Link>
    </Card>
  );
}
