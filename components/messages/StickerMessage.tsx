"use client";

/* A LINE sticker in the thread: the academy's local copy if it has one, else
   LINE's public image of it (lib/line-stickers.ts), else — no id, or the image
   would not load — a placeholder. No bubble either way: LINE draws stickers
   bare. A message sticker's own text goes underneath. */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import type { LineSticker } from "@/lib/line";
import { stickerCdnUrl, stickerImage, STICKER_ASSETS } from "@/lib/line-stickers";
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
  const [failed, setFailed] = useState(false);
  const src = failed
    ? null
    : stickerImage(sticker, assets) ?? (sticker?.stickerId ? stickerCdnUrl(sticker.stickerId) : null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={t("kindSticker")}
          width={SIZE}
          height={SIZE}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={{ objectFit: "contain" }}
        />
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
