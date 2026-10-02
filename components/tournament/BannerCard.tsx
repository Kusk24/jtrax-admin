"use client";

/**
 * The tournament's banner on its own screen, with the one choice there is to
 * make about it: upload the organiser's own picture, or go back to the one the
 * pages draw from the tournament's name, date and venue.
 *
 * The same picture is what the public registration page and the parent's
 * tournament card show, so changing it here changes it there.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import type { Tournament } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { useData } from "../DataProvider";
import { ErrorNote, errorText } from "../crud";
import { secondaryButtonStyle } from "../page-kit";
import { Card } from "../ui";
import { TournamentBanner } from "./TournamentBanner";

export function BannerCard({
  tournament,
  badge,
  actions,
}: {
  tournament: Tournament;
  /** The status tag, pinned to the banner's top-right corner. */
  badge?: React.ReactNode;
  /** The tournament's own actions, on the right under the banner. */
  actions?: React.ReactNode;
}) {
  const t = useTranslations("tournament");
  const tCommon = useTranslations("common");
  const { refresh } = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Bumped after an upload, so the browser does not show the old picture
     from its cache under the same address. */
  const [version, setVersion] = useState(0);

  async function run(job: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await job();
      await refresh();
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 415 ? t("bannerWrongType") : errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    void run(() => api.upload(`tournaments/${tournament.id}/banner`, form));
  }

  const when = [tournament.date, tournament.endDate].filter((d, i, all) => d && all.indexOf(d) === i).join(" – ");

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* The banner says the name; the heading stays for screen readers,
          since an uploaded picture may not. */}
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", margin: 0 }}>
        {tournament.name}
      </h1>
      <div style={{ position: "relative" }}>
        <TournamentBanner
          name={tournament.name}
          when={when}
          venue={tournament.venue}
          imageUrl={tournament.hasBanner ? `/api/tournaments/${tournament.id}/banner?v=${version}` : undefined}
        />
        {badge && (
          <div style={{ position: "absolute", top: 12, right: 12, filter: "drop-shadow(0 2px 6px rgba(0,0,0,.18))" }}>
            {badge}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <label
          className="jt-btn-ghost"
          title={tournament.hasBanner ? t("bannerCustomNote") : t("bannerDefaultNote")}
          style={{ ...secondaryButtonStyle, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}
        >
          <Icon name="image" size={14} /> {tournament.hasBanner ? t("bannerReplace") : t("bannerUpload")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label={t("bannerUpload")}
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
            style={{ display: "none" }}
          />
        </label>
        {tournament.hasBanner && (
          <button
            type="button"
            className="jt-btn-ghost"
            style={secondaryButtonStyle}
            disabled={busy}
            onClick={() => void run(() => api.del(`tournaments/${tournament.id}/banner`))}
          >
            {t("bannerUseDefault")}
          </button>
        )}
        {actions && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {actions}
          </div>
        )}
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
    </Card>
  );
}
