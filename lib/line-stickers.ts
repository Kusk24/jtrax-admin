/**
 * Stickers the console can draw.
 *
 * LINE's webhook names a sticker only by package and sticker id; it has no API
 * that returns the image a user sent, so the server downloads nothing. A
 * sticker the academy has a local copy of is listed here, keyed
 * "packageId/stickerId", with its file under public/line-stickers/.
 *
 * Anything not listed is loaded by the browser from LINE's public sticker
 * store (stickerCdnUrl). That address is not an official API — it is the one
 * LINE's own store pages use — so it can stop working, and some creator
 * stickers are not on it; the console then falls back to a placeholder.
 */
export const STICKER_ASSETS: Record<string, string> = {
  // "446/1988": "/line-stickers/446-1988.png",
};

/** LINE's public image of a sticker, by its id. Static, so animated ones show their first frame. */
export function stickerCdnUrl(stickerId: string): string {
  return `https://stickershop.line-scdn.net/stickershop/v1/sticker/${encodeURIComponent(stickerId)}/android/sticker.png`;
}

/** The local image for a sticker, or null when there is none. */
export function stickerImage(
  sticker: { packageId: string; stickerId: string } | undefined,
  assets: Record<string, string> = STICKER_ASSETS,
): string | null {
  if (!sticker) return null;
  return assets[`${sticker.packageId}/${sticker.stickerId}`] ?? null;
}
