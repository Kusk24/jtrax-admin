/**
 * A pupil's practice, read for the Practice tab on their profile.
 *
 * Two sources, each the truth for its own part:
 *   · practice_activity — one row per day the pupil solved puzzles (daily set
 *     or free play), with the puzzles and minutes the server measured. The
 *     streak is counted from these rows, exactly as the student app counts it.
 *   · the pupil's history (`GET students/{id}/history`) — each game against
 *     the computer, each game on the academy's board, and each puzzle with
 *     whether it was the day's set or free play.
 *
 * No points: games earn none, and a figure that only moves for puzzles would
 * read as a score for everything the child did.
 */
import { todayISO } from "./live";

export type HistoryEntry = {
  kind: "solo" | "room" | "puzzle";
  id: string;
  /** UTC timestamp: when the game ended, or the puzzle was solved. */
  at: string;
  /** The academy's calendar day. */
  day: string;
  startedAt?: string;
  source?: "daily" | "free";
  against: string;
  result?: string;
  moves?: number;
};

export type PracticeDay = {
  puzzles: number;
  minutes: number;
  games: number;
  gameMinutes: number;
  /** Every puzzle of that day's daily set was solved. */
  dailyDone: boolean;
};

type Row = Record<string, unknown>;

const iso = (d: Date) => todayISO(d);
const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split("-").map(Number);
  return iso(new Date(y, m - 1, d + n));
};

/** SQLite writes "YYYY-MM-DD HH:MM:SS" in UTC with no zone; the browser
    writes ISO with one. Both read as the same instant. */
function instant(stamp: string | undefined): number {
  if (!stamp) return NaN;
  const s = /[zZ]|[+-]\d\d:?\d\d$/.test(stamp) ? stamp : `${stamp.replace(" ", "T")}Z`;
  return Date.parse(s);
}

/** Minutes between two stamps, or 0 when either is missing or they disagree. */
export function minutesBetween(start: string | undefined, end: string | undefined, cap = 180): number {
  const a = instant(start);
  const b = instant(end);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.min(cap, Math.round((b - a) / 60_000));
}

/** Everything that happened on each day, keyed by ISO day. */
export function practiceByDay(activities: Row[], history: HistoryEntry[], studentId: string): Map<string, PracticeDay> {
  const days = new Map<string, PracticeDay>();
  const get = (day: string) => {
    let d = days.get(day);
    if (!d) {
      d = { puzzles: 0, minutes: 0, games: 0, gameMinutes: 0, dailyDone: false };
      days.set(day, d);
    }
    return d;
  };
  for (const a of activities) {
    if (String(a["student_id"] ?? "") !== studentId) continue;
    const d = get(String(a["activity_date"] ?? ""));
    d.puzzles += Number(a["puzzles_completed"] ?? 0);
    d.minutes += Number(a["minutes_practiced"] ?? 0);
  }
  const daily = new Map<string, { set: number; solved: number }>();
  for (const e of history) {
    if (e.kind === "puzzle") {
      if (e.source !== "daily") continue;
      const tally = daily.get(e.day) ?? { set: 0, solved: 0 };
      tally.set += 1;
      if (e.result === "solved") tally.solved += 1;
      daily.set(e.day, tally);
    } else {
      const d = get(e.day);
      d.games += 1;
      d.gameMinutes += minutesBetween(e.startedAt, e.at);
    }
  }
  for (const [day, tally] of daily) {
    if (tally.set > 0 && tally.solved === tally.set) get(day).dailyDone = true;
  }
  return days;
}

/** Whether a day counts towards the streak — the same test the backend uses:
    a practice row with puzzles or minutes in it. */
const practised = (d: PracticeDay | undefined) => !!d && (d.puzzles > 0 || d.minutes > 0);

/**
 * Days in a row, the way the student app counts them: the run must reach today
 * or yesterday — a child who has not practised *yet* today keeps yesterday's
 * streak until the day ends.
 */
export function currentStreak(days: Map<string, PracticeDay>, today = todayISO()): number {
  let day = practised(days.get(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (practised(days.get(day))) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export type Totals = { puzzles: number; minutes: number; games: number };

/** Puzzles, minutes (puzzles and games together) and games over a run of days
    ending on `end`, inclusive. */
export function totalsOver(days: Map<string, PracticeDay>, end: string, count: number): Totals {
  const out = { puzzles: 0, minutes: 0, games: 0 };
  for (let i = 0; i < count; i++) {
    const d = days.get(addDays(end, -i));
    if (!d) continue;
    out.puzzles += d.puzzles;
    out.minutes += d.minutes + d.gameMinutes;
    out.games += d.games;
  }
  return out;
}

/** Everything on record: puzzles, minutes (puzzles and games) and games. */
export function overallTotals(days: Map<string, PracticeDay>): Totals {
  const out = { puzzles: 0, minutes: 0, games: 0 };
  for (const d of days.values()) {
    out.puzzles += d.puzzles;
    out.minutes += d.minutes + d.gameMinutes;
    out.games += d.games;
  }
  return out;
}

/** How much a day holds, for the heatmap's shade: puzzles and games. */
export const activityOf = (d: PracticeDay | undefined) => (d ? d.puzzles + d.games : 0);

/** 0 none, 1 for 1–2, 2 for 3–5, 3 for 6 and over. */
export function level(n: number): 0 | 1 | 2 | 3 {
  if (n <= 0) return 0;
  if (n <= 2) return 1;
  if (n <= 5) return 2;
  return 3;
}

/**
 * A month as Monday-first weeks: one array per week, seven days each, with
 * null for the days either side that belong to another month.
 */
export function monthWeeks(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const length = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length }, (_, i) => iso(new Date(year, month, i + 1))),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export type WeekBucket = { start: string; end: string } & Totals;

/** The last `count` Monday-to-Sunday weeks, oldest first, the current one last. */
export function weeklyProgress(days: Map<string, PracticeDay>, count: number, today = todayISO()): WeekBucket[] {
  const [y, m, d] = today.split("-").map(Number);
  const monday = iso(new Date(y, m - 1, d - ((new Date(y, m - 1, d).getDay() + 6) % 7)));
  const weeks: WeekBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = addDays(monday, -7 * i);
    const end = addDays(start, 6);
    weeks.push({ start, end, ...totalsOver(days, end, 7) });
  }
  return weeks;
}

export type RecentRow = {
  key: string;
  day: string;
  kind: "daily" | "free" | "solo" | "room";
  /** Puzzles solved, for a puzzle row; null for a game. */
  puzzles: number | null;
  minutes: number;
  /** Who a game was against, or its result. */
  detail?: string;
};

/**
 * The pupil's recent practice, newest first. A day's puzzles are one row per
 * kind — "Daily Challenge, 5 puzzles" reads better than five rows of one — and
 * each game is its own row.
 */
export function recentActivity(history: HistoryEntry[]): RecentRow[] {
  const puzzleRows = new Map<string, RecentRow & { last: string }>();
  const games: (RecentRow & { last: string })[] = [];
  for (const e of history) {
    if (e.kind === "puzzle") {
      const kind = e.source === "free" ? "free" : "daily";
      const key = `${e.day}|${kind}`;
      const row = puzzleRows.get(key) ?? { key, day: e.day, kind, puzzles: 0, minutes: 0, last: "" };
      if (e.result === "solved") {
        row.puzzles = (row.puzzles ?? 0) + 1;
        row.minutes += minutesBetween(e.startedAt, e.at, 30);
      }
      if (e.at > row.last) row.last = e.at;
      puzzleRows.set(key, row);
    } else {
      games.push({
        key: `${e.kind}|${e.id}`,
        day: e.day,
        kind: e.kind,
        puzzles: null,
        minutes: minutesBetween(e.startedAt, e.at),
        detail: e.against,
        last: e.at,
      });
    }
  }
  /* A daily set that was handed out but not touched is not activity. */
  const rows = [...[...puzzleRows.values()].filter((r) => (r.puzzles ?? 0) > 0), ...games];
  rows.sort((a, b) => b.day.localeCompare(a.day) || b.last.localeCompare(a.last));
  return rows.map((row) => ({ key: row.key, day: row.day, kind: row.kind, puzzles: row.puzzles, minutes: row.minutes, detail: row.detail }));
}
