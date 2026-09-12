/**
 * The QR code encodes at all.
 *
 * This exists because it did not. `QrCode.tsx` passed `COLORS.text` to the
 * encoder, and the dark-theme change (#84) turned every token in `lib/theme.ts`
 * into `var(--jt-…)`. `qrcode` parses colour strings itself and throws
 * `Invalid hex color` — inside a promise, caught and discarded, leaving a grey
 * placeholder that looks exactly like "still loading".
 *
 * So these call the real encoder rather than asserting on an options object: a
 * test that checked the colours *looked* like hex would have passed against a
 * token too.
 */
import { describe, expect, it } from "vitest";
import { QR_COLORS, encodePng, encodeSvg, fileNameFor } from "./qr";

const URL_ = "https://jtrax-web-app.vercel.app/register/trn_wellington";

describe("encodeSvg", () => {
  it("produces a real SVG for a registration link", async () => {
    const svg = await encodeSvg(URL_);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    // A QR of this length is ~33 modules; a stub would not carry a path.
    expect(svg).toContain("<path");
  });

  it("rejects nothing a tournament link can contain", async () => {
    for (const value of [
      "https://a.test/register/trn_x",
      "https://a.test/t/trn_x?lang=th",
      "https://ตัวอย่าง.test/register/trn_x",
    ]) {
      await expect(encodeSvg(value)).resolves.toContain("<svg");
    }
  });
});

describe("encodePng", () => {
  it("produces a PNG data URL big enough to print", async () => {
    const href = await encodePng(URL_);
    expect(href.startsWith("data:image/png;base64,")).toBe(true);
    // A 1024px code is tens of KB; a blank or tiny one would not be.
    expect(href.length).toBeGreaterThan(2000);
  });
});

describe("the colours", () => {
  it("are literal hex, because the encoder parses them itself", () => {
    // The regression in one line: a theme token is not a colour to this library.
    expect(QR_COLORS.dark).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(QR_COLORS.light).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("are dark-on-light, which is the only thing a scanner reads", () => {
    // Not themed. A dark code on a dark card in dark mode scans for nobody.
    expect(QR_COLORS.dark).toBe("#000000");
    expect(QR_COLORS.light).toBe("#FFFFFF");
  });
});

describe("fileNameFor", () => {
  it("names the file after the tournament in the link", () => {
    expect(fileNameFor(URL_)).toBe("jtrax-qr-trn_wellington.png");
    expect(fileNameFor("https://a.test/t/trn_x")).toBe("jtrax-qr-trn_x.png");
  });

  it("falls back rather than building a name out of nothing", () => {
    expect(fileNameFor("https://a.test/")).toBe("jtrax-qr.png");
    expect(fileNameFor("not a url")).toBe("jtrax-qr.png");
  });

  it("cannot be talked into a path or an extension", () => {
    // The segment reaches this from a URL, but a name that could contain a
    // slash or a dot is a download nobody meant to write.
    const name = fileNameFor("https://a.test/register/..%2Fevil.sh");
    expect(name).not.toContain("/");
    expect(name.endsWith(".png")).toBe(true);
  });
});
