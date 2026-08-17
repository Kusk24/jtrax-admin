"use client";

/* Where an arbiter runs a tournament: add a round, pair it, type the results in
 * as the boards finish, and watch the table reorder itself.
 *
 * Built for the situation it is actually used in — standing in a noisy hall
 * between rounds, on a phone. So the result control is a row of buttons rather
 * than a dropdown, the standings sit above the boards, and nothing needs a
 * "save" press: a tapped result is sent immediately.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  RESULTS, addRound, formatPoints, getResults, proposePairings, recordResult, savePairings,
  type Pairing, type ResultCode, type Results, type Round,
} from "@/lib/tournament-results";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { ErrorNote, errorText } from "../crud";
import { primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Badge, Card, SectionTitle } from "../ui";

/* Only the results an arbiter types in normally. A bye is set when pairing, and
   "Pending" is what a board starts as — neither belongs on this row. */
const QUICK: ResultCode[] = ["1-0", "1/2-1/2", "0-1"];
const FORFEIT: ResultCode[] = ["+/-", "-/+"];

export function ResultsTab({
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

  const [data, setData] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    try {
      setData(await getResults(tournamentId));
      setError(null);
    } catch (e) {
      setError(errorText(e, tCommon("loadFailed")));
    }
  }, [tournamentId, tCommon]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getResults(tournamentId);
        if (!cancelled) setData(next);
      } catch {
        /* The empty state covers it; a failed first read is usually a cold API. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  async function guard(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  /* Add the round and pair it in one press. An arbiter wants a paired round,
     not an empty one they then have to fill — and the proposal is editable
     afterwards anyway. */
  async function addAndPair() {
    await guard(async () => {
      const round = await addRound(tournamentId);
      const { pairings } = await proposePairings(tournamentId);
      if (pairings.length > 0) {
        await savePairings(
          round.roundId,
          pairings.map((p, i) => ({
            board: i + 1,
            whiteRegistrationId: p.whiteRegistrationId,
            blackRegistrationId: p.blackRegistrationId || undefined,
            result: p.result,
          })),
        );
      }
    });
  }

  const publicUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/t/${tournamentId}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard refused; the link is on screen either way. */
    }
  }

  const rounds = data?.rounds ?? [];
  const standings = data?.standings ?? [];
  const played = standings.some((s) => s.played > 0 || s.points > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <ErrorNote>{error}</ErrorNote>}

      {/* ---- publishing ---- */}
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

        {resultsPublic && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code
              style={{
                flex: 1, minWidth: 0, padding: "8px 11px", borderRadius: 9,
                background: COLORS.neutralBg, fontSize: 12.5, color: COLORS.textSecondary,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {publicUrl}
            </code>
            <button
              type="button"
              onClick={() => void copyLink()}
              aria-label={t("copyLink")}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 34, height: 34, borderRadius: 9, border: `1px solid ${COLORS.border}`,
                background: COLORS.surface, cursor: "pointer", flexShrink: 0,
              }}
            >
              <Icon name={copied ? "check" : "copy"} size={14} color={copied ? COLORS.success : COLORS.textSecondary} />
            </button>
          </div>
        )}

        <button
          type="button"
          className={resultsPublic ? "jt-btn-ghost" : "jt-btn-primary"}
          style={{
            ...(resultsPublic ? secondaryButtonStyle : primaryButtonStyle),
            alignSelf: "flex-start",
            opacity: busy ? 0.6 : 1,
          }}
          disabled={busy}
          onClick={() => void guard(() => onPublishChange(!resultsPublic))}
        >
          {t(resultsPublic ? "unpublish" : "publish")}
        </button>
      </Card>

      {/* ---- standings ---- */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <SectionTitle>{t("standings")}</SectionTitle>
        </div>
        {standings.length === 0 ? (
          <p style={{ padding: 20, margin: 0, textAlign: "center", fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
            {t("noPlayers")}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: 14 }}>
              <thead>
                <tr style={{ background: COLORS.bg, color: COLORS.textSecondary, fontSize: 12.5 }}>
                  {[t("rank"), tCommon("name"), t("points"), t("wdl"), t("buchholz")].map((h, i) => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: i < 2 ? "left" : "right", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr key={s.registrationId} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "9px 14px", fontWeight: 700, color: s.rank === 1 && played ? COLORS.blue : COLORS.text }}>
                      {s.rank}
                    </td>
                    <td style={{ padding: "9px 14px" }}>
                      {s.name}
                      {s.category && (
                        <span style={{ marginLeft: 7, fontSize: 12, color: COLORS.textSecondary }}>{s.category}</span>
                      )}
                    </td>
                    <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700 }}>{formatPoints(s.points)}</td>
                    <td style={{ padding: "9px 14px", textAlign: "right", color: COLORS.textSecondary, whiteSpace: "nowrap" }}>
                      {s.wins}/{s.draws}/{s.losses}
                    </td>
                    <td style={{ padding: "9px 14px", textAlign: "right", color: COLORS.textSecondary }}>
                      {formatPoints(s.buchholz)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---- rounds ---- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <SectionTitle>{t("rounds")}</SectionTitle>
        <button
          type="button"
          className="jt-btn-primary"
          style={{ ...primaryButtonStyle, opacity: busy || standings.length < 2 ? 0.6 : 1 }}
          disabled={busy || standings.length < 2}
          onClick={() => void addAndPair()}
        >
          <Icon name="plus" size={14} /> {t("addRound")}
        </button>
      </div>

      {rounds.length === 0 && (
        <Card>
          <p style={{ margin: 0, textAlign: "center", fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
            {standings.length < 2 ? t("needPlayers") : t("noRounds")}
          </p>
        </Card>
      )}

      {rounds.map((round) => (
        <RoundCard key={round.roundId} round={round} busy={busy} onResult={(id, r) => guard(() => recordResult(id, r))} />
      ))}
    </div>
  );
}

function RoundCard({
  round,
  busy,
  onResult,
}: {
  round: Round;
  busy: boolean;
  onResult: (pairingId: string, result: ResultCode) => Promise<void>;
}) {
  const t = useTranslations("results");
  const [showForfeit, setShowForfeit] = useState(false);

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bg,
        }}
      >
        <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
          {t("round", { n: round.round })}
        </span>
        <Badge
          color={round.status === "Completed" ? COLORS.success : COLORS.blue}
          bg={round.status === "Completed" ? COLORS.successBg : COLORS.light}
        >
          {t(`status.${round.status}`)}
        </Badge>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setShowForfeit((v) => !v)}
          style={{
            border: "none", background: "transparent", cursor: "pointer",
            fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: COLORS.textSecondary,
          }}
        >
          {t(showForfeit ? "hideForfeits" : "showForfeits")}
        </button>
      </div>

      {round.pairings.length === 0 ? (
        <p style={{ padding: 18, margin: 0, textAlign: "center", fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
          {t("noBoards")}
        </p>
      ) : (
        round.pairings.map((p) => (
          <BoardRow key={p.pairingId} pairing={p} busy={busy} showForfeit={showForfeit} onResult={onResult} />
        ))
      )}
    </Card>
  );
}

function BoardRow({
  pairing,
  busy,
  showForfeit,
  onResult,
}: {
  pairing: Pairing;
  busy: boolean;
  showForfeit: boolean;
  onResult: (pairingId: string, result: ResultCode) => Promise<void>;
}) {
  const t = useTranslations("results");
  const isBye = !pairing.blackRegistrationId;

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        padding: "11px 16px", borderTop: `1px solid ${COLORS.border}`,
      }}
    >
      <span style={{ width: 22, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary, flexShrink: 0 }}>
        {pairing.board}
      </span>
      <span style={{ flex: "1 1 200px", minWidth: 0, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>
        {pairing.white}
        {isBye ? (
          <span style={{ color: COLORS.textSecondary }}> — {t("bye")}</span>
        ) : (
          <>
            <span style={{ color: COLORS.textSecondary }}> vs </span>
            {pairing.black}
          </>
        )}
      </span>

      {isBye ? (
        <Badge color={COLORS.textSecondary} bg={COLORS.neutralBg}>{t("byeScored")}</Badge>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[...QUICK, ...(showForfeit ? FORFEIT : [])].map((code) => {
            const active = pairing.result === code;
            return (
              <button
                key={code}
                type="button"
                disabled={busy}
                onClick={() => void onResult(pairing.pairingId, code)}
                aria-pressed={active}
                title={t(`resultName.${code}`)}
                style={{
                  minWidth: 46, padding: "6px 10px", borderRadius: 9,
                  border: `1px solid ${active ? COLORS.blue : COLORS.border}`,
                  background: active ? COLORS.light : COLORS.surface,
                  color: active ? COLORS.blue : COLORS.textSecondary,
                  fontFamily: FONT, fontSize: 13, fontWeight: 700,
                  cursor: busy ? "wait" : "pointer",
                }}
              >
                {code === "1/2-1/2" ? "½–½" : code}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Re-exported so the page can render the tab without importing the constants. */
export { RESULTS };
