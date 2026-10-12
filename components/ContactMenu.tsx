"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Student } from "@/lib/data";
import type { LineConversation } from "@/lib/line";
import { MoreMenu, type MoreMenuItem } from "./MoreMenu";

/** The parent's ways in, as a menu: only the ones they gave — phone, email,
    and LINE (the chat linked in Messages, else their LINE ID). Nothing at
    all when they gave none. Its clicks never reach the row behind it. */
export function ContactMenu({ student, chat }: { student: Student; chat: LineConversation | null }) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const tMsg = useTranslations("messages");
  const router = useRouter();
  const items: MoreMenuItem[] = [];
  const phone = (student.parentPhone ?? "").trim();
  const email = (student.parentEmail ?? "").trim();
  const lineId = (student.parentLineId ?? "").trim();
  if (phone) {
    items.push({ label: `${tCommon("phone")}: ${phone}`, icon: "phone", onSelect: () => { window.location.href = `tel:${phone.replace(/\s/g, "")}`; } });
  }
  if (email) {
    items.push({ label: `${tCommon("email")}: ${email}`, icon: "mail", onSelect: () => { window.location.href = `mailto:${email}`; } });
  }
  if (chat) {
    items.push({
      label: `LINE: ${chat.displayName || tMsg("unnamedContact")}`,
      icon: "chat",
      onSelect: () => router.push(`/chat?id=${encodeURIComponent(chat.lineUserId)}`),
    });
  } else if (lineId) {
    items.push({
      label: `LINE: ${lineId}`,
      icon: "chat",
      onSelect: () => window.open(`https://line.me/R/ti/p/~${encodeURIComponent(lineId)}`, "_blank", "noopener"),
    });
  }
  if (items.length === 0) return null;
  return <MoreMenu label={t("contact")} text={t("contact")} icon="phone" items={items} />;
}
