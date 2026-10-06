"use client";

/* A course's name on a record — a payment, a credit, an attendance, a past
   class — with how it is taught: "JCA NXT · Private". The same course name
   runs as a Private and a Group class at very different prices, so the name
   alone does not say which. A course the student was removed from, or one the
   academy archived, is still named, so the office can tell which it was, but
   faded and marked "· Removed" rather than read as one that is running. */
import { useCallback } from "react";
import { useTranslations } from "next-intl";
import type { ClassType } from "@/lib/class-face";
import { COLORS } from "@/lib/theme";

export function CourseName({ name, type, deleted }: { name: string; type?: ClassType; deleted?: boolean }) {
  const t = useTranslations("common");
  const tType = useTranslations("classType");
  const typed = name && type ? `${name} · ${tType(type)}` : name;
  if (!deleted) return <>{typed || "—"}</>;
  return (
    <span style={{ color: COLORS.textSecondary, opacity: 0.75 }}>
      {typed && <span style={{ textDecoration: "none" }}>{typed}</span>}
      <span style={{ fontSize: "0.9em" }}>{typed ? " · " : ""}{t("removed")}</span>
    </span>
  );
}

/** The same, as plain text for a dropdown or a title: "JCA NXT · Private". */
export function useCourseLabel() {
  const tType = useTranslations("classType");
  return useCallback((name: string, type?: ClassType) => (name && type ? `${name} · ${tType(type)}` : name), [tType]);
}
