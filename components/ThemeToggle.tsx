"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { COLORS, FONT } from "@/lib/theme";

/** The account's saved preference; System follows the OS. */
type Theme = "System" | "Light" | "Dark";
const THEMES: Theme[] = ["System", "Light", "Dark"];

/* Module scope on purpose, like LanguageToggle's cookie write: touching the
   document is a side effect on an external store. */
function apply(theme: Theme) {
  if (theme === "System") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.toLowerCase();
}

/**
 * Auto ⇄ Light ⇄ Dark pill, on the Settings screen.
 *
 * A control only: the root layout renders the account's saved theme onto
 * <html>, so the theme holds on every screen and survives a refresh whether
 * or not this component is mounted. This reads that attribute back for its
 * own state, applies a change immediately, and saves it to the account.
 */
export function ThemeToggle() {
  const t = useTranslations("nav");
  /* Lazy initialiser, not an effect: the stored value is known synchronously,
     and setting state inside the effect would render System for a frame. */
  /* Same pill shape and the same active blue as LanguageToggle — they are
     the same kind of control and were reading as two different ones. */
  /* Read back what the server already rendered, so the pill agrees with the
     screen without asking the backend a second time. A lazy initialiser, not
     an effect: the attribute is there before React runs, and setting state in
     an effect would render the wrong pill for a frame. */
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") return "System";
    const attr = document.documentElement.dataset.theme;
    return attr === "dark" ? "Dark" : attr === "light" ? "Light" : "System";
  });

  function choose(next: Theme) {
    if (next === theme) return;
    setTheme(next);
    apply(next);
    fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themePreference: next }),
    }).catch(() => { /* applied locally; the account catches up next save */ });
  }

  return (
    <div
      role="group"
      aria-label={t("theme")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
      }}
    >
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => choose(option)}
          aria-pressed={theme === option}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "5px 10px",
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            background: theme === option ? COLORS.blue : "transparent",
            color: theme === option ? COLORS.surface : COLORS.textSecondary,
          }}
        >
          {t(`theme${option}`)}
        </button>
      ))}
    </div>
  );
}
