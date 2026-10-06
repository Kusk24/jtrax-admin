"use client";

/**
 * A tournament participant's profile — the same drawer from the Participants
 * tab and from the Results tab.
 *
 * It used to be two: the Participants drawer read the registration and showed
 * wins and scores that were always zero, and the Results panel read the
 * chess-results row and looked the name up among every student. Now a
 * participant is their registration, joined to their chess-results row in one
 * place (lib/participant-results.ts), and both tabs open this.
 *
 * Opened from a results row that is nobody's entry — a player from another
 * school — it shows the results alone.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSectionResults } from "@/lib/use-section-results";
import type { Participant } from "@/lib/data";
import { Icon } from "@/lib/icons";
import {
  matchParticipants,
  nameWords,
  participantForRow,
  rowFor,
  unlinkedRows,
} from "@/lib/participant-results";
import { COLORS, FONT } from "@/lib/theme";
import { initialsOf, roundViews } from "@/lib/tournament-rounds";
import { fmtTHB } from "@/lib/live";
import { useData } from "../DataProvider";
import { Drawer, InfoGrid, primaryButtonStyle, SearchInput, secondaryButtonStyle } from "../page-kit";
import { Avatar, Badge, SectionTitle } from "../ui";
import { PlayerResults } from "./PlayerResults";
import { DeleteButton, EditButton } from "../detail";

/** Who to show: an entry, or a results row. */
export type ProfileTarget = { participantId: string } | { sectionId: number; name: string };

/** A chess-results player picked for an entry, or null to match by name again. */
export type ResultsLink = { sectionId: number; name: string } | null;


export function ParticipantProfile({
  tournamentId,
  participants,
  target,
  onLink,
  onClose,
  onEdit,
  onDelete,
}: {
  tournamentId: string;
  participants: Participant[];
  target: ProfileTarget;
  onLink: (participantId: string, link: ResultsLink) => Promise<void>;
  onClose: () => void;
  /** The table's own Edit and Delete, for the entry this profile shows. */
  onEdit?: (p: Participant) => void;
  onDelete?: (p: Participant) => void;
}) {
  const t = useTranslations("participantProfile");
  const tT = useTranslations("tournament");
  const router = useRouter();
  const { students } = useData();
  const { loaded, failed } = useSectionResults(tournamentId);

  const matches = useMemo(() => matchParticipants(participants, loaded?.data ?? []), [participants, loaded]);

  /* The entry and the results row, whichever the profile was opened from. */
  const participant =
    "participantId" in target
      ? participants.find((p) => p.id === target.participantId)
      : participantForRow(matches, participants, target.sectionId, target.name);
  const match = participant?.id
    ? matches.get(participant.id)
    : "sectionId" in target
      ? rowFor(loaded?.data ?? [], target.sectionId, target.name)
      : undefined;
  const standing = match?.standing;
  const manual = participant?.id ? (matches.get(participant.id)?.manual ?? false) : false;

  /* A JCA student by the participant's own student record — the link the
     Participants tab shows — not by the server matching a name. */
  const studentId = participant?.studentId;
  const student = studentId ? students.find((s) => s.id === studentId) : undefined;
  const name = participant?.name ?? standing?.name ?? ("name" in target ? target.name : "");
  const views = match ? roundViews(match.results.rounds ?? [], loaded?.rounds ?? 0) : [];

  const [picking, setPicking] = useState(false);
  const [choice, setChoice] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveLink(link: ResultsLink) {
    if (!participant?.id) return;
    setBusy(true);
    setError(null);
    try {
      await onLink(participant.id, link);
      setPicking(false);
      setChoice("");
      setQuery("");
    } catch {
      setError(t("linkFailed"));
    } finally {
      setBusy(false);
    }
  }

  const subline = [
    standing?.rating || participant?.rating ? t("rating", { rating: standing?.rating || participant?.rating || 0 }) : null,
    standing?.club || null,
    match?.sectionName || participant?.category || null,
  ]
    .filter(Boolean)
    .join(" · ");

  const phone = participant?.contactPhone || (participant?.contact && participant.contact !== "—" ? participant.contact : "");
  const contactRows: Array<{ label: string; value: React.ReactNode }> = [];
  if (student?.parentName) contactRows.push({ label: t("guardian"), value: student.parentName });
  if (student?.parentPhone) contactRows.push({ label: t("guardianPhone"), value: <PhoneLink phone={student.parentPhone} /> });
  if (phone && phone !== student?.parentPhone) contactRows.push({ label: t("phone"), value: <PhoneLink phone={phone} /> });
  if (participant?.contactEmail) contactRows.push({ label: t("email"), value: participant.contactEmail });

  /* Every unclaimed player, flat, for the search below. An event can have a
     few hundred of them, which is why this is a search and not a dropdown. */
  const choices = (loaded ? unlinkedRows(loaded.data, matches) : []).flatMap(({ section, players }) =>
    players.map((p) => ({ key: `${section.chessResultsId}|${p.name}`, name: p.name, club: p.club, section: section.name })),
  );
  const words = query.toLowerCase().replace(/,/g, " ").split(/\s+/).filter(Boolean);
  const found =
    words.length === 0
      ? []
      : choices.filter((c) => {
          const hay = `${c.name} ${c.club ?? ""}`.toLowerCase().replace(/,/g, " ");
          return words.every((w) => hay.includes(w));
        });
  const chosen = choices.find((c) => c.key === choice);
  const picker = participant && loaded?.connected && (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
        {t("pickHint")}
        <SearchInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            setChoice("");
          }}
          placeholder={t("pickSearch")}
          label={t("pickHint")}
        />
      </label>
      {words.length > 0 && !chosen && (
        <div role="listbox" aria-label={t("pickHint")} style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
          {found.length === 0 && <Note>{t("pickNone", { query: query.trim() })}</Note>}
          {found.slice(0, PICK_LIMIT).map((c) => (
            <button
              key={c.key}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => setChoice(c.key)}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1, padding: "8px 11px", borderRadius: 9, border: `1px solid ${COLORS.border}`, background: COLORS.surface, cursor: "pointer", textAlign: "left", fontFamily: FONT }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{c.name}</span>
              <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{[c.section, c.club].filter(Boolean).join(" · ")}</span>
            </button>
          ))}
          {found.length > PICK_LIMIT && <Note>{t("pickMore", { count: found.length - PICK_LIMIT })}</Note>}
        </div>
      )}
      {/* The pick, before it is saved — easy to change by typing again. */}
      {chosen && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 9, border: `2px solid ${COLORS.blue}`, background: COLORS.light, fontFamily: FONT }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: COLORS.text }}>{chosen.name}</span>
            <span style={{ display: "block", fontSize: 12, color: COLORS.textSecondary }}>{[chosen.section, chosen.club].filter(Boolean).join(" · ")}</span>
          </span>
          <button type="button" aria-label={t("pickClear")} onClick={() => setChoice("")} style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
            <Icon name="x" size={15} color={COLORS.textSecondary} />
          </button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="jt-btn-primary"
          style={primaryButtonStyle}
          disabled={busy || !choice}
          onClick={() => {
            const cut = choice.indexOf("|");
            void saveLink({ sectionId: Number(choice.slice(0, cut)), name: choice.slice(cut + 1) });
          }}
        >
          <Icon name="link" size={14} color={COLORS.surface} /> {t("link")}
        </button>
        {match && (
          <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} disabled={busy} onClick={() => setPicking(false)}>
            {t("cancel")}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Drawer title={name} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* ---- who ---- */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar initials={initialsOf(name)} size={52} color={COLORS.surface} bg={COLORS.blue} />
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <strong style={{ fontFamily: FONT, fontSize: 17, color: COLORS.text }}>{name}</strong>
            {subline && <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{subline}</span>}
            {/* The arbiter's spelling, when it is not the entry form's. */}
            {participant && standing && nameWords(standing.name) !== nameWords(participant.name) && (
              <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("onChessResults", { name: standing.name })}</span>
            )}
          </div>
          {/* The same actions as the participant's row in the table. */}
          {participant && (onEdit || onDelete) && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexShrink: 0 }}>
              {onEdit && <EditButton onClick={() => onEdit(participant)} />}
              {onDelete && <DeleteButton onClick={() => onDelete(participant)} />}
            </div>
          )}
        </div>
        {student && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Badge color={COLORS.blue} bg={COLORS.light}>
              {t("jcaStudent")}
            </Badge>
            <button
              type="button"
              className="jt-btn-ghost"
              style={{ ...secondaryButtonStyle, minHeight: 34, padding: "5px 12px", fontSize: 13 }}
              onClick={() => router.push(`/students?id=${encodeURIComponent(student.id)}`)}
            >
              <Icon name="students" size={14} /> {t("openStudent")}
            </button>
          </div>
        )}

        {/* ---- results ---- */}
        {!loaded && !failed && <Note>{t("loadingResults")}</Note>}
        {failed && <Note>{t("resultsFailed")}</Note>}
        {loaded?.connected && (
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionTitle>{t("resultsTitle")}</SectionTitle>
            {match && !picking && (
              <>
                <PlayerResults name={match.standing.name} rounds={views} rank={match.standing.rank || undefined} />
                {participant && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                    <span>{manual ? t("linkedByHand", { name: match.standing.name }) : t("linkedByName", { name: match.standing.name })}</span>
                    <button type="button" className="jt-btn-ghost" style={smallButton} disabled={busy} onClick={() => setPicking(true)}>
                      {t("change")}
                    </button>
                    {manual && (
                      <button type="button" className="jt-btn-ghost" style={smallButton} disabled={busy} onClick={() => void saveLink(null)}>
                        {t("unlink")}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {/* Not found by name: the entry's details stay below, and staff
                say which player on chess-results this is. */}
            {participant && (!match || picking) && (
              <>
                {!match && <Note>{t("notFound")}</Note>}
                {picker}
              </>
            )}
            {error && <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.danger }}>{error}</p>}
          </section>
        )}

        {/* ---- contact ---- */}
        {contactRows.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionTitle>{t("contactTitle")}</SectionTitle>
            <InfoGrid rows={contactRows} />
          </section>
        )}

        {/* ---- the entry ---- */}
        {participant && (
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionTitle>{t("registrationTitle")}</SectionTitle>
            {participant.ageCheck && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  padding: "9px 12px",
                  borderRadius: 10,
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 600,
                  background: participant.ageCheck === "tooOld" ? COLORS.dangerBg : COLORS.warningBg,
                  color: participant.ageCheck === "tooOld" ? COLORS.danger : COLORS.warning,
                }}
              >
                {tT(`ageCheck.${participant.ageCheck}`)}
              </p>
            )}
            <InfoGrid
              rows={[
                /* The fee as plain text: it is set on the entry form. */
                { label: t("entryFee"), value: (participant.feeCharged ?? 0) > 0 ? fmtTHB(participant.feeCharged!) : "—" },
                ...((participant.feeCharged ?? 0) > 0
                  ? [
                      {
                        label: t("payment"),
                        value: (
                          <span style={{ fontWeight: 600, color: participant.paymentStatus === "Paid" ? COLORS.success : participant.paymentStatus === "Cancelled" ? COLORS.danger : COLORS.warning }}>
                            {participant.paymentStatus === "Paid" ? t("paid") : participant.paymentStatus === "Cancelled" ? t("cancelled") : t("unpaid")}
                          </span>
                        ),
                      },
                    ]
                  : []),
                { label: t("registeredCategory"), value: participant.category },
                { label: tT("age"), value: participant.age ? String(participant.age) : "—" },
                { label: tT("dobSubmitted"), value: participant.dateOfBirth || "—" },
                { label: tT("dobScanned"), value: participant.scannedDateOfBirth || "—" },
                { label: tT("nameScanned"), value: participant.scannedName || "—" },
                { label: tT("nameThai"), value: participant.nameTh || "—" },
                { label: tT("documentType"), value: participant.documentType ? tT(`doc.${participant.documentType}`) : "—" },
              ]}
            />
            {participant.earlyBirdLapsed && <Note>{tT("earlyBirdLapsedNote")}</Note>}
            {/* What the family typed on the form: an allergy is for whoever is
                in the room on the day. */}
            {[
              { label: tT("medicalNotes"), value: participant.medicalNotes },
              { label: tT("remarks"), value: participant.notes },
            ]
              .filter((x) => x.value)
              .map((x) => (
                <div
                  key={x.label}
                  style={{ padding: 12, borderRadius: 10, background: COLORS.bg, border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.text, marginBottom: 4 }}>{x.label}</div>
                  {x.value}
                </div>
              ))}
          </section>
        )}
      </div>
    </Drawer>
  );
}

/** Matches listed at once; typing more narrows the rest. */
const PICK_LIMIT = 20;

const smallButton: React.CSSProperties = { ...secondaryButtonStyle, minHeight: 30, padding: "4px 10px", fontSize: 12.5 };

function Note({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, lineHeight: 1.5, color: COLORS.textSecondary }}>{children}</p>;
}

function PhoneLink({ phone }: { phone: string }) {
  return (
    <a href={`tel:${phone}`} style={{ color: COLORS.blue, textDecoration: "none" }}>
      {phone}
    </a>
  );
}
