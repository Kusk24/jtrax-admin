import { describe, expect, it } from "vitest";
import { MAX_SIDE, fitWithin, shrinkImage } from "./shrink-image";

describe("fitWithin", () => {
  it("scales a phone photo down to the longest side, keeping its shape", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: MAX_SIDE, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: MAX_SIDE });
  });

  it("leaves a photo that already fits alone, and never enlarges", () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
    expect(fitWithin(MAX_SIDE, 10)).toEqual({ width: MAX_SIDE, height: 10 });
  });
});

describe("shrinkImage", () => {
  it("sends a small photo as it is", async () => {
    const small = new File([new Uint8Array(1000)], "form.jpg", { type: "image/jpeg" });
    expect(await shrinkImage(small)).toBe(small);
  });

  it("hands back the original where it cannot redraw it", async () => {
    // No canvas in this environment: the photo goes as it was, not nowhere.
    const big = new File([new Uint8Array(2 * 1024 * 1024)], "form.jpg", { type: "image/jpeg" });
    expect(await shrinkImage(big)).toBe(big);
  });
});
