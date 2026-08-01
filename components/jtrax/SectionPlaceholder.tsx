"use client";

import Link from "next/link";
import { Icon } from "@/lib/jtrax/icons";
import { SECTION_META } from "@/lib/jtrax/nav";
import { COLORS, FONT } from "@/lib/jtrax/theme";
import { useJtrax } from "./JtraxContext";
import { Card } from "./ui";

/** The design's `isPlaceholder` branch, plus the role-guard refusal. */
export function SectionPlaceholder({ section, noAccess }: { section: string; noAccess?: boolean }) {
  const { role } = useJtrax();
  const meta = SECTION_META[section];

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
        <Icon name={noAccess ? "lock" : (meta?.icon ?? "layers")} size={28} color={COLORS.blue} />
      </span>
      <h2 style={{ margin: 0, fontFamily: FONT, fontSize: 18, fontWeight: 700, color: COLORS.text }}>
        {noAccess ? "No access" : (meta?.label ?? "Section")}
      </h2>
      <p style={{ margin: 0, maxWidth: 420, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
        {noAccess ? (
          <>
            The <strong>{role}</strong> role can&apos;t open {meta?.label ?? "this section"}.
          </>
        ) : (
          <>
            This section is coming soon. You&apos;re viewing as <strong>{role}</strong>.
          </>
        )}
      </p>
      <Link
        href="/jtrax"
        className="jt-btn-primary"
        style={{
          marginTop: 6,
          padding: "9px 18px",
          borderRadius: 999,
          background: COLORS.blue,
          color: "#fff",
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Back to Dashboard
      </Link>
    </Card>
  );
}
