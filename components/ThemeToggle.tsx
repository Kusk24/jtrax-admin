"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { COLORS, FONT, type Theme } from "@/lib/theme";
import { useJtrax } from "./JtraxContext";

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
  /* Same pill shape and the same active blue as LanguageToggle — they are the
     same kind of control and were reading as two different ones. */

  /* Seeded from the session, which the server resolved.

     This used to read `<html data-theme>` in a `useState` initialiser, on the
     reasoning that the attribute is there before React runs. It is — in the
     browser. But a client component is server-rendered too, where `document`
     does not exist, so the server always sent HTML with Auto pressed; and
     React does not repair attribute mismatches when it hydrates, which it
     says out loud: *"some attributes of the server rendered HTML didn't match
     the client properties. This won't be patched up."*

     So the pill sat on Auto over a dark screen, permanently, while the theme
     itself was saved and applied correctly. **A value the server renders has
     to come from something the server can see.** */
  const { theme: saved } = useJtrax();
  const [theme, setTheme] = useState<Theme>(saved);

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
