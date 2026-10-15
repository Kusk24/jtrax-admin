"use client";

/**
 * A family's request to have their data erased (PDPA s.33), shown on their
 * guardian's page while it is open. An admin carries it out — deleting the
 * guardian and their children, which keeps payments detached and named as
 * accounting law requires, and closes the request — or declines it with a
 * reason the family is owed. Reception sees it but cannot act on it.
 */
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { COLORS, FONT } from "@/lib/theme";
import { useJtrax } from "../JtraxContext";
import { ConfirmModal } from "../crud";
import { dangerButtonStyle, fieldStyle, secondaryButtonStyle } from "../page-kit";

export type DataRequest = {
  data_request_id: string;
  status: "Open" | "Done" | "Declined";
  parent_id: string | null;
  requested_by_name: string;
  note: string;
  requested_at: string;
};

/** The open request for this guardian, if any. */
export function openRequestFor(requests: DataRequest[], parentId: string): DataRequest | undefined {
  return requests.find((r) => r.parent_id === parentId && r.status === "Open");
}

export function ErasureRequest({
  parentId,
  onErase,
}: {
  parentId: string;
  /** Deletes the guardian and their children; the backend closes the request. */
  onErase: () => Promise<void>;
}) {
  const t = useTranslations("parents");
  const locale = useLocale();
  const { role } = useJtrax();
  const [request, setRequest] = useState<DataRequest | undefined>();
  const [erasing, setErasing] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let live = true;
    api
      .get<DataRequest[]>("data-requests")
      .then((rows) => live && setRequest(openRequestFor(rows, parentId)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [parentId]);

  if (!request) return null;
  const when = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(request.requested_at.replace(" ", "T") + "Z"));

  return (
    <div
      role="status"
      style={{
        display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 14,
        background: COLORS.warningBg, color: COLORS.text, fontFamily: FONT,
      }}
    >
      <strong style={{ fontSize: 14, color: COLORS.warning }}>{t("erasureRequested", { date: when })}</strong>
      {request.note && <span style={{ fontSize: 13 }}>&ldquo;{request.note}&rdquo;</span>}
      <span style={{ fontSize: 12.5, color: COLORS.textSecondary }}>{t("erasureHint")}</span>
      {role === "Admin" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" style={dangerButtonStyle} onClick={() => setErasing(true)}>
            {t("erasureErase")}
          </button>
          <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setDeclining(true)}>
            {t("erasureDecline")}
          </button>
        </div>
      ) : (
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t("erasureAdminOnly")}</span>
      )}
      {erasing && (
        <ConfirmModal
          title={t("erasureErase")}
          prompt={t("erasureConfirm")}
          note={t("erasureConfirmNote")}
          confirmLabel={t("erasureErase")}
          failedText={t("erasureFailed")}
          onClose={() => setErasing(false)}
          onConfirm={onErase}
        />
      )}
      {declining && (
        <ConfirmModal
          title={t("erasureDecline")}
          prompt={t("erasureDeclinePrompt")}
          confirmLabel={t("erasureDecline")}
          failedText={t("erasureFailed")}
          extra={
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              aria-label={t("erasureDeclineReason")}
              placeholder={t("erasureDeclineReason")}
              style={{ ...fieldStyle, width: "100%", resize: "vertical" }}
            />
          }
          onClose={() => setDeclining(false)}
          onConfirm={async () => {
            await api.post(`data-requests/${request.data_request_id}/resolve`, { status: "Declined", note: reason.trim() });
            setRequest(undefined);
            setDeclining(false);
          }}
        />
      )}
    </div>
  );
}
