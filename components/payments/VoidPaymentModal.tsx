"use client";

/**
 * Voiding a payment recorded in error. A reason is required; "Other" asks for
 * the admin's own words. The payment is kept, marked Voided, and the credits
 * it bought are taken back — the server does all of it, and refuses anyone
 * but an admin.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { COLORS, FONT } from "@/lib/theme";
import { dangerSolidButtonStyle, fieldStyle, Modal, secondaryButtonStyle } from "../page-kit";

export const VOID_REASONS = ["duplicate", "wrong_payer", "other"] as const;
export type VoidReason = (typeof VOID_REASONS)[number];

/** Shortest explanation the server accepts for "Other". */
export const MIN_VOID_NOTE = 5;

/** Whether the form can be sent: a reason, and words for "Other". */
export function voidReady(reason: VoidReason | "", note: string): boolean {
  if (!reason) return false;
  return reason !== "other" || note.trim().length >= MIN_VOID_NOTE;
}

export function VoidPaymentModal({
  paymentId,
  label,
  onClose,
  onVoided,
}: {
  paymentId: string;
  /** "THB 5,000 · Mini" — which payment, in the dialog. */
  label: string;
  onClose: () => void;
  onVoided: () => void | Promise<void>;
}) {
  const t = useTranslations("voidPayment");
  const [reason, setReason] = useState<VoidReason | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = voidReady(reason, note) && !busy;

  async function confirm() {
    if (!ready || !reason) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`payments/${paymentId}/void`, { reason, note: reason === "other" ? note.trim() : "" });
      await onVoided();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : t("failed"));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t("title")}
      width={460}
      onClose={onClose}
      footer={
        <>
          <button type="button" style={secondaryButtonStyle} onClick={onClose}>{t("cancel")}</button>
          <button
            type="button"
            style={{ ...dangerSolidButtonStyle, opacity: ready ? 1 : 0.5, cursor: ready ? "pointer" : "not-allowed" }}
            disabled={!ready}
            onClick={() => void confirm()}
          >
            {busy ? t("working") : t("confirm")}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
        <p style={{ margin: 0, fontSize: 13.5, color: COLORS.textSecondary }}>
          <strong style={{ color: COLORS.text }}>{label}</strong>
          <br />
          {t("body")}
        </p>
        <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <legend style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{t("reason")}</legend>
          {VOID_REASONS.map((r) => (
            <label
              key={r}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${reason === r ? COLORS.blue : COLORS.border}`,
                background: reason === r ? COLORS.light : COLORS.surface,
                cursor: "pointer",
                fontSize: 14,
                color: COLORS.text,
              }}
            >
              <input
                type="radio"
                name="void-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                style={{ width: 16, height: 16, accentColor: COLORS.blue }}
              />
              {t(`reason_${r}`)}
            </label>
          ))}
        </fieldset>
        {reason === "other" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
            {t("otherLabel")}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              required
              autoFocus
              style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5, fontWeight: 400 }}
            />
          </label>
        )}
        {error && (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: COLORS.danger }}>{error}</p>
        )}
      </div>
    </Modal>
  );
}
