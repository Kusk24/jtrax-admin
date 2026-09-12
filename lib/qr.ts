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
 * Error correction level H — the highest, recovering from ~30% of the code
 * being unreadable.
 *
 * M was enough while nothing covered the code. A logo in the middle *is*
 * damage, deliberately applied, so the redundancy that repairs a crease or a
 * thumb is the same redundancy that pays for the mark. H costs modules, which
 * is why the downloaded file is 1024px: more modules in the same square means
 * each one is smaller, and a small module is what actually stops a code
 * resolving.
 */
const LEVEL = "H" as const;

/**
 * How wide the logo plate is, as a fraction of the whole code.
 *
 * 22% of the width is ~5% of the area — comfortably inside what H recovers,
 * with room left for the print, the angle and the crease it was meant for.
 * Pushing this is the cheapest way to make a code that scans on your desk and
 * fails on a wall, so it is a constant with a test pointed at it rather than a
 * number tuned by eye.
 */
export const LOGO_SCALE = 0.22;

/** The mark in the middle. The academy's, not an event's: every tournament in
    here is a JCA tournament, and the file is already served for the sidebar. */
export const LOGO_SRC = "/jca-logo.png";

/** The white plate behind the logo, as a fraction of the plate's own width.
    A logo laid straight onto the modules has no edge, and a scanner reading
    the boundary between it and the code finds noise. */
const LOGO_PAD = 0.16;

/** The code as inline SVG, for the card. */
export async function encodeSvg(value: string, logo = LOGO_SRC): Promise<string> {
  const svg = await QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: LEVEL,
    margin: QUIET_ZONE_SCREEN,
    color: { ...QR_COLORS },
  });
  return logo ? withLogo(svg, logo) : svg;
}

/**
 * Lays the plate and the mark over the middle of an encoded SVG.
 *
 * The viewBox is in *modules*, not pixels — `0 0 45 45` for a code of 41
 * modules inside a 2-module quiet zone — so everything here is sized against
 * that side length and scales with whatever the card renders it at.
 */
export function withLogo(svg: string, logo: string): string {
  const side = Number(/viewBox="0 0 (\d+(?:\.\d+)?)/.exec(svg)?.[1]);
  if (!Number.isFinite(side) || side <= 0) {
    // An SVG we cannot measure is one we must not draw on: a mis-placed plate
    // covers data instead of the middle. The bare code still scans.
    return svg;
  }
  const plate = side * LOGO_SCALE;
  const mark = plate * (1 - LOGO_PAD * 2);
  const at = (w: number) => (side - w) / 2;

  return svg.replace(
    "</svg>",
    `<rect x="${at(plate)}" y="${at(plate)}" width="${plate}" height="${plate}" rx="${plate * 0.14}" fill="${QR_COLORS.light}"/>` +
      `<image x="${at(mark)}" y="${at(mark)}" width="${mark}" height="${mark}" href="${logo}" preserveAspectRatio="xMidYMid meet"/>` +
      "</svg>",
  );
}

/** How wide the downloaded file is. Big enough to print on a poster and to
    survive a social crop without the modules turning to mush. */
export const FILE_SIZE = 1024;

/** The bare code as a PNG data URL, with no mark on it. */
export function encodePngPlain(value: string, width = FILE_SIZE): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: LEVEL,
    margin: QUIET_ZONE_FILE,
    width,
    color: { ...QR_COLORS },
  });
}

/**
 * The code as a PNG data URL, with the mark in the middle.
 *
 * Composited on a canvas rather than by rasterising the SVG, because an SVG
 * with an `<image href>` in it does not draw reliably from a data URL — the
 * referenced file is a second fetch the canvas will not wait for, and what
 * lands on disk is a code with a hole in it.
 *
 * Browser only, which is where downloads happen. Falls back to the bare code
 * if anything in the composite fails: a QR with no logo still scans, and a
 * missing download does not.
 */
export async function encodePng(
  value: string,
  width = FILE_SIZE,
  logo = LOGO_SRC,
): Promise<string> {
  const bare = await encodePngPlain(value, width);
  if (!logo || typeof document === "undefined") return bare;

  try {
    const [code, mark] = await Promise.all([loadImage(bare), loadImage(logo)]);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = width;
    const ctx = canvas.getContext("2d");
    if (!ctx) return bare;

    ctx.drawImage(code, 0, 0, width, width);

    const plate = width * LOGO_SCALE;
    const size = plate * (1 - LOGO_PAD * 2);
    ctx.fillStyle = QR_COLORS.light;
    roundedRect(ctx, (width - plate) / 2, (width - plate) / 2, plate, plate * 0.14);
    ctx.fill();
    ctx.drawImage(mark, (width - size) / 2, (width - size) / 2, size, size);

    return canvas.toDataURL("image/png");
  } catch {
    return bare;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, at: number, top: number, side: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(at + r, top);
  ctx.arcTo(at + side, top, at + side, top + side, r);
  ctx.arcTo(at + side, top + side, at, top + side, r);
  ctx.arcTo(at, top + side, at, top, r);
  ctx.arcTo(at, top, at + side, top, r);
  ctx.closePath();
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
