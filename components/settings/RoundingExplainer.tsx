"use client";

/* How Attendance Rounding works, as one infographic.
 *
 * One ring for a 2-hour class (10:00–12:00), split into the ranges of time
 * missed — arriving late or leaving early, it is the same — each with what
 * the visit is charged at; a colour-coded legend beside it; the rule in a
 * sentence; and two examples, one late and one early, worked the same way.
 * Everything follows the step in the field, saved or not. The rule is the
 * backend's (credits.go attendedHours).
 */
import { useTranslations } from "next-intl";
import { COLORS, FONT } from "@/lib/theme";
import { fmtMinutes } from "@/lib/charge-explain";
import { Modal } from "../page-kit";

const START = 10 * 60; // 10:00
const END = 12 * 60; // 12:00
const CLASS = END - START;

/* Subtle range colours, in order: full class, then each step off. */
const BAND_COLORS = ["#6BBF8A", "#7AA9E6", "#E9C85C", "#E9A066", "#E28A8A"];

/** Minutes charged for a visit of `present` minutes, at a step. */
export function roundedMinutes(present: number, classMinutes: number, step: number): number {
  if (present >= classMinutes) return classMinutes;
  const r = step > 0 ? Math.round(present / step) * step : present;
  return Math.max(0, Math.min(classMinutes, r));
}

function clock(min: number): string {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

/** Credits for minutes charged: "2", "1.75". */
function credits(min: number): string {
  return String(Math.round((min / 60) * 100) / 100);
}

export type Band = { from: number; to: number; charged: number; color: string };

/** The ranges of minutes missed that round to the same charge: 0–7, 8–22, … at 15. */
export function bandsFor(step: number, count = 5): Band[] {
  if (step <= 0) return [];
  return Array.from({ length: count }, (_, k) => ({
    from: k === 0 ? 0 : Math.floor(step * (k - 0.5)) + 1,
    to: Math.floor(step * (k + 0.5)),
    charged: Math.max(0, CLASS - k * step),
    color: BAND_COLORS[k % BAND_COLORS.length],
  }));
}

/* ---- the ring ---- */

const C = 130;
const R = 92;
const W = 34;

function polar(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
}

function slice(fromDeg: number, toDeg: number): string {
  const [x1, y1] = polar(fromDeg, R);
  const [x2, y2] = polar(toDeg, R);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${toDeg - fromDeg > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function Ring({ bands, label, centre, centreSub }: { bands: Band[]; label: string; centre: string; centreSub: string }) {
  /* The ring is the missed minutes from 0 to the end of the last band. */
  const total = bands[bands.length - 1].to + 0.5;
  const deg = (min: number) => (min / total) * 360;
  return (
    <svg viewBox="-12 -12 284 284" width={260} height={260} role="img" aria-label={label} style={{ flexShrink: 0 }}>
      {bands.map((b, i) => {
        const from = i === 0 ? 0 : b.from - 0.5;
        const to = i === bands.length - 1 ? total : b.to + 0.5;
        return <path key={i} d={slice(deg(from), deg(to) - 0.6)} fill="none" stroke={b.color} strokeWidth={W} />;
      })}
      {/* Where each range ends, in minutes missed. */}
      {bands.slice(0, -1).map((b, i) => {
        const [x, y] = polar(deg(b.to + 0.5), R + W / 2 + 13);
        return (
          <text key={i} x={x} y={y + 4} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={COLORS.text} fontFamily={FONT}>
            {b.to}′
          </text>
        );
      })}
      <circle cx={C} cy={C} r={R - W / 2 - 6} fill={COLORS.surface} />
      <text x={C} y={C - 8} textAnchor="middle" fontSize={15} fontWeight={800} fill={COLORS.text} fontFamily={FONT}>
        {centre}
      </text>
      <text x={C} y={C + 12} textAnchor="middle" fontSize={11.5} fill={COLORS.textSecondary} fontFamily={FONT}>
        {centreSub}
      </text>
    </svg>
  );
}

export function RoundingExplainer({ step, onClose }: { step: number; onClose: () => void }) {
  const t = useTranslations("settings");
  const bands = bandsFor(step);
  const examples = [
    { key: "late", inAt: 10 * 60 + 25, outAt: END },
    { key: "early", inAt: START, outAt: 11 * 60 + 35 },
  ];
  return (
    <Modal title={t("roundHowTitle")} onClose={onClose} width={680}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.textSecondary }}>{t("roundClass")}</span>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, lineHeight: 1.6, color: COLORS.text }}>
            {step > 0 ? t("roundRule", { step }) : t("roundRuleExact")}
          </p>
        </div>

        {bands.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "center" }}>
            <Ring bands={bands} label={t("roundRingLabel")} centre={t("roundRingCentre")} centreSub={t("roundRingCentreSub")} />
            <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 8 }}>
              {bands.map((b) => (
                <li
                  key={b.from}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "9px 12px",
                    border: `1px solid ${COLORS.border}`, borderRadius: 10, fontFamily: FONT,
                  }}
                >
                  <span aria-hidden style={{ width: 14, height: 14, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>
                    {t("roundBandMissed", { from: b.from, to: b.to })}
                  </span>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                    {b.charged === CLASS ? t("roundFullClass") : fmtMinutes(b.charged)}
                  </span>
                  <span style={{ minWidth: 76, textAlign: "right", fontSize: 13.5, fontWeight: 700, color: COLORS.blue }}>
                    {t("roundCredits", { credits: credits(b.charged) })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* The two examples in one box: the same rule, late and early. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", borderRadius: 12, background: COLORS.light }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>
            {t("roundExamples")}
            <span style={{ padding: "1px 8px", borderRadius: 999, background: COLORS.surface, color: COLORS.blue, fontSize: 11.5 }}>
              {t("roundSameRule")}
            </span>
          </span>
          {examples.map((e) => {
            const present = e.outAt - e.inAt;
            const charged = roundedMinutes(present, CLASS, step);
            return (
              <div
                key={e.key}
                style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, fontFamily: FONT, fontSize: 13.5, color: COLORS.text }}
              >
                <span style={{ fontWeight: 600 }}>
                  {e.key === "late" ? t("roundArrived", { time: clock(e.inAt) }) : t("roundLeft", { time: clock(e.outAt) })}
                </span>
                <span>→ {t("roundPresent", { time: fmtMinutes(present) })}</span>
                <span>→ {fmtMinutes(charged)}</span>
                <span style={{ fontWeight: 700, color: COLORS.blue }}>→ {t("roundCredits", { credits: credits(charged) })}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
