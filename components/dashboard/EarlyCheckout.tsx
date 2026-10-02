"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { earlyCheckout, type EarlyCheckout } from "@/lib/early-checkout";
import { fmtCredits } from "@/lib/live";
import { COLORS, FONT } from "@/lib/theme";
import { useData } from "../DataProvider";
import { Modal, primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { useLengthLabel } from "./DurationField";

type Leaving = EarlyCheckout & { attendanceId: string; name: string };

/**
 * Asks before checking someone out while their class is still running.
 *
 * Leaving early now costs the time actually attended rather than the whole
 * class, so an early check-out changes what a family pays — worth one look
 * before it is written. A check-out at or after the scheduled end costs the
 * full class and needs no question, so `request` goes straight through.
 *
 * `request` takes the attendance rows about to be checked out and the write
 * that does it. When anyone in them is leaving early it opens the dialog and
 * holds the write until "Check Out"; otherwise it runs the write at once.
 */
export function useEarlyCheckout(): {
  request: (attendanceIds: string[], proceed: () => Promise<void>) => Promise<void>;
  dialog: ReactNode;
} {
  const { raw, creditRules } = useData();
  const [pending, setPending] = useState<{ leaving: Leaving[]; proceed: () => Promise<void> } | null>(null);

  async function request(attendanceIds: string[], proceed: () => Promise<void>) {
    const now = new Date();
    const leaving: Leaving[] = [];
    for (const id of attendanceIds) {
      const row = raw.attendance.find((a) => String(a["attendance_id"]) === id);
      if (!row) continue;
      const session = raw.classSessions.find((s) => String(s["session_id"]) === String(row["session_id"]));
      const early = earlyCheckout(row, session, now, creditRules.checkoutRoundMinutes);
      if (!early) continue;
      const student = raw.students.find((s) => String(s["student_id"]) === String(row["student_id"]));
      leaving.push({ ...early, attendanceId: id, name: String(student?.["name"] ?? "") });
    }
    if (leaving.length === 0) {
      await proceed();
      return;
    }
    setPending({ leaving, proceed });
  }

  const dialog = pending ? (
    <EarlyCheckoutDialog
      leaving={pending.leaving}
      onClose={() => setPending(null)}
      onConfirm={async () => {
        await pending.proceed();
        setPending(null);
      }}
    />
  ) : null;

  return { request, dialog };
}

function EarlyCheckoutDialog({
  leaving,
  onClose,
  onConfirm,
}: {
  leaving: Leaving[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("earlyCheckout");
  const lengthLabel = useLengthLabel();
  const [busy, setBusy] = useState(false);
  const one = leaving.length === 1 ? leaving[0] : null;

  const text = { fontFamily: FONT, fontSize: 14.5, lineHeight: 1.55, color: COLORS.text, margin: 0 } as const;

  return (
    <Modal
      title={one ? t("titleOne", { name: one.name }) : t("titleMany", { count: leaving.length })}
      width={440}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={onClose}>
            {t("notYet")}
          </button>
          <button
            type="button"
            style={{ ...primaryButtonStyle, opacity: busy ? 0.75 : 1, cursor: busy ? "wait" : "pointer" }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("checkOut")}
          </button>
        </>
      }
    >
      {one ? (
        <p style={text}>
          {t("bodyOne", {
            name: one.name,
            attended: lengthLabel(one.attendedMinutes),
            scheduled: lengthLabel(one.scheduledMinutes),
          })}{" "}
          <strong>{t("deducted", { credits: fmtCredits(one.credits) })}</strong>
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={text}>{t("bodyMany")}</p>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {leaving.map((l) => (
              <li key={l.attendanceId} style={{ ...text, fontSize: 14 }}>
                {t("lineMany", {
                  name: l.name,
                  attended: lengthLabel(l.attendedMinutes),
                  scheduled: lengthLabel(l.scheduledMinutes),
                  credits: fmtCredits(l.credits),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
