"use client";

import type { CSSProperties, ReactNode } from "react";
import { COLORS, FONT } from "@/lib/jtrax/theme";

/** The mockup's standard white panel: 1px hairline border, 14px radius. */
export function Card({
  children,
  style,
  className,
  onClick,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <section
      className={className}
      onClick={onClick}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <h2
      style={{
        margin: 0,
        fontFamily: FONT,
        fontSize: 15,
        fontWeight: 700,
        color: COLORS.text,
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

export function Avatar({
  initials,
  size = 32,
  color = COLORS.blue,
  bg = COLORS.light,
}: {
  initials: string;
  size?: number;
  color?: string;
  bg?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color,
        fontFamily: FONT,
        fontSize: size * 0.36,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

export function Badge({
  children,
  color,
  bg,
  style,
}: {
  children: ReactNode;
  color: string;
  bg: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: 999,
        background: bg,
        color,
        fontFamily: FONT,
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** Small coloured dot keyed to a class category. */
export function ClassDot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        marginRight: 7,
        flexShrink: 0,
      }}
    />
  );
}
