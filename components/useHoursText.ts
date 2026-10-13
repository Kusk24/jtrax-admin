"use client";

import { useTranslations } from "next-intl";
import { splitHours } from "@/lib/hours";

/** Hours attended (credits used) as "9 h 15 min", or "9 h" on the hour. */
export function useHoursText(): (h: number) => string {
  const t = useTranslations("common");
  return (h: number) => {
    const { hours, minutes } = splitHours(h);
    return minutes === 0 ? t("hoursText", { hours }) : t("hoursMinutesText", { hours, minutes });
  };
}
