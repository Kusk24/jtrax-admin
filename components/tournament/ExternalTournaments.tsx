"use client";

/* Tournaments the academy's students play in that are run by other people,
 * followed from chess-results.com.
 *
 * The framing matters: chess-results is the authority and cannot be written
 * to — this card is the academy's *reading* of it. So every tournament links
 * back to the source, the standings say when they were fetched, and the rows
 * that belong to our students are highlighted rather than filtered: a coach
 * wants to see where their pupils placed *among* the field, not a field of
 * one.
 */
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  getExternal, listExternal, refreshExternal, trackExternal, untrackExternal,
  type ExternalDetail, type ExternalTournament,
} from "@/lib/chess-results";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { ErrorNote, errorText } from "../crud";
import { primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Badge, Card, SectionTitle } from "../ui";

export function ExternalTournaments() {
  const t = useTranslations("external");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [list, setList] = useState<ExternalTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExternalDetail | null>(null);

  const reload = useCallback(async () => {
    setList(await listExternal());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await listExternal();
        if (!cancelled) setList(next);
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

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const d = await getExternal(openId);
        if (!cancelled) setDetail(d);
      } catch (e) {
        if (!cancelled) setError(errorText(e, tCommon("loadFailed")));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openId, tCommon]);

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

  async function track() {
    const pasted = url.trim();
    if (!pasted) return;
    await guard(async () => {
      const created = await trackExternal(pasted);
      setUrl("");
      setOpenId(created.externalTournamentId);
    });
  }

  async function refresh(id: string) {
    await guard(async () => {
      await refreshExternal(id);
      if (openId === id) setDetail(await getExternal(id));
    });
  }

  /* Fractions the way a wallchart writes them: 6½, not 6.5 — and never 6,5,
     whatever the locale, because this is chess notation rather than a number. */
  const points = (p: number) => {
    const whole = Math.floor(p);
    const half = p - whole >= 0.5;
    if (whole === 0) return half ? "½" : "0";
    return half ? `${whole}½` : String(whole);
  };

  const fetchedLabel = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionTitle>{t("title")}</SectionTitle>
      <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, lineHeight: 1.55, color: COLORS.textSecondary }}>
          {t("intro")}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void track()}
            placeholder="https://chess-results.com/tnr…"
            aria-label={t("urlLabel")}
            style={{
              flex: 1, minWidth: 220, padding: "9px 12px", borderRadius: 9,
              border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13.5,
              color: COLORS.text, background: COLORS.surface, outline: "none",
            }}
          />
          <button
            type="button"
            className="jt-btn-primary"
            style={{ ...primaryButtonStyle, opacity: busy || !url.trim() ? 0.75 : 1 }}
            disabled={busy || !url.trim()}
            onClick={() => void track()}
          >
            <Icon name="plus" size={15} color={COLORS.surface} /> {t("track")}
          </button>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        {loading ? (
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
            {tCommon("loading")}
          </p>
        ) : list.length === 0 ? (
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
            {t("empty")}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {list.map((x) => (
              <div key={x.externalTournamentId} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                    padding: "11px 2px", cursor: "pointer",
                  }}
                  onClick={() =>
                    setOpenId(openId === x.externalTournamentId ? null : x.externalTournamentId)
                  }
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text }}>
                      {x.name}
                    </p>
                    <p style={{ margin: "2px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                      {x.stage || t("notStarted")}
                      {x.fetchedAt ? ` · ${t("fetched", { at: fetchedLabel(x.fetchedAt) })}` : ""}
                    </p>
                  </div>
                  {x.academyPlayers > 0 && (
                    <Badge color={COLORS.blue} bg={COLORS.neutralBg}>
                      {t("ours", { count: x.academyPlayers })}
                    </Badge>
                  )}
                  <Badge color={COLORS.textSecondary} bg={COLORS.neutralBg}>
                    {t("players", { count: x.players })}
                  </Badge>
                  <button
                    type="button"
                    className="jt-btn-ghost"
                    style={{ ...secondaryButtonStyle, opacity: busy ? 0.75 : 1 }}
                    disabled={busy}
                    onClick={(e) => { e.stopPropagation(); void refresh(x.externalTournamentId); }}
                  >
                    <Icon name="refund" size={14} /> {t("refresh")}
                  </button>
                  {/* The source is the authority; linking to it is part of
                      reading someone else's tournament politely. */}
                  <a
                    href={x.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ ...secondaryButtonStyle, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Icon name="globe" size={14} /> {t("openSource")}
                  </a>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void guard(() => untrackExternal(x.externalTournamentId)); }}
                    disabled={busy}
                    aria-label={t("untrack")}
                    style={{ border: "none", background: "transparent", cursor: busy ? "wait" : "pointer", color: COLORS.textSecondary }}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>

                {openId === x.externalTournamentId && detail && (
                  <div style={{ overflowX: "auto", paddingBottom: 12 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: 13.5, minWidth: 560 }}>
                      <thead>
                        <tr style={{ background: COLORS.bg, color: COLORS.textSecondary, fontSize: 12.5 }}>
                          <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, width: 44 }}>#</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600 }}>{t("colName")}</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600 }}>{t("colFed")}</th>
                          <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{t("colRating")}</th>
                          <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{t("colPoints")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.standings.map((s, i) => {
                          const ours = !!s.studentId;
                          return (
                            <tr
                              key={i}
                              style={{
                                borderTop: `1px solid ${COLORS.border}`,
                                background: ours ? COLORS.successBg : "transparent",
                              }}
                            >
                              <td style={{ padding: "7px 10px", textAlign: "right", color: COLORS.textSecondary }}>{s.rank}</td>
                              <td style={{ padding: "7px 10px", color: COLORS.text, fontWeight: ours ? 700 : 400 }}>
                                {s.name}
                                {ours && (
                                  <span style={{ marginLeft: 8 }}>
                                    <Badge color={COLORS.success} bg="transparent">
                                      {t("ourStudent", { name: s.studentName ?? "" })}
                                    </Badge>
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "7px 10px", color: COLORS.textSecondary }}>{s.federation || "—"}</td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: COLORS.textSecondary }}>
                                {s.rating ? s.rating : "—"}
                              </td>
                              <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600, color: COLORS.text }}>
                                {points(s.points)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
