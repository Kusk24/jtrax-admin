"use client";

/**
 * Putting a class on the timetable, as a card rather than a button.
 *
 * It used to be a 12px "Create Class" button in the Today's Classes header,
 * where it competed with the class list for the same corner and lost. It is
 * the one thing the desk does to this column rather than reads from it, so it
 * gets its own surface above the list.
 *
 * The rings are decoration, and the only decoration on the page: they mark
 * the single write action in a rail that is otherwise all readout. They are
 * drawn rather than an asset so they take the accent with them when the theme
 * changes.
 */

import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { ACCENTS, COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";

/** Concentric arcs breaking out of the card's top-right corner. */
function RingPattern() {
  return (
    <svg
      className="jt-create-rings"
      viewBox="0 0 200 200"
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMaxYMin slice"
    >
      {[38, 62, 86, 110, 134].map((r, i) => (
        <circle
          key={r}
          cx={168}
          cy={64}
          r={r}
          fill="none"
          stroke={ACCENTS.blue}
          strokeWidth={1.5}
          /* Fading outward so the rings read as a glow behind the plus rather
             than as five hard rules across the copy. */
          opacity={0.26 - i * 0.04}
        />
      ))}
    </svg>
  );
}

export function CreateClassCard({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations("dashboard");

  return (
    <button type="button" className="jt-create-class" onClick={onCreate}>
      <RingPattern />

      <span className="jt-create-body">
        <span className="jt-create-eyebrow" style={{ fontFamily: FONT }}>
          {t("createSession")}
        </span>
        <span
          style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600, color: COLORS.text }}
        >
          {t("createClassTitle")}
        </span>
        <span
          style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.45, color: COLORS.textSecondary }}
        >
          {t("createClassBody")}
        </span>
      </span>

      {/* Decorative: the whole card is the button, so the plus must not read
          as a second control a screen reader has to consider. */}
      <span className="jt-create-fab" aria-hidden>
        <Icon name="plus" size={20} color="#fff" />
      </span>
    </button>
  );
}
