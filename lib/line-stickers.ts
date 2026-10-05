/**
 * Stickers the console can draw.
 *
 * LINE's webhook names a sticker only by package and sticker id; it has no API
 * that returns the image a user sent, so nothing is downloaded. A sticker the
 * academy has a licensed copy of is listed here, keyed "packageId/stickerId",
 * with its file under public/line-stickers/. Anything not listed is drawn as a
 * placeholder.
 */
export const STICKER_ASSETS: Record<string, string> = {
  // "446/1988": "/line-stickers/446-1988.png",
};

/** The local image for a sticker, or null to draw the placeholder. */
export function stickerImage(
  sticker: { packageId: string; stickerId: string } | undefined,
  assets: Record<string, string> = STICKER_ASSETS,
): string | null {
  if (!sticker) return null;
  return assets[`${sticker.packageId}/${sticker.stickerId}`] ?? null;
}
