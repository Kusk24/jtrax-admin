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
 *
 * ---- how an age-group event arrives ----
 *
 * Two ways, and the tab strip has to handle both because arbiters use both.
 *
 *   Several events. Swiss-Manager uploads each group as its own tournament,
 *   so OPEN, U18, U12, U10 and U08 are five tnr numbers and five links. Each
 *   of the tournament's own categories carries one, and switching tab fetches
 *   that group's link. This is what the console already did.
 *
 *   One event. Swiss-Manager uploads a single tournament and names each
 *   player's group in the ranking table's "Typ" column — which is how
 *   "WCIB CHESS CHAMPIONSHIP 2025 [U14 + G14]" is published. There is one
 *   link to give, so linking per category cannot divide it, and the console
 *   used to show both age groups as one undivided list of twenty children.
 *   The tabs are now read off that column instead.
 *
 * Groups the link names itself win where both are available: they are the
 * arbiter's division of the event rather than the office's, and a group tab
 * always has results behind it where a category tab may have no link at all.
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
import { groupsIn, roundsInGroup, standingsInGroup } from "@/lib/tournament-rounds";
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
  /**
   * Which tab is showing, as `""` for the whole event, `c:<id>` for one of the
   * tournament's own categories, or `g:<name>` for a group the linked event
   * names in its own ranking table.
   *
   * The two are different in kind, which is why the prefix exists rather than
   * two pieces of state. A `c:` tab is a *separate chess-results event* with
   * its own link, fetched on its own; a `g:` tab is a slice of the event
   * already loaded, and fetching for it would ask the server for a link that
   * was never made. One string keeps the fetch effect keyed on the only thing
   * that can change what is fetched.
   */
  const [tab, setTab] = useState("");
  const categoryTab = tab.startsWith("c:") ? tab.slice(2) : "";
  const groupTab = tab.startsWith("g:") ? tab.slice(2) : "";

  /* One fetch per *category* tab, because those are different chess-results
     events: an arbiter may publish OPEN, U18, U12, U10 and U08 separately,
     with separate links, pairings and ranked lists.

     Group tabs are deliberately not in the dependencies. They divide the event
     already in hand, so switching between them must not cost chess-results a
     request — or worse, ask for a per-category link that does not exist and
     blank the screen. */
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
  const allStandings = linkedResults?.standings ?? [];
  const allRounds = linkedResults?.rounds ?? [];

  /**
   * The groups this one link publishes, read off the ranking table.
   *
   * This is the half that was missing. A per-category link divides an event
   * the arbiter uploaded as several tournaments; it can do nothing for an
   * event uploaded as one, with the groups in a "Typ" column — there is a
   * single link to give, so the console showed twenty children of two
   * different age groups as one undivided list.
   */
  const groups = groupsIn(allStandings);

  /* Filtering, not refetching: a group tab is a slice of the event already in
     hand. The ranks stay the arbiter's own overall ranks — renumbering each
     group 1..n would be the console inventing a placing, and a placing is the
     one thing at a tournament that is not ours to write. */
  const standings = groupTab ? standingsInGroup(groupTab, allStandings) : allStandings;
  const rounds = groupTab ? roundsInGroup(groupTab, allStandings, allRounds) : allRounds;

  const preview = standings.slice(0, PREVIEW_ROWS);
  const shownCount = standings.length;
  const hasStandings = shownCount > 0;

  /**
   * The tab strip: the whole event, then its groups.
   *
   * Groups the link names itself win over the tournament's own categories.
   * They are the arbiter's division of the event rather than the office's, and
   * they are the one whose results actually exist — a category tab with no
   * link of its own has nothing to show, whereas a group tab always does.
   */
  const tabs = groups.length > 0
    ? [{ id: "", name: t("wholeEvent") }, ...groups.map((g) => ({ id: `g:${g}`, name: g }))]
    : [{ id: "", name: t("wholeEvent") }, ...categories.map((c) => ({ id: `c:${c.id}`, name: c.name }))];
  /* One tab is furniture, not navigation. */
  const tabbed = tabs.length > 1;

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
            const current = g.id === tab;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={current}
                onClick={() => setTab(g.id)}
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
          /* Prefixed because this card and the table below are siblings in one
             list: keyed on the tab alone they collide, and React quietly drops
             one of the two. */
          key={`link-${categoryTab || tournamentId}`}
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
            /* Remounted per tab so a player picked in U18 does not stay
               selected over U12's boards, where that name is not on one.
               Keyed on the whole tab, groups included: those do not refetch,
               so nothing else would clear the selection. */
            key={`table-${tab || tournamentId}`}
            rounds={rounds}
            /* The group's own rows on a group tab, so its ranked list and its
               player cards agree with the boards beside them. */
            standings={standings}
            totalRounds={totalRounds}
            eventName={tournamentName}
            categoryName={groupTab || categories.find((c) => c.id === categoryTab)?.name}
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
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionTitle>{tExt("previewTitle")}</SectionTitle>
            <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
              {tExt("previewSub", { count: shownCount })}
            </span>
            {/* The list is this group's, but the numbers beside it are the
                arbiter's overall ranks — the winner of the group is the top
                row, which may well be ranked fourth in the event. Said out
                loud, because renumbering the group 1..n would read better and
                would be the console inventing a placing. */}
            {groupTab && (
              <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.warning }}>
                {t("overallRanksNote", { group: groupTab })}
              </span>
            )}
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
