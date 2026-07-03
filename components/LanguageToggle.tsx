"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

const locales = [
  { code: "en", label: "EN" },
  { code: "th", label: "ไทย" },
] as const;

/** EN ⇄ ไทย pill. Persists the choice in a cookie and re-renders the tree. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(code: string) {
    if (code === locale) return;
    document.cookie = `locale=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={`flex items-center gap-1 rounded-full border-2 border-line bg-card p-1 shadow-clay ${className}`}
      role="group"
      aria-label="Language"
    >
      <Globe className="ml-1.5 size-4 shrink-0 text-muted" />
      {locales.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchTo(code)}
          disabled={isPending}
          aria-pressed={locale === code}
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            locale === code ? "bg-navy text-white" : "text-muted hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
