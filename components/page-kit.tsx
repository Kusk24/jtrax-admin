"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";

/* Shared building blocks for the nine list/detail pages. The design reuses one
   set of table, filter-bar, pagination and modal treatments across all of them,
   so they live here rather than being re-declared per page. */

export const TABLE_PAGE_SIZE = 10;

export function paginate<T>(rows: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE));
  const current = Math.max(0, Math.min(page, totalPages - 1));
  return {
    pageRows: rows.slice(current * TABLE_PAGE_SIZE, current * TABLE_PAGE_SIZE + TABLE_PAGE_SIZE),
    totalPages,
    page: current,
  };
}

export const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 9,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  fontFamily: FONT,
  fontSize: 13.5,
  /* Pinned rather than left at `normal`: an <input> and a <select> resolve the
     default differently, which is what left the role picker a few pixels
     shorter than the text fields stacked with it. */
  lineHeight: "20px",
  color: COLORS.text,
  outline: "none",
};

/* The chevron from `lib/icons`, inlined — a native <select> arrow comes with
   its own metrics, so `appearance: none` has to draw the caret itself. */
const CHEVRON_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B7B93' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

/** `fieldStyle` for a <select>: same box as the inputs beside it. */
export const selectStyle: CSSProperties = {
  ...fieldStyle,
  appearance: "none",
  paddingRight: 34,
  backgroundImage: CHEVRON_SVG,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 11px center",
  backgroundSize: "15px 15px",
  cursor: "pointer",
};

export const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontFamily: FONT,
  fontSize: 12.5,
  fontWeight: 600,
  color: COLORS.textSecondary,
};

export const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  /* No-op while the button hugs its label, which is most of them — it earns its
     keep where one stretches to fill a column (the drawer's Save), where the
     label would otherwise sit against the left edge. */
  justifyContent: "center",
  gap: 7,
  padding: "9px 16px",
  borderRadius: 999,
  border: "none",
  background: COLORS.blue,
  color: "#fff",
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const secondaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "9px 16px",
  borderRadius: 999,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontFamily: FONT, fontSize: 17, fontWeight: 700, color: COLORS.text }}>
          {title}
        </h2>
        {sub && (
          <p style={{ margin: "3px 0 0", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
            {sub}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>{children}</div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  /* Sizing is left to the caller. The field must NOT set `flex` itself: in a
     column-direction parent a flex-basis applies to the height and stretches
     the bar into a tall box. */
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 13px",
        borderRadius: 999,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        width: "100%",
        minWidth: 0,
        /* Filter bars mix this pill with selects and date inputs; they all sit
           on the same 40px box so the row doesn't come out ragged. */
        minHeight: 40,
        ...style,
      }}
    >
      <Icon name="search" size={16} color={COLORS.textSecondary} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          fontFamily: FONT,
          fontSize: 13.5,
          color: COLORS.text,
        }}
      />
    </div>
  );
}

export type FilterOption = { value: string; label: string };

/** Options carry an explicit value so the localised label never becomes the
    thing we filter on — "all" is always the empty string. */
export function SelectFilter({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      style={{
        ...selectStyle,
        width: "auto",
        borderRadius: 999,
        /* Shorthand, so it has to re-state the room the caret needs. */
        padding: "9px 34px 9px 14px",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Header row + rows share one grid template so columns line up. */
export function Table({
  columns,
  template,
  children,
  minWidth = 820,
}: {
  columns: string[];
  template: string;
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: template,
            gap: 12,
            padding: "10px 16px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
          }}
        >
          {columns.map((c) => (
            <span
              key={c}
              style={{
                fontFamily: FONT,
                fontSize: 11.5,
                fontWeight: 600,
                color: COLORS.textSecondary,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {c}
            </span>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

export function TableRow({
  template,
  children,
  onClick,
}: {
  template: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className="jt-table-row"
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: template,
        gap: 12,
        alignItems: "center",
        padding: "11px 16px",
        borderBottom: `1px solid ${COLORS.border}`,
        cursor: onClick ? "pointer" : undefined,
        fontFamily: FONT,
        fontSize: 13,
        color: COLORS.text,
      }}
    >
      {children}
    </div>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "36px 16px",
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 13.5,
        color: COLORS.textSecondary,
      }}
    >
      {children}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const t = useTranslations("common");
  if (totalPages <= 1) return null;
  const arrow = (disabled: boolean): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 7,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surface,
    color: disabled ? "#C7CFDB" : COLORS.textSecondary,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.6 : 1,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 10,
        padding: "12px 16px",
      }}
    >
      <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
        {t("page", { page: page + 1, total: totalPages })}
      </span>
      <button
        type="button"
        aria-label={t("previousPage")}
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        style={arrow(page === 0)}
      >
        <Icon name="chevronLeft" size={15} />
      </button>
      <button
        type="button"
        aria-label={t("nextPage")}
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        style={arrow(page >= totalPages - 1)}
      >
        <Icon name="chevronRight" size={15} />
      </button>
    </div>
  );
}

/** Centred dialog. Centres with auto margins so the fade-in keyframe's
    `transform` can't cancel the positioning. */
export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 560,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const t = useTranslations("common");
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgb(20 33 58 / 0.38)", zIndex: 50 }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="jtrax-fade-in-up"
        style={{
          position: "fixed",
          top: "6vh",
          left: 0,
          right: 0,
          marginInline: "auto",
          width: `min(${width}px, 92vw)`,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          boxShadow: "0 24px 60px rgb(20 33 58 / 0.28)",
          zIndex: 60,
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "15px 18px",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <h3 style={{ margin: 0, fontFamily: FONT, fontSize: 15.5, fontWeight: 700, color: COLORS.text }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: COLORS.textSecondary, padding: 0 }}
          >
            <Icon name="x" size={17} />
          </button>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>{children}</div>
        {footer && (
          <footer
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
              padding: "13px 18px",
              borderTop: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </>
  );
}

/** Right-hand drawer used for admin / participant / student detail views. */
export function Drawer({
  title,
  onClose,
  children,
  footer,
  width = 460,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const t = useTranslations("common");
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgb(20 33 58 / 0.38)", zIndex: 50 }} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: `min(${width}px, 94vw)`,
          display: "flex",
          flexDirection: "column",
          background: COLORS.surface,
          borderLeft: `1px solid ${COLORS.border}`,
          boxShadow: "-16px 0 44px rgb(20 33 58 / 0.2)",
          zIndex: 60,
          animation: "jtrax-slide-in-right 0.22s ease both",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 18px",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <h3 style={{ margin: 0, fontFamily: FONT, fontSize: 15.5, fontWeight: 700, color: COLORS.text }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: COLORS.textSecondary, padding: 0 }}
          >
            <Icon name="x" size={17} />
          </button>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>{children}</div>
        {footer && (
          <footer
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "13px 18px",
              borderTop: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
            }}
          >
            {footer}
          </footer>
        )}
      </aside>
    </>
  );
}

/** Call / LINE / Email trio used on admin and teacher cards. */
export function ContactActions({ phone, lineId, email }: { phone: string; lineId: string; email: string }) {
  const t = useTranslations("common");
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flex: 1,
    padding: "7px 10px",
    borderRadius: 999,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surface,
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.text,
    textDecoration: "none",
    transition: "all 160ms ease",
    whiteSpace: "nowrap",
  };
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div style={{ display: "flex", gap: 7 }}>
      <a href={`tel:${phone.replace(/\s/g, "")}`} onClick={stop} className="jt-qa-call" style={base}>
        <Icon name="phone" size={13} /> {t("call")}
      </a>
      <a
        href={`https://line.me/ti/p/~${lineId}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stop}
        className="jt-qa-line"
        style={base}
      >
        <Icon name="chat" size={13} /> {t("line")}
      </a>
      <a href={`mailto:${email}`} onClick={stop} className="jt-qa-email" style={base}>
        <Icon name="mail" size={13} /> {t("email")}
      </a>
    </div>
  );
}

export function InfoGrid({ rows }: { rows: Array<{ label: string; value: ReactNode; icon?: IconName }> }) {
  return (
    <dl style={{ display: "grid", gap: 12, margin: 0 }}>
      {rows.map((row) => (
        <div key={row.label} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <dt
            style={{
              flex: "0 0 128px",
              fontFamily: FONT,
              fontSize: 12.5,
              color: COLORS.textSecondary,
            }}
          >
            {row.label}
          </dt>
          <dd style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: COLORS.text }}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
