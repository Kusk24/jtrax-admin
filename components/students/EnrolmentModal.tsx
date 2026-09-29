"use client";

/* One enrolment, opened from its row on the student's page.

   Read-only first: most clicks are the office checking a date or a note, and a
   form that opens editable invites a stray keystroke into a ledger. Edit turns
   the three things that can be corrected here into fields — when the child
   joined, when this course's credits expire, and the office's note. The course
   and the status have their own acts (Change course, Delete) because each of
   those moves credits, which a field edit must not. */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { fmtDate, todayISO } from "@/lib/live";
import { COLORS, FONT, statusChipColors } from "@/lib/theme";
import type { Student } from "@/lib/data";
import { ActionButton, ErrorNote, errorText } from "../crud";
import { fieldStyle, InfoGrid, labelStyle, Modal, primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Badge } from "../ui";

export type EnrolmentSummary = {
  id: string;
  className: string;
  status: string;
  enrolledDate: string;
  /** ISO date, or "" for never expires. */
  expires: string;
  movedFrom: string;
  notes: string;
};

export type EnrolmentEdits = { enrolledDate: string; expires: string; notes: string };

export function EnrolmentModal({
  enrolment,
  balance,
  creditStatus,
  canSetExpiry,
  onClose,
  onSave,
}: {
  enrolment: EnrolmentSummary;
  balance: number;
  /** This course's own condition; null for a course the child has left. */
  creditStatus: Student["status"] | null;
  /** Expiry lives on the course's purchases. With none bought yet there is
      nothing for a date to be on, so the field says so instead. */
  canSetExpiry: boolean;
  onClose: () => void;
  onSave: (edits: EnrolmentEdits) => Promise<void>;
}) {
  const t = useTranslations("students");
  const tc = useTranslations("common");
  const tStatus = useTranslations("status");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EnrolmentEdits>({
    enrolledDate: enrolment.enrolledDate.slice(0, 10),
    expires: enrolment.expires.slice(0, 10),
    notes: enrolment.notes,
  });
  const [problem, setProblem] = useState("");

  const active = enrolment.status === "" || enrolment.status === "Active";
  const expired = enrolment.expires !== "" && enrolment.expires < todayISO();
  const chip = creditStatus ? statusChipColors(creditStatus) : null;

  async function save() {
    if (!draft.enrolledDate) {
      setProblem(t("enrolmentDateRequired"));
      return;
    }
    if (draft.expires && draft.expires < draft.enrolledDate) {
      setProblem(t("expiryBeforeEnrolment"));
      return;
    }
    setProblem("");
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e) {
      setProblem(errorText(e, tc("saveFailed")));
    }
  }

  const footer = editing ? (
    <>
      <button
        type="button"
        className="jt-btn-ghost"
        style={secondaryButtonStyle}
        onClick={() => {
          setDraft({
            enrolledDate: enrolment.enrolledDate.slice(0, 10),
            expires: enrolment.expires.slice(0, 10),
            notes: enrolment.notes,
          });
          setProblem("");
          setEditing(false);
        }}
      >
        {tc("cancel")}
      </button>
      <ActionButton className="jt-btn-primary" style={primaryButtonStyle} busyLabel={tc("saving")} onClick={save}>
        {tc("save")}
      </ActionButton>
    </>
  ) : (
    <>
      <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={onClose}>
        {tc("close")}
      </button>
      <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => setEditing(true)}>
        {tc("edit")}
      </button>
    </>
  );

  const muted = { color: COLORS.textSecondary };

  return (
    <Modal title={t("enrolmentTitle", { className: enrolment.className })} onClose={onClose} footer={footer} width={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {problem && <ErrorNote>{problem}</ErrorNote>}

        {/* What cannot be edited here, shown the same in both modes. */}
        <InfoGrid
          rows={[
            {
              label: tc("status"),
              value: (
                <Badge
                  color={active ? COLORS.success : COLORS.textSecondary}
                  bg={active ? COLORS.successBg : COLORS.neutralBg}
                >
                  {tStatus(enrolment.status || "Active")}
                </Badge>
              ),
            },
            {
              label: t("colCredits"),
              value: (
                <span style={{ color: balance < 0 ? COLORS.danger : undefined }}>
                  {tc("creditsCount", { count: balance })}
                </span>
              ),
            },
            {
              label: t("colCreditStatus"),
              value: chip && creditStatus ? (
                <Badge color={chip.color} bg={chip.bg}>{tStatus(creditStatus)}</Badge>
              ) : (
                <span style={muted}>—</span>
              ),
            },
            ...(enrolment.movedFrom
              ? [{ label: t("movedFromLabel"), value: enrolment.movedFrom }]
              : []),
            ...(editing
              ? []
              : [
                  { label: t("enrolledDate"), value: fmtDate(enrolment.enrolledDate) },
                  {
                    label: t("expires"),
                    value: (
                      <span style={{ color: expired ? COLORS.danger : undefined, fontWeight: expired ? 600 : undefined }}>
                        {enrolment.expires ? fmtDate(enrolment.expires) : t("neverExpires")}
                      </span>
                    ),
                  },
                  {
                    label: t("enrolmentNotes"),
                    value: enrolment.notes ? (
                      <span style={{ whiteSpace: "pre-wrap" }}>{enrolment.notes}</span>
                    ) : (
                      <span style={muted}>{t("noNotes")}</span>
                    ),
                  },
                ]),
          ]}
        />

        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label>
                <span style={labelStyle}>{t("enrolledDate")}</span>
                <input
                  type="date"
                  required
                  value={draft.enrolledDate}
                  onChange={(e) => setDraft((d) => ({ ...d, enrolledDate: e.target.value }))}
                  style={fieldStyle}
                />
              </label>
              <label>
                <span style={labelStyle}>{t("expires")}</span>
                <input
                  type="date"
                  value={draft.expires}
                  disabled={!canSetExpiry}
                  onChange={(e) => setDraft((d) => ({ ...d, expires: e.target.value }))}
                  style={{ ...fieldStyle, opacity: canSetExpiry ? 1 : 0.55 }}
                />
              </label>
            </div>
            <p style={{ margin: "-6px 0 0", fontFamily: FONT, fontSize: 12.5, ...muted }}>
              {canSetExpiry ? t("expiryThisCourseOnly") : t("expiryNeedsCredits")}
            </p>
            <label>
              <span style={labelStyle}>{t("enrolmentNotes")}</span>
              <textarea
                rows={3}
                value={draft.notes}
                placeholder={t("enrolmentNotesPlaceholder")}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                style={{ ...fieldStyle, resize: "vertical" }}
              />
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}
