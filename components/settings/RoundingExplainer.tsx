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
const W = 17;
/* The clock face inside the ring. */
const FACE = R - W / 2 - 6;

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
  /* The ring reads like the clock inside it: 0 at the 12, one minute per
     minute mark, so a range sits over the minutes it covers. The last
     range runs on to the full hour. */
  const total = 60;
  const deg = (min: number) => (Math.min(min, total) / total) * 360;
  return (
    <svg viewBox="-12 -12 284 318" width={260} height={292} role="img" aria-label={label} style={{ flexShrink: 0 }}>
      {bands.map((b, i) => {
        const from = i === 0 ? 0 : b.from - 0.5;
        /* A range that starts past the hour is off the dial. */
        if (from >= total) return null;
        const to = i === bands.length - 1 || b.to + 0.5 >= total ? total : b.to + 0.5;
        return <path key={i} d={slice(deg(from), deg(to) - 0.6)} fill="none" stroke={b.color} strokeWidth={W} />;
      })}
      {/* Where each range ends, in minutes missed. */}
      {bands.slice(0, -1).filter((b) => b.to + 0.5 < total).map((b, i) => {
        const [x, y] = polar(deg(b.to + 0.5), R + W / 2 + 13);
        return (
          <text key={i} x={x} y={y + 4} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={COLORS.text} fontFamily={FONT}>
            {b.to}′
          </text>
        );
      })}
      {/* A clock inside the ring, its hands at 11:35 — the "left early" example. */}
      <circle cx={C} cy={C} r={FACE} fill={COLORS.surface} stroke={COLORS.border} strokeWidth={1.5} />
      {Array.from({ length: 12 }, (_, i) => {
        const [x1, y1] = polar(i * 30, FACE - 5);
        const [x2, y2] = polar(i * 30, FACE - (i % 3 === 0 ? 14 : 10));
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLORS.textSecondary} strokeWidth={i % 3 === 0 ? 2.2 : 1.2} strokeLinecap="round" />;
      })}
      {[12, 3, 6, 9].map((h) => {
        const [x, y] = polar((h % 12) * 30, FACE - 26);
        return (
          <text key={h} x={x} y={y + 4} textAnchor="middle" fontSize={12} fill={COLORS.textSecondary} fontFamily={FONT}>
            {h}
          </text>
        );
      })}
      {(() => {
        const at = 11 * 60 + 35;
        const [hx, hy] = polar(((at / 60) % 12) * 30, FACE * 0.48);
        const [mx, my] = polar((at % 60) * 6, FACE * 0.72);
        return (
          <g stroke={COLORS.text} strokeLinecap="round">
            <line x1={C} y1={C} x2={hx} y2={hy} strokeWidth={4} />
            <line x1={C} y1={C} x2={mx} y2={my} strokeWidth={2.4} />
          </g>
        );
      })()}
      <circle cx={C} cy={C} r={4} fill={COLORS.text} />
      {/* What the ring measures, under it. */}
      <text x={C} y={C + R + W / 2 + 36} textAnchor="middle" fontSize={13} fontWeight={700} fill={COLORS.text} fontFamily={FONT}>
        {centre}
        <tspan fill={COLORS.textSecondary} fontWeight={400}> · {centreSub}</tspan>
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
            {t("roundClass")}
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
