"use client";

/* Every results category of a tournament, with what was read from each — the
   one load both the participant profile and the Results tab's JCA marking
   match participants against, so the two cannot disagree. */
import { useEffect, useState } from "react";
import { getResultSection, getResultSections } from "./chess-results";
import type { SectionResults } from "./participant-results";

export type Loaded = { connected: boolean; rounds: number; data: SectionResults[] };

export function useSectionResults(tournamentId: string) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getResultSections(tournamentId);
      if (!s.connected) return { connected: false, rounds: 0, data: [] };
      const read = await Promise.all(s.sections.map((section) => getResultSection(tournamentId, section.chessResultsId)));
      const data = s.sections.flatMap((section, i) => (read[i] ? [{ section, results: read[i]! }] : []));
      return { connected: true, rounds: s.rounds ?? 0, data };
    })()
      .then((l) => !cancelled && setLoaded(l))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);
  return { loaded, failed };
}
