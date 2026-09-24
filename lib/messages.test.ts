/**
 * The two message files, read as the build reads them.
 *
 * A missing comma in one of them fails the Vercel build for the whole console,
 * and a key in one language only shows the raw key to the other. Both are
 * caught here instead of on deploy.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (locale: string) => readFileSync(join(__dirname, "..", "messages", `${locale}.json`), "utf8");

function keysOf(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k));
}

describe("message files", () => {
  it.each(["en", "th"])("%s.json is valid JSON", (locale) => {
    expect(() => JSON.parse(read(locale))).not.toThrow();
  });

  it("en and th have the same keys", () => {
    const en = new Set(keysOf(JSON.parse(read("en"))));
    const th = new Set(keysOf(JSON.parse(read("th"))));
    expect([...en].filter((k) => !th.has(k))).toEqual([]);
    expect([...th].filter((k) => !en.has(k))).toEqual([]);
  });
});
