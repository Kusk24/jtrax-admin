"use client";

/* The Results tab, after the academy said out loud how tournaments really run:
 * everything is managed in Swiss-Manager and published to chess-results.com —
 * player list → pairing → upload → results → upload again. JTrax's job here is
 * registration tracking (the Participants tab) and *showing* the arbiter's
 * results, never authoring them.
 *
 * This tab therefore has exactly three pieces: the chess-results link (the
 * results source), the public page (where families see it), and a read-only
 * preview of what that page is showing. The round-and-result entry UI that
 * used to live below them is gone on purpose — a second place to type results
 * is a second version of the truth.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getChessResultsLink,
  type LinkedResults,
} from "@/lib/chess-results";
import { COLORS, FONT } from "@/lib/theme";
import { Icon } from "@/lib/icons";
import { errorText } from "../crud";
import { formatPoints } from "@/lib/tournament-results";
import { Drawer, primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Badge, Card, SectionTitle } from "../ui";
import { LinkedResultsCard } from "./LinkedResultsCard";
import { ShareLink } from "./ShareLink";

/** How many mirrored rows the preview shows; the full table lives on the
    public page and the preview only exists for a sanity glance. */
const PREVIEW_ROWS = 10;

export function ResultsTab({
  tournamentId,
  tournamentName,
  resultsPublic,
  onPublishChange,
}: {
  tournamentId: string;
  /** Used to search chess-results for this event by name. */
  tournamentName: string;
  resultsPublic: boolean;
  onPublishChange: (next: boolean) => Promise<void>;
}) {
  const t = useTranslations("results");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("external");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /* Loaded once; the card owns its own state after that. `linkLoaded` gates
     the first render so the card does not flash its empty state on a linked
     event. */
  const [linkedResults, setLinkedResults] = useState<LinkedResults | null>(null);
  const [linkLoaded, setLinkLoaded] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerDrawer, setPlayerDrawer] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const link = await getChessResultsLink(tournamentId);
        if (!cancelled) setLinkedResults(link);
      } catch {
        /* Nothing linked (or an older backend): the card then offers to link,
           which is the correct thing to show. */
      } finally {
        if (!cancelled) setLinkLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  async function publish(next: boolean) {
    setBusy(true);
    try {
      await onPublishChange(next);
      setError(null);
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL;
  const publicUrl = portalBase ? `${portalBase.replace(/\/$/, "")}/t/${tournamentId}` : null;
  const linked = linkedResults !== null;
  const preview = linkedResults?.standings.slice(0, PREVIEW_ROWS) ?? [];
  const rounds = linkedResults?.rounds ?? [];
  const selectedStanding = linkedResults?.standings.find((row) => row.name === playerDrawer);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.danger }}>{error}</p>
      )}

      {/* The results source. This card *is* the results feature now. */}
      {linkLoaded && <LinkedResultsCard tournamentId={tournamentId} tournamentName={tournamentName} initial={linkedResults} />}

      {/* ---- the public page ---- */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Icon name="globe" size={17} color={resultsPublic ? COLORS.success : COLORS.textSecondary} />
          <SectionTitle style={{ flex: 1 }}>{t("publicTitle")}</SectionTitle>
          <Badge
            color={resultsPublic ? COLORS.success : COLORS.textSecondary}
            bg={resultsPublic ? COLORS.successBg : COLORS.neutralBg}
          >
            {t(resultsPublic ? "published" : "notPublished")}
          </Badge>
        </div>
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, lineHeight: 1.55, color: COLORS.textSecondary }}>
          {t("publicBody")}
        </p>

        {/* Published without a link yet: families see the registered list, and
            the live table appears the moment the event is linked. Said here so
            nobody hunts for a missing "enter results" button. */}
        {resultsPublic && !linked && (
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, lineHeight: 1.5, color: COLORS.warning }}>
            {t("unlinkedNote")}
          </p>
        )}

        {resultsPublic && !publicUrl && (
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, lineHeight: 1.5, color: COLORS.warning }}>
            {t("publicUrlMissing")}
          </p>
        )}

        {resultsPublic && publicUrl && (
          <ShareLink url={publicUrl} qrLabel={t("qrLabel")} openLabel={t("openPage")} />
        )}

        <button
          type="button"
          className={resultsPublic ? "jt-btn-ghost" : "jt-btn-primary"}
          style={{
            ...(resultsPublic ? secondaryButtonStyle : primaryButtonStyle),
            alignSelf: "flex-start",
            opacity: busy ? 0.75 : 1,
          }}
          disabled={busy}
          onClick={() => void publish(!resultsPublic)}
        >
          {t(resultsPublic ? "unpublish" : "publish")}
        </button>
      </Card>

      {/* ---- what the public sees ---- */}
      {linked && preview.length > 0 && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <SectionTitle>{t("roundFlow")}</SectionTitle>
            <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("roundFlowHint")}</span>
          </div>
          {rounds.length > 0 ? (
            <div role="region" aria-label={t("roundFlow")} tabIndex={0} style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
              {rounds.map((round) => (
                <section key={round.round} style={{ flex: "0 0 250px", border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", background: COLORS.surface }}>
                  <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", background: COLORS.light }}>
                    <strong style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.text }}>{t("round", { n: round.round })}</strong>
                    <Badge color={round.played ? COLORS.success : COLORS.textSecondary} bg={round.played ? COLORS.successBg : COLORS.neutralBg}>{t(round.played ? "played" : "scheduled")}</Badge>
                  </header>
                  <div style={{ padding: "4px 10px 8px" }}>
                    {round.pairings.map((pairing) => {
                      const highlighted = selectedPlayer === pairing.white || selectedPlayer === pairing.black;
                      return (
                        <div key={`${round.round}-${pairing.board}`} style={{ padding: "8px 0", borderTop: `1px solid ${COLORS.border}`, background: highlighted ? COLORS.light : "transparent" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 18, textAlign: "center", fontFamily: FONT, fontSize: 10.5, color: COLORS.textSecondary }}>{pairing.board}</span>
                            <PlayerName name={pairing.white} academy={Boolean(pairing.whiteStudentId)} selected={selectedPlayer === pairing.white} onSelect={setSelectedPlayer} onOpen={setPlayerDrawer} />
                            <strong style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.text }}>{pairing.result || "–"}</strong>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                            <span style={{ width: 18 }} />
                            <PlayerName name={pairing.black || t("bye")} academy={Boolean(pairing.blackStudentId)} selected={selectedPlayer === pairing.black} onSelect={setSelectedPlayer} onOpen={setPlayerDrawer} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("noMirroredRounds")}</p>
          )}
        </Card>
      )}

      {linked && preview.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionTitle>{tExt("previewTitle")}</SectionTitle>
            <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
              {tExt("previewSub", { count: linkedResults!.standings.length })}
            </span>
          </div>
          <div
            style={{ overflowX: "auto" }}
            tabIndex={0}
            role="region"
            aria-label={tCommon("tableRegion")}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: 14 }}>
              <tbody>
                {preview.map((s) => (
                  <tr key={`${s.rank}-${s.name}`} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "8px 14px", width: 40, fontWeight: 700, color: COLORS.textSecondary }}>{s.rank}</td>
                    <td style={{ padding: "8px 14px" }}>
                      {s.name}
                      {/* The reason the mirror knows about students at all:
                          staff can see at a glance which rows matched ours. */}
                      {s.studentName && (
                        <span style={{ marginLeft: 8 }}>
                          <Badge color={COLORS.success} bg={COLORS.successBg}>{s.studentName}</Badge>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "8px 14px", textAlign: "right", color: COLORS.textSecondary }}>{s.rating || ""}</td>
                    <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700 }}>{formatPoints(s.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {playerDrawer && (
        <Drawer title={playerDrawer} onClose={() => setPlayerDrawer(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ display: "flex", width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, background: COLORS.light, color: COLORS.blue, fontFamily: FONT, fontWeight: 700 }}>{playerDrawer.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span>
              <div><strong style={{ display: "block", fontFamily: FONT, fontSize: 16, color: COLORS.text }}>{playerDrawer}</strong><span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{selectedStanding?.rating || "—"}</span></div>
            </div>
            <Card style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("rank")}<strong style={{ display: "block", marginTop: 3, fontSize: 18, color: COLORS.text }}>#{selectedStanding?.rank || "—"}</strong></span>
              <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("points")}<strong style={{ display: "block", marginTop: 3, fontSize: 18, color: COLORS.text }}>{selectedStanding ? formatPoints(selectedStanding.points) : "—"}</strong></span>
            </Card>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, lineHeight: 1.55, color: COLORS.textSecondary }}>{t("playerDrawerHint")}</p>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function PlayerName({ name, academy, selected, onSelect, onOpen }: { name: string; academy: boolean; selected: boolean; onSelect: (name: string) => void; onOpen: (name: string) => void }) {
  return (
    <button type="button" onClick={() => onSelect(name)} onDoubleClick={() => onOpen(name)} style={{ minWidth: 0, flex: 1, border: selected ? `1px solid ${COLORS.blue}` : "1px solid transparent", borderRadius: 7, background: selected ? COLORS.light : "transparent", padding: "3px 5px", textAlign: "left", cursor: "pointer", fontFamily: FONT, fontSize: 11.5, fontWeight: academy ? 700 : 500, color: academy ? COLORS.blue : COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</button>
  );
}
