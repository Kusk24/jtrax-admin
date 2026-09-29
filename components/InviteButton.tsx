"use client";

/* Sending a parent their "set your password" link.

   A new parent gets one automatically. This is for the times it did not
   land — a typo in the address since corrected, a spam folder, a link left
   longer than its week — and for a parent who has lost their password: the
   office sends a link rather than choosing one for them. The old link keeps working until it expires or is
   used; the new one works alongside it. */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { sendInvite, type InviteResult, type StudentLogin } from "@/lib/invite";
import { COLORS, FONT } from "@/lib/theme";
import { useJtrax } from "./JtraxContext";
import { Modal, primaryButtonStyle, secondaryButtonStyle } from "./page-kit";

export type InviteOutcome = InviteResult | "failed";

/** What happened to an invite, said plainly — including when nothing was sent. */
export function InviteOutcomeNote({
  outcome,
  email,
  withLoginOf,
  resent = false,
}: {
  outcome: InviteOutcome;
  email: string;
  /** Sent again from the parent's page: a password link, not a welcome. */
  resent?: boolean;
  /** The child whose login went in the same email, if one did. */
  withLoginOf?: string;
}) {
  const t = useTranslations("invite");
  const [text, color] =
    outcome === "failed"
      ? [t("failed", { email }), COLORS.danger]
      : outcome.delivered
        ? [
            withLoginOf
              ? t("sentWithLogin", { email: outcome.email, name: withLoginOf })
              : t(resent ? "linkSent" : "sent", { email: outcome.email }),
            COLORS.text,
          ]
        : [t("notDelivered", { email: outcome.email }), COLORS.warning];
  return (
    <p style={{ margin: 0, display: "flex", gap: 8, alignItems: "flex-start", fontFamily: FONT, fontSize: 13.5, color }}>
      <Icon name="mail" size={15} color={color} />
      <span>{text}</span>
    </p>
  );
}

export async function inviteOutcome(accountId: string, studentLogins: StudentLogin[] = []): Promise<InviteOutcome> {
  try {
    return await sendInvite(accountId, studentLogins);
  } catch {
    return "failed";
  }
}

export function InviteButton({ accountId, email }: { accountId: string; email: string }) {
  const t = useTranslations("invite");
  const { role } = useJtrax();
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState<InviteOutcome | null>(null);

  if ((role !== "Admin" && role !== "Receptionist") || !accountId || !email.includes("@")) return null;

  return (
    <>
      <button
        type="button"
        className="jt-btn-ghost"
        style={{ ...secondaryButtonStyle, opacity: working ? 0.75 : 1 }}
        disabled={working}
        onClick={async () => {
          setWorking(true);
          setOutcome(await inviteOutcome(accountId));
          setWorking(false);
        }}
      >
        <Icon name="mail" size={14} /> {working ? t("sending") : t("resend")}
      </button>
      {outcome && (
        <Modal
          title={t("resultTitle")}
          width={420}
          onClose={() => setOutcome(null)}
          footer={
            <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => setOutcome(null)}>
              {t("done")}
            </button>
          }
        >
          <InviteOutcomeNote outcome={outcome} email={email} resent />
        </Modal>
      )}
    </>
  );
}
