"use client";

/* A room's join code with a copy button beside it — shown only for a room
   whose seats are still open to whoever types it. A tick replaces the copy
   icon once it is on the clipboard. */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS } from "@/lib/theme";

export function CodeChip({ code, size = 13.5 }: { code: string; size?: number }) {
  const t = useTranslations("games");
  const [copied, setCopied] = useState(false);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: size, fontWeight: 700,
                     letterSpacing: "0.15em", color: COLORS.navy }}>
        {code}
      </span>
      <button
        type="button"
        aria-label={copied ? t("codeCopied") : t("copyCode")}
        title={copied ? t("codeCopied") : t("copyCode")}
        onClick={async (e) => {
          /* Inside a clickable card: copying is not opening the game. */
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* The code is on screen to read or select. */
          }
        }}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28,
                 borderRadius: 7, border: `1px solid ${COLORS.border}`, background: COLORS.surface, cursor: "pointer" }}
      >
        <Icon name={copied ? "check" : "copy"} size={14} color={copied ? COLORS.success : COLORS.textSecondary} />
      </button>
    </span>
  );
}
