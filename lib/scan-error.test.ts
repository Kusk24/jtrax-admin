/**
 * A failed form scan says why, with the code it came with, in the console's
 * language — not the server's English sentence, or "upload failed (413)".
 */
import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "../messages/en.json";
import th from "../messages/th.json";
import { ApiError } from "./api";
import { SCAN_REASONS, scanErrorText } from "./scan-error";

const translator = (messages: typeof en) =>
  createTranslator({ locale: "en", messages, namespace: "students" }) as unknown as (
    key: string, values?: Record<string, string | number>,
  ) => string;
const t = translator(en);

describe("scanErrorText", () => {
  it("says the reason and shows the code with the scan service's status", () => {
    const err = new ApiError(502, "could not read the form: …", { reason: "model_unavailable", status: 404 });
    const text = scanErrorText(err, t);
    expect(text).toContain("scan model isn't available");
    expect(text).toContain("(error: model_unavailable 404)");
  });

  it("says it in Thai", () => {
    const err = new ApiError(502, "could not read the form: …", { reason: "quota", status: 429 });
    expect(scanErrorText(err, translator(th as typeof en))).toContain("ใช้ครบโควตาแล้ว");
  });

  it("names a photo nginx refused by its HTTP status", () => {
    // nginx answers HTML, so api.ts has no body and makes up "upload failed (413)".
    const text = scanErrorText(new ApiError(413, "upload failed (413)", {}), t);
    expect(text).toContain("too large");
    expect(text).toContain("(error: http 413)");
  });

  it("falls back to the server's own sentence for a code it does not know", () => {
    const err = new ApiError(403, "only admin or reception may scan a form", { error: "only admin or reception may scan a form" });
    expect(scanErrorText(err, t)).toBe("only admin or reception may scan a form (error: http 403)");
  });

  it("says the photo was not sent when there was no answer at all", () => {
    const text = scanErrorText(new TypeError("Failed to fetch"), t);
    expect(text).toContain("could not be sent");
    expect(text).toContain("(error: Failed to fetch)");
  });

  it("has a sentence for every reason, in English and Thai", () => {
    for (const messages of [en, th]) {
      const why = (messages.students as unknown as { scanWhy: Record<string, string> }).scanWhy;
      for (const reason of [...SCAN_REASONS, "busy", "server", "unsent"]) {
        expect(why[reason], reason).toBeTruthy();
      }
    }
  });
});
