"use client";

/**
 * A payment's history: each edit (what changed, from and to) and the void,
 * with who and when. Read from the server's audit trail; nothing here edits it.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { fmtDateTime } from "@/lib/live";
import { COLORS, FONT } from "@/lib/theme";

type Entry = {
  action: "edit" | "void";
  by: string;
  at: string;
  reason: string;
  changes?: Record<string, unknown>;
};

const FIELD_KEYS: Record<string, string> = {
  amount: "amount",
  discount_amount: "discount",
  final_amount: "finalAmount",
  payment_method: "method",
  status: "status",
  payment_date: "date",
  reference_number: "reference",
  credit_amount: "credits",
};

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

export function PaymentHistory({ paymentId, refreshKey }: { paymentId: string; refreshKey?: unknown }) {
  const t = useTranslations("voidPayment");
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    let live = true;
    api
      .get<Entry[]>(`payments/${paymentId}/history`)
      .then((rows) => live && setEntries(Array.isArray(rows) ? rows : []))
      .catch(() => live && setEntries([]));
    return () => { live = false; };
  }, [paymentId, refreshKey]);

  if (!entries || entries.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{t("history")}</span>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map((e, i) => {
          const changes = e.changes ?? {};
          return (
            <li key={i} style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: e.action === "void" ? COLORS.danger : COLORS.text }}>
                {e.action === "void" ? t("voidedBy", { name: e.by || "—" }) : t("editedBy", { name: e.by || "—" })}
                <span style={{ fontWeight: 400, color: COLORS.textSecondary }}> · {fmtDateTime(e.at)}</span>
              </div>
              {e.action === "void" ? (
                <div style={{ marginTop: 4, color: COLORS.textSecondary, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>{t(`reason_${e.reason}`)}{typeof changes.note === "string" ? ` — ${changes.note}` : ""}</span>
                  {typeof changes.credits_reversed === "number" && (
                    <span>{t("creditsReversed", { credits: Math.abs(changes.credits_reversed) })}</span>
                  )}
                  {typeof changes.enrollment_ended === "string" && <span>{t("enrolmentEnded")}</span>}
                </div>
              ) : (
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, color: COLORS.textSecondary }}>
                  {Object.entries(changes).map(([field, v]) => {
                    const c = v as { from?: unknown; to?: unknown };
                    return (
                      <li key={field}>
                        {FIELD_KEYS[field] ? t(`field_${FIELD_KEYS[field]}`) : field}: {show(c.from)} → {show(c.to)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
