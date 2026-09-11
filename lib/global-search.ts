/**
 * The header search's matching and ranking.
 *
 * Pure: takes the console's collections and a query, returns grouped hits
 * with the route each one opens. Prefix matches outrank word-start matches,
 * which outrank substring matches — "pen" should surface Penny before
 * "Openings Club". A student's ID matches too, because the ID is the thing
 * a family arrives at the desk with.
 */

export type SearchHit = {
  kind: "student" | "parent" | "class" | "tournament";
  id: string;
  title: string;
  /** The secondary line — a course, a phone number, a date. Already plain data. */
  sub: string;
  href: string;
};

export type SearchPools = {
  students: { id: string; name: string; className?: string }[];
  parents: { id: string; name: string; phone?: string }[];
  classes: { id: string; name: string; category?: string }[];
  tournaments: { id: string; name: string; date?: string }[];
};

/** Lower is better; null means no match. */
export function matchRank(text: string, q: string): number | null {
  const hay = text.toLowerCase();
  const needle = q.toLowerCase();
  if (!needle || !hay.includes(needle)) return null;
  if (hay.startsWith(needle)) return 0;
  if (hay.includes(" " + needle)) return 1;
  return 2;
}

const PER_KIND = 5;

export function globalSearch(q: string, pools: SearchPools): SearchHit[] {
  const query = q.trim();
  if (query.length < 2) return [];

  const take = (hits: { hit: SearchHit; rank: number }[]) =>
    hits
      .sort((a, b) => a.rank - b.rank || a.hit.title.localeCompare(b.hit.title))
      .slice(0, PER_KIND)
      .map((x) => x.hit);

  const students = take(
    pools.students.flatMap((s) => {
      const r = matchRank(s.name, query) ?? matchRank(s.id, query);
      if (r === null) return [];
      return [{
        rank: r,
        hit: {
          kind: "student" as const,
          id: s.id,
          title: s.name,
          sub: s.className ?? "",
          href: `/students?id=${encodeURIComponent(s.id)}`,
        },
      }];
    }),
  );

  const parents = take(
    pools.parents.flatMap((p) => {
      const r = matchRank(p.name, query);
      if (r === null) return [];
      return [{
        rank: r,
        hit: {
          kind: "parent" as const,
          id: p.id,
          title: p.name,
          sub: p.phone ?? "",
          href: `/parents?id=${encodeURIComponent(p.id)}`,
        },
      }];
    }),
  );

  const classes = take(
    pools.classes.flatMap((c) => {
      const r = matchRank(c.name, query);
      if (r === null) return [];
      return [{
        rank: r,
        /* The academy page has no per-class deep link yet, so every class hit
           lands on the list. Still the right screen, one click short. */
        hit: { kind: "class" as const, id: c.id, title: c.name, sub: c.category ?? "", href: "/academy" },
      }];
    }),
  );

  const tournaments = take(
    pools.tournaments.flatMap((t) => {
      const r = matchRank(t.name, query);
      if (r === null) return [];
      return [{
        rank: r,
        hit: {
          kind: "tournament" as const,
          id: t.id,
          title: t.name,
          sub: t.date ?? "",
          href: `/tournament?id=${encodeURIComponent(t.id)}`,
        },
      }];
    }),
  );

  return [...students, ...parents, ...classes, ...tournaments];
}
