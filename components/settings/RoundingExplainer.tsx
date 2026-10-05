"use client";

/* How Attendance Rounding works, drawn on two clocks.
 *
 * A 10:00–12:00 class: one child leaves early, one arrives late. Each clock
 * shows the class as an arc, the time the child was there in blue, and the
 * time missed in amber; underneath, the time present, what it rounds to at
 * the step being set, and the credits. The numbers follow the value in the
 * field, so changing 15 to 30 shows what 30 would do before it is saved.
 * The rule is the backend's (credits.go attendedHours).
 */
import { useTranslations } from "next-intl";
import { COLORS, FONT } from "@/lib/theme";
import { fmtMinutes } from "@/lib/charge-explain";
import { Modal } from "../page-kit";

const START = 10 * 60; // 10:00
const END = 12 * 60; // 12:00

/** Minutes charged for a visit of `present` minutes, at a step. */
export function roundedMinutes(present: number, classMinutes: number, step: number): number {
  if (present >= classMinutes) return classMinutes;
  const r = step > 0 ? Math.round(present / step) * step : present;
  return Math.max(0, Math.min(classMinutes, r));
}

function clock(min: number): string {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

function credits(min: number): string {
  return String(Math.round((min / 60) * 100) / 100);
}

/* ---- the clock ---- */

const C = 110; // centre
const R = 86; // the class's ring, just outside the face

function point(minuteOfDay: number, r: number): [number, number] {
  const a = (((minuteOfDay / 60) % 12) / 12) * 2 * Math.PI;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
}

function arc(from: number, to: number, r: number): string {
  const [x1, y1] = point(from, r);
  const [x2, y2] = point(to, r);
  const large = to - from > 360 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** `at` is the moment the hands show: when they left early, or arrived late. */
function Clock({ inAt, outAt, at, label }: { inAt: number; outAt: number; at: number; label: string }) {
  const marker = (m: number, text: string) => {
    const [x, y] = point(m, R);
    const [lx, ly] = point(m, R + 21);
    return (
      <g>
        <circle cx={x} cy={y} r={4.5} fill={COLORS.surface} stroke={COLORS.text} strokeWidth={2} />
        <text x={lx} y={ly + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={COLORS.text} fontFamily={FONT}>
          {text}
        </text>
      </g>
    );
  };
  return (
    <svg viewBox="-6 -6 232 232" width={200} height={200} role="img" aria-label={label}>
      <circle cx={C} cy={C} r={76} fill={COLORS.surface} stroke={COLORS.border} strokeWidth={1.5} />
      {Array.from({ length: 12 }, (_, i) => {
        const [x1, y1] = point(i * 60, 73);
        const [x2, y2] = point(i * 60, i % 3 === 0 ? 64 : 68);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLORS.textSecondary} strokeWidth={i % 3 === 0 ? 2 : 1} />;
      })}
      {[12, 3, 6, 9].map((h) => {
        const [x, y] = point(h * 60, 54);
        return (
          <text key={h} x={x} y={y + 4} textAnchor="middle" fontSize={11} fill={COLORS.textSecondary} fontFamily={FONT}>
            {h}
          </text>
        );
      })}
      {/* The whole class, then what was missed, then the time there. */}
      <path d={arc(START, END, R)} fill="none" stroke={COLORS.border} strokeWidth={12} />
      {inAt > START && <path d={arc(START, inAt, R)} fill="none" stroke={COLORS.warning} strokeWidth={12} opacity={0.55} />}
      {outAt < END && <path d={arc(outAt, END, R)} fill="none" stroke={COLORS.warning} strokeWidth={12} opacity={0.55} />}
      <path d={arc(inAt, outAt, R)} fill="none" stroke={COLORS.blue} strokeWidth={12} />
      {marker(inAt, clock(inAt))}
      {marker(outAt, clock(outAt))}
      {/* The hands at the moment that cut the class short. */}
      {(() => {
        const [hx, hy] = point(at, 30);
        const minuteAngle = (at % 60) * 12; // the minute hand's place, as a minute of the 12-hour dial
        const [mx, my] = point(minuteAngle, 44);
        return (
          <g stroke={COLORS.text} strokeLinecap="round">
            <line x1={C} y1={C} x2={hx} y2={hy} strokeWidth={3.5} />
            <line x1={C} y1={C} x2={mx} y2={my} strokeWidth={2} />
          </g>
        );
      })()}
      <circle cx={C} cy={C} r={3.5} fill={COLORS.text} />
    </svg>
  );
}

function Example({ title, inAt, outAt, step }: { title: string; inAt: number; outAt: number; step: number }) {
  const at = inAt > START ? inAt : outAt;
  const t = useTranslations("settings");
  const present = outAt - inAt;
  const charged = roundedMinutes(present, END - START, step);
  return (
    <div style={{ flex: "1 1 220px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text }}>{title}</span>
      <Clock inAt={inAt} outAt={outAt} at={at} label={t("roundClockLabel", { from: clock(inAt), to: clock(outAt) })} />
      <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.6, color: COLORS.text, textAlign: "center" }}>
        <div>{t("roundIn", { time: clock(inAt) })} · {t("roundOut", { time: clock(outAt) })}</div>
        <div>{t("roundPresent", { time: fmtMinutes(present) })}</div>
        <div style={{ color: COLORS.textSecondary }}>
          {step > 0 ? t("roundTo", { step, time: fmtMinutes(charged) }) : t("roundExact")}
        </div>
        <div style={{ fontWeight: 700, color: COLORS.blue }}>{t("roundCharged", { credits: credits(charged) })}</div>
      </div>
    </div>
  );
}

export function RoundingExplainer({ step, onClose }: { step: number; onClose: () => void }) {
  const t = useTranslations("settings");
  /* Five ways a 2-hour class can be cut short, worked at this step. */
  const rows = [5, 10, 15, 20, 25].map((missed) => {
    const attended = END - START - missed;
    const charged = roundedMinutes(attended, END - START, step);
    return { missed, attended, charged };
  });
  return (
    <Modal title={t("roundHowTitle")} onClose={onClose} width={620}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, lineHeight: 1.6, color: COLORS.text }}>
          {t("roundHowIntro")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
          <Example title={t("roundExampleEarly")} inAt={START} outAt={11 * 60 + 35} step={step} />
          <Example title={t("roundExampleLate")} inAt={10 * 60 + 25} outAt={END} step={step} />
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
          <span><Swatch color={COLORS.blue} /> {t("roundLegendThere")}</span>
          <span><Swatch color={COLORS.warning} faded /> {t("roundLegendMissed")}</span>
        </div>
        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontFamily: FONT, fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>
          {/* Four equal columns. */}
          <colgroup>
            {[0, 1, 2, 3].map((i) => <col key={i} style={{ width: "25%" }} />)}
          </colgroup>
          <thead>
            <tr style={{ color: COLORS.textSecondary }}>
              <th style={{ ...cell, ...first, fontWeight: 600 }}>{t("roundColMissed")}</th>
              <th style={{ ...cell, textAlign: "right", fontWeight: 600 }}>{t("roundColAttended")}</th>
              <th style={{ ...cell, textAlign: "right", fontWeight: 600 }}>{t("roundColRounded")}</th>
              <th style={{ ...cell, textAlign: "right", fontWeight: 600 }}>{t("roundColCharged")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.missed} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <td style={{ ...cell, ...first }}>{t("roundMinutes", { minutes: r.missed })}</td>
                <td style={{ ...cell, textAlign: "right" }}>{short(r.attended)}</td>
                <td style={{ ...cell, textAlign: "right" }}>{short(r.charged)}</td>
                <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{oneDecimal(r.charged)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("roundBoth")}</p>
      </div>
    </Modal>
  );
}

function Swatch({ color, faded = false }: { color: string; faded?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: color, opacity: faded ? 0.55 : 1, verticalAlign: "-1px" }}
    />
  );
}

const cell = { padding: "7px 10px" } as const;
/* The first column starts flush with the text above it. */
const first = { textAlign: "left", paddingLeft: 0 } as const;

/** "1h55", "2h" — the table's compact time. */
function short(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Credits with at least one decimal: "2.0", "1.75". */
function oneDecimal(min: number): string {
  return (min / 60).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

