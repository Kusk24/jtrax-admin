"use client";

/* One way to hand out a link, used by every card on the tournament screen that
 * produces one.
 *
 * They had drifted apart. The registration card showed a QR, the full address
 * and two labelled buttons; the published-results card showed the same kind of
 * link as a truncated grey `<code>` beside a 34px icon-only button — under the
 * 44px touch minimum, unreadable, and impossible to select. Two links of equal
 * importance, two unrelated treatments, on one screen.
 *
 * What a link on this screen is actually for: reading it aloud, scanning it off
 * a laptop at the front desk, or copying it into a message. So all three are
 * offered, and the address is shown in full and selectable rather than clipped.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { secondaryButtonStyle } from "../page-kit";
import { QrCode } from "./QrCode";

export function ShareLink({
  url,
  qrLabel,
  openLabel,
}: {
  url: string;
  /** Describes where the code leads, for anyone not using a camera. */
  qrLabel: string;
  openLabel: string;
}) {
  const t = useTranslations("share");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard refused; the address is on screen and selectable anyway. */
    }
  }

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        padding: 14, borderRadius: 12,
        background: COLORS.bg, border: `1px solid ${COLORS.border}`,
      }}
    >
      <QrCode value={url} label={qrLabel} size={96} />

      <div style={{ flex: "1 1 240px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Selectable and wrapped, not clipped: somebody reads this out over the
            phone, and an ellipsis in the middle of a URL helps nobody. */}
        <span
          style={{
            fontFamily: "ui-monospace, monospace", fontSize: 12.5, lineHeight: 1.5,
            color: COLORS.text, wordBreak: "break-all", userSelect: "all",
          }}
        >
          {url}
        </span>

        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <button
            type="button"
            className="jt-btn-ghost"
            onClick={() => void copy()}
            style={{
              ...secondaryButtonStyle,
              minHeight: 44,
              /* Confirmation stays put rather than swapping the label's width,
                 which made the row jump under the cursor. */
              minWidth: 132,
              justifyContent: "center",
              color: copied ? COLORS.success : undefined,
              borderColor: copied ? COLORS.success : undefined,
            }}
          >
            <Icon name={copied ? "check" : "copy"} size={15} color={copied ? COLORS.success : undefined} />
            {copied ? t("copied") : t("copy")}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="jt-btn-ghost"
            style={{ ...secondaryButtonStyle, minHeight: 44, textDecoration: "none" }}
          >
            <Icon name="globe" size={15} /> {openLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
