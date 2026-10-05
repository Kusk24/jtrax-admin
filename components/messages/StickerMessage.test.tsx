import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { stickerImage } from "@/lib/line-stickers";
import { StickerMessage } from "./StickerMessage";

const sticker = { packageId: "446", stickerId: "1988", resourceType: "STATIC" };

function show(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("a LINE sticker", () => {
  it("is drawn from the local copy when the academy has one", () => {
    show(<StickerMessage sticker={sticker} assets={{ "446/1988": "/line-stickers/446-1988.png" }} />);
    expect(screen.getByRole("img", { name: "Sticker" }).getAttribute("src")).toBe("/line-stickers/446-1988.png");
  });

  it("is a placeholder, never [Sticker], when there is no local copy", () => {
    show(<StickerMessage sticker={sticker} assets={{}} />);
    const box = screen.getByRole("img", { name: "Sticker" });
    expect(box.tagName).toBe("DIV");
    expect(screen.queryByText("[Sticker]")).toBeNull();
  });

  it("is a placeholder for one saved before its ids were kept", () => {
    show(<StickerMessage assets={{ "446/1988": "/x.png" }} />);
    expect(screen.getByRole("img", { name: "Sticker" }).tagName).toBe("DIV");
  });

  it("shows a message sticker's own text", () => {
    show(<StickerMessage sticker={{ ...sticker, resourceType: "MESSAGE" }} text="Thank you!" assets={{}} />);
    expect(screen.getByText("Thank you!")).toBeDefined();
  });

  it("looks up by package and sticker id together", () => {
    expect(stickerImage({ packageId: "1", stickerId: "1988" }, { "446/1988": "/a.png" })).toBeNull();
  });
});
