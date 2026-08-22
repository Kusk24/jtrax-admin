"use client";

/**
 * Lichess, on its own.
 *
 * This lived at the bottom of the students list — below the table, inside its
 * card, and only in list view, so switching to cards made it vanish. It is not
 * a footnote to the roster: it is the half of a pupil's chess the academy
 * never sees, read from somewhere else entirely, and it belongs on a screen of
 * its own where it can be looked at rather than scrolled past.
 */
import { useTranslations } from "next-intl";
import { LichessPanel } from "../lichess/LichessPanel";
import { PageHeader } from "../page-kit";

export function LichessPage() {
  const t = useTranslations("lichessAdmin");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title={t("title")} sub={t("pageSub")} />
      <LichessPanel />
    </div>
  );
}
