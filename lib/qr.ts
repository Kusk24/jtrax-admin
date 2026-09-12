/**
 * Encoding a link as a QR code.
 *
 * Kept out of the component for one reason: this is where the colours are
 * decided, and getting them wrong is invisible. `qrcode` parses colour strings
 * itself and throws on anything that is not literal hex, so handing it a token
 * from `lib/theme.ts` — every one of which is now `var(--jt-…)` — fails at
 * runtime, inside a promise, and leaves a placeholder on screen. That is
 * exactly what happened when the console gained a dark theme.
 */
import QRCode from "qrcode";

/**
 * Black on white, in both themes, on purpose.
 *
 * A QR code is not a piece of the interface — it is a target for a camera, and
 * scanners are built for dark modules on a light field. Theming it would make
 * it a dark code on a dark card in dark mode, which no phone will read. The
 * printed example this matches is black on white too.
 */
export const QR_COLORS = { dark: "#000000", light: "#FFFFFF" } as const;

/**
 * The quiet zone, in modules. The spec asks for four; on a 96px card that eats
 * most of the code, so the on-screen one carries two and leans on the white
 * padding around it. The downloaded file — the one that ends up on a poster or
 * in a post, photographed at an angle — gets the full four.
 */
export const QUIET_ZONE_SCREEN = 2;
export const QUIET_ZONE_FILE = 4;

/**
 * Error correction level M: enough redundancy to survive a print and a phone
 * camera at an angle, without inflating the module count so far that the code
 * stops resolving at poster size.
 */
const LEVEL = "M" as const;

/** The code as inline SVG, for the card. */
export function encodeSvg(value: string): Promise<string> {
  return QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: LEVEL,
    margin: QUIET_ZONE_SCREEN,
    color: { ...QR_COLORS },
  });
}

/** How wide the downloaded file is. Big enough to print on a poster and to
    survive a social crop without the modules turning to mush. */
export const FILE_SIZE = 1024;

/** The code as a PNG data URL, for downloading. */
export function encodePng(value: string, width = FILE_SIZE): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: LEVEL,
    margin: QUIET_ZONE_FILE,
    width,
    color: { ...QR_COLORS },
  });
}

/**
 * A filename somebody can find again after downloading four of them.
 *
 * Built from the link's last meaningful segment — `trn_wellington` — rather
 * than the tournament's display name, which is free text and arrives with
 * spaces, slashes and Thai in it.
 */
export function fileNameFor(url: string): string {
  let last = "";
  try {
    last = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    /* Not a URL we can parse; the generic name is still better than nothing. */
  }
  const safe = last.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
  return safe ? `jtrax-qr-${safe}.png` : "jtrax-qr.png";
}
