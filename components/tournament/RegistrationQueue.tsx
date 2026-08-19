"use client";

/* People who signed up through the public form and are waiting to be let in.
 *
 * The column that matters is the last one. Someone ticking "I am a JCA student"
 * is quoted the discount on their word alone — the public form deliberately
 * never says whether the academy recognised their email, because a discount
 * that only appeared for real students would be a way to test whether a given
 * child is a pupil here.
 *
 * So the match surfaces here instead, and the desk decides. "Claimed, and we
 * found them" is a click; "claimed, no match" is a conversation, and the fee
 * can be corrected at the moment of approving.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { fmtTHB } from "@/lib/live";
import {
  approveRegistration, listRegistrations, rejectRegistration, type QueueEntry,
} from "@/lib/registration";
import { ErrorNote, errorText } from "../crud";
import { secondaryButtonStyle } from "../page-kit";
import { Badge, Card, SectionTitle } from "../ui";

export function RegistrationQueue({
  tournamentId,
  fullFee,
  onDecided,
}: {
  tournamentId: string;
  /** The undiscounted entry fee, for overriding a claim that did not hold up. */
  fullFee: number;
  /** Approving changes the participant count the rest of the screen shows. */
  onDecided: () => void;
}) {
  const t = useTranslations("registration");
  const tCommon = useTranslations("common");

  const [rows, setRows] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setRows(await listRegistrations(tournamentId));
  }, [tournamentId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await listRegistrations(tournamentId);
        if (!cancelled) setRows(next);
      } catch {
        /* The empty state covers it; a cold API is not an error worth showing. */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  async function decide(entry: QueueEntry, approve: boolean, fee?: number) {
    setBusyId(entry.id);
    setError(null);
    try {
      if (approve) await approveRegistration(entry.id, fee);
      else await rejectRegistration(entry.id);
      await reload();
      onDecided();
    } catch (e) {
      setError(errorText(e, t("decisionFailed")));
    } finally {
      setBusyId(null);
    }
  }

  const pending = rows.filter((r) => r.status === "Pending");
  const decided = rows.filter((r) => r.status !== "Pending" && r.source === "Public");

  // Nothing has ever come through the form: the card would be an empty box on
  // a screen that already has plenty.
  if (!loading && rows.every((r) => r.source !== "Public")) return null;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <SectionTitle>{t("queueTitle")}</SectionTitle>
        {pending.length > 0 && (
          <Badge color={COLORS.warning} bg={COLORS.warningBg}>
            {t("waitingCount", { count: pending.length })}
          </Badge>
        )}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {loading ? (
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>{tCommon("loading")}</p>
      ) : pending.length === 0 ? (
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>{t("queueEmpty")}</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {pending.map((entry) => (
            <li
              key={entry.id}
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
                borderRadius: 11,
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>
                    {entry.participantName}
                  </span>
                  {entry.category && (
                    <Badge color={COLORS.navy} bg={COLORS.light}>{entry.category}</Badge>
                  )}
                  <StudentClaim entry={entry} />
                </div>
                <p style={{ margin: "4px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary, wordBreak: "break-word" }}>
                  {entry.contactEmail}
                  {entry.contactPhone ? ` · ${entry.contactPhone}` : ""}
                  {entry.feeQuoted != null ? ` · ${t("quoted", { fee: fmtTHB(entry.feeQuoted) })}` : ""}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="jt-btn-primary"
                  style={{ ...secondaryButtonStyle, background: COLORS.success, color: "#fff", borderColor: COLORS.success }}
                  disabled={busyId === entry.id}
                  onClick={() => void decide(entry, true)}
                >
                  <Icon name="check" size={14} color="#fff" /> {t("approve")}
                </button>
                {/* Offered only where it is the judgement call: a claimed
                    discount our records cannot corroborate. */}
                {entry.claimedStudent && !entry.matchedStudentId && fullFee > 0 &&
                  entry.feeQuoted != null && entry.feeQuoted < fullFee && (
                  <button
                    type="button"
                    className="jt-btn-ghost"
                    style={secondaryButtonStyle}
                    disabled={busyId === entry.id}
                    onClick={() => void decide(entry, true, fullFee)}
                    title={t("approveFullPriceHint")}
                  >
                    {t("approveFullPrice", { fee: fmtTHB(fullFee) })}
                  </button>
                )}
                <button
                  type="button"
                  className="jt-btn-ghost"
                  style={secondaryButtonStyle}
                  disabled={busyId === entry.id}
                  onClick={() => void decide(entry, false)}
                >
                  <Icon name="x" size={14} /> {t("reject")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
          {t("decidedCount", { count: decided.length })}
        </p>
      )}
    </Card>
  );
}

/* The three states of a discount claim, said in words rather than a colour —
   this is the row's most important fact and colour alone would not carry it. */
function StudentClaim({ entry }: { entry: QueueEntry }) {
  const t = useTranslations("registration");
  if (!entry.claimedStudent) return null;
  if (entry.matchedStudentId) {
    return (
      <Badge color={COLORS.success} bg={COLORS.successBg}>
        {t("studentMatched", { name: entry.matchedStudentName ?? "" })}
      </Badge>
    );
  }
  return (
    <Badge color={COLORS.warning} bg={COLORS.warningBg}>
      {t("studentUnverified")}
    </Badge>
  );
}
