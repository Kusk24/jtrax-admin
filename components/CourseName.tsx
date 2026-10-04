"use client";

/* A course's name on a record — a payment, a credit, an attendance, a past
   class. A course the student was removed from, or one the academy archived,
   is still named, so the office can tell which it was, but faded and marked
   "· Removed" rather than read as one that is running. */
import { useTranslations } from "next-intl";
import { COLORS } from "@/lib/theme";

export function CourseName({ name, deleted }: { name: string; deleted?: boolean }) {
  const t = useTranslations("common");
  if (!deleted) return <>{name || "—"}</>;
  return (
    <span style={{ color: COLORS.textSecondary, opacity: 0.75 }}>
      {name && <span style={{ textDecoration: "none" }}>{name}</span>}
      <span style={{ fontSize: "0.9em" }}>{name ? " · " : ""}{t("removed")}</span>
    </span>
  );
}
