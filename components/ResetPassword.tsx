"use client";

/**
 * Resetting somebody's password from the office.
 *
 * A child signs in with an ID — `stu_penny_ward` — and an ID has no mailbox, so
 * the self-service "forgot password" link that works for staff and parents
 * cannot reach them at all. Somebody at the academy has to be able to set one
 * and read it out. That is this.
 *
 * The same button serves the accounts that *do* have a mailbox, because the
 * office needs one answer to "they cannot get in" rather than a different route
 * per role. Where a reset link is possible it is still the better path — it
 * never puts the password in a third person's hands — and the screens that can
 * send one keep offering it alongside.
 *
 * Admin only, matching the server: whoever types a new password can then sign in
 * as that person. The button is hidden rather than disabled for a receptionist,
 * because a disabled control invites asking why, and the answer is not
 * something they can fix.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { generateReadablePassword } from "@/lib/credentials";
import { useJtrax } from "./JtraxContext";
import { InfoGrid, Modal, primaryButtonStyle, secondaryButtonStyle } from "./page-kit";

type UpdateFn = (path: string, id: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>;

export function ResetPasswordButton({
  accountId,
  identifier,
  name,
  update,
  onError,
}: {
  /** `user_account_id`. Absent when the person has no login at all. */
  accountId: string;
  /** Their ID or address — shown with the new password, because a password on
      its own is half of what the family needs to write down. */
  identifier: string;
  name: string;
  update: UpdateFn;
  onError: (e: unknown) => void;
}) {
  const t = useTranslations("resetPassword");
  const { role } = useJtrax();
  const [confirming, setConfirming] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  /* The button says whether the copy worked. It gave no sign either way, so
     the office could not tell whether the password was on the clipboard —
     and the modal is the only place it is ever shown. */
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  async function copyBoth() {
    try {
      await navigator.clipboard.writeText(`${identifier} / ${issued}`);
      setCopy("copied");
      setTimeout(() => setCopy("idle"), 2000);
    } catch {
      setCopy("failed");
    }
  }

  if (role !== "Admin" || !accountId) return null;

  async function reset() {
    setWorking(true);
    /* Readable, because it is read out at the counter or copied onto a slip
       for a child. */
    const password = generateReadablePassword();
    try {
      await update("user-accounts", accountId, { password });
      setConfirming(false);
      setCopy("idle");
      setIssued(password);
    } catch (e) {
      onError(e);
      setConfirming(false);
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="jt-act-reset"
        style={secondaryButtonStyle}
        onClick={() => setConfirming(true)}
      >
        <Icon name="lock" size={14} /> {t("action")}
      </button>

      {/* Confirmed first, because it cannot be undone: the old password is a
          hash and is gone the moment this runs. Someone who is signed in on a
          phone stays signed in — the session outlives the password — so the
          dialog says what actually happens rather than implying a lockout. */}
      {confirming && (
        <Modal
          title={t("confirmTitle")}
          width={440}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button type="button" style={secondaryButtonStyle} onClick={() => setConfirming(false)}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="jt-btn-primary"
                style={{ ...primaryButtonStyle, opacity: working ? 0.75 : 1 }}
                disabled={working}
                onClick={reset}
              >
                {working ? t("working") : t("confirm")}
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
            {t("confirmBody", { name })}
          </p>
        </Modal>
      )}

      {issued && (
        <Modal title={t("doneTitle")} width={460} onClose={() => setIssued(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
              {t("doneHint")}
            </p>
            <InfoGrid
              rows={[
                { label: t("signInWith"), value: <strong>{identifier}</strong> },
                {
                  label: t("newPassword"),
                  value: <strong style={{ letterSpacing: "0.04em" }}>{issued}</strong>,
                },
              ]}
            />
            <button
              type="button"
              style={{
                ...secondaryButtonStyle,
                justifyContent: "center",
                color: copy === "copied" ? COLORS.success : undefined,
                borderColor: copy === "copied" ? COLORS.success : undefined,
              }}
              onClick={() => void copyBoth()}
              aria-label={copy === "copied" ? t("copied") : undefined}
            >
              {/* Copied reads as a green tick alone; the label comes back after
                  two seconds, ready to copy again. */}
              {copy === "copied" ? (
                <Icon name="check" size={17} color={COLORS.success} />
              ) : (
                <>
                  <Icon name="copy" size={14} /> {t("copy")}
                </>
              )}
            </button>
            {/* Said aloud for anyone not looking at the button; shown only
                when the copy failed, since then there is something to do. */}
            <p
              role="status"
              style={
                copy === "failed"
                  ? { margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.danger }
                  : { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", margin: 0 }
              }
            >
              {copy === "copied" ? t("copiedNote") : copy === "failed" ? t("copyFailed") : ""}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
