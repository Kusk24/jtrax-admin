/**
 * The revenue card's sub-line copy.
 *
 * "From 1 payments" shipped and read like a typo on every quiet day — the
 * first of the month always starts at one. The message is an ICU plural now,
 * and this pins both branches so the string can't regress to a bare {count}.
 */
import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "@/messages/en.json";

const t = createTranslator({ locale: "en", messages: en, namespace: "dashboard" });

describe("the payments sub-line", () => {
  it("says payment, singular, when there has been one", () => {
    expect(t("fromPayments", { count: 1 })).toBe("From 1 payment");
  });

  it("says payments for any other count, including none", () => {
    expect(t("fromPayments", { count: 0 })).toBe("From 0 payments");
    expect(t("fromPayments", { count: 2 })).toBe("From 2 payments");
  });
});
