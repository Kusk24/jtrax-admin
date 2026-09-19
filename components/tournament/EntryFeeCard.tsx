"use client";

/* One participant's entry fee, in the drawer: what it is, whether it is paid,
 * and the two things the desk does about it.
 *
 * The fee is set here, by staff, and nowhere else — a family's own entry is
 * priced by the server from the tournament, and a parent can no longer send a
 * number of their own. Changing it stops once the money is in: a paid fee is
 * changed by a refund on the payments screen, not by editing a figure.
 *
 * "Mark paid at desk" records the payment against this entry, so the drawer and
 * the family's portal both read Paid. A fee taken at the counter used to be
 * recorded on the payments screen with nothing tying it to the entry, and the
 * entry read Pending for ever.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { fmtTHB } from "@/lib/live";
import { COLORS, FONT } from "@/lib/theme";
import { useData } from "../DataProvider";
import { ActionButton, ErrorNote, errorText } from "../crud";
import { fieldStyle, labelStyle, primaryButtonStyle, secondaryButtonStyle, selectStyle } from "../page-kit";
import { Badge } from "../ui";

/* The backend's spelling; card is not here because Stripe, not the desk,
   says when a card payment went through. */
const DESK_METHODS = ["Cash", "PromptPay", "BankTransfer"] as const;

export function EntryFeeCard({
  registrationId,
  fee,
  paid,
}: {
  registrationId: string;
  fee: number;
  paid: boolean;
}) {
  const t = useTranslations("tournament");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { update, refresh } = useData();
  const [draft, setDraft] = useState(fee ? String(fee) : "");
  const [method, setMethod] = useState<(typeof DESK_METHODS)[number]>("Cash");
  const [error, setError] = useState<string | null>(null);

  /* The drawer outlives a reload; the figure it opened with must not. */
  useEffect(() => setDraft(fee ? String(fee) : ""), [fee]);

  const parsed = Number(draft);
  const valid = draft.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;

  async function run(job: () => Promise<unknown>) {
    setError(null);
    try {
      await job();
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 14,
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text }}>
          {t("entryFee")}
        </span>
        <Badge
          color={paid ? COLORS.success : COLORS.warning}
          bg={paid ? COLORS.successBg : COLORS.warningBg}
        >
          {tStatus(paid ? "Paid" : "Pending")}
        </Badge>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {paid ? (
        <>
          <span style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: COLORS.text }}>
            {fmtTHB(fee)}
          </span>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {t("feeLocked")}
          </p>
        </>
      ) : (
        <>
          <div>
            <label style={labelStyle} htmlFor={`fee-${registrationId}`}>{t("feeCharged")}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id={`fee-${registrationId}`}
                type="number"
                min={0}
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                style={{ ...fieldStyle, flex: 1, minWidth: 0 }}
              />
              <ActionButton
                className="jt-btn-ghost"
                style={secondaryButtonStyle}
                busyLabel={tCommon("saving")}
                disabled={!valid || parsed === fee}
                onClick={() => run(() => update("tournament-registrations", registrationId, { fee_charged: parsed }))}
              >
                {t("saveFee")}
              </ActionButton>
            </div>
          </div>

          <div>
            <label style={labelStyle} htmlFor={`desk-${registrationId}`}>{t("paidWith")}</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                id={`desk-${registrationId}`}
                value={method}
                onChange={(e) => setMethod(e.target.value as (typeof DESK_METHODS)[number])}
                style={{ ...selectStyle, flex: 1, minWidth: 140 }}
              >
                {DESK_METHODS.map((m) => (
                  <option key={m} value={m}>{t(`method${m}`)}</option>
                ))}
              </select>
              {/* Takes the fee as it stands on the entry, so an unsaved edit
                  above is not what gets recorded — it would be a figure the
                  desk never confirmed. */}
              <ActionButton
                className="jt-btn-primary"
                style={primaryButtonStyle}
                busyLabel={tCommon("saving")}
                disabled={!(fee > 0) || draft.trim() !== String(fee)}
                onClick={() =>
                  run(async () => {
                    await api.post(`tournament-registrations/${registrationId}/desk-payment`, {
                      payment_method: method,
                    });
                    await refresh();
                  })
                }
              >
                {t("markPaidAtDesk")}
              </ActionButton>
            </div>
            {!(fee > 0) && (
              <p style={{ margin: "6px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                {t("noFeeToCollect")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
