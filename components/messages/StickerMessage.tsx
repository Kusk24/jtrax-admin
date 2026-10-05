"use client";

/* A LINE sticker in the thread: its image when the academy has it locally
   (lib/line-stickers.ts), otherwise a placeholder. No bubble either way —
   LINE draws stickers bare. A message sticker's own text goes underneath. */
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import type { LineSticker } from "@/lib/line";
import { stickerImage, STICKER_ASSETS } from "@/lib/line-stickers";
import { COLORS, FONT } from "@/lib/theme";

const SIZE = 96;

export function StickerMessage({
  sticker,
  text,
  assets = STICKER_ASSETS,
}: {
  sticker?: LineSticker;
  text?: string;
  assets?: Record<string, string>;
}) {
  const t = useTranslations("messages");
  const src = stickerImage(sticker, assets);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={t("kindSticker")} width={SIZE} height={SIZE} style={{ objectFit: "contain" }} />
      ) : (
        <div
          role="img"
          aria-label={t("kindSticker")}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: 16,
            border: `1.5px dashed ${COLORS.border}`,
            background: COLORS.neutralBg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Icon name="smile" size={30} color={COLORS.textSecondary} />
          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.textSecondary }}>
            {t("kindSticker")}
          </span>
        </div>
      )}
      {text && <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.text }}>{text}</span>}
    </div>
  );
}
