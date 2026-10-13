/**
 * A phone photo of a registration form, made small enough to upload before it
 * is read. Copied from jtrax-web-app's lib/shrink-image.ts, which does the same
 * for an ID card.
 *
 * A camera's photo of a page is 2–5 MB and around 4000 px across; reading the
 * form needs a fraction of that. Sent whole it is larger than the web server in
 * front of the API accepts by default (nginx: 1 MB), so the scan fails before
 * it reaches the reader. Scaled to 1600 px on its longest side it is a few
 * hundred kilobytes and the handwriting is still legible.
 *
 * Anything that goes wrong — a format the browser cannot decode, no canvas —
 * hands back the original file, which is what was sent before.
 */

/** The longest side a photo is sent at. */
export const MAX_SIDE = 1600;

/** Below this a photo is sent as it is, whatever its size in pixels. */
const SMALL_ENOUGH = 700 * 1024;

/** The size that fits within max on its longest side, keeping the shape.
    Never enlarges. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** The photo as a JPEG no larger than MAX_SIDE, or the original when it is
    already small or cannot be redrawn. */
export async function shrinkImage(file: File, max = MAX_SIDE, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= SMALL_ENOUGH) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  try {
    // Turned upright by its EXIF orientation, as the camera meant it.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]*$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
