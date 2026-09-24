"use client";

/**
 * The round-by-round view of an event, and the search that narrows it to one
 * player.
 *
 * What this replaced was a horizontal strip of round columns. It fitted on the
 * page, but it answered no question anybody actually asked: the live round
 * slid further right the longer the event ran, a board number meant scrolling
 * to find it, and tracing one child through five rounds meant reading five
 * columns and remembering. The rounds are stacked and collapsible now, and a
 * name in the search box turns the whole screen into that player's event.
 *
 * Read-only throughout. The arbiter pairs in Swiss-Manager and publishes to
 * chess-results.com; the console mirrors that and shows it.
 */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ExternalStanding, LinkedRound } from "@/lib/chess-results";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import {
  matchPlayers,
  nameKey,
  roundViews,
  roundsForPlayer,
  standingBy,
  type RoundView,
} from "@/lib/tournament-rounds";
import { standingsRace } from "@/lib/standings-race";
import { useShown } from "@/lib/shown-pref";
import { ExportButton, SearchInput, secondaryButtonStyle } from "../page-kit";
import { Badge, Card } from "../ui";
import { PlayerPanel } from "./PlayerPanel";
import { RoundCard, type PlayerMeta } from "./RoundCard";
import { StandingsRace } from "./StandingsRace";

export function ResultsTable({
  rounds,
  standings,
  totalRounds,
  eventName,
  /** The age group on show, when the tab strip is on one. Named on the filter
      bar so a filtered screen still says which event it is filtering. */
  categoryName,
}: {
  rounds: LinkedRound[];
  standings: ExternalStanding[];
  /** The tournament's own round count — see `roundViews`, which needs it to
      know about rounds the site has not published a page for. */
  totalRounds: number;
  eventName: string;
  categoryName?: string;
}) {
  const t = useTranslations("results");

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const views = useMemo(() => roundViews(rounds, totalRounds), [rounds, totalRounds]);

  /* The standings race, an optional picture above the rounds. On one age
     group's tab only that group is ranked; opponents from other groups still
     score against them. It needs two played rounds before a line means
     anything, and until then neither the chart nor its switch is shown. */
  const race = useMemo(
    () => standingsRace(views, categoryName ? standings.map((row) => row.name) : undefined),
    [views, standings, categoryName],
  );
  const canRace = race.rounds.length >= 2;
  const [raceShown, setRaceShown] = useShown("results.race");

  /* Which rounds are open. The default is the round the event is at — the
     latest completed one and the one already paired — because opening all of
     them makes a five-round event a page nobody reads, and opening none makes
     the screen a list of headings. */
  const atTheEvent = useMemo(
    () => () => new Set(views.filter((v) => v.latest || v.state === "pairings").map((v) => v.round)),
    [views],
  );
  /* Narrowed to one player, the rounds worth opening are the ones they are
     actually on a board in — which is most of them, and never the same set as
     the default. Leaving the default in place was the bug this replaced: a
     search for a child showed their first two rounds still collapsed, so the
     filter looked as though it had found nothing there. */
  const withPlayer = (name: string) =>
    new Set(roundsForPlayer(name, views).filter((r) => r.pairings.length > 0).map((r) => r.round));

  const [open, setOpen] = useState<Set<number>>(atTheEvent);

  /* Names for the typed text. One match selects itself: typing a full name and
     then having to click it is a step that exists only because the code could
     not decide. Several matches leave the choice on the board. */
  const matches = useMemo(() => matchPlayers(query, views), [query, views]);
  const player = selected ?? (matches.length === 1 ? matches[0] : null);

  /* The ranking page is where a club, a rating and a rank live; the pairing
     pages carry none of them, so every cell needs this join.

     Built in full up front rather than filled in as cells ask for it. A cache
     that grows during render is a cache written after the render that read it,
     which React's compiler rejects outright — and rightly, since which entries
     exist would then depend on the order the boards happened to draw in. */
  const metaOf = useMemo(() => {
    const byName = new Map<string, PlayerMeta>(
      standings.map((row) => [
        nameKey(row.name),
        { rating: row.rating, club: row.club, points: row.points, studentId: row.studentId },
      ]),
    );
    return (name: string): PlayerMeta => byName.get(nameKey(name)) ?? {};
  }, [standings]);

  /* Filtered, the rounds keep their own headings and counts — "16 Boards · 16
     Games Finished" stays true of the round, not of what is left after the
     filter. Only the boards below are narrowed. */
  const shown: RoundView[] = player ? roundsForPlayer(player, views) : views;
  const matchCount = shown.reduce((n, r) => n + r.pairings.length, 0);
  const completed = views.filter((v) => v.state === "completed").length;
  const upcoming = views.length - completed;

  function pick(name: string) {
    setSelected(name);
    setQuery(name);
    setOpen(withPlayer(name));
  }

  /**
   * Typing is the other way into one player's event, and it has to behave like
   * clicking one: a name that matches exactly one player selects them, and the
   * rounds they played open with them.
   *
   * Done here rather than in an effect watching `player`. An effect would be a
   * second render that re-opens rounds the organiser had just closed by hand —
   * and React's compiler rejects setState in one anyway.
   */
  function typeQuery(value: string) {
    setQuery(value);
    /* Editing the box is how you get back out of one player's event; keeping
       the old pick would leave their card up beside somebody else's boards. */
    setSelected(null);
    const hits = matchPlayers(value, views);
    setOpen(hits.length === 1 ? withPlayer(hits[0]) : atTheEvent());
  }

  function reset() {
    setSelected(null);
    setQuery("");
    setOpen(atTheEvent());
  }

  const selectedRow = player ? standingBy(player, standings) : undefined;

  const list = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {shown.map((view) => (
        <RoundCard
          key={view.round}
          view={view}
          open={open.has(view.round)}
          onToggle={() =>
            setOpen((prev) => {
              const next = new Set(prev);
              if (!next.delete(view.round)) next.add(view.round);
              return next;
            })
          }
          meta={metaOf}
          selected={player}
          onSelect={pick}
          highlight={view.latest}
        />
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span
          aria-hidden
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 11,
            background: COLORS.light,
            flexShrink: 0,
          }}
        >
          <Icon name="list" size={19} color={COLORS.blue} />
        </span>
        <div style={{ flex: 1, minWidth: 140 }}>
          <strong style={{ display: "block", fontFamily: FONT, fontSize: 15, color: COLORS.text }}>
            {t("tableTitle")}
          </strong>
          <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {t("tableSub")}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* The one place the chart is switched on and off. Remembered in this
              browser, like the list / grid choice on other screens. */}
          {canRace && (
            <button
              type="button"
              className="jt-btn-ghost"
              style={secondaryButtonStyle}
              aria-pressed={raceShown}
              onClick={() => setRaceShown(!raceShown)}
            >
              <Icon name="trendingUp" size={15} /> {raceShown ? t("raceHide") : t("raceShow")}
            </button>
          )}
          <button
            type="button"
            className="jt-btn-ghost"
            style={secondaryButtonStyle}
            onClick={() => setOpen(new Set(views.map((v) => v.round)))}
          >
            {t("expandAll")}
          </button>
          <button
            type="button"
            className="jt-btn-ghost"
            style={secondaryButtonStyle}
            onClick={() => setOpen(new Set())}
          >
            {t("collapseAll")}
          </button>
        </div>
      </Card>

      {canRace && raceShown && <StandingsRace race={race} selected={player} onSelect={pick} />}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 0, maxWidth: 360 }}>
          <SearchInput
            value={query}
            onChange={typeQuery}
            placeholder={t("searchPlayer")}
            label={t("searchPlayer")}
            style={player ? { borderColor: COLORS.blue } : undefined}
          />
        </div>
        <ExportButton
          filename={`${eventName}-rounds`}
          columns={[t("roundCol"), t("boardNo"), t("whitePlayer"), t("rating"), t("result"), t("blackPlayer"), t("rating")]}
          /* The rounds as they are on screen, filter and all — the same rule
             every other export on the console follows. */
          rows={() =>
            shown.flatMap((view) =>
              view.pairings.map((p) => [
                view.round,
                p.board,
                p.white,
                p.whiteRating ?? "",
                p.result ?? "",
                p.black ?? "",
                p.blackRating ?? "",
              ]),
            )
          }
        />
      </div>

      {player && (
        <Card
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            padding: "11px 14px",
            background: COLORS.light,
          }}
        >
          <Icon name="filter" size={15} color={COLORS.textSecondary} />
          <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("filteredBy")}</span>
          <Badge color={COLORS.blue} bg={COLORS.surface}>
            {selectedRow?.rating ? `${player} (${selectedRow.rating})` : player}
          </Badge>
          <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {t("roundsSummary", { total: views.length, completed, upcoming })}
            {categoryName ? ` · ${t("categoryIs", { name: categoryName })}` : ""}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {t("showingMatches", { count: matchCount })}
          </span>
          <button
            type="button"
            className="jt-btn-ghost"
            style={{ ...secondaryButtonStyle, minHeight: 32, padding: "5px 11px" }}
            onClick={reset}
          >
            <Icon name="x" size={13} /> {t("resetFilter")}
          </button>
        </Card>
      )}

      {/* Several names matched and none was picked: say so rather than showing
          the unfiltered table, which reads as the search having done nothing. */}
      {!player && query.trim() !== "" && (
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
          {matches.length === 0
            ? t("noPlayerMatch", { query: query.trim() })
            : t("pickOneOf", { count: matches.length })}
        </p>
      )}

      {player ? (
        <div className="jt-results-split">
          {list}
          <PlayerPanel
            name={player}
            rounds={views}
            rating={selectedRow?.rating}
            club={selectedRow?.club}
            rank={selectedRow?.rank}
            category={categoryName}
            studentId={selectedRow?.studentId}
            onClose={reset}
          />
        </div>
      ) : (
        list
      )}
    </div>
  );
}
