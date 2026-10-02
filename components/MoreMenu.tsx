"use client";

/* A row's "⋯": the actions a row has, kept out of sight until asked for.
   Several buttons repeated down every row turn a list into a control panel;
   one quiet button per row keeps it a list. */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon, type IconName } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";

export type MoreMenuItem = {
  label: string;
  /** The accessible name when the label alone would be ambiguous. */
  ariaLabel?: string;
  icon?: IconName;
  danger?: boolean;
  /** Why it cannot be used right now; the item stays listed, disabled. */
  disabledReason?: string | null;
  onSelect: () => void;
};

export function MoreMenu({ label, items }: { label: string; items: MoreMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const box = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  /* Clicking anywhere else closes it. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    first.current?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function onMenuKey(e: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      buttons[(at + 1) % buttons.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      buttons[(at - 1 + buttons.length) % buttons.length]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    /* Clicks inside belong to the menu, never to the row or card around it. */
    <span ref={box} style={{ position: "relative", display: "inline-flex" }} onClick={(e) => e.stopPropagation()}>
      <button
        ref={trigger}
        type="button"
        className="jt-btn-ghost"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: 8,
          border: `1px solid ${open ? COLORS.border : "transparent"}`,
          background: open ? COLORS.light : "transparent",
          color: COLORS.textSecondary,
          cursor: "pointer",
        }}
      >
        <Icon name="moreHorizontal" size={17} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          style={{
            position: "absolute",
            zIndex: 20,
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 180,
            padding: 4,
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.surface,
            boxShadow: "0 10px 28px rgb(0 0 0 / 0.25)",
          }}
        >
          {items.map((item, i) => {
            const disabled = !!item.disabledReason;
            return (
              <button
                key={item.label}
                ref={i === 0 ? first : undefined}
                type="button"
                role="menuitem"
                aria-label={item.ariaLabel}
                disabled={disabled}
                title={item.disabledReason ?? undefined}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  borderRadius: 7,
                  background: "transparent",
                  cursor: disabled ? "not-allowed" : "pointer",
                  textAlign: "left",
                  fontFamily: FONT,
                  fontSize: 13.5,
                  color: disabled ? COLORS.disabled : item.danger ? COLORS.danger : COLORS.text,
                }}
                className="jt-menu-item"
              >
                {item.icon && <Icon name={item.icon} size={14} />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}
