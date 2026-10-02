"use client";

/**
 * Every round side by side — the event at a glance.
 *
 * The stacked list (RoundCard) is for reading one round closely; this is for
 * following a player across all of them without opening anything. Each round
 * is a column of its boards, the columns scroll sideways, and the picked
 * player's board is outlined in every round so their path reads left to right.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { nameKey, type RoundView } from "@/lib/tournament-rounds";
import type { LinkedPairing } from "@/lib/chess-results";
import { ResultPill } from "./RoundCard";

/** Boards shown in a column until "Show all games" is pressed. */
export const COLUMN_FOLD = 8;
const COLUMN_WIDTH = 322;

export function RoundColumns({
  views: allViews,
  selected,
  onSelect,
  showAll,
  onShowAll,
}: {
  views: RoundView[];
  /** The picked player, outlined on every board they sat at. */
  selected: string | null;
  onSelect: (name: string) => void;
  /** Every board in every column, from the one button beside the search. */
  showAll: boolean;
  /** Opens every column — the "+N more" line at a folded column's foot. */
  onShowAll: () => void;
}) {
  const t = useTranslations("results");
  /* A round the arbiter has not paired yet has nothing to show, so it gets
     no column; the list view still names it. */
  const views = allViews.filter((v) => v.pairings.length > 0);
  const scroller = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ start: 0, size: 1 });

  function measure() {
    const el = scroller.current;
    if (!el) return;
    const size = el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1;
    const room = el.scrollWidth - el.clientWidth;
    setBar({ start: room > 0 ? (el.scrollLeft / room) * (1 - size) : 0, size });
  }

  /* Opens on the latest completed round, not on round 1: that is the one
     everyone at the venue is asking about. */
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const at = views.findIndex((v) => v.latest);
    if (at > 0) el.scrollLeft = at * (COLUMN_WIDTH + 16);
    const onResize = () => measure();
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // Only on first show: re-running on every filter would yank the scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * (COLUMN_WIDTH + 16), behavior: "smooth" });
  const pickedKey = selected ? nameKey(selected) : null;
  const onBoard = (p: LinkedPairing) => !!pickedKey && (nameKey(p.white) === pickedKey || nameKey(p.black ?? "") === pickedKey);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        ref={scroller}
        onScroll={measure}
        tabIndex={0}
        role="region"
        aria-label={t("columnsRegion")}
        style={{ display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x proximity", paddingBottom: 4, scrollbarWidth: "none" }}
      >
        {views.map((view) => {
          const hidden = view.pairings.slice(COLUMN_FOLD);
          /* Folded, the picked player's board still shows when it is below
             the fold — the column is there to show where they are. */
          const rows = showAll ? view.pairings : [...view.pairings.slice(0, COLUMN_FOLD), ...hidden.filter(onBoard)];
          return (
            <section
              key={view.round}
              aria-label={t("round", { n: view.round })}
              style={{
                flex: `0 0 ${COLUMN_WIDTH}px`,
                maxWidth: "86vw",
                scrollSnapAlign: "start",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: 14,
                borderRadius: 20,
                border: `1px solid ${view.latest ? COLORS.blue : COLORS.border}`,
                background: COLORS.light,
              }}
            >
              <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "4px 4px 6px" }}>
                <div>
                  <strong style={{ display: "block", fontFamily: FONT, fontSize: 16, color: COLORS.text }}>
                    {view.final ? t("roundFinal", { n: view.round }) : t("round", { n: view.round })}
                  </strong>
                  {view.date && <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{dateLabel(view.date)}</span>}
                </div>
                <span style={{ padding: "3px 10px", borderRadius: 999, border: `1px solid ${COLORS.border}`, background: COLORS.surface, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary, whiteSpace: "nowrap" }}>
                  {t("colGames", { count: view.boards })}
                </span>
              </header>

              {rows.map((p) => (
                <BoardRow key={p.board} pairing={p} picked={pickedKey} highlight={onBoard(p)} onSelect={onSelect} />
              ))}

              {/* Folded: say how much is below, so a short column is not read
                  as the whole round. */}
              {!showAll && view.pairings.length > rows.length && (
                <button
                  type="button"
                  onClick={onShowAll}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 8px", border: `1px dashed ${COLORS.border}`, borderRadius: 12, background: "transparent", cursor: "pointer", fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: COLORS.blue }}
                >
                  {t("colMoreBelow", { count: view.pairings.length - rows.length })}
                  <Icon name="chevronDown" size={13} color={COLORS.blue} />
                </button>
              )}

            </section>
          );
        })}
      </div>

      {/* Where the strip is, and a way along it without a trackpad. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ArrowButton label={t("colPrev")} icon="chevronLeft" onClick={() => step(-1)} />
        <div aria-hidden style={{ flex: 1, height: 7, borderRadius: 999, background: COLORS.neutralBg, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${bar.start * 100}%`, width: `${bar.size * 100}%`, borderRadius: 999, background: COLORS.blue }} />
        </div>
        <ArrowButton label={t("colNext")} icon="chevronRight" onClick={() => step(1)} />
      </div>
    </div>
  );
}

function BoardRow({
  pairing,
  picked,
  highlight,
  onSelect,
}: {
  pairing: LinkedPairing;
  picked: string | null;
  highlight: boolean;
  onSelect: (name: string) => void;
}) {
  const t = useTranslations("results");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
        alignItems: "center",
        gap: 10,
        padding: highlight ? "8px 11px" : "9px 12px",
        borderRadius: 14,
        border: `${highlight ? 2 : 1}px solid ${highlight ? COLORS.blue : COLORS.border}`,
        background: COLORS.surface,
        boxShadow: highlight ? `0 0 0 3px ${COLORS.light}` : undefined,
      }}
    >
      <NameButton name={pairing.white} picked={picked} onSelect={onSelect} />
      <ResultPill result={pairing.result} />
      {pairing.black ? (
        <NameButton name={pairing.black} picked={picked} onSelect={onSelect} alignRight />
      ) : (
        <span style={{ textAlign: "right", fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>{t("bye")}</span>
      )}
    </div>
  );
}

/** The name in two lines, as chess-results writes it — "Liu, Xi Feng" is
    "Liu" and, smaller underneath, "Xi Feng" — so a crowded column still
    tells two Lius apart. The full name is the accessible name and tooltip. */
function NameButton({ name, picked, onSelect, alignRight = false }: { name: string; picked: string | null; onSelect: (n: string) => void; alignRight?: boolean }) {
  const me = picked !== null && nameKey(name) === picked;
  const cut = name.indexOf(",");
  const first = (cut < 0 ? name : name.slice(0, cut)).trim() || name;
  const rest = cut < 0 ? "" : name.slice(cut + 1).trim();
  const line: React.CSSProperties = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  return (
    <button
      type="button"
      title={name}
      aria-label={name}
      onClick={() => onSelect(name)}
      style={{
        minWidth: 0,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        textAlign: alignRight ? "right" : "left",
        fontFamily: FONT,
        lineHeight: 1.25,
      }}
    >
      <span style={{ ...line, fontSize: 13.5, fontWeight: me ? 700 : 500, color: me ? COLORS.blue : COLORS.text }}>{first}</span>
      {rest && <span style={{ ...line, fontSize: 12, color: me ? COLORS.blue : COLORS.textSecondary }}>{rest}</span>}
    </button>
  );
}

function ArrowButton({ label, icon, onClick }: { label: string; icon: "chevronLeft" | "chevronRight"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, border: `1px solid ${COLORS.border}`, background: COLORS.surface, cursor: "pointer", flexShrink: 0 }}
    >
      <Icon name={icon} size={16} color={COLORS.textSecondary} />
    </button>
  );
}

/* The arbiter's date as it was published: "2026/06/07" reads as "Jun 7, 2026". */
function dateLabel(raw: string): string {
  const m = raw.match(/(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (!m) return raw;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(d);
}
