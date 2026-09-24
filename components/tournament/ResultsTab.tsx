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
 * The strip carries both, and this is the part that was got wrong once: it
 * used to build from the groups *or* the categories, so adding a category to
 * a linked event added nothing to the strip. They are not alternatives. They
 * are the same age groups named twice — once by the office, in the categories
 * it manages and prices and edits on the Overview tab, and once by the arbiter
 * in whatever they typed into Swiss-Manager.
 *
 * So every category gets a tab, and each is answered by whichever source has
 * results behind it: its own linked event if there is one, else the matching
 * group inside the whole event, else nothing yet. A group the arbiter named
 * that the office has no category for gets a tab of its own, because a result
 * with no tab is a result nobody can reach.
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
  /* Both links carry the scope they were fetched for, so "loaded" is derived
     rather than toggled: a separate boolean has to be set false on the way
     into the effect, and that is a render where the previous tab's card is
     still showing — which reads as this group being linked to that event. */
  /**
   * The whole event's link, held on its own and fetched once.
   *
   * Separate from the per-category link because a category tab may need both:
   * its own link if the arbiter published that group separately, and this one
   * if they published the groups together and named them in a column. Holding
   * only whichever the current tab asked for meant a category could not fall
   * back to the event it is part of.
   */
  const [eventLink, setEventLink] = useState<{ done: boolean; link: LinkedResults | null }>({
    done: false,
    link: null,
  });
  const [catLink, setCatLink] = useState<{ scope: string; link: LinkedResults | null } | null>(null);
  /**
   * Which tab is showing, as `""` for the whole event, `c:<id>` for one of the
   * tournament's own categories, or `g:<name>` for a group the linked event
   * names in its own ranking table.
   *
   * The prefix exists because the two are different in kind. A `c:` tab is one
   * of the office's own age groups, which may have a separate chess-results
   * event behind it; a `g:` tab is a group the arbiter named inside one event,
   * and asking the server for a link to that would be asking for a link nobody
   * ever made.
   */
  const [tab, setTab] = useState("");
  const categoryTab = tab.startsWith("c:") ? tab.slice(2) : "";
  const groupTab = tab.startsWith("g:") ? tab.slice(2) : "";

  /* The event itself, once. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let link: LinkedResults | null = null;
      try {
        link = await getChessResultsLink(tournamentId);
      } catch {
        /* Nothing linked (or an older backend): the card then offers to link,
           which is the correct thing to show. */
      }
      if (!cancelled) setEventLink({ done: true, link });
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  /* And one fetch per *category* tab, because an arbiter may publish OPEN,
     U18, U12, U10 and U08 as separate events with separate links.

     Group tabs are deliberately not in the dependencies. They divide the event
     already in hand, so switching between them must not cost chess-results a
     request — or worse, ask for a per-category link that does not exist and
     blank the screen. */
  useEffect(() => {
    const scope = categoryTab;
    /* Nothing to fetch off a category tab. The previous category's link is
       left in place rather than cleared: `linkLoaded` compares the scope it
       was fetched for against the tab now showing, so a stale one is already
       invisible — and clearing it here would be a setState in an effect,
       which is a second render for no gain. */
    if (!scope) return;
    let cancelled = false;
    (async () => {
      let link: LinkedResults | null = null;
      try {
        link = await getCategoryResultsLink(scope);
      } catch {
        /* Not linked separately — the group may still be inside the event. */
      }
      if (!cancelled) setCatLink({ scope, link });
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
  /* Ready when everything this tab needs has been asked for: the event always,
     and a category's own link as well when one is selected. */
  const linkLoaded = eventLink.done && (!categoryTab || catLink?.scope === categoryTab);

  /**
   * The groups the event names in its own ranking table — Swiss-Manager's
   * "Typ" column, where the arbiter uploaded every age group as one
   * tournament rather than several.
   */
  const eventStandings = eventLink.link?.standings ?? [];
  const groups = groupsIn(eventStandings);

  /**
   * Which slice of which link this tab is showing.
   *
   * A category tab is answered two ways and has to try both, which is the bug
   * this replaced: tabs were built from the groups *or* the categories, so
   * adding a category to a linked event added nothing to the strip. The
   * office's categories and the arbiter's groups are not alternatives — they
   * are the same age groups named twice, by two different people, and a
   * category is served by whichever of them has results behind it.
   */
  const active = (() => {
    if (groupTab) return { link: eventLink.link, group: groupTab };
    if (!categoryTab) return { link: eventLink.link, group: "" };
    /* Its own chess-results event, where the arbiter published one. */
    if (catLink?.link) return { link: catLink.link, group: "" };
    /* Otherwise the same name inside the whole event, if it is one of the
       groups there. Matched on the name because that is all the two have in
       common — the office's category id means nothing to chess-results. */
    const named = categories.find((c) => c.id === categoryTab)?.name ?? "";
    const match = groups.find((g) => g.toLowerCase().trim() === named.toLowerCase().trim());
    return match ? { link: eventLink.link, group: match } : { link: null, group: "" };
  })();

  const linkedResults = linkLoaded ? active.link : null;
  const linked = linkedResults !== null;
  const allStandings = linkedResults?.standings ?? [];
  const allRounds = linkedResults?.rounds ?? [];

  /* Filtering, not refetching, when the group came from inside the event. The
     ranks stay the arbiter's own overall ranks — renumbering each group 1..n
     would be the console inventing a placing, and a placing is the one thing
     at a tournament that is not ours to write. */
  const shownGroup = linkLoaded ? active.group : "";
  const standings = shownGroup ? standingsInGroup(shownGroup, allStandings) : allStandings;
  const rounds = shownGroup ? roundsInGroup(shownGroup, allStandings, allRounds) : allRounds;

  const preview = standings.slice(0, PREVIEW_ROWS);
  const shownCount = standings.length;
  const hasStandings = shownCount > 0;

  /**
   * The tab strip: the whole event, the tournament's own age groups, then any
   * group the link names that the office has not got a category for.
   *
   * Both, not one or the other. The categories are what the office manages and
   * what the Overview tab edits, so a category added there has to appear here
   * — that was the regression. The extra groups are there because an arbiter
   * can publish a division the office never entered, and a result with no tab
   * is a result nobody can reach.
   */
  const named = new Set(categories.map((c) => c.name.toLowerCase().trim()));
  const tabs = [
    { id: "", name: t("wholeEvent") },
    ...categories.map((c) => ({ id: `c:${c.id}`, name: c.name })),
    ...groups
      .filter((g) => !named.has(g.toLowerCase().trim()))
      .map((g) => ({ id: `g:${g}`, name: g })),
  ];
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
            categoryName={shownGroup || categories.find((c) => c.id === categoryTab)?.name}
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
            {shownGroup && (
              <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.warning }}>
                {t("overallRanksNote", { group: shownGroup })}
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
