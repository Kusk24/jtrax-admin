"use client";

/**
 * The list/card switch every list screen carries, and the card it switches to.
 *
 * The console's lists were all tables. A table is right for scanning a column
 * and wrong for recognising a person, so each screen now offers both and
 * remembers which one you left it in (`lib/view-mode.ts`). The card itself
 * lives here rather than per page so nine screens can't drift into nine
 * different cards.
 */
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/lib/icons";
import type { ViewMode } from "@/lib/view-mode";
import { COLORS, FONT } from "@/lib/theme";
import { Card } from "./ui";

const MODE_ICON: Record<ViewMode, IconName> = {
  list: "list",
  card: "grid",
  calendar: "calendar",
};

/**
 * Segmented control, sized to the 40px box the filter bar's pills and selects
 * sit on. Icon-only — the accessible name carries the meaning.
 */
export function ViewToggle({
  value,
  onChange,
  options,
  style,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  options: readonly ViewMode[];
  style?: CSSProperties;
}) {
  const t = useTranslations("view");
  return (
    <div
      role="group"
      aria-label={t("switchView")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        minHeight: 40,
        ...style,
      }}
    >
      {options.map((mode) => {
        const active = mode === value;
        return (
          <button
            key={mode}
            type="button"
            /* aria-pressed, not aria-selected: these are toggle buttons, and a
               screen reader announces the state without a visible label. */
            aria-pressed={active}
            aria-label={t(mode)}
            title={t(mode)}
            onClick={() => onChange(mode)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 999,
              border: "none",
              background: active ? COLORS.light : "transparent",
              color: active ? COLORS.blue : COLORS.textSecondary,
              cursor: "pointer",
              transition: "background 160ms ease, color 160ms ease",
            }}
          >
            <Icon name={MODE_ICON[mode]} size={16} />
          </button>
        );
      })}
    </div>
  );
}

/** The card view's grid. Same track sizing as the admin and teacher cards. */
export function CardGrid({ children, min = 280 }: { children: ReactNode; min?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

/** The card view's empty state, matching `EmptyRow` in the table. */
export function EmptyCards({ children }: { children: ReactNode }) {
  return (
    <Card
      style={{
        padding: "36px 16px",
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 14.5,
        color: COLORS.textSecondary,
      }}
    >
      {children}
    </Card>
  );
}

/**
 * One row of a list, drawn as a card: who it is at the top, the fields the
 * table would have shown as columns underneath, and the row's own actions.
 */
export function EntityCard({
  avatar,
  title,
  subtitle,
  badges,
  rows,
  actions,
  footer,
  onClick,
}: {
  avatar?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /* Status chips, shown under the name where the eye lands next. */
  badges?: ReactNode;
  rows?: Array<{ label: string; value: ReactNode }>;
  /* `RowActions` from the table, unchanged — it already stops its clicks from
     reaching a card that opens a detail view. */
  actions?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
}) {
  /* A card that opens something is a button; without that, keyboard users can
     reach every row of the table view and none of the card view. */
  const activate = (e: KeyboardEvent<HTMLElement>) => {
    if (!onClick || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    onClick();
  };

  return (
    <Card
      className={onClick ? "jt-adm-card" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={activate}
        style={{ display: "flex", alignItems: "flex-start", gap: 11, outlineOffset: 3 }}
      >
        {avatar}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 15.5,
              fontWeight: 700,
              color: COLORS.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ marginTop: 3, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
              {subtitle}
            </div>
          )}
          {badges && (
            <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              {badges}
            </div>
          )}
        </div>
        {actions}
      </div>

      {rows && rows.length > 0 && (
        <dl style={{ display: "grid", gap: 7, margin: 0 }}>
          {rows.map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <dt
                style={{
                  flex: "0 0 88px",
                  fontFamily: FONT,
                  fontSize: 12.5,
                  color: COLORS.textSecondary,
                }}
              >
                {row.label}
              </dt>
              <dd
                style={{
                  margin: 0,
                  minWidth: 0,
                  flex: 1,
                  fontFamily: FONT,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: COLORS.text,
                }}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {footer}
    </Card>
  );
}
