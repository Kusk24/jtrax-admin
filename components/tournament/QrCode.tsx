"use client";

/* A real, scannable QR code for a tournament's registration link.
 *
 * It replaces a decorative one. The old `buildQrCells` drew a deterministic
 * pseudo-random grid with three finder squares in the corners, which looked
 * exactly like a QR code in the mockup and did nothing when a phone was pointed
 * at it — the worst possible failure for something whose entire job is to be
 * scanned off a poster by a parent standing in a hall.
 *
 * The colours and the quiet zone live in `lib/qr.ts`; see the note there on why
 * they are not theme tokens.
 */
import { useEffect, useState } from "react";
import { encodeSvg, QR_COLORS } from "@/lib/qr";
import { COLORS } from "@/lib/theme";

export function QrCode({
  value,
  size = 104,
  label,
}: {
  value: string;
  size?: number;
  /** Describes where the code leads, for anyone not using a camera. */
  label: string;
}) {
  /* The rendered code is stored *with* the value it was made from, rather than
     alone. Encoding is async, so a bare `svg` string would keep showing the
     previous tournament's code until the new one resolved — and clearing it
     up-front would mean setting state synchronously inside the effect, which
     cascades a render. Pairing the two makes staleness answerable by comparison
     instead. */
  const [rendered, setRendered] = useState<{ value: string; svg: string } | null>(null);

  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    encodeSvg(value)
      .then((out) => {
        if (!cancelled) setRendered({ value, svg: out });
      })
      .catch((err) => {
        /* Swallowing this is how a themed colour token turned every QR on the
           console into a grey square for weeks: the encoder throws inside a
           promise, the placeholder below is indistinguishable from "still
           loading", and nothing reaches a log. The link is on screen beside it
           either way, so this stays out of the interface — but it does not stay
           out of the console. */
        console.error("QR encoding failed for", value, err);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const svg = rendered?.value === value ? rendered.svg : "";

  if (!svg) {
    // Reserves the space so the card does not jump when the code arrives.
    return (
      <div
        aria-hidden
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: 9,
          background: COLORS.neutralBg,
          border: `1px solid ${COLORS.border}`,
        }}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        width: size,
        height: size,
        padding: 6,
        flexShrink: 0,
        /* White in both themes, like the code itself. A dark card behind a
           dark-moduled code is the same unscannable thing as dark modules on a
           dark field — the quiet zone has to be light too. */
        background: QR_COLORS.light,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 9,
        boxSizing: "border-box",
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
