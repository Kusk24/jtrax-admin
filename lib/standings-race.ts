/**
 * The standings race: where each player stood after every round, worked out
 * from the boards the arbiter published.
 *
 * chess-results prints one ranking — the current one, with the official
 * tiebreaks — and nothing for the rounds before it. So a position "after round
 * 2" has to be read back out of the pairings: add up each player's points
 * through that round and rank by them. That is a ranking by points only, and
 * the chart says so; two players on the same score share the place ("=3rd")
 * rather than being split by a tiebreak the console would be inventing.
 *
 * Derivation only, like the rest of the Results tab. Nothing here is stored.
 */
import { nameKey, playerNames, scoresOf, type RoundView } from "./tournament-rounds";

export type RaceRow = {
  /** As the arbiter prints it. */
  name: string;
  /** Set when the player is one of the academy's own — the backend matched
      them to a student record when it mirrored the round. */
  studentId?: string;
  /** Running points after each round in `Race.rounds`. */
  points: number[];
  /** Position after each round: 1 plus the number of players with more
      points, so a shared score is a shared place. */
  positions: number[];
  /** Whether that position is shared with somebody else. */
  tied: boolean[];
};

export type Race = {
  /** The round numbers charted, in order: completed rounds only. */
  rounds: number[];
  /** Every player who has sat at a board in those rounds, ordered by their
      latest position and then by name. */
  rows: RaceRow[];
  /** How many players are ranked — the bottom of the chart. */
  field: number;
};

/**
 * @param views Every round, as `roundViews` returns them.
 * @param members When the screen is one age group of a shared event, the
 *   names in that group. Their opponents from other groups still score
 *   against them, but only the members are ranked, so the race is the group's
 *   own. Omit it to rank everybody on the boards.
 */
export function standingsRace(views: RoundView[], members?: string[]): Race {
  /* A round counts once its results are in. A round that is only paired has
     nothing to rank by yet, and charting it would draw everybody flat. */
  const done = views.filter((v) => v.state === "completed" && v.finished > 0);
  const only = members && members.length > 0 ? new Set(members.map(nameKey)) : null;

  const names = playerNames(done).filter((n) => !only || only.has(nameKey(n)));
  const rows = new Map<string, RaceRow>(
    names.map((name) => [nameKey(name), { name, points: [], positions: [], tied: [] }]),
  );

  const total = new Map<string, number>(names.map((n) => [nameKey(n), 0]));
  for (const view of done) {
    for (const p of view.pairings) {
      const scores = scoresOf(p.result);
      const seats: [string | undefined, number | null, string | undefined][] = [
        [p.white, scores.white, p.whiteStudentId],
        [p.black, scores.black, p.blackStudentId],
      ];
      for (const [name, score, studentId] of seats) {
        const k = nameKey(name ?? "");
        const row = rows.get(k);
        if (!row) continue;
        if (studentId && !row.studentId) row.studentId = studentId;
        /* An unscored board in a finished round adds nothing: no result is not
           a loss, and not a draw either. */
        if (score !== null) total.set(k, (total.get(k) ?? 0) + score);
      }
    }

    /* Rank after this round. A player not on any board this round — withdrawn,
       or a late entry — keeps the points they had. */
    const all = [...rows.keys()].map((k) => total.get(k) ?? 0);
    for (const [k, row] of rows) {
      const mine = total.get(k) ?? 0;
      row.points.push(mine);
      row.positions.push(1 + all.filter((p) => p > mine).length);
      row.tied.push(all.filter((p) => p === mine).length > 1);
    }
  }

  const ordered = [...rows.values()].sort(
    (a, b) => (a.positions.at(-1) ?? 0) - (b.positions.at(-1) ?? 0) || a.name.localeCompare(b.name),
  );
  return { rounds: done.map((v) => v.round), rows: ordered, field: ordered.length };
}
