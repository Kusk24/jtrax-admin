/**
 * Reading the arbiter's mirrored rounds into the shapes the Results table
 * draws: a round's state, one player's games, and what those games add up to.
 *
 * All of it is derivation, none of it is authorship. The academy does not
 * decide who won — Swiss-Manager does and chess-results.com publishes it — so
 * every number here has to come back out of the pairings the backend mirrored.
 * Nothing in this file may invent a result, and nothing may be stored: a saved
 * copy of "wins" is a number that can disagree with the board it came from.
 *
 * Kept apart from the components because this is the part worth testing. The
 * result strings in particular are the arbiter's own text in a dozen shapes
 * ("1 - 0", "½ - ½", "+ - -", a bare "1" on a bye), and guessing at them
 * silently mis-scores a player rather than failing.
 */
import type { ExternalStanding, LinkedPairing, LinkedRound } from "./chess-results";

/** Where a round has got to, in the arbiter's terms rather than ours.
 *
 *  The backend's sync is what makes these three distinguishable: it stores
 *  rounds 1..n as played once the ranking heading counts them, stores the next
 *  round unplayed the moment its pairings appear, and stores nothing at all for
 *  the rounds after that. So the state is not guesswork — it is which of those
 *  three ways a round arrived. */
export type RoundState = "completed" | "pairings" | "scheduled";

export type RoundView = {
  round: number;
  state: RoundState;
  /** Empty for a scheduled round: the arbiter has not paired it yet. */
  pairings: LinkedPairing[];
  boards: number;
  /** Boards with a result printed against them. */
  finished: number;
  /** The most recently completed round — the one an organiser means by "how
      did we just do?". Exactly one round has it, and only ever a completed
      one. */
  latest: boolean;
  /** The event's last round, when we know how many there are. */
  final: boolean;
  date?: string;
};

/**
 * Every round of the event, mirrored or not.
 *
 * `totalRounds` is the tournament's own round count, and it is here because
 * the mirror cannot supply it: chess-results has no page for a round it has
 * not published, so an event four rounds into five looks finished from the
 * outside. Padding to the declared total is what lets the table say "Round 5
 * (Final) · Scheduled" instead of ending at four and implying the event is
 * over.
 *
 * A mirrored round past the declared total still shows. The organiser's number
 * is a plan; the arbiter's pages are what happened, and when they disagree the
 * thing that actually happened wins.
 */
export function roundViews(rounds: LinkedRound[], totalRounds = 0): RoundView[] {
  const mirrored = [...rounds].sort((a, b) => a.round - b.round);
  const lastPlayed = mirrored.filter((r) => r.played).at(-1)?.round ?? 0;
  const highest = Math.max(totalRounds, mirrored.at(-1)?.round ?? 0);

  const views: RoundView[] = mirrored.map((r) => {
    const pairings = r.pairings ?? [];
    return {
      round: r.round,
      state: r.played ? "completed" : "pairings",
      pairings,
      boards: pairings.length,
      finished: pairings.filter((p) => scoresOf(p.result).white !== null).length,
      latest: r.played && r.round === lastPlayed,
      final: r.round === highest,
      date: r.date,
    };
  });

  /* The rounds the site has no page for yet. Numbered from the end of what is
     mirrored so a gap in the site's own pages does not become a duplicate. */
  const known = new Set(views.map((v) => v.round));
  for (let n = 1; n <= highest; n++) {
    if (known.has(n)) continue;
    views.push({
      round: n,
      state: "scheduled",
      pairings: [],
      boards: 0,
      finished: 0,
      latest: false,
      final: n === highest,
    });
  }
  return views.sort((a, b) => a.round - b.round);
}

/** How the two halves of a result string score, or null where the game has not
    been played. Null and 0 are different answers and the table draws them
    differently — an unplayed board says "vs", a lost one says "0". */
export type Scores = { white: number | null; black: number | null };

const TOKENS: Record<string, number> = {
  "1": 1,
  "0": 0,
  "½": 0.5,
  "0.5": 0.5,
  ".5": 0.5,
  /* A forfeit. The arbiter prints the award, not the moves; the point counts
     the same and the pill reads the same. */
  "+": 1,
  "-": 0,
};

/**
 * Score both sides of one result as the arbiter printed it.
 *
 * The separator is matched as " - " with spaces, not as a bare dash, because
 * a dash is also one of the tokens: "- - +" is a black win by forfeit, and
 * splitting it on every dash gives four empty halves. The no-space form
 * ("1-0") is handled separately for the same reason — it cannot contain a
 * forfeit token without becoming ambiguous.
 *
 * A bare "1" is a bye: chess-results prints one number because there is only
 * one player. It scores for white, who is the only seat filled.
 */
export function scoresOf(result?: string): Scores {
  const text = (result ?? "").replace(/\s+/g, " ").trim();
  if (!text) return { white: null, black: null };

  const spaced = text.split(/ +- +/);
  if (spaced.length === 2) {
    const white = TOKENS[spaced[0]];
    const black = TOKENS[spaced[1]];
    if (white !== undefined && black !== undefined) return { white, black };
    return { white: null, black: null };
  }

  const tight = /^([01½])-([01½])$/.exec(text);
  if (tight) return { white: TOKENS[tight[1]], black: TOKENS[tight[2]] };

  /* A lone token: the bye. Anything else printed in that column is something
     we have not seen, and is better left unscored than scored wrongly. */
  const lone = TOKENS[text];
  return lone === undefined ? { white: null, black: null } : { white: lone, black: null };
}

/** Whether a board has been played, from the only evidence there is. */
export const isPlayed = (result?: string): boolean => scoresOf(result).white !== null;

export type GameSide = "white" | "black";

/** One player's side of one board. */
export type PlayerGame = {
  round: number;
  board: number;
  side: GameSide;
  /** As the arbiter names them, or "" on a bye. */
  opponent: string;
  opponentRating?: number;
  opponentStudentId?: string;
  /** The arbiter's own result text, unedited. */
  result: string;
  /** This player's score, or null before the game. */
  score: number | null;
  /** No opponent — the site's word for it is kept in `opponent`. */
  bye: boolean;
};

/** Names as chess-results prints them, compared the way a person would: case
    and spacing are noise, everything else is the arbiter's spelling and we do
    not correct it.
 *
 *  Exported because the table joins pairing rows to ranking rows by name and
 *  has to agree with this exactly. Two nearly-identical normalisations is how
 *  a player ends up with a club on one screen and none on the next. */
export const nameKey = (name: string) => name.replace(/\s+/g, " ").trim().toLowerCase();
const key = nameKey;

/** Every board this player sits at, in round order. */
export function gamesFor(name: string, rounds: RoundView[]): PlayerGame[] {
  const want = key(name);
  const out: PlayerGame[] = [];
  for (const round of rounds) {
    for (const p of round.pairings) {
      const side: GameSide | null =
        key(p.white) === want ? "white" : key(p.black ?? "") === want ? "black" : null;
      if (!side) continue;
      const scores = scoresOf(p.result);
      /* A bye has no black seat. The site's own word for it — "bye", "not
         paired" — is kept rather than replaced with ours, because which of
         them it is was the arbiter's decision. */
      const bye = side === "white" && !p.black?.trim();
      out.push({
        round: round.round,
        board: p.board,
        side,
        opponent: bye ? "" : side === "white" ? p.black ?? "" : p.white,
        opponentRating: bye ? undefined : side === "white" ? p.blackRating : p.whiteRating,
        opponentStudentId: bye ? undefined : side === "white" ? p.blackStudentId : p.whiteStudentId,
        result: p.result ?? "",
        score: side === "white" ? scores.white : scores.black,
        bye,
      });
    }
  }
  return out.sort((a, b) => a.round - b.round);
}

export type PlayerRecord = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  /** Points as a share of those available, 0-1. Zero when nothing is played —
      not NaN, which reaches the screen as "NaN%". */
  rate: number;
};

/** What a player's games add up to. Unplayed boards count for nothing, not as
    a loss: a round that has not happened is not a result. */
export function recordOf(games: PlayerGame[]): PlayerRecord {
  const done = games.filter((g) => g.score !== null);
  const points = done.reduce((sum, g) => sum + (g.score ?? 0), 0);
  return {
    played: done.length,
    wins: done.filter((g) => g.score === 1).length,
    draws: done.filter((g) => g.score === 0.5).length,
    losses: done.filter((g) => g.score === 0).length,
    points,
    rate: done.length === 0 ? 0 : points / done.length,
  };
}

/** Running total after each played game — the shape of a player's event. */
export function progression(games: PlayerGame[]): number[] {
  let total = 0;
  return games
    .filter((g) => g.score !== null)
    .map((g) => (total += g.score ?? 0));
}

/** Every name the arbiter has paired, deduplicated, in first-seen order. The
    standings are not the source: a player withdrawn after round one is still
    on the boards we mirrored, and a search for them should find those. */
export function playerNames(rounds: RoundView[]): string[] {
  const seen = new Map<string, string>();
  for (const round of rounds) {
    for (const p of round.pairings) {
      for (const name of [p.white, p.black]) {
        const clean = (name ?? "").trim();
        if (clean && !seen.has(key(clean))) seen.set(key(clean), clean);
      }
    }
  }
  return [...seen.values()];
}

/** Names containing `query`, for the search box. An empty query matches
    nothing rather than everything — the table is already showing everything,
    and "all 32 players matched" is not a filter. */
export function matchPlayers(query: string, rounds: RoundView[]): string[] {
  const want = key(query);
  if (!want) return [];
  return playerNames(rounds).filter((name) => key(name).includes(want));
}

/** Rounds reduced to the boards this player sits at. Rounds they are not in
    are kept, with no boards, so the strip still reads as the whole event
    rather than renumbering itself around one player. */
export function roundsForPlayer(name: string, rounds: RoundView[]): RoundView[] {
  const want = key(name);
  return rounds.map((round) => {
    const pairings = round.pairings.filter(
      (p) => key(p.white) === want || key(p.black ?? "") === want,
    );
    return { ...round, pairings, boards: round.boards, finished: round.finished };
  });
}

/** The standings row for a name, which is where a player's club, rating and
    rank live — the pairing pages carry none of them.
 *
 *  Joining by name is safe *here* and nowhere else: both tables are pages of
 *  the same chess-results event, printed from the same Swiss-Manager file, so
 *  the string is the site's own key rather than our guess at one. Matching
 *  names across events is a different thing entirely and is not done. */
export function standingBy(
  name: string,
  standings: ExternalStanding[],
): ExternalStanding | undefined {
  const want = key(name);
  return standings.find((s) => key(s.name) === want);
}

/* ------------------------------------------- groups inside one event --- */

/* An age-group event reaches us in one of two shapes. Either the arbiter
   uploaded each group as its own chess-results tournament — five links for
   OPEN, U18, U12, U10, U08 — or they uploaded one tournament and named each
   player's group in the ranking table's "Typ" column, which is how
   "WCIB CHESS CHAMPIONSHIP 2025 [U14 + G14]" is published.

   The second shape cannot be divided by linking, because there is only one
   link to give. These three functions divide it by reading. */

/** The groups this event publishes, in the order the ranking table introduces
    them — which is by rank, so the strongest group's tab comes first. Empty
    when the arbiter named no groups, which is most events. */
export function groupsIn(standings: ExternalStanding[]): string[] {
  const seen = new Map<string, string>();
  for (const row of standings) {
    const group = row.type?.trim();
    if (group && !seen.has(group.toLowerCase())) seen.set(group.toLowerCase(), group);
  }
  return [...seen.values()];
}

/** The standings rows belonging to one group, in the arbiter's own order. The
    ranks are left exactly as published: they are the overall ranks, and
    renumbering them 1..n would be the console inventing a placing. */
export function standingsInGroup(
  group: string,
  standings: ExternalStanding[],
): ExternalStanding[] {
  const want = group.trim().toLowerCase();
  return standings.filter((row) => (row.type ?? "").trim().toLowerCase() === want);
}

/**
 * The rounds as they look from inside one group.
 *
 * A board is kept when either seat belongs to the group, because in this shape
 * the groups share a pairing pool — in WCIB's round one a G14 played a U14 —
 * and a game is a game to both of them. Filtering to boards where *both* seats
 * matched would hide most of a child's event from their own tab.
 *
 * Rounds with nothing left are kept, empty, so the strip still reads as the
 * whole event rather than renumbering itself around one group.
 */
export function roundsInGroup(
  group: string,
  standings: ExternalStanding[],
  rounds: LinkedRound[],
): LinkedRound[] {
  const members = new Set(standingsInGroup(group, standings).map((row) => nameKey(row.name)));
  return rounds.map((round) => ({
    ...round,
    pairings: (round.pairings ?? []).filter(
      (p) => members.has(nameKey(p.white)) || members.has(nameKey(p.black ?? "")),
    ),
  }));
}

/**
 * A name reduced to initials for an avatar.
 *
 * Swiss-Manager prints "Stancec, Nikolaus" — surname first — so the comma is
 * read rather than stripped. Without that the avatar reads SN for a player
 * everyone at the venue calls NS, and the same person gets different initials
 * depending on which page of the site their name was mirrored from.
 */
export function initialsOf(name: string): string {
  const comma = name.indexOf(",");
  const ordered =
    comma >= 0 ? `${name.slice(comma + 1)} ${name.slice(0, comma)}` : name;
  const parts = ordered.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}
