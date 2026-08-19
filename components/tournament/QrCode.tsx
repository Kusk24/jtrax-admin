"use client";

/* A real, scannable QR code for a tournament's registration link.
 *
 * It replaces a decorative one. The old `buildQrCells` drew a deterministic
 * pseudo-random grid with three finder squares in the corners, which looked
 * exactly like a QR code in the mockup and did nothing when a phone was pointed
 * at it — the worst possible failure for something whose entire job is to be
 * scanned off a poster by a parent standing in a hall.
 *
 * Encoding a QR needs Reed-Solomon error correction, so this is a dependency
 * rather than a hand-roll. Error level M: enough redundancy to survive a print
 * and a phone camera at an angle, without inflating the module count so far
 * that the code stops resolving at poster size.
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
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
    QRCode.toString(value, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 0,
      color: { dark: COLORS.text, light: "#0000" },
    })
      .then((out) => {
        if (!cancelled) setRendered({ value, svg: out });
      })
      .catch(() => {
        /* An unencodable value is not worth an error state; the link is on
           screen beside it either way. */
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
        background: "#fff",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 9,
        boxSizing: "border-box",
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
