"use client";

/* Who has signed up through the public form.
 *
 * This was a queue with approve and reject on the end of it. The academy takes
 * every entry, so there is nothing left to decide here and the list is a
 * record: the same people, in the order they arrived, with what they were
 * quoted.
 *
 * It is not the participants table repeated. That one is every entrant however
 * they got in; this one is the public door specifically, and carries the one
 * fact the table has no column for — whether the email somebody registered
 * with belongs to a student the academy already knows. The public reply
 * deliberately never says so (a discount that appeared only for real students
 * would be a way to test whether a given child is a pupil here), so this is
 * the only place it is visible.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { COLORS, FONT } from "@/lib/theme";
import { fmtTHB } from "@/lib/live";
import { listRegistrations, type QueueEntry } from "@/lib/registration";
import { ErrorNote, errorText } from "../crud";
import { Badge, Card, SectionTitle } from "../ui";

export function RegistrationQueue({ tournamentId }: { tournamentId: string }) {
  const t = useTranslations("registration");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  /* Read once, outside the effect that reports it: a translator is not a
     stable dependency, and a string is. */
  const loadFailed = tCommon("loadFailed");

  const [rows, setRows] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await listRegistrations(tournamentId);
        if (!cancelled) setRows(next);
      } catch (e) {
        /* Not "there is nothing here" — we do not know what is here. Said
           plainly, because the alternative is the card telling the office that
           nobody has registered while entries sit on the other side of a
           failed request. */
        if (!cancelled) setError(errorText(e, loadFailed));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId, loadFailed]);

  /* Withdrawn entries stay on the list rather than vanishing: somebody who
     pulled out is a thing the desk needs to see, not an absence. */
  const signups = rows.filter((r) => r.source === "Public");

  // Nothing has ever come through the form: the card would be an empty box on
  // a screen that already has plenty.
  //
  // `error` is part of the condition because `rows` is also empty when the load
  // failed, and `[].every()` is true — so a failed request used to hide the
  // whole card rather than show an empty one. Staff saw no queue at all.
  if (!loading && !error && rows.every((r) => r.source !== "Public")) return null;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <SectionTitle>{t("signupsTitle")}</SectionTitle>
        {signups.length > 0 && (
          <Badge color={COLORS.navy} bg={COLORS.light}>
            {t("signupCount", { count: signups.length })}
          </Badge>
        )}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {loading ? (
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>{tCommon("loading")}</p>
      ) : error ? (
        /* The note above already says we could not load. Printing "nobody has
           signed up" underneath it would be the card answering a question it
           just admitted it cannot answer. */
        null
      ) : (
        /* No empty branch: the card returns null above when nothing has come
           through the form, so `signups` is non-empty by the time we are here.
           An unreachable "nobody has signed up" would be a sentence waiting
           for a bug to make it true. */
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {signups.map((entry) => (
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
                  {/* Only when it is not the ordinary state. Every live entry
                      reads Approved now, and a badge on all of them would be
                      a column of the same word. */}
                  {entry.status !== "Approved" && (
                    <Badge color={COLORS.textSecondary} bg={COLORS.light}>
                      {tStatus(entry.status)}
                    </Badge>
                  )}
                </div>
                <p style={{ margin: "4px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary, wordBreak: "break-word" }}>
                  {entry.contactEmail}
                  {entry.contactPhone ? ` · ${entry.contactPhone}` : ""}
                  {entry.feeQuoted != null ? ` · ${t("quoted", { fee: fmtTHB(entry.feeQuoted) })}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
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
