"use client";

/* Which reductions a JCA student gets at one tournament: the student discount,
 * the early-bird price, both, or neither.
 *
 * The rule used to be fixed — students got the discount and never early bird —
 * and the organiser had no say. The server prices every entry from these two
 * switches, so what is ticked here is exactly what a parent is charged.
 */
import { useTranslations } from "next-intl";
import { COLORS, FONT } from "@/lib/theme";

export function StudentPricingChoice({
  discount,
  earlyBird,
  onChange,
}: {
  discount: boolean;
  earlyBird: boolean;
  onChange: (next: { discount: boolean; earlyBird: boolean }) => void;
}) {
  const t = useTranslations("tournament");
  const box = (id: string, label: string, checked: boolean, set: (v: boolean) => void) => (
    <label
      htmlFor={id}
      style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: FONT, fontSize: 14.5, color: COLORS.text, cursor: "pointer" }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => set(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: COLORS.blue, cursor: "pointer" }}
      />
      {label}
    </label>
  );
  return (
    <fieldset style={{ margin: 0, padding: 0, border: "none", display: "flex", flexDirection: "column", gap: 9 }}>
      <legend style={{ padding: 0, marginBottom: 6, fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
        {t("studentPricing")}
      </legend>
      {box("sp-discount", t("studentGetsDiscount"), discount, (v) => onChange({ discount: v, earlyBird }))}
      {box("sp-early", t("studentGetsEarlyBird"), earlyBird, (v) => onChange({ discount, earlyBird: v }))}
      <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
        {t("studentPricingHint")}
      </p>
    </fieldset>
  );
}
