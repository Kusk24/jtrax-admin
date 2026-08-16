"use client";

/**
 * The block every detail view opens with.
 *
 * Each screen had grown its own: the student's put its status chips in the same
 * row as the buttons, the parent's used icon-only buttons, the admin's put its
 * actions in a modal footer, the teacher's used a red panel. Same job, four
 * shapes, so nothing was where the last screen had trained you to look.
 *
 * One shape now: who it is on the left, what they are underneath the name, the
 * actions on the right — written out as words, because "Edit" and "Delete" on a
 * page you have opened deliberately should not be a guess at a glyph.
 */
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { dangerButtonStyle, secondaryButtonStyle } from "./page-kit";
import { Card } from "./ui";

/** "Back to Students", and the like. Same affordance on every detail view. */
export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: 600,
        color: COLORS.textSecondary,
        padding: 0,
      }}
    >
      <Icon name="chevronLeft" size={16} color={COLORS.textSecondary} /> {label}
    </button>
  );
}

export function EditButton({ onClick, label }: { onClick: () => void; label?: string }) {
  const t = useTranslations("common");
  return (
    <button type="button" className="jt-act-edit" style={secondaryButtonStyle} onClick={onClick}>
      <Icon name="edit" size={14} /> {label ?? t("edit")}
    </button>
  );
}

export function DeleteButton({ onClick, label }: { onClick: () => void; label?: string }) {
  const t = useTranslations("common");
  return (
    <button type="button" className="jt-act-danger" style={dangerButtonStyle} onClick={onClick}>
      <Icon name="trash" size={14} color={COLORS.danger} /> {label ?? t("delete")}
    </button>
  );
}

/**
 * `avatar` is whatever identifies the thing — a person's initials, a course's
 * icon. `badges` sit under the name rather than beside the buttons: they say
 * what this record *is*, which belongs with its name, not with the controls
 * that change it.
 */
export function DetailHeader({
  avatar,
  title,
  subtitle,
  badges,
  actions,
}: {
  avatar?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
      {avatar}
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 21,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: "3px 0 0", fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
            {subtitle}
          </p>
        )}
        {badges && (
          <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {badges}
          </div>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>{actions}</div>
      )}
    </Card>
  );
}

/**
 * The red panel a destructive action drops into. Was hand-rolled on three
 * screens with three different shades of red; this is the one of them.
 */
export function DangerPanel({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  /* The confirm and cancel buttons, plus any choice the delete depends on. */
  children: ReactNode;
}) {
  return (
    <div
      className="jtrax-fade-in-up"
      style={{
        padding: 16,
        borderRadius: 12,
        border: `1px solid ${COLORS.dangerFill}`,
        background: COLORS.dangerBg,
        color: COLORS.danger,
      }}
    >
      <div style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 700 }}>{title}</div>
      {body && <p style={{ margin: "5px 0 12px", fontFamily: FONT, fontSize: 13.5 }}>{body}</p>}
      {children}
    </div>
  );
}
