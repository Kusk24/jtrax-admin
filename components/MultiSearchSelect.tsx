"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";

export type SearchOption = {
  id: string;
  label: string;
  /** A second line that tells two same-named people apart — their children. */
  sub?: string;
};

/**
 * Pick several things by typing part of a name.
 *
 * A search field with a list of matches under it, and what has been picked as
 * removable chips beneath. A plain multi-select is unusable past a dozen
 * entries, and the academy has hundreds of parents.
 */
export function MultiSearchSelect({
  label,
  placeholder,
  options,
  selected,
  onChange,
  noMatches,
  maxShown = 8,
}: {
  label: string;
  placeholder: string;
  options: SearchOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  noMatches: string;
  maxShown?: number;
}) {
  const t = useTranslations("common");
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const q = query.trim().toLowerCase();
  const matches = options
    .filter((o) => !selected.includes(o.id))
    .filter((o) => !q || o.label.toLowerCase().includes(q) || (o.sub ?? "").toLowerCase().includes(q))
    .slice(0, maxShown);
  const chosen = selected
    .map((id) => options.find((o) => o.id === id) ?? { id, label: id })
    .filter(Boolean);

  function pick(id: string) {
    onChange([...selected, id]);
    setQuery("");
    setActive(0);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      /* Enter picks, and never submits the form around the field. */
      e.preventDefault();
      if (open && matches[active]) pick(matches[active].id);
    } else if (e.key === "Escape" && open) {
      /* Closes the list, not the dialog around it. */
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "Backspace" && !query && selected.length > 0) {
      onChange(selected.slice(0, -1));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 12px",
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.surface,
          }}
        >
          <Icon name="search" size={15} color={COLORS.textSecondary} />
          <input
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].id}` : undefined}
            value={query}
            placeholder={placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            /* Options keep focus on mousedown, so a blur means focus left. */
            onBlur={() => setOpen(false)}
            onKeyDown={onKey}
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: FONT,
              fontSize: 14.5,
              color: COLORS.text,
            }}
          />
        </div>
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            style={{
              position: "absolute",
              zIndex: 5,
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              margin: 0,
              padding: 4,
              listStyle: "none",
              maxHeight: 240,
              overflowY: "auto",
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              boxShadow: "0 8px 24px rgb(20 33 58 / 0.12)",
            }}
          >
            {matches.length === 0 ? (
              <li style={{ padding: "8px 10px", fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {noMatches}
              </li>
            ) : (
              matches.map((o, i) => (
                <li
                  key={o.id}
                  id={`${listId}-${o.id}`}
                  role="option"
                  aria-selected={i === active}
                  /* mousedown, not click: it runs before the field's blur
                     closes the list. */
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(o.id);
                  }}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 7,
                    cursor: "pointer",
                    background: i === active ? COLORS.light : "transparent",
                    fontFamily: FONT,
                  }}
                >
                  <div style={{ fontSize: 14, color: COLORS.text }}>{o.label}</div>
                  {o.sub && <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{o.sub}</div>}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {chosen.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chosen.map((o) => (
            <span
              key={o.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 6px 4px 10px",
                borderRadius: 999,
                background: COLORS.light,
                fontFamily: FONT,
                fontSize: 13.5,
                color: COLORS.text,
              }}
            >
              {o.label}
              <button
                type="button"
                aria-label={t("removeThing", { what: o.label })}
                onClick={() => onChange(selected.filter((id) => id !== o.id))}
                style={{
                  display: "inline-flex",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 2,
                  color: COLORS.textSecondary,
                }}
              >
                <Icon name="x" size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
