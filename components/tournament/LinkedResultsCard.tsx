"use client";

/* Pointing one of the academy's own tournaments at the chess-results.com event
 * it is published as.
 *
 * The console has always let staff type rounds and results by hand, and for a
 * club night that is right. For an event an arbiter runs it is not: they pair it
 * in Swiss-Manager and upload to chess-results.com, and that upload is what
 * players, parents and federations treat as true. A second table typed in here
 * is wrong the moment a round lands.
 *
 * So this card is a choice between two sources, said plainly. Linked, the public
 * page follows the arbiter and the hand-entry below becomes irrelevant; unlinked,
 * the console's own rounds are the result again. Nothing is deleted either way.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  linkChessResults, refreshLinkedResults, unlinkChessResults, type LinkedResults,
} from "@/lib/chess-results";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { ErrorNote, errorText } from "../crud";
import { primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Badge, Card, SectionTitle } from "../ui";

export function LinkedResultsCard({
  tournamentId,
  initial,
}: {
  tournamentId: string;
  /** What the tournament is already linked to, when it is. */
  initial: LinkedResults | null;
}) {
  const t = useTranslations("external");
  const tCommon = useTranslations("common");

  const [linked, setLinked] = useState<LinkedResults | null>(initial);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e, t("linkFailed")));
    } finally {
      setBusy(false);
    }
  }

  const ours = linked?.standings.filter((s) => s.studentId).length ?? 0;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <SectionTitle>{t("linkTitle")}</SectionTitle>
          <p style={{ margin: "5px 0 0", fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary, maxWidth: 620 }}>
            {linked ? t("linkedIntro") : t("linkIntro")}
          </p>
        </div>
        {linked && (
          <Badge color={COLORS.success} bg={COLORS.successBg}>
            {linked.stage || t("linkedBadge")}
          </Badge>
        )}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {linked ? (
        <>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
            {t("linkedPlayers", { count: linked.standings.length, ours })}
            {(linked.rounds?.length ?? 0) > 0
              ? ` · ${t("linkedRounds", { count: linked.rounds!.length })}`
              : ""}
            {linked.fetchedAt ? ` · ${t("fetched", { at: fetchedLabel(linked.fetchedAt) })}` : ""}
          </p>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <button
              type="button"
              className="jt-btn-ghost"
              style={secondaryButtonStyle}
              disabled={busy}
              onClick={() =>
                void run(async () => setLinked(await refreshLinkedResults(tournamentId)))
              }
            >
              <Icon name="refund" size={14} /> {busy ? tCommon("saving") : t("refresh")}
            </button>
            <a
              href={linked.url}
              target="_blank"
              rel="noopener noreferrer"
              className="jt-btn-ghost"
              style={{ ...secondaryButtonStyle, textDecoration: "none" }}
            >
              <Icon name="globe" size={14} /> {t("openSource")}
            </a>
            <button
              type="button"
              className="jt-btn-ghost"
              style={secondaryButtonStyle}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await unlinkChessResults(tournamentId);
                  setLinked(null);
                })
              }
            >
              <Icon name="x" size={14} /> {t("unlink")}
            </button>
          </div>

          {/* Said out loud, because it is the surprising part: the rounds below
              this card stop being what anybody sees. */}
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.warning }}>
            {t("linkedOverridesNote")}
          </p>
        </>
      ) : (
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && url.trim() && void run(async () =>
              setLinked(await linkChessResults(tournamentId, url.trim())))}
            placeholder="https://chess-results.com/tnr123456.aspx"
            aria-label={t("urlLabel")}
            style={{
              flex: "1 1 320px",
              minWidth: 0,
              minHeight: 44,
              padding: "9px 12px",
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              fontFamily: FONT,
              fontSize: 14,
              color: COLORS.text,
              background: COLORS.surface,
            }}
          />
          <button
            type="button"
            className="jt-btn-primary"
            style={primaryButtonStyle}
            disabled={busy || !url.trim()}
            onClick={() =>
              void run(async () => setLinked(await linkChessResults(tournamentId, url.trim())))
            }
          >
            <Icon name="link" size={15} color="#fff" /> {busy ? tCommon("saving") : t("link")}
          </button>
        </div>
      )}
    </Card>
  );
}

/* The backend stores UTC without a zone marker; treated as such rather than as
   local time, which would report a fetch as hours in the future. */
function fetchedLabel(raw: string): string {
  const iso = raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(d);
}
