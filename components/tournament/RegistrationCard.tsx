"use client";

/* Public registration for one tournament: the switch that opens it, the terms
 * the desk sets, and the link and QR code that go on a poster.
 *
 * The link is the point. It used to be a constant pointing at a demo site, the
 * same for every event, beside a QR code that was decorative — a grid of
 * pseudo-random squares that looked scannable and did nothing. Both are real
 * now, and both are per-tournament.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { registrationUrl } from "@/lib/registration";
import { ErrorNote, errorText } from "../crud";
import { primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Card, SectionTitle } from "../ui";
import { ShareLink } from "./ShareLink";

export function RegistrationCard({
  tournamentId,
  tournamentName,
  open,
  onChange,
}: {
  tournamentId: string;
  tournamentName: string;
  open: boolean;
  /** Patches the tournament row; the parent owns the reload. */
  onChange: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const t = useTranslations("registration");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = registrationUrl(tournamentId);

  async function run(patch: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await onChange(patch);
    } catch (e) {
      setError(errorText(e, t("failed")));
    } finally {
      setBusy(false);
    }
  }

  /* The two prices used to be repeated here. They are on the Registration &
     Pricing card beside this one, so this card is only the door: open or
     closed, and the link and QR code while it is open. */

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <SectionTitle>{t("title")}</SectionTitle>
          <p style={{ margin: "5px 0 0", fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary, maxWidth: 620 }}>
            {t("intro")}
          </p>
        </div>
        <button
          type="button"
          className={open ? "jt-btn-ghost" : "jt-btn-primary"}
          style={open ? secondaryButtonStyle : primaryButtonStyle}
          disabled={busy}
          onClick={() => void run({ public_registration: !open })}
        >
          <Icon name={open ? "x" : "globe"} size={14} color={open ? undefined : COLORS.surface} />
          {open ? t("close") : t("open")}
        </button>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* ---- the link, only once there is something to link to ---- */}
      {open && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {url ? (
            <ShareLink
              url={url}
              qrLabel={t("qrLabel", { name: tournamentName })}
              openLabel={t("openForm")}
            />
          ) : (
            /* Registration is open but nobody can be sent anywhere. Said plainly
               rather than printing a link built from the console's own origin,
               which is how the published-results link came to 404 for everyone
               who scanned it. */
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.warning }}>
              {t("portalUnset")}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
