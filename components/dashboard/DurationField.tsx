"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { MIN_SESSION_MINUTES } from "@/lib/session-draft";
import { COLORS, FONT } from "@/lib/theme";

/**
 * "2 hr 45 min", from the parts, so the two languages can order them and
 * punctuate them their own way. Shared by the running-class panel and the
 * early check-out question, so a length reads the same everywhere it is shown.
 */
export function useLengthLabel(): (total: number) => string {
  const t = useTranslations("session");
  return (total: number) => {
    const whole = Math.round(total);
    const h = Math.floor(whole / 60);
    const m = whole % 60;
    if (h === 0) return t("lengthMinutes", { minutes: m });
    if (m === 0) return t("lengthHours", { hours: h });
    return t("lengthHoursMinutes", { hours: h, minutes: m });
  };
}

const SEGMENT_HEIGHT = 38; // inside a 1px border: 40px, the height of every field

/**
 * One half of the duration: the hours, or the minutes.
 *
 * A click opens its presets; a double-click — or simply typing a number while
 * it has focus — turns it into a text box for any value. Enter keeps the
 * value, Esc and clicking away drop it. A native <select> could not do this:
 * it opens its own list on the first press, and the double-click never
 * reaches the page.
 */
function Segment({
  label,
  value,
  unit,
  presets,
  isAllowed,
  disabled,
  onChoose,
  onTyped,
}: {
  label: string;
  value: number;
  unit: (n: number) => string;
  presets: number[];
  /** Whether a preset can be picked at all, given the other half. */
  isAllowed: (n: number) => boolean;
  disabled: boolean;
  onChoose: (n: number) => void;
  /** A typed value: returns what is wrong with it, or null once accepted. */
  onTyped: (n: number) => string | null;
}) {
  const t = useTranslations("session");
  const listId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  /* Opened by typing a digit: that digit is the start of the value, so it is
     kept rather than selected for replacing. */
  const [typedFirst, setTypedFirst] = useState(false);
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  function edit(initial: string, fromKey = false) {
    if (disabled) return;
    setOpen(false);
    setTypedFirst(fromKey);
    setText(initial);
    setProblem(null);
    setEditing(true);
  }

  function stopEditing() {
    setEditing(false);
    setProblem(null);
    /* Back to the segment, so the keyboard carries on from where it was. */
    requestAnimationFrame(() => button.current?.focus());
  }

  function commit() {
    const n = Number(text.trim());
    if (!/^\d+$/.test(text.trim()) || !Number.isFinite(n)) {
      setProblem(t("durationWholeNumber"));
      return;
    }
    const wrong = onTyped(n);
    if (wrong) {
      setProblem(wrong);
      return;
    }
    stopEditing();
  }

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      /* This field's Esc, not the panel's around it. */
      e.preventDefault();
      e.stopPropagation();
      stopEditing();
    }
  }

  function onButtonKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      edit(e.key, true);
    } else if (e.key === "F2") {
      e.preventDefault();
      edit(String(value));
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      setOpen(true);
    }
  }

  const segment = {
    flex: 1,
    minWidth: 0,
    height: SEGMENT_HEIGHT,
    padding: "0 10px 0 12px",
    border: "none",
    background: "transparent",
    fontFamily: FONT,
    fontSize: 14.5,
    lineHeight: "20px",
    color: COLORS.text,
    outline: "none",
  } as const;

  return (
    <span style={{ position: "relative", flex: 1, minWidth: 0, display: "flex" }}>
      {editing ? (
        <input
          aria-label={t("durationTypeLabel", { part: label })}
          autoFocus
          inputMode="numeric"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setProblem(null);
          }}
          onFocus={(e) => {
            const el = e.currentTarget;
            if (typedFirst) el.setSelectionRange(el.value.length, el.value.length);
            else el.select();
          }}
          onKeyDown={onInputKey}
          /* Clicking away is not a decision; only Enter keeps a value. A
             length change on a running class re-charges everyone in it. */
          onBlur={() => stopEditing()}
          style={{ ...segment, background: COLORS.light, borderRadius: 8 }}
        />
      ) : (
        <button
          ref={button}
          type="button"
          aria-label={`${label}: ${unit(value)}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={t("durationSegmentTitle")}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          onDoubleClick={() => edit(String(value))}
          onKeyDown={onButtonKey}
          /* Options keep focus on mousedown, so a blur means focus really
             left — close at once, never on a timer that could land on a list
             reopened a moment later. */
          onBlur={() => setOpen(false)}
          style={{
            ...segment,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.6 : 1,
            textAlign: "left",
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>{unit(value)}</span>
          <Icon name="chevronDown" size={14} color={COLORS.textSecondary} />
        </button>
      )}

      {open && !editing && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          style={{
            position: "absolute",
            zIndex: 5,
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            margin: 0,
            padding: 4,
            listStyle: "none",
            maxHeight: 220,
            overflowY: "auto",
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.surface,
            boxShadow: "0 8px 24px rgb(20 33 58 / 0.12)",
          }}
        >
          {presets.map((n) => {
            const allowed = isAllowed(n);
            return (
              <li
                key={n}
                role="option"
                aria-selected={n === value}
                aria-disabled={!allowed}
                /* mousedown: runs before the segment's blur closes the list. */
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!allowed) return;
                  onChoose(n);
                  setOpen(false);
                }}
                style={{
                  padding: "7px 10px",
                  borderRadius: 7,
                  fontFamily: FONT,
                  fontSize: 14,
                  cursor: allowed ? "pointer" : "not-allowed",
                  color: allowed ? COLORS.text : COLORS.textSecondary,
                  opacity: allowed ? 1 : 0.5,
                  background: n === value ? COLORS.light : "transparent",
                  fontWeight: n === value ? 600 : 400,
                }}
              >
                {unit(n)}
              </li>
            );
          })}
        </ul>
      )}

      {problem && (
        <span
          role="alert"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "100%",
            whiteSpace: "nowrap",
            fontFamily: FONT,
            fontSize: 12,
            color: COLORS.danger,
          }}
        >
          {problem}
        </span>
      )}
    </span>
  );
}

/**
 * A class length as one control: [ 2 hr ▾ | 0 min ▾ ].
 *
 * Two halves in one bordered box, the same 40px as every field beside it,
 * so it reads as a single Duration rather than two stray dropdowns. Each half
 * offers presets — whole hours, quarter hours — and takes any typed value on
 * a double-click: a class can run 2 hr 5 min.
 *
 * `max` is how long the class may run from its start before it would cross
 * midnight; nothing longer is offered or accepted, and nothing under half an
 * hour.
 */
export function DurationField({
  idPrefix,
  minutes,
  max,
  disabled = false,
  onChange,
}: {
  idPrefix: string;
  minutes: number;
  max: number;
  disabled?: boolean;
  onChange: (minutes: number) => void;
}) {
  const t = useTranslations("session");
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const fits = (total: number) => total >= MIN_SESSION_MINUTES && total <= max;
  const tooShortOrLong = (total: number) =>
    total < MIN_SESSION_MINUTES ? t("atLeastHalfAnHour") : total > max ? t("durationPastMidnight") : null;

  const hourPresets: number[] = [];
  for (let h = 0; h * 60 <= max; h++) hourPresets.push(h);

  return (
    <div
      id={idPrefix}
      role="group"
      aria-label={t("length")}
      style={{
        display: "flex",
        alignItems: "stretch",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 9,
        background: COLORS.surface,
      }}
    >
      <Segment
        label={t("durationHours")}
        value={hours}
        unit={(n) => t("durationHourOption", { hours: n })}
        presets={hourPresets}
        isAllowed={(h) => h * 60 + rest <= max && (h > 0 || rest >= MIN_SESSION_MINUTES || rest === 0)}
        disabled={disabled}
        onChoose={(h) => {
          const next = h * 60 + rest;
          /* 0 hr with 0 min is no class: take the shortest one there is. */
          onChange(fits(next) ? next : Math.min(max, Math.max(MIN_SESSION_MINUTES, next)));
        }}
        onTyped={(h) => {
          const next = h * 60 + rest;
          const wrong = tooShortOrLong(next);
          if (wrong) return wrong;
          if (next !== minutes) onChange(next);
          return null;
        }}
      />
      <span aria-hidden style={{ width: 1, alignSelf: "stretch", margin: "8px 0", background: COLORS.border }} />
      <Segment
        label={t("durationMinutes")}
        value={rest}
        unit={(n) => t("durationMinuteOption", { minutes: n })}
        presets={[0, 15, 30, 45]}
        isAllowed={(m) => fits(hours * 60 + m)}
        disabled={disabled}
        onChoose={(m) => onChange(hours * 60 + m)}
        onTyped={(m) => {
          if (m > 59) return t("durationMinutesRange");
          const next = hours * 60 + m;
          const wrong = tooShortOrLong(next);
          if (wrong) return wrong;
          if (next !== minutes) onChange(next);
          return null;
        }}
      />
    </div>
  );
}
