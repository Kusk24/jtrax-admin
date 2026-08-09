"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { COLORS, FONT } from "@/lib/theme";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "th", label: "ไทย" },
] as const;

/* Module scope on purpose: writing to document.cookie is a side effect on an
   external store, which the react-hooks rules disallow inside a component. */
function persistLocale(code: string) {
  document.cookie = `locale=${code}; path=/; max-age=31536000; samesite=lax`;
}

/** EN ⇄ ไทย pill. Persists the choice in a cookie and re-renders the tree. */
export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("nav");
  const [isPending, startTransition] = useTransition();

  function switchTo(code: string) {
    if (code === locale) return;
    persistLocale(code);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {LOCALES.map(({ code, label }) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchTo(code)}
            disabled={isPending}
            aria-pressed={active}
            style={{
              padding: "4px 11px",
              borderRadius: 999,
              border: "none",
              background: active ? COLORS.blue : "transparent",
              color: active ? "#fff" : COLORS.textSecondary,
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              cursor: isPending ? "wait" : "pointer",
              transition: "background 160ms ease, color 160ms ease",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
