"use client";

/* Moving between games without going back to the list.

   During a class the office watches several boards at once, and each check
   used to be Back, find the row, open it. The navigator steps through the
   games in the order the Games table shows them — same filter, same sort — so
   "next" means the row under this one. */
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { neighbours, playersOf, stageOf, type GameRoom, type GameStage } from "@/lib/games";
import { Badge } from "../ui";

export const STATUS_TONE: Record<GameStage, { color: string; bg: string }> = {
  Active: { color: COLORS.success, bg: COLORS.successBg },
  Open: { color: COLORS.warning, bg: COLORS.warningBg },
  Finished: { color: COLORS.textSecondary, bg: COLORS.neutralBg },
  Cancelled: { color: COLORS.danger, bg: COLORS.dangerBg },
  Stopped: { color: COLORS.blue, bg: COLORS.light },
};

/** Whether a key press belongs to something the admin is typing into or
    working with — then the arrows are theirs, not the navigator's. */
function isBusyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("input, textarea, select, [role='listbox'], [role='dialog']")) return true;
  return false;
}

const arrowButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 9,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  cursor: "pointer",
  flexShrink: 0,
} as const;

export function GameNavigator({
  rooms,
  currentId,
  onSelect,
}: {
  /** The games in the Games table's order. */
  rooms: GameRoom[];
  currentId: string;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("games");
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const toggle = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const { index, prev, next } = neighbours(rooms, currentId);
  const current = index >= 0 ? rooms[index] : null;

  /* ← and → step through the games from anywhere on the page, except while
     the admin is typing or a dialog is up. One listener at a time: the old
     one is removed before the next is added. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (isBusyTarget(e.target) || document.querySelector("[role='dialog']")) return;
      const to = e.key === "ArrowLeft" ? prev : next;
      if (!to) return;
      e.preventDefault();
      onSelect(to.gameRoomId);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onSelect]);

  /* Focus moves into the list on opening so the arrow keys pick a game. */
  useEffect(() => {
    if (open) list.current?.focus();
  }, [open]);

  function openList() {
    setActive(Math.max(0, index));
    setOpen(true);
  }

  function choose(id: string) {
    setOpen(false);
    toggle.current?.focus();
    if (id !== currentId) onSelect(id);
  }

  function onListKey(e: ReactKeyboardEvent<HTMLUListElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rooms.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (rooms[active]) choose(rooms[active].gameRoomId);
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      setOpen(false);
      toggle.current?.focus();
    }
  }

  const waiting = t("waiting");

  return (
    <nav aria-label={t("navigator.label")} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <button
        type="button"
        className="jt-btn-ghost"
        aria-label={t("navigator.previous")}
        title={t("navigator.previousHint")}
        disabled={!prev}
        onClick={() => prev && onSelect(prev.gameRoomId)}
        style={{ ...arrowButton, opacity: prev ? 1 : 0.45, cursor: prev ? "pointer" : "not-allowed" }}
      >
        <Icon name="chevronLeft" size={16} />
      </button>

      <div style={{ position: "relative", minWidth: 0 }}>
        <button
          ref={toggle}
          type="button"
          className="jt-btn-ghost"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => (open ? setOpen(false) : openList())}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            height: 34,
            maxWidth: 380,
            padding: "0 10px 0 12px",
            borderRadius: 9,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.surface,
            cursor: "pointer",
            fontFamily: FONT,
            color: COLORS.text,
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.blue, whiteSpace: "nowrap" }}>
            {index >= 0
              ? t("navigator.position", { current: index + 1, total: rooms.length })
              : t("navigator.notInList", { total: rooms.length })}
          </span>
          {current && (
            <>
              <span aria-hidden style={{ width: 1, height: 16, background: COLORS.border }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {playersOf(current, waiting)}
              </span>
            </>
          )}
          <Icon name="chevronDown" size={14} color={COLORS.textSecondary} />
        </button>

        {open && (
          <ul
            ref={list}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={t("navigator.allGames")}
            aria-activedescendant={rooms[active] ? `${listId}-${rooms[active].gameRoomId}` : undefined}
            onKeyDown={onListKey}
            /* Clicking away closes it; the options keep focus on mousedown,
               so a blur really means focus left. */
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
            }}
            style={{
              position: "absolute",
              zIndex: 20,
              top: "calc(100% + 6px)",
              right: 0,
              width: "min(380px, calc(100vw - 32px))",
              maxHeight: 340,
              overflowY: "auto",
              margin: 0,
              padding: 4,
              listStyle: "none",
              outline: "none",
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              boxShadow: "0 12px 32px rgb(0 0 0 / 0.28)",
            }}
          >
            {rooms.map((room, i) => {
              const selected = room.gameRoomId === currentId;
              const tone = STATUS_TONE[stageOf(room)];
              return (
                <li
                  key={room.gameRoomId}
                  id={`${listId}-${room.gameRoomId}`}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(room.gameRoomId)}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    /* The current game carries the blue accent; the one under
                       the pointer or keyboard gets the quieter highlight. */
                    background: selected ? COLORS.light : i === active ? COLORS.neutralBg : "transparent",
                    boxShadow: selected ? `inset 3px 0 0 ${COLORS.blue}` : undefined,
                    fontFamily: FONT,
                  }}
                >
                  <span style={{ width: 22, fontSize: 12, color: COLORS.textSecondary, textAlign: "right", flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text,
                                   overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t("navigator.versus", {
                        white: room.white?.displayName ?? waiting,
                        black: room.black?.displayName ?? waiting,
                      })}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge color={tone.color} bg={tone.bg} style={{ fontSize: 11.5, padding: "1px 7px" }}>
                        {t(`status.${stageOf(room)}`)}
                      </Badge>
                      <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("navigator.moveCount", { count: room.moveCount })}
                      </span>
                    </span>
                  </span>
                  {selected && <Icon name="check" size={15} color={COLORS.blue} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="jt-btn-ghost"
        aria-label={t("navigator.next")}
        title={t("navigator.nextHint")}
        disabled={!next}
        onClick={() => next && onSelect(next.gameRoomId)}
        style={{ ...arrowButton, opacity: next ? 1 : 0.45, cursor: next ? "pointer" : "not-allowed" }}
      >
        <Icon name="chevronRight" size={16} />
      </button>
    </nav>
  );
}
