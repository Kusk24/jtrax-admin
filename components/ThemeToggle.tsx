"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { COLORS, FONT } from "@/lib/theme";

/** The account's saved preference; System follows the OS. */
type Theme = "System" | "Light" | "Dark";
const THEMES: Theme[] = ["System", "Light", "Dark"];

/* Module scope on purpose, like LanguageToggle's cookie write: touching the
   document and localStorage are side effects on external stores. */
function apply(theme: Theme) {
  if (theme === "System") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.toLowerCase();
  try {
    localStorage.setItem("jtrax:theme", theme);
  } catch { /* private mode — the account still remembers */ }
}

/**
 * System ⇄ Light ⇄ Dark pill, next to the language toggle. The choice is the
 * account's, saved to user_account.theme_preference, so it follows the person
 * to any machine; localStorage only bridges the moment before /auth/me lands.
 */
export function ThemeToggle() {
  const t = useTranslations("nav");
  /* Lazy initialiser, not an effect: the stored value is known synchronously,
     and setting state inside the effect would render System for a frame. */
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "System";
    const stored = localStorage.getItem("jtrax:theme") as Theme | null;
    return stored && THEMES.includes(stored) ? stored : "System";
  });

  useEffect(() => {
    const stored = localStorage.getItem("jtrax:theme") as Theme | null;
    if (stored && THEMES.includes(stored)) apply(stored);
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        const saved = me?.themePreference as Theme | undefined;
        if (saved && THEMES.includes(saved) && saved !== stored) {
          setTheme(saved);
          apply(saved);
        }
      })
      .catch(() => { /* the stored value already applied */ });
  }, []);

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
            background: theme === option ? COLORS.navy : "transparent",
            color: theme === option ? "#FFFFFF" : COLORS.textSecondary,
          }}
        >
          {t(`theme${option}`)}
        </button>
      ))}
    </div>
  );
}
