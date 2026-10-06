"use client";

/* The Results tab: the arbiter's results, as published on chess-results.com.
 *
 * The academy runs its events in Swiss-Manager and publishes to
 * chess-results.com; JTrax shows that, it never authors it. Connecting takes
 * one link — any category of the event — because the site lists every section
 * of an event on each section's details page, and the backend reads them all.
 *
 * Two lists of categories are in play and they are kept apart on purpose:
 *
 *   - Registration categories are the office's (Overview tab). Families enter
 *     them before the day.
 *   - Chess-Results categories are the arbiter's. They are how the event was
 *     actually run, may include a section nobody registered for (a late U16)
 *     or two groups in one ("U14 + G14"), and they are what results follow.
 *
 * Neither list is copied into the other. Each tab here is one Chess-Results
 * category; a category that holds two groups offers a chip per group.
 */
import { useEffect, useId, useMemo, useState } from "react";
import type { Participant } from "@/lib/data";
import { useTranslations } from "next-intl";
import {
  connectResults,
  disconnectResults,
  getResultSection,
  getResultSections,
  refreshResultSection,
  type ExternalStanding,
  type LinkedResults,
  type LinkedRound,
  type ResultSections,
} from "@/lib/chess-results";
import { COLORS, FONT, FONT_DISPLAY } from "@/lib/theme";
import { Icon } from "@/lib/icons";
import { ErrorNote, errorText } from "../crud";
import { formatPoints } from "@/lib/tournament-results";
import { groupsIn, roundsInGroup, standingsInGroup } from "@/lib/tournament-rounds";
import { primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Badge, Card, SectionTitle } from "../ui";
import { ParticipantProfile, type ProfileTarget, type ResultsLink } from "./ParticipantProfile";
import { jcaByRow, withLinkedStudents } from "@/lib/participant-results";
import { useSectionResults } from "@/lib/use-section-results";
import { ResultsTable } from "./ResultsTable";

export function ResultsTab({
  tournamentId,
  tournamentName,
  categories,
  totalRounds,
  resultsPublic,
  onPublishChange,
  participants = [],
  onLinkParticipant,
}: {
  tournamentId: string;
  /** Copied for the chess-results search, so staff never retype it. */
  tournamentName: string;
  /** The registration categories — named beside the Chess-Results ones so the
      two lists are never mistaken for each other. */
  categories: Array<{ id: string; name: string }>;
  /** The tournament's own round count, used until chess-results says. */
  totalRounds: number;
  resultsPublic: boolean;
  onPublishChange: (next: boolean) => Promise<void>;
  /** The tournament's entries — a clicked player opens the same profile the
      Participants tab does. */
  participants?: Participant[];
  onLinkParticipant?: (participantId: string, link: ResultsLink) => Promise<void>;
}) {
  const tCommon = useTranslations("common");
  const [profile, setProfile] = useState<ProfileTarget | null>(null);
  /* True from pasting a link until the admin says it is the right event. The
     category check is shown only then — not every time the tab opens. */
  const [checking, setChecking] = useState(false);

  const [sections, setSections] = useState<ResultSections | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getResultSections(tournamentId)
      .then((s) => !cancelled && setSections(s))
      .catch((e) => !cancelled && setLoadError(errorText(e, tCommon("loadFailed"))));
    return () => {
      cancelled = true;
    };
  }, [tournamentId, tCommon]);

  /* The public page's link, with Copy, Open and Publish beside it — the one
     place to find the link to share. Inside the Chess-Results box, since the
     page shows exactly what that connection brings in. */
  const publish = <PublicLinkRow tournamentId={tournamentId} resultsPublic={resultsPublic} onPublishChange={onPublishChange} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {loadError && <ErrorNote>{loadError}</ErrorNote>}

      {sections === null && !loadError && (
        <Card>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>{tCommon("loading")}</p>
        </Card>
      )}

      {sections && !sections.connected && (
        <ConnectCard
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          onConnected={(s) => {
            setSections(s);
            setChecking(true);
          }}
          publish={publish}
        />
      )}

      {sections?.connected && (
        <ConnectedResults
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          participants={participants}
          sections={sections}
          registration={categories}
          totalRounds={sections.rounds || totalRounds}
          onChange={setSections}
          publish={publish}
          onOpenPlayer={setProfile}
          checking={checking}
          onChecking={setChecking}
        />
      )}

      {profile && (
        <ParticipantProfile
          tournamentId={tournamentId}
          participants={participants}
          target={profile}
          onLink={async (id, link) => onLinkParticipant?.(id, link)}
          onClose={() => setProfile(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- connect -- */

function ConnectCard({
  tournamentId,
  tournamentName,
  onConnected,
  onCancel,
  publish,
}: {
  tournamentId: string;
  tournamentName: string;
  onConnected: (s: ResultSections) => void;
  /** Present when changing an existing connection. */
  onCancel?: () => void;
  /** The publish section, shown at the foot of the box. */
  publish?: React.ReactNode;
}) {
  const t = useTranslations("resultsLink");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function connect() {
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      onConnected(await connectResults(tournamentId, url.trim()));
    } catch (e) {
      setError(errorText(e, t("connectFailed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, background: COLORS.light, flexShrink: 0 }}>
          <Icon name="link" size={18} color={COLORS.blue} />
        </span>
        <div style={{ minWidth: 0 }}>
          <SectionTitle>{t("connectTitle")}</SectionTitle>
          <p style={{ margin: "4px 0 0", fontFamily: FONT, fontSize: 13.5, lineHeight: 1.55, color: COLORS.textSecondary, maxWidth: 680 }}>
            {t("connectBody")}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="jt-btn-ghost"
          style={{ ...secondaryButtonStyle, padding: "4px 12px", fontSize: 13 }}
          onClick={() => {
            /* The site's search is a postback form that cannot be filled from
               a URL, so the name goes to the clipboard for a paste. */
            void navigator.clipboard
              ?.writeText(tournamentName)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 4000);
              })
              .catch(() => {});
            window.open("https://chess-results.com/TurnierSuche.aspx?lan=1", "_blank", "noopener,noreferrer");
          }}
        >
          <Icon name="search" size={13} /> {t("findOnSource")}
        </button>
        {copied && <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.success }}>{t("nameCopied")}</span>}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void connect()}
          placeholder="https://chess-results.com/tnr1193905.aspx"
          aria-label={t("urlLabel")}
          disabled={busy}
          style={{
            flex: "1 1 340px",
            minWidth: 0,
            minHeight: 44,
            padding: "9px 12px",
            borderRadius: 9,
            border: `1px solid ${COLORS.border}`,
            fontFamily: FONT,
            fontSize: 14.5,
            color: COLORS.text,
            background: COLORS.surface,
          }}
        />
        <button type="button" className="jt-btn-primary" style={primaryButtonStyle} disabled={busy || !url.trim()} onClick={() => void connect()}>
          <Icon name="link" size={15} color={COLORS.surface} /> {busy ? t("connecting") : t("connect")}
        </button>
        {onCancel && (
          <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} disabled={busy} onClick={onCancel}>
            {t("cancel")}
          </button>
        )}
      </div>
      {busy && <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("connectingHint")}</p>}
      {publish}
    </Card>
  );
}

/* -------------------------------------------------------------- connected -- */

function ConnectedResults({
  tournamentId,
  tournamentName,
  participants,
  sections,
  registration,
  totalRounds,
  onChange,
  publish,
  onOpenPlayer,
  checking,
  onChecking,
}: {
  tournamentId: string;
  tournamentName: string;
  participants: Participant[];
  sections: ResultSections;
  registration: Array<{ id: string; name: string }>;
  totalRounds: number;
  onChange: (s: ResultSections) => void;
  /** The public link row: link, Copy, Open, Publish. */
  publish: React.ReactNode;
  onOpenPlayer: (target: ProfileTarget) => void;
  /** Just connected: show the categories found, for the admin to confirm. */
  checking: boolean;
  onChecking: (on: boolean) => void;
}) {
  const t = useTranslations("resultsLink");
  /* Who is a JCA student in these results: a player linked to a participant
     who is one — the profile's own matching, across every category. */
  const { loaded } = useSectionResults(tournamentId);
  const jca = useMemo(() => jcaByRow(participants, loaded?.data ?? []), [participants, loaded]);
  /* A category's JCA students, by the same links. */
  const jcaIn = (sectionId: number) => [...jca.keys()].filter((k) => k.startsWith(`${sectionId}|`)).length;
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const current = sections.sections.find((s) => s.chessResultsId === picked) ?? sections.sections[0];

  async function disconnect() {
    if (!window.confirm(t("disconnectConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await disconnectResults(tournamentId));
    } catch (e) {
      setError(errorText(e, t("disconnectFailed")));
    } finally {
      setBusy(false);
    }
  }

  if (changing) {
    return (
      <ConnectCard
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        onConnected={(s) => {
          setChanging(false);
          setPicked(null);
          onChange(s);
          onChecking(true);
        }}
        onCancel={() => setChanging(false)}
        publish={publish}
      />
    );
  }

  return (
    <>
      {/* ---- what is connected ---- */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.textSecondary }}>
              {t("connectedEyebrow")}
            </p>
            <p style={{ margin: "3px 0 0", fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: COLORS.text }}>
              {sections.eventName || tournamentName}
            </p>
            <p style={{ margin: "3px 0 0", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
              {t("connectedSummary", { categories: sections.sections.length, rounds: totalRounds })}
            </p>
          </div>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}

        {/* Two links, one above the other and named for whose page each is:
            the arbiter's on chess-results, and ours that families are sent. */}
        {sections.sections[0] && (
          <SourceLinkRow url={sections.sections[0].url}>
            {/* What is done to the connection sits with its link. */}
            <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} disabled={busy} onClick={() => setChanging(true)}>
              <Icon name="link" size={14} /> {t("changeLink")}
            </button>
            <button type="button" className="jt-act-danger" style={secondaryButtonStyle} disabled={busy} onClick={() => void disconnect()}>
              <Icon name="x" size={14} /> {t("disconnect")}
            </button>
          </SourceLinkRow>
        )}
        {publish}

        {/* Right after a link is pasted: the categories chess-results has
            beside the ones families registered in, so the admin can see it is
            the right event. Once they say so, this goes away for good. */}
        {checking && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", borderRadius: 14, border: `2px solid ${COLORS.blue}`, background: COLORS.light }}>
            <div>
              <strong style={{ display: "block", fontFamily: FONT, fontSize: 14.5, color: COLORS.text }}>{t("checkTitle")}</strong>
              <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("checkBody")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
              <CategoryList
                title={t("resultsCategories")}
                hint={t("resultsCategoriesHint")}
                names={sections.sections.map((s) => s.name)}
                tone="blue"
              />
              <CategoryList
                title={t("registrationCategories")}
                hint={t("registrationCategoriesHint")}
                names={registration.map((c) => c.name)}
                tone="neutral"
                empty={t("noRegistrationCategories")}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => onChecking(false)}>
                <Icon name="check" size={14} color={COLORS.surface} /> {t("checkConfirm")}
              </button>
              <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setChanging(true)}>
                <Icon name="link" size={14} /> {t("changeLink")}
              </button>
            </div>
          </section>
        )}
      </Card>

      {/* ---- one tab per Chess-Results category ---- */}
      <div role="tablist" aria-label={t("resultsCategories")} style={{ display: "flex", gap: 4, borderBottom: `1px solid ${COLORS.border}`, overflowX: "auto" }}>
        {sections.sections.map((s) => {
          const on = s.chessResultsId === current?.chessResultsId;
          return (
            <button
              key={s.chessResultsId}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setPicked(s.chessResultsId)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                border: "none",
                background: "transparent",
                padding: "10px 12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: FONT,
                fontSize: 13.5,
                fontWeight: on ? 700 : 600,
                color: on ? COLORS.blue : COLORS.textSecondary,
                borderBottom: `2px solid ${on ? COLORS.blue : "transparent"}`,
                marginBottom: -1,
              }}
            >
              {s.name}
              {jcaIn(s.chessResultsId) > 0 && (
                <span
                  title={t("jcaCount", { count: jcaIn(s.chessResultsId) })}
                  style={{ borderRadius: 999, padding: "1px 7px", fontSize: 11.5, fontWeight: 700, background: COLORS.successBg, color: COLORS.success }}
                >
                  {jcaIn(s.chessResultsId)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {current && (
        <SectionResults
          /* Remounted per category: filters, the chosen group and a picked
             player belong to the category they were chosen in. */
          key={current.chessResultsId}
          tournamentId={tournamentId}
          tournamentName={sections.eventName || tournamentName}
          sectionName={current.name}
          chessResultsId={current.chessResultsId}
          totalRounds={totalRounds}
          jca={jca}
          onOpenPlayer={(name) => onOpenPlayer({ sectionId: current.chessResultsId, name })}
          onRefreshed={(r) =>
            onChange({
              ...sections,
              sections: sections.sections.map((s) =>
                s.chessResultsId === current.chessResultsId
                  ? {
                      ...s,
                      tracked: true,
                      stage: r.stage,
                      fetchedAt: r.fetchedAt,
                      players: r.standings.length,
                      academyPlayers: withLinkedStudents(r, current.chessResultsId, jca).standings.filter((x) => x.studentId).length,
                    }
                  : s,
              ),
            })
          }
        />
      )}
    </>
  );
}

function CategoryList({ title, hint, names, tone, empty }: { title: string; hint: string; names: string[]; tone: "blue" | "neutral"; empty?: string }) {
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, background: tone === "blue" ? COLORS.light : COLORS.bg, padding: "10px 12px" }}>
      <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, fontWeight: 700, color: tone === "blue" ? COLORS.blue : COLORS.text }}>{title}</p>
      <p style={{ margin: "2px 0 8px", fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>{hint}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {names.length === 0 && empty && <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{empty}</span>}
        {names.map((n) => (
          <Badge key={n} color={tone === "blue" ? COLORS.blue : COLORS.textSecondary} bg={COLORS.surface}>
            {n}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- category -- */

function SectionResults({
  tournamentId,
  tournamentName,
  sectionName,
  chessResultsId,
  totalRounds,
  jca,
  onRefreshed,
  onOpenPlayer,
}: {
  tournamentId: string;
  tournamentName: string;
  sectionName: string;
  chessResultsId: number;
  totalRounds: number;
  /** JCA students by category and name, from the participant links. */
  jca: Map<string, string>;
  onRefreshed: (r: LinkedResults) => void;
  onOpenPlayer: (name: string) => void;
}) {
  const t = useTranslations("resultsLink");
  const tCommon = useTranslations("common");
  const [data, setData] = useState<LinkedResults | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState("");
  const [jcaOnly, setJcaOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getResultSection(tournamentId, chessResultsId)
      .then((r) => !cancelled && setData(r))
      .catch((e) => {
        if (cancelled) return;
        setData(null);
        setError(errorText(e, tCommon("loadFailed")));
      });
    return () => {
      cancelled = true;
    };
  }, [tournamentId, chessResultsId, tCommon]);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const r = await refreshResultSection(tournamentId, chessResultsId);
      setData(r);
      onRefreshed(r);
    } catch (e) {
      setError(errorText(e, t("refreshFailed")));
    } finally {
      setBusy(false);
    }
  }

  /* The results, with who is a JCA student taken from the participant links:
     the highlight, the badge, the boards and the filter all read this. */
  const marked = useMemo(() => (data ? withLinkedStudents(data, chessResultsId, jca) : data), [data, chessResultsId, jca]);
  const allStandings = useMemo(() => marked?.standings ?? [], [marked]);
  const allRounds = useMemo(() => marked?.rounds ?? [], [marked]);
  const groups = useMemo(() => groupsIn(allStandings), [allStandings]);
  const inGroup = group && groups.includes(group);

  /* The chosen group first, then our students on top of it. */
  const standings = useMemo(() => {
    const rows = inGroup ? standingsInGroup(group, allStandings) : allStandings;
    return jcaOnly ? rows.filter((r) => r.studentId) : rows;
  }, [inGroup, group, allStandings, jcaOnly]);
  const rounds = useMemo(() => {
    const rs = inGroup ? roundsInGroup(group, allStandings, allRounds) : allRounds;
    return jcaOnly ? onlyOurBoards(rs) : rs;
  }, [inGroup, group, allStandings, allRounds, jcaOnly]);

  const played = allRounds.filter((r) => r.played).length;
  const ours = allStandings.filter((r) => r.studentId).length;

  const jcaToggle = (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.text, cursor: "pointer", whiteSpace: "nowrap" }}>
      <input type="checkbox" checked={jcaOnly} onChange={(e) => setJcaOnly(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--jt-blue)" }} />
      {t("jcaOnly")}
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ---- status strip ---- */}
      <Card style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 16px" }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: !data ? COLORS.disabled : isFinal(data.stage) ? COLORS.successFill : COLORS.warningFill,
            flexShrink: 0,
          }}
          aria-hidden
        />
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text }}>
            {data === undefined
              ? tCommon("loading")
              : !data
                ? t("notReadYet")
                : data.stage || t("notStarted")}
          </p>
          <p style={{ margin: "2px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {[
              data ? t("roundOf", { played, total: totalRounds || played }) : "",
              data ? t("players", { count: allStandings.length }) : "",
              data && ours > 0 ? t("jcaCount", { count: ours }) : "",
              data?.fetchedAt ? t("updated", { at: fetchedLabel(data.fetchedAt) }) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} disabled={busy} onClick={() => void refresh()}>
          <Icon name="refund" size={14} /> {busy ? t("refreshing") : t("refresh")}
        </button>
        <a
          href={`https://chess-results.com/tnr${chessResultsId}.aspx?lan=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="jt-btn-ghost"
          style={{ ...secondaryButtonStyle, textDecoration: "none" }}
        >
          <Icon name="globe" size={14} /> {t("openSource")}
        </a>
      </Card>

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* ---- filters ---- */}
      {data && groups.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {["", ...groups].map((g) => {
              const on = (g === "" && !inGroup) || g === group;
              return (
                <button
                  key={g || "all"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setGroup(g)}
                  style={{
                    minHeight: 34,
                    padding: "5px 14px",
                    borderRadius: 999,
                    border: `1px solid ${on ? COLORS.blue : COLORS.border}`,
                    background: on ? COLORS.blue : COLORS.surface,
                    color: on ? COLORS.surface : COLORS.text,
                    fontFamily: FONT,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {g || t("allGroups", { name: sectionName })}
                </button>
              );
            })}
        </div>
      )}

      {data === null && !error && (
        <Card>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>{t("notReadYetBody")}</p>
        </Card>
      )}

      {/* ---- rounds ---- */}
      {data &&
        (rounds.length > 0 ? (
          <ResultsTable
            key={group}
            rounds={rounds}
            standings={standings}
            totalRounds={totalRounds}
            eventName={tournamentName}
            categoryName={inGroup ? group : sectionName}
            filters={jcaToggle}
            onOpenPlayer={onOpenPlayer}
          />
        ) : (
          <Card style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <p style={{ margin: 0, flex: 1, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
              {jcaOnly ? t("noJcaBoards") : t("noRounds")}
            </p>
            {/* Kept here too, so the filter can be switched off when it hides every board. */}
            {jcaToggle}
          </Card>
        ))}

      {/* ---- full standings ---- */}
      {data && <StandingsTable rows={standings} showGroup={groups.length > 1 && !inGroup} jcaOnly={jcaOnly} onOpenPlayer={onOpenPlayer} />}
    </div>
  );
}

function StandingsTable({
  rows,
  showGroup,
  jcaOnly,
  onOpenPlayer,
}: {
  rows: ExternalStanding[];
  showGroup: boolean;
  jcaOnly: boolean;
  onOpenPlayer: (name: string) => void;
}) {
  const t = useTranslations("resultsLink");
  const tCommon = useTranslations("common");
  /* Folded to begin with, like the round cards, so the page opens short. */
  const [open, setOpen] = useState(false);
  const headerId = useId();
  const panelId = useId();
  const th: React.CSSProperties = {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 12.5,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: COLORS.textSecondary,
    background: COLORS.light,
    whiteSpace: "nowrap",
  };
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        id={headerId}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          padding: "14px 16px",
          border: "none",
          borderBottom: open ? `1px solid ${COLORS.border}` : "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontFamily: FONT, fontSize: 15, color: COLORS.text, whiteSpace: "nowrap" }}>{t("standingsTitle")}</strong>
        <span style={{ flex: 1, minWidth: 120, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("players", { count: rows.length })}</span>
        {/* Rotated like a round card's, so both read as the same control. */}
        <span
          aria-hidden
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 160ms ease",
          }}
        >
          <Icon name="chevronDown" size={15} color={COLORS.textSecondary} />
        </span>
      </button>
      {open && (
        <div id={panelId} style={{ overflowX: "auto" }} tabIndex={0} role="region" aria-label={tCommon("tableRegion")}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 56 }}>{t("colRank")}</th>
                <th style={th}>{t("colName")}</th>
                {showGroup && <th style={th}>{t("colGroup")}</th>}
                <th style={th}>{t("colClub")}</th>
                <th style={{ ...th, textAlign: "right" }}>{t("colRating")}</th>
                <th style={{ ...th, textAlign: "right" }}>{t("colPoints")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "16px", fontSize: 13.5, color: COLORS.textSecondary }}>
                    {jcaOnly ? t("noJcaPlayers") : t("noPlayers")}
                  </td>
                </tr>
              )}
              {rows.map((s, i) => (
                <tr
                  key={`${s.rank}-${s.name}-${i}`}
                  className="jt-table-row"
                  /* Our students stand out without a filter: that is who the
                     office is asked about. */
                  style={{ borderTop: `1px solid ${COLORS.border}`, background: s.studentId ? COLORS.successBg : undefined }}
                >
                  <td style={{ padding: "9px 14px", fontWeight: 700, color: COLORS.textSecondary }}>{s.rank || ""}</td>
                  <td style={{ padding: "9px 14px" }}>
                    {/* Opens the participant's profile, the same one as the Participants tab. */}
                    <button
                      type="button"
                      onClick={() => onOpenPlayer(s.name)}
                      style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: FONT, fontSize: 14, fontWeight: s.studentId ? 700 : 500, color: COLORS.text, textAlign: "left" }}
                    >
                      {s.name}
                    </button>
                    {s.studentId && (
                      <span style={{ marginLeft: 8 }}>
                        <Badge color={COLORS.success} bg={COLORS.surface}>
                          {t("jcaBadge")}
                        </Badge>
                      </span>
                    )}
                  </td>
                  {showGroup && <td style={{ padding: "9px 14px", color: COLORS.textSecondary }}>{s.type || ""}</td>}
                  <td style={{ padding: "9px 14px", color: COLORS.textSecondary }}>{s.club || ""}</td>
                  <td style={{ padding: "9px 14px", textAlign: "right", color: COLORS.textSecondary }}>{s.rating || ""}</td>
                  <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700 }}>{formatPoints(s.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------ public page -- */

/** The event's own page on chess-results.com — where the results come from.
    Shown beside our public link so the two are never mistaken for each other. */
function SourceLinkRow({ url, children }: { url: string; children?: React.ReactNode }) {
  const t = useTranslations("results");
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", borderRadius: 14, border: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="link" size={16} color={COLORS.textSecondary} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontFamily: FONT, fontSize: 14.5, color: COLORS.text }}>{t("sourceLinkTitle")}</strong>
          <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("sourceLinkHint")}</span>
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <LinkBox url={url} label={t("sourceLinkTitle")} />
        <a href={url} target="_blank" rel="noopener noreferrer" className="jt-btn-ghost" style={{ ...secondaryButtonStyle, textDecoration: "none" }}>
          <Icon name="globe" size={14} /> {t("openPage")}
        </a>
        {children}
      </div>
    </section>
  );
}

/** A link in a read-only box, with Copy tucked into its right-hand corner. */
function LinkBox({ url, label }: { url: string; label: string }) {
  return (
    <div style={{ position: "relative", flex: "1 1 280px", minWidth: 0 }}>
      <input
        readOnly
        value={url}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        style={{
          width: "100%",
          minHeight: 40,
          padding: "8px 92px 8px 12px",
          borderRadius: 9,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.surface,
          color: COLORS.text,
          fontFamily: FONT,
          fontSize: 13.5,
          textOverflow: "ellipsis",
        }}
      />
      <span style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)" }}>
        <CopyButton text={url} />
      </span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations("results");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        minHeight: 30,
        padding: "4px 10px",
        borderRadius: 7,
        border: "none",
        background: copied ? COLORS.successBg : COLORS.light,
        color: copied ? COLORS.success : COLORS.blue,
        cursor: "pointer",
        fontFamily: FONT,
        fontSize: 12.5,
        fontWeight: 600,
      }}
      onClick={() => {
        void navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          })
          .catch(() => {});
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={14} color={copied ? COLORS.success : undefined} /> {copied ? t("linkCopied") : t("copyShort")}
    </button>
  );
}

/** The public results page's link, and everything done with it in one row:
    Copy it for a post, Open it to check, Publish or stop publishing it. The
    link is shown before publishing too, so it is never hard to find; until
    then it leads to a not-found page, and the row says so. */
function PublicLinkRow({
  tournamentId,
  resultsPublic,
  onPublishChange,
}: {
  tournamentId: string;
  resultsPublic: boolean;
  onPublishChange: (next: boolean) => Promise<void>;
}) {
  const t = useTranslations("results");
  const tCommon = useTranslations("common");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = publicUrlOf(tournamentId);

  async function togglePublish() {
    setBusy(true);
    try {
      await onPublishChange(!resultsPublic);
      setError(null);
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", borderRadius: 14, border: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Icon name="globe" size={16} color={resultsPublic ? COLORS.success : COLORS.textSecondary} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontFamily: FONT, fontSize: 14.5, color: COLORS.text }}>{t("publicLinkTitle")}</strong>
          <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("publicLinkHint")}</span>
        </span>
        <Badge color={resultsPublic ? COLORS.success : COLORS.textSecondary} bg={resultsPublic ? COLORS.successBg : COLORS.neutralBg}>
          {t(resultsPublic ? "published" : "notPublished")}
        </Badge>
      </div>

      {url ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <LinkBox url={url} label={t("publicLinkTitle")} />
          <a href={url} target="_blank" rel="noopener noreferrer" className="jt-btn-ghost" style={{ ...secondaryButtonStyle, textDecoration: "none" }}>
            <Icon name="globe" size={14} /> {t("openPage")}
          </a>
          <button
            type="button"
            className={resultsPublic ? "jt-btn-ghost" : "jt-btn-primary"}
            style={{ ...(resultsPublic ? secondaryButtonStyle : primaryButtonStyle), opacity: busy ? 0.75 : 1 }}
            disabled={busy}
            title={t("publicBody")}
            onClick={() => void togglePublish()}
          >
            {t(resultsPublic ? "unpublish" : "publish")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <p style={{ flex: 1, margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.warning }}>{t("publicUrlMissing")}</p>
          <button
            type="button"
            className={resultsPublic ? "jt-btn-ghost" : "jt-btn-primary"}
            style={resultsPublic ? secondaryButtonStyle : primaryButtonStyle}
            disabled={busy}
            onClick={() => void togglePublish()}
          >
            {t(resultsPublic ? "unpublish" : "publish")}
          </button>
        </div>
      )}

      {!resultsPublic && url && (
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("notPublishedNote")}</p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
    </section>
  );
}

/** The public results page, or null when this deployment has no portal URL. */
function publicUrlOf(tournamentId: string): string | null {
  const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL;
  return portalBase ? `${portalBase.replace(/\/$/, "")}/t/${tournamentId}` : null;
}

/* ---------------------------------------------------------------- helpers -- */

/** Only the boards with one of our students on them; rounds keep their place. */
function onlyOurBoards(rounds: LinkedRound[]): LinkedRound[] {
  return rounds.map((r) => ({ ...r, pairings: r.pairings.filter((p) => p.whiteStudentId || p.blackStudentId) }));
}

function isFinal(stage?: string): boolean {
  return !!stage && stage.toLowerCase().startsWith("final");
}

/* The backend stores UTC without a zone marker. */
function fetchedLabel(raw: string): string {
  const d = new Date(raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}
