"use client";

import { useRouter } from "next/navigation";
import { buildFollowUps, type FollowUpBucket } from "@/lib/jtrax/derive";
import { Icon } from "@/lib/jtrax/icons";
import { COLORS, FONT } from "@/lib/jtrax/theme";
import { useJtrax } from "../JtraxContext";
import { Card, SectionTitle } from "../ui";

const ROW_CLASS: Record<FollowUpBucket, string> = {
  low: "jt-follow-low",
  expiring: "jt-follow-exp",
  inactive: "jt-follow-inactive",
};

export function FollowUps({ style }: { style?: React.CSSProperties }) {
  const router = useRouter();
  const { creditRules } = useJtrax();
  const followUps = buildFollowUps(creditRules);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12, ...style }}>
      <SectionTitle>Needs Follow-up</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {followUps.map((fu) => (
          <button
            key={fu.key}
            type="button"
            className={`jt-follow ${ROW_CLASS[fu.key]}`}
            onClick={() => router.push(`/jtrax/students?followUp=${fu.key}`)}
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
                <span style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>
                  {fu.label}
                </span>
                <span
                  style={{
                    padding: "1px 8px",
                    borderRadius: 999,
                    background: fu.bg,
                    color: fu.color,
                    fontFamily: FONT,
                    fontSize: 11.5,
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
                  fontSize: 12,
                  color: COLORS.textSecondary,
                }}
              >
                {fu.desc}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
