"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Student } from "@/lib/data";
import type { LineConversation } from "@/lib/line";
import { MoreMenu, type MoreMenuItem } from "./MoreMenu";

/** The parent's ways in, as a menu of what they gave, each an icon and the
    value: phone (calls), email (a new mail), LINE (their chat, opened in
    Messages — so only once a chat is linked). Nothing given, no menu. Its
    clicks never reach the row behind it. */
export function ContactMenu({ student, chat }: { student: Student; chat: LineConversation | null }) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const tMsg = useTranslations("messages");
  const router = useRouter();
  const items: MoreMenuItem[] = [];
  const phone = (student.parentPhone ?? "").trim();
  const email = (student.parentEmail ?? "").trim();
  if (phone) {
    items.push({
      label: phone,
      ariaLabel: `${tCommon("phone")} ${phone}`,
      icon: "phone",
      onSelect: () => { window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`; },
    });
  }
  if (email) {
    items.push({
      label: email,
      ariaLabel: `${tCommon("email")} ${email}`,
      icon: "mail",
      onSelect: () => { window.location.href = `mailto:${email}`; },
    });
  }
  if (chat) {
    const name = chat.displayName || tMsg("unnamedContact");
    items.push({
      label: name,
      ariaLabel: `${tMsg("lineChat")} ${name}`,
      icon: "chat",
      onSelect: () => router.push(`/chat?id=${encodeURIComponent(chat.lineUserId)}`),
    });
  }
  if (items.length === 0) return null;
  return <MoreMenu label={t("contact")} text={t("contact")} items={items} />;
}
