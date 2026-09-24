"use client";

/* The Results tab, after the academy said out loud how tournaments really run:
 * everything is managed in Swiss-Manager and published to chess-results.com —
 * player list → pairing → upload → results → upload again. JTrax's job here is
 * registration tracking (the Participants tab) and *showing* the arbiter's
 * results, never authoring them.
 *
 * This tab therefore has four pieces, in the order the questions come: the
 * chess-results link (the results source), the public page (where families see
 * it), the boards round by round, and the ranked list under them. The
 * round-and-result entry UI that used to live below them is gone on purpose —
 * a second place to type results is a second version of the truth.
 *
 * The boards are the bulk of it and live in `ResultsTable`. They used to be a
 * strip of columns scrolled sideways; what an organiser is actually asked at a
 * venue is about one round or one child, and neither was answerable by
 * scrolling.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getCategoryResultsLink,
  getChessResultsLink,
  type LinkedResults,
} from "@/lib/chess-results";
import { COLORS, FONT } from "@/lib/theme";
import { Icon } from "@/lib/icons";
import { errorText } from "../crud";
import { formatPoints } from "@/lib/tournament-results";
import { primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Badge, Card, SectionTitle } from "../ui";
import { LinkedResultsCard } from "./LinkedResultsCard";
import { ResultsTable } from "./ResultsTable";
import { ShareLink } from "./ShareLink";

/** How many mirrored rows the preview shows; the full table lives on the
    public page and the preview only exists for a sanity glance. */
const PREVIEW_ROWS = 10;

export function ResultsTab({
  tournamentId,
  tournamentName,
  categories,
  totalRounds,
  resultsPublic,
  onPublishChange,
}: {
  tournamentId: string;
  /** Used to search chess-results for this event by name. */
  tournamentName: string;
  /** The event's age groups, in the order the organiser entered them. */
  categories: Array<{ id: string; name: string }>;
  /** How many rounds the event is scheduled for. chess-results has no page
      for a round it has not published, so without this an event four rounds
      into five reads as finished. */
  totalRounds: number;
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
  /* The result *and* the scope it was fetched for, in one piece of state.
     Kept together so "loaded" is derived rather than toggled: a separate
     boolean has to be set false on the way into the effect, which is a render
     where the previous group's card is still showing — it reads as this group
     being linked to that event. */
  const [loaded, setLoaded] = useState<{ scope: string; link: LinkedResults | null } | null>(null);
  /* "" is the first group, whatever it is — not a magic "all". A stored id
     would dangle if the organiser deleted the category it names. */
  const [categoryTab, setCategoryTab] = useState("");

  /* One fetch per tab, because each age group is a different chess-results
     event: the arbiter publishes OPEN, U18, U12, U10 and U08 separately, with
     separate links, pairings and ranked lists.

     `setLinkLoaded(false)` on the way in, so switching group does not show the
     previous group's card for a frame — which would read as this group being
     linked to that event. */
  useEffect(() => {
    let cancelled = false;
    const scope = categoryTab;
    (async () => {
      let link: LinkedResults | null = null;
      try {
        link = scope
          ? await getCategoryResultsLink(scope)
          : await getChessResultsLink(tournamentId);
      } catch {
        /* Nothing linked (or an older backend): the card then offers to link,
           which is the correct thing to show. */
      }
      if (!cancelled) setLoaded({ scope, link });
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId, categoryTab]);

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
  /* Only trust what was fetched for the group now selected. */
  const linkLoaded = loaded?.scope === categoryTab;
  const linkedResults = linkLoaded ? loaded!.link : null;
  const linked = linkedResults !== null;
  /* The standings are whatever the selected group is linked to. No joining:
     the arbiter already separated the groups, and inferring a player's group
     by matching their name against our entrants was guessing at something
     chess-results had told us outright. */
  const preview = (linkedResults?.standings ?? []).slice(0, PREVIEW_ROWS);
  const shownCount = linkedResults?.standings.length ?? 0;
  const hasStandings = shownCount > 0;
  /* The whole event, then each group. An event with no categories is a single
     list and gets no tab strip — one tab is furniture, not navigation. */
  const tabs = [{ id: "", name: t("wholeEvent") }, ...categories];
  const tabbed = categories.length > 0;
  const rounds = linkedResults?.rounds ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.danger }}>{error}</p>
      )}

      {/* The group strip comes first: it decides what everything below is
          about, and a card that changes meaning under a control further down
          reads as the control having done nothing. */}
      {tabbed && (
        <div
          role="tablist"
          aria-label={t("byCategory")}
          style={{ display: "flex", gap: 4, borderBottom: `1px solid ${COLORS.border}`, overflowX: "auto" }}
        >
          {tabs.map((g) => {
            const current = g.id === categoryTab;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={current}
                onClick={() => setCategoryTab(g.id)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "10px 12px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: FONT,
                  fontSize: 13.5,
                  fontWeight: current ? 700 : 600,
                  color: current ? COLORS.blue : COLORS.textSecondary,
                  borderBottom: `2px solid ${current ? COLORS.blue : "transparent"}`,
                  marginBottom: -1,
                }}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      )}

      {/* The results source for whichever group is selected. This card *is*
          the results feature now. `key` remounts it on a group change: it
          keeps the pasted URL in its own state, and carrying that across would
          offer one group's half-typed link on another. */}
      {linkLoaded && (
        <LinkedResultsCard
          key={categoryTab || tournamentId}
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          categoryId={categoryTab || undefined}
          initial={linkedResults}
        />
      )}

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

      {/* ---- the boards, round by round ---- */}
      {linked &&
        (rounds.length > 0 ? (
          <ResultsTable
            /* Remounted per group so a player picked in U18 does not stay
               selected over U12's boards, where that name is not on one. */
            key={categoryTab || tournamentId}
            rounds={rounds}
            standings={linkedResults?.standings ?? []}
            totalRounds={totalRounds}
            eventName={tournamentName}
            categoryName={categories.find((c) => c.id === categoryTab)?.name}
          />
        ) : (
          <Card>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
              {t("noMirroredRounds")}
            </p>
          </Card>
        ))}

      {linked && hasStandings && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionTitle>{tExt("previewTitle")}</SectionTitle>
            <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
              {tExt("previewSub", { count: shownCount })}
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
                {preview.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ padding: "14px 16px", fontSize: 13.5, color: COLORS.textSecondary }}
                    >
                      {t("noneInCategory")}
                    </td>
                  </tr>
                )}
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

    </div>
  );
}
