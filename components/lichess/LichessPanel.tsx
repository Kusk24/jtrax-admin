"use client";

/* What the academy's students are doing on Lichess at home.
 *
 * The school records every move played *here*; this is the half it is otherwise
 * blind to. Staff and teachers see everyone, a parent sees their children, a
 * student sees themselves — decided on the server, not by this component.
 *
 * The verified/unverified distinction is shown rather than smoothed over. A
 * username a teacher typed in is a claim; one a pupil proved through their
 * Lichess bio is a fact, and a leaderboard that mixed them would be worthless.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  PERF_ORDER, listLichessLinks, ratingOf, syncLichess, unlinkStudentLichess,
  type LichessLink,
} from "@/lib/lichess";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { ErrorNote, errorText } from "../crud";
import { secondaryButtonStyle } from "../page-kit";
import { Badge, Card, SectionTitle } from "../ui";

/**
 * `heading` is off when the panel sits under a page header that already names
 * it — on the chess screen it does, and printing "Lichess at home" twice, once
 * as the h1 and again inside the card, read as two sections that happened to
 * share a name. The row stays: the verified count and Sync belong to the
 * table, not to the page.
 */
export function LichessPanel({ heading = true }: { heading?: boolean }) {
  const t = useTranslations("lichessAdmin");
  const tCommon = useTranslations("common");

  const [links, setLinks] = useState<LichessLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLinks(await listLichessLinks());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await listLichessLinks();
        if (!cancelled) setLinks(next);
      } catch {
        /* The empty state covers it; a cold API is not an error worth showing. */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function sync() {
    setBusy(true);
    setError(null);
    try {
      await syncLichess();
      await reload();
    } catch (e) {
      setError(errorText(e, tCommon("loadFailed")));
    } finally {
      setBusy(false);
    }
  }

  async function unlink(studentId: string) {
    setBusy(true);
    setError(null);
    try {
      await unlinkStudentLichess(studentId);
      await reload();
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  const verified = links.filter((l) => l.verified).length;

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        {heading ? (
          <>
            <Icon name="knight" size={17} color={COLORS.blue} />
            <SectionTitle style={{ flex: 1 }}>{t("title")}</SectionTitle>
          </>
        ) : (
          /* Nothing to say, but the controls still sit at the right-hand end
             of the row rather than bunched against the left edge. */
          <span style={{ flex: 1 }} />
        )}
        {links.length > 0 && (
          <Badge color={COLORS.textSecondary} bg={COLORS.neutralBg}>
            {t("verifiedCount", { verified, total: links.length })}
          </Badge>
        )}
        <button
          type="button"
          className="jt-btn-ghost"
          style={{ ...secondaryButtonStyle, opacity: busy ? 0.75 : 1 }}
          disabled={busy}
          onClick={() => void sync()}
        >
          <Icon name="refund" size={14} /> {busy ? t("syncing") : t("sync")}
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px" }}>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {loading ? (
        <p style={{ padding: 20, margin: 0, textAlign: "center", fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
          {tCommon("loading")}
        </p>
      ) : links.length === 0 ? (
        <div style={{ padding: "22px 20px", textAlign: "center" }}>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text }}>
            {t("emptyTitle")}
          </p>
          <p style={{ margin: "5px 0 0", fontFamily: FONT, fontSize: 13, lineHeight: 1.5, color: COLORS.textSecondary }}>
            {t("emptyBody")}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: 14, minWidth: 640 }}>
            <thead>
              <tr style={{ background: COLORS.bg, color: COLORS.textSecondary, fontSize: 12.5 }}>
                <th style={{ padding: "9px 14px", textAlign: "left", fontWeight: 600 }}>{tCommon("student")}</th>
                <th style={{ padding: "9px 14px", textAlign: "left", fontWeight: 600 }}>{t("account")}</th>
                {PERF_ORDER.map((p) => (
                  <th key={p} style={{ padding: "9px 10px", textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {t(`perf.${p}`)}
                  </th>
                ))}
                <th style={{ padding: "9px 14px" }} />
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.studentId} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "9px 14px", color: COLORS.text }}>{l.studentName || l.studentId}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <a
                      href={l.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: COLORS.blue, textDecoration: "none", fontWeight: 600 }}
                    >
                      {l.username}
                    </a>
                    {/* A typed username is a claim; a proved one is a fact. */}
                    {!l.verified && (
                      <span style={{ marginLeft: 7, fontSize: 11.5, color: COLORS.warning, fontWeight: 600 }}>
                        {t("unverified")}
                      </span>
                    )}
                  </td>
                  {PERF_ORDER.map((perf) => {
                    const r = ratingOf(l, perf);
                    return (
                      <td key={perf} style={{ padding: "9px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                        {r ? (
                          <span style={{ color: COLORS.text, fontWeight: 600 }}>
                            {r.rating}
                            {/* Provisional ratings swing wildly and must not
                                read as an achievement. */}
                            {r.provisional && (
                              <span style={{ marginLeft: 3, fontSize: 10.5, fontWeight: 400, color: COLORS.textSecondary }}>?</span>
                            )}
                          </span>
                        ) : (
                          /* "No rating in this speed" is information, so it is
                             legible. This was COLORS.border — a hairline grey
                             meant for 1px rules, which on white read as an
                             empty cell rather than a dash. */
                          <span style={{ color: COLORS.text }}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: "9px 14px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => void unlink(l.studentId)}
                      disabled={busy}
                      aria-label={t("unlink")}
                      style={{
                        border: "none", background: "transparent",
                        cursor: busy ? "wait" : "pointer", color: COLORS.textSecondary,
                      }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin: 0, padding: "9px 16px", fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>
            {t("footnote")}
          </p>
        </div>
      )}
    </Card>
  );
}
