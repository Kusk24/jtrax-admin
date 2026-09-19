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
import { fmtTHB } from "@/lib/live";
import { registrationUrl, studentFee } from "@/lib/registration";
import { ErrorNote, errorText } from "../crud";
import { primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Card, SectionTitle } from "../ui";
import { ShareLink } from "./ShareLink";

export function RegistrationCard({
  tournamentId,
  tournamentName,
  open,
  fee,
  discountPct,
  studentFeeNow,
  studentGetsDiscount,
  studentGetsEarlyBird,
  onChange,
}: {
  tournamentId: string;
  tournamentName: string;
  open: boolean;
  fee: number;
  discountPct: number;
  /** What a JCA student is charged today, priced by the server. */
  studentFeeNow?: number;
  studentGetsDiscount: boolean;
  studentGetsEarlyBird: boolean;
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

  /* Which of the two reductions the organiser gave students, in words. The
     figure beside it is the server's, so the card cannot disagree with what a
     family is charged. */
  const discounting = studentGetsDiscount && discountPct > 0;
  const studentNote = discounting && studentGetsEarlyBird
    ? t("pricingBoth", { pct: discountPct })
    : discounting
      ? t("discountOf", { pct: discountPct })
      : studentGetsEarlyBird
        ? t("pricingEarly")
        : t("noDiscount");

  /* saveDiscount was here. The percentage is set in the Create Tournament
     wizard now, beside the fee it comes off, so that the first person through
     a freshly-opened form is quoted the discount the academy meant rather
     than the zero a tournament starts with. This card still *shows* it —
     it is one of the two prices the public form quotes. */

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

      {/* ---- the terms, editable whether or not registration is open ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Figure label={t("publicFee")} value={fee > 0 ? fmtTHB(fee) : t("noFee")} />
        <Figure
          label={t("studentFee")}
          value={fee > 0 ? fmtTHB(studentFeeNow ?? studentFee(fee, discountPct)) : t("noFee")}
          note={studentNote}
        />
      </div>

      {/* ---- the link, only once there is something to link to ---- */}
      {open && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            paddingTop: 13,
            borderTop: `1px solid ${COLORS.border}`,
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

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: COLORS.textSecondary }}>{label}</span>
      <span style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: COLORS.text }}>{value}</span>
      {note && <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>{note}</span>}
    </div>
  );
}
