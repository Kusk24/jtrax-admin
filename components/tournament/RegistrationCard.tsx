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
  onChange,
}: {
  tournamentId: string;
  tournamentName: string;
  open: boolean;
  fee: number;
  discountPct: number;
  /** Patches the tournament row; the parent owns the reload. */
  onChange: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const t = useTranslations("registration");
  const tCommon = useTranslations("common");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftDiscount, setDraftDiscount] = useState(String(discountPct));

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

  function saveDiscount() {
    const pct = Number(draftDiscount);
    // Bounded here as well as in the database: a typo should be a message on
    // this screen, not a rejected write the desk has to decode.
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
      setError(t("discountRange"));
      return;
    }
    void run({ student_discount_pct: pct });
  }

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
          <Icon name={open ? "x" : "globe"} size={14} color={open ? undefined : "#fff"} />
          {open ? t("close") : t("open")}
        </button>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* ---- the terms, editable whether or not registration is open ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Figure label={t("publicFee")} value={fee > 0 ? fmtTHB(fee) : t("noFee")} />
        <Figure
          label={t("studentFee")}
          value={fee > 0 ? fmtTHB(studentFee(fee, discountPct)) : t("noFee")}
          note={discountPct > 0 ? t("discountOf", { pct: discountPct }) : t("noDiscount")}
        />
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: COLORS.textSecondary }}>
            {t("discountLabel")}
          </span>
          <span style={{ display: "flex", gap: 7 }}>
            <input
              type="number"
              min={0}
              max={100}
              inputMode="numeric"
              value={draftDiscount}
              onChange={(e) => setDraftDiscount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveDiscount()}
              style={{
                width: 82,
                minHeight: 44,
                padding: "8px 10px",
                borderRadius: 9,
                border: `1px solid ${COLORS.border}`,
                fontFamily: FONT,
                fontSize: 14,
                color: COLORS.text,
                background: COLORS.surface,
              }}
            />
            <button
              type="button"
              className="jt-btn-ghost"
              style={secondaryButtonStyle}
              disabled={busy || draftDiscount === String(discountPct)}
              onClick={saveDiscount}
            >
              {busy ? tCommon("saving") : tCommon("save")}
            </button>
          </span>
        </label>
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
