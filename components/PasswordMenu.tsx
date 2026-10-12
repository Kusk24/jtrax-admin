"use client";

/* One "Password" button for someone's sign-in, opening the two ways back in:
   a link to choose their own (needs a real mailbox), or a new password the
   office reads out. Each item shows only where it applies. */
import { useTranslations } from "next-intl";
import { MoreMenu, type MoreMenuItem } from "./MoreMenu";
import { useInvite } from "./InviteButton";
import { useResetPassword } from "./ResetPassword";

type UpdateFn = (path: string, id: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>;

export function PasswordMenu({
  accountId,
  identifier,
  name,
  update,
  onError,
  sendLink,
}: {
  accountId: string;
  /** Their sign-in ID or email. */
  identifier: string;
  name: string;
  update: UpdateFn;
  onError: (e: unknown) => void;
  /** A different "send link" act (staff use the forgot-password email). */
  sendLink?: { run: () => void; busy: boolean };
}) {
  const t = useTranslations("passwordMenu");
  const invite = useInvite(accountId, identifier);
  const reset = useResetPassword({ accountId, identifier, name, update, onError });

  const items: MoreMenuItem[] = [];
  if (sendLink) {
    items.push({ label: t("sendLink"), icon: "mail", disabledReason: sendLink.busy ? t("sending") : null, onSelect: sendLink.run });
  } else if (invite.available) {
    items.push({ label: t("sendLink"), icon: "mail", disabledReason: invite.working ? t("sending") : null, onSelect: () => void invite.send() });
  }
  if (reset.available) items.push({ label: t("reset"), icon: "lock", onSelect: reset.start });
  if (items.length === 0) return null;

  return (
    <>
      <MoreMenu label={t("label", { name })} text={t("button")} icon="lock" items={items} />
      {invite.modal}
      {reset.modal}
    </>
  );
}
