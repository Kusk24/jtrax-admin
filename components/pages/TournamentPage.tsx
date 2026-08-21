"use client";

import { useMemo, useState } from "react";
import { ResultsTab } from "../tournament/ResultsTab";
import { ExternalTournaments } from "../tournament/ExternalTournaments";
import { RegistrationCard } from "../tournament/RegistrationCard";
import { RegistrationQueue } from "../tournament/RegistrationQueue";
import { useTranslations } from "next-intl";
import { removeIfPresent } from "@/lib/credentials";
import { type Participant, type Tournament } from "@/lib/data";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import {
  ActionButton,
  AddButton,
  ConfirmDeleteModal,
  CrudFormModal,
  ErrorNote,
  RowActions,
  errorText,
  type CrudField,
  type CrudValues,
} from "../crud";
import {
  Drawer,
  EmptyRow,
  fieldStyle,
  InfoGrid,
  labelStyle,
  ExportButton,
  equalTemplate,
  PageHeader,
  paginate,
  Pagination,
  primaryButtonStyle,
  SearchInput,
  secondaryButtonStyle,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, SectionTitle } from "../ui";
import { BackLink, DeleteButton, DetailHeader, EditButton } from "../detail";
import { CardGrid, EmptyCards, EntityCard, ViewToggle } from "../view-mode";
import { useViewMode } from "@/lib/view-mode";
import { useErrorToast } from "../ErrorToast";
import { useUrlBackedState } from "@/lib/url-state";
import { ApiError } from "@/lib/api";
import { refreshLinkedResults } from "@/lib/chess-results";

const PARTICIPANT_TEMPLATE = equalTemplate(6, 70);
const TOURNAMENT_TEMPLATE = equalTemplate(5, 100);
const CARD_FIRST = ["card", "list"] as const;
const LIST_FIRST = ["list", "card"] as const;

function rankBadge(rank: number): { color: string; bg: string; labelKey: string } | null {
  if (rank === 1) return { color: "#8A6D00", bg: "#FCEFC2", labelKey: "champion" };
  if (rank === 2) return { color: "#5B6472", bg: "#E6E9EE", labelKey: "runnerUp" };
  if (rank === 3) return { color: "#8A4B26", bg: "#F3DCC6", labelKey: "secondRunnerUp" };
  return null;
}

/** Branded stand-in for the tournament photo (design assets weren't imported). */
function TournamentArt({ name, height = 120 }: { name: string; height?: number }) {
  const hue = Array.from(name).reduce((n, ch) => n + ch.charCodeAt(0), 0) % 360;
  return (
    <div
      aria-hidden
      style={{
        height,
        borderRadius: 11,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, hsl(${hue} 46% 42%), hsl(${(hue + 42) % 360} 52% 58%))`,
        flexShrink: 0,
      }}
    >
      <Icon name="trophy" size={height > 100 ? 34 : 24} color={COLORS.surface} />
    </div>
  );
}

/* ---------------------------------------------------------------- wizard --- */

const WIZARD_STEP_KEYS = ["stepUpload", "stepReview", "stepPublish"];

function CreateWizard({
  onCancel,
  onPublish,
}: {
  onCancel: () => void;
  /* Awaited by Publish, so a second press cannot open a second tournament. */
  onPublish: (t: Tournament) => Promise<void>;
}) {
  const t = useTranslations("tournament");
  const tCommon = useTranslations("common");
  const [step, setStep] = useState(1);
  const [extracting, setExtracting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    date: "",
    venue: "",
    format: "Swiss System",
    timeControl: "",
    chiefArbiter: "",
    maxParticipants: "100",
  });

  /* Fake extraction, matching the mockup's 1.8s simulated parse. */
  function extract(file: File) {
    setFileName(file.name);
    setExtracting(true);
    setTimeout(() => {
      setDraft({
        name: "JCA Youth Monthly Rapid Chess Tournament",
        date: "12–13 Sep 2026",
        venue: "Paradise Park",
        format: "Swiss System",
        timeControl: "25 min + 10 sec",
        chiefArbiter: "Somchai Prasert (FIDE Arbiter)",
        maxParticipants: "120",
      });
      setExtracting(false);
      setStep(2);
    }, 1800);
  }

  const fields: Array<{ key: keyof typeof draft; labelKey: string }> = [
    { key: "name", labelKey: "fieldName" },
    { key: "date", labelKey: "fieldDate" },
    { key: "venue", labelKey: "fieldVenue" },
    { key: "format", labelKey: "fieldFormat" },
    { key: "timeControl", labelKey: "fieldTimeControl" },
    { key: "chiefArbiter", labelKey: "fieldChiefArbiter" },
    { key: "maxParticipants", labelKey: "fieldMaxParticipants" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 780 }}>
      <button
        type="button"
        onClick={onCancel}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: FONT,
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.textSecondary,
          padding: 0,
        }}
      >
        <Icon name="chevronLeft" size={16} color={COLORS.textSecondary} /> {t("backToTournaments")}
      </button>

      <PageHeader title={t("create")} sub={t("wizardSub")} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {WIZARD_STEP_KEYS.map((labelKey, i) => {
          const n = i + 1;
          const done = step > n;
          const current = step === n;
          return (
            <div key={labelKey} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: done || current ? COLORS.blue : COLORS.neutralBg,
                  color: done || current ? COLORS.surface : COLORS.textSecondary,
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {done ? <Icon name="check" size={13} color={COLORS.surface} /> : n}
              </span>
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: current ? 700 : 500,
                  color: current ? COLORS.text : COLORS.textSecondary,
                }}
              >
                {t(labelKey)}
              </span>
              {i < WIZARD_STEP_KEYS.length - 1 && (
                <span style={{ width: 28, height: 1, background: COLORS.border }} />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 13, padding: 34 }}>
          {extracting ? (
            <>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: `3px solid ${COLORS.border}`,
                  borderTopColor: COLORS.blue,
                  animation: "jtrax-spin 0.8s linear infinite",
                }}
              />
              <span style={{ fontFamily: FONT, fontSize: 14.5, color: COLORS.textSecondary }}>
                {t("extracting", { file: fileName })}
              </span>
            </>
          ) : (
            <>
              <Icon name="fileText" size={30} color={COLORS.blue} />
              <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                {t("uploadPrompt")}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("uploadHint")}
              </span>
              <label style={{ ...primaryButtonStyle, cursor: "pointer" }}>
                {t("chooseFile")}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) extract(f);
                  }}
                  style={{ display: "none" }}
                />
              </label>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: FONT, fontSize: 13.5, color: COLORS.blue }}
              >
                {t("skipManual")}
              </button>
            </>
          )}
        </Card>
      )}

      {step === 2 && (
        <>
          <Card style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <SectionTitle>{t("reviewTitle")}</SectionTitle>
            {fields.map((f) => (
              <div key={f.key}>
                <label style={labelStyle} htmlFor={`tw-${f.key}`}>{t(f.labelKey)}</label>
                <input
                  id={`tw-${f.key}`}
                  value={draft[f.key]}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  style={fieldStyle}
                />
              </div>
            ))}
          </Card>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setStep(1)}>
              {tCommon("back")}
            </button>
            <button
              type="button"
              className="jt-btn-primary"
              style={{
                ...primaryButtonStyle,
                opacity: draft.name ? 1 : 0.75,
                cursor: draft.name ? "pointer" : "not-allowed",
              }}
              disabled={!draft.name}
              onClick={() => setStep(3)}
            >
              {t("publishAction")}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15, padding: 30, textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: COLORS.successBg,
            }}
          >
            <Icon name="check" size={25} color={COLORS.success} />
          </span>
          <SectionTitle>{t("liveTitle", { name: draft.name })}</SectionTitle>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
            {t("liveSub")}
          </p>
          {/* No registration link here: the tournament does not have an id
              until it is saved, and a link built before then could only be a
              placeholder. It appears on the tournament's own screen, where it
              is real and scannable. */}
          <ActionButton
            className="jt-btn-primary"
            style={primaryButtonStyle}
            busyLabel={tCommon("saving")}
            onClick={() =>
              onPublish({
                id: `t-${Date.now()}`,
                name: draft.name,
                status: "Ongoing",
                date: draft.date || "TBC",
                venue: draft.venue || "TBC",
                format: draft.format,
                published: true,
                publicRegistration: false,
                studentDiscountPct: 0,
                entryFeeAmount: 0,
                categories: [],
                organizer: "JCA Chess Academy",
                chiefArbiter: draft.chiefArbiter,
                registrationDeadline: "TBC",
                timeControl: draft.timeControl,
                entryFeeMember: "—",
                entryFeeNonMember: "—",
                address: draft.venue,
                contactPerson: "—",
                maxParticipants: Number(draft.maxParticipants) || 100,
                currentParticipants: 0,
                rounds: 0,
                revenue: "0 THB",
                participants: [],
              })
            }
          >
            {t("viewTournament")}
          </ActionButton>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- detail --- */

function TournamentDetail({
  tournament,
  initialTab,
  onBack,
  onEdit,
  onDelete,
}: {
  /* Which tab the address bar asked for. */
  initialTab?: string;
  tournament: Tournament;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("tournament");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const tExternal = useTranslations("external");
  const { students, create, update, remove, refresh } = useData();
  /* Also in the address bar: refreshing while reading Results should not
     silently return to Overview. */
  const [tab, setTab] = useUrlBackedState<"overview" | "participants" | "results">(
    "tab",
    initialTab === "participants" || initialTab === "results" ? initialTab : "overview",
  );
  const [categoryDraft, setCategoryDraft] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);
  const [participantModal, setParticipantModal] = useState<"new" | Participant | null>(null);
  const [participantValues, setParticipantValues] = useState<CrudValues>({});
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string } | null>(null);

  /* Memoised because the participant field spec depends on it — a fresh []
     every render would rebuild that spec on every keystroke. */
  const categoryRows = useMemo(() => tournament.categoryRows ?? [], [tournament.categoryRows]);

  const participantFields: CrudField[] = useMemo(
    () => [
      {
        name: "student_id",
        label: tCommon("student"),
        kind: "select",
        required: true,
        options: students.map((s) => ({ value: s.id, label: s.name })),
        help: t("participantStudentHelp"),
      },
      { name: "participant_name", label: t("player"), required: true, half: true },
      { name: "participant_contact", label: tCommon("phone"), half: true },
      { name: "participant_date_of_birth", label: t("dateOfBirth"), kind: "date", half: true },
      {
        name: "tournament_category_id",
        label: t("category"),
        kind: "select",
        half: true,
        options: categoryRows.map((c) => ({ value: c.id, label: c.name })),
      },
      { name: "fide_rating", label: t("rating"), kind: "number", half: true, min: 0 },
      { name: "fee_charged", label: t("feeCharged"), kind: "number", half: true, min: 0 },
    ],
    [students, categoryRows, t, tCommon],
  );

  function openParticipant(p: Participant | "new") {
    setParticipantModal(p);
    setParticipantValues(
      p === "new"
        ? {
            student_id: "", participant_name: "", participant_contact: "",
            participant_date_of_birth: "", tournament_category_id: "", fide_rating: "", fee_charged: "",
          }
        : {
            student_id: p.studentId ?? "",
            participant_name: p.name,
            participant_contact: p.contact === "—" ? "" : p.contact,
            participant_date_of_birth: p.dateOfBirth ?? "",
            tournament_category_id: p.categoryId ?? "",
            fide_rating: p.rating ? String(p.rating) : "",
            fee_charged: p.feeCharged ? String(p.feeCharged) : "",
          },
    );
  }

  async function guarded(job: () => Promise<unknown>) {
    setRowError(null);
    try {
      await job();
    } catch (e) {
      setRowError(errorText(e, tCommon("saveFailed")));
    }
  }

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [mode, setMode] = useViewMode("participants", LIST_FIRST);
  const [drawer, setDrawer] = useState<Participant | null>(null);

  const status = statusChipColors(tournament.status);
  const filled = tournament.maxParticipants
    ? Math.round((tournament.currentParticipants / tournament.maxParticipants) * 100)
    : 0;

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tournament.participants;
    return tournament.participants.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }, [tournament.participants, search]);

  const { pageRows, totalPages, page: current } = paginate(filteredParticipants, page);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <BackLink label={t("backToTournaments")} onClick={onBack} />

      <DetailHeader
        avatar={
          <div style={{ width: 120 }}>
            <TournamentArt name={tournament.name} height={92} />
          </div>
        }
        title={tournament.name}
        subtitle={`${tournament.date} · ${tournament.venue}`}
        badges={
          <Badge color={status.color} bg={status.bg}>
            {tStatus(tournament.status)}
          </Badge>
        }
        actions={
          <>
            {tournament.chessResultsId ? (
              <>
                <ChessResultsJump id={tournament.chessResultsId} name={tournament.name} />
                <UpdateResultsButton tournamentId={tournament.id} />
              </>
            ) : (
              /* Unlinked: the link form lives on the Results tab, which nobody
                 finds by guessing. This is the signpost — same place the jump
                 buttons appear once it *is* linked. */
              <button
                type="button"
                className="jt-btn-ghost"
                style={secondaryButtonStyle}
                onClick={() => setTab("results")}
              >
                <Icon name="globe" size={14} /> {tExternal("linkAction")}
              </button>
            )}
            <EditButton onClick={onEdit} />
            <DeleteButton onClick={onDelete} />
          </>
        }
      />

      {rowError && <ErrorNote>{rowError}</ErrorNote>}

      {participantModal && (
        <CrudFormModal
          title={participantModal === "new" ? t("addParticipant") : t("editParticipant")}
          fields={participantFields}
          values={participantValues}
          onChange={setParticipantValues}
          onClose={() => setParticipantModal(null)}
          onSubmit={async (payload) => {
            if (participantModal === "new") {
              await create("tournament-registrations", {
                ...payload,
                tournament_id: tournament.id,
                registered_at: new Date().toISOString(),
              });
            } else {
              await update("tournament-registrations", participantModal.id!, payload);
            }
          }}
        />
      )}

      {deletingParticipant && (
        <ConfirmDeleteModal
          what={deletingParticipant.name}
          onClose={() => setDeletingParticipant(null)}
          onConfirm={() => remove("tournament-registrations", deletingParticipant.id!)}
        />
      )}

      {deletingCategory && (
        <ConfirmDeleteModal
          what={deletingCategory.name}
          note={t("categoryDeleteNote")}
          onClose={() => setDeletingCategory(null)}
          onConfirm={() => remove("tournament-categories", deletingCategory.id)}
        />
      )}

      <RegistrationCard
        tournamentId={tournament.id}
        tournamentName={tournament.name}
        open={tournament.publicRegistration}
        fee={tournament.entryFeeAmount}
        discountPct={tournament.studentDiscountPct}
        onChange={async (patch) => {
          await update("tournaments", tournament.id, patch);
        }}
      />

      <div style={{ display: "flex", gap: 18, borderBottom: `1px solid ${COLORS.border}` }}>
        {(["overview", "participants", "results"] as const).map((tab_) => (
          <button
            key={tab_}
            type="button"
            onClick={() => setTab(tab_)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "11px 3px",
              fontFamily: FONT,
              fontSize: 14.5,
              fontWeight: 600,
              color: tab === tab_ ? COLORS.blue : COLORS.textSecondary,
              borderBottom: `2px solid ${tab === tab_ ? COLORS.blue : "transparent"}`,
            }}
          >
            {tab_ === "overview" ? t("tabOverview") : tab_ === "participants" ? t("tabParticipants") : t("tabResults")}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {[
              { label: t("totalRevenue"), value: tournament.revenue, icon: "wallet" as const, color: COLORS.success, bg: COLORS.successBg },
              { label: t("participants"), value: `${tournament.currentParticipants}`, icon: "usersPlus" as const, color: COLORS.blue, bg: COLORS.light },
              { label: t("registrationFilled"), value: `${filled}%`, icon: "layers" as const, color: COLORS.warning, bg: COLORS.warningBg },
            ].map((stat) => (
              <Card key={stat.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: stat.bg,
                    flexShrink: 0,
                  }}
                >
                  <Icon name={stat.icon} size={19} color={stat.color} />
                </span>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{stat.label}</div>
                  <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: COLORS.text }}>{stat.value}</div>
                </div>
              </Card>
            ))}
          </div>

          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionTitle>{t("summary")}</SectionTitle>
            <InfoGrid
              rows={[
                { label: t("organizer"), value: tournament.organizer },
                { label: t("chiefArbiter"), value: tournament.chiefArbiter },
                { label: t("format"), value: tournament.format },
                { label: t("timeControl"), value: tournament.timeControl },
                { label: t("categories"), value: tournament.categories.join(", ") || "—" },
                { label: t("registrationCloses"), value: tournament.registrationDeadline },
                {
                  label: t("entryFee"),
                  value: t("entryFeeValue", {
                    member: tournament.entryFeeMember,
                    nonMember: tournament.entryFeeNonMember,
                  }),
                },
                { label: t("rounds"), value: tournament.rounds || "—" },
                { label: t("address"), value: tournament.address },
              ]}
            />
          </Card>

          <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionTitle>{t("categories")}</SectionTitle>
            {categoryRows.length === 0 ? (
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
                {t("noCategories")}
              </p>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {categoryRows.map((c) => (
                  <span
                    key={c.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "6px 8px 6px 12px",
                      borderRadius: 999,
                      border: `1px solid ${COLORS.border}`,
                      fontFamily: FONT,
                      fontSize: 13.5,
                      color: COLORS.text,
                    }}
                  >
                    {c.name}
                    <button
                      type="button"
                      aria-label={tCommon("deleteThing", { what: c.name })}
                      onClick={() => setDeletingCategory(c)}
                      style={{
                        display: "inline-flex",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        color: COLORS.textSecondary,
                      }}
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={categoryDraft}
                onChange={(e) => setCategoryDraft(e.target.value)}
                placeholder={t("categoryPlaceholder")}
                aria-label={t("categoryPlaceholder")}
                style={{ ...fieldStyle, flex: "1 1 180px", width: "auto" }}
              />
              <ActionButton
                className="jt-btn-ghost"
                style={secondaryButtonStyle}
                disabled={!categoryDraft.trim()}
                onClick={() =>
                  guarded(async () => {
                    await create("tournament-categories", {
                      tournament_id: tournament.id,
                      name: categoryDraft.trim(),
                    });
                    setCategoryDraft("");
                  })
                }
              >
                <Icon name="plus" size={13} /> {tCommon("add")}
              </ActionButton>
            </div>
          </Card>
        </>
      ) : tab === "participants" ? (
        <>
        {/* Above the roster: people waiting to be let in come before the people
            already in. */}
        <RegistrationQueue
          tournamentId={tournament.id}
          fullFee={tournament.entryFeeAmount}
          onDecided={refresh}
        />
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, flexWrap: "wrap" }}>
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(0); }}
              placeholder={t("searchParticipants")}
              label={t("searchParticipants")}
              style={{ maxWidth: 340 }}
            />
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
              <ViewToggle value={mode} onChange={setMode} options={LIST_FIRST} />
              <AddButton label={t("addParticipant")} onClick={() => openParticipant("new")} />
            </span>
          </div>
          {mode === "card" ? (
            <div style={{ padding: "0 14px 14px" }}>
              <CardGrid min={240}>
                {pageRows.length === 0 && <EmptyCards>{t("noParticipants")}</EmptyCards>}
                {pageRows.map((p) => {
                  const badge = rankBadge(p.rank);
                  return (
                    <EntityCard
                      key={p.name}
                      onClick={() => setDrawer(p)}
                      avatar={<Avatar initials={initialsOf(p.name)} size={44} />}
                      title={p.name}
                      subtitle={
                        badge ? (
                          <span style={{ fontWeight: 700, color: badge.color }}>{t(badge.labelKey)}</span>
                        ) : (
                          `#${p.rank}`
                        )
                      }
                      badges={<Badge color={COLORS.blue} bg={COLORS.light}>{p.category}</Badge>}
                      actions={
                        p.id ? (
                          <RowActions
                            label={p.name}
                            onEdit={() => openParticipant(p)}
                            onDelete={() => setDeletingParticipant(p)}
                          />
                        ) : undefined
                      }
                      rows={[
                        { label: t("rating"), value: p.rating },
                        { label: t("score"), value: p.score },
                      ]}
                    />
                  );
                })}
              </CardGrid>
            </div>
          ) : (
          <Table
            /* No payment column — registration fees are tracked on the
               Payment page, not per participant row. */
            columns={[t("rank"), t("player"), t("rating"), t("category"), t("score"), tCommon("action")]}
            template={PARTICIPANT_TEMPLATE}
            minWidth={780}
          >
            {pageRows.length === 0 && <EmptyRow>{t("noParticipants")}</EmptyRow>}
            {pageRows.map((p) => {
              const badge = rankBadge(p.rank);
              return (
                <TableRow key={p.name} template={PARTICIPANT_TEMPLATE} onClick={() => setDrawer(p)}>
                  <span style={{ fontWeight: 700, color: COLORS.textSecondary }}>#{p.rank}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    <Avatar initials={initialsOf(p.name)} size={28} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </span>
                      {badge && (
                        <span style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: badge.color }}>
                          {t(badge.labelKey)}
                        </span>
                      )}
                    </span>
                  </span>
                  <span style={{ color: COLORS.textSecondary }}>{p.rating}</span>
                  <span style={{ color: COLORS.textSecondary }}>{p.category}</span>
                  <span style={{ fontWeight: 600 }}>{p.score}</span>
                  {p.id ? (
                    <RowActions
                      label={p.name}
                      onEdit={() => openParticipant(p)}
                      onDelete={() => setDeletingParticipant(p)}
                    />
                  ) : (
                    <span />
                  )}
                </TableRow>
              );
            })}
          </Table>
          )}
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </Card>
        </>
      ) : (
        <ResultsTab
          tournamentId={tournament.id}
          resultsPublic={tournament.published}
          onPublishChange={async (next) => {
            await update("tournaments", tournament.id, { results_public: next });
          }}
        />
      )}

      {drawer && (
        <Drawer title={drawer.name} onClose={() => setDrawer(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar initials={initialsOf(drawer.name)} size={52} />
              <div>
                <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: COLORS.text }}>{drawer.name}</div>
                <div style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
{t("ratingLine", { age: drawer.age, rating: drawer.rating, category: drawer.category })}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { label: t("wins"), value: drawer.wins, color: COLORS.success },
                { label: t("draws"), value: drawer.draws, color: COLORS.warning },
                { label: t("losses"), value: drawer.losses, color: COLORS.danger },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: "11px 12px",
                    borderRadius: 11,
                    border: `1px solid ${COLORS.border}`,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{s.label}</div>
                </div>
              ))}
            </div>

            <InfoGrid
              rows={[
                { label: t("score"), value: drawer.score },
                { label: t("prize"), value: drawer.prize },
                { label: t("attendance"), value: drawer.attendance },
                { label: t("payment"), value: tStatus(drawer.paymentStatus) },
                { label: t("guardian"), value: drawer.guardian },
                { label: t("contact"), value: drawer.contact },
              ]}
            />

            {drawer.notes && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                  fontFamily: FONT,
                  fontSize: 13.5,
                  color: COLORS.textSecondary,
                }}
              >
                {drawer.notes}
              </div>
            )}
          </div>
        </Drawer>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ page --- */


/** Pulls the mirror up to date on demand. The workflow is: jump to
    chess-results (new tab), upload from Swiss-Manager, come back here, press
    this. The mirror also follows by itself while an event is live — this
    button exists so nobody has to wait the interval out. */
function UpdateResultsButton({ tournamentId, compact }: { tournamentId: string; compact?: boolean }) {
  const t = useTranslations("external");
  const { showError } = useErrorToast();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  return (
    <button
      type="button"
      className="jt-btn-ghost"
      disabled={state === "busy"}
      onClick={(e) => {
        e.stopPropagation();
        setState("busy");
        refreshLinkedResults(tournamentId)
          .then(() => {
            setState("done");
            setTimeout(() => setState("idle"), 2500);
          })
          .catch((err) => {
            setState("idle");
            const throttled = err instanceof ApiError && err.status === 429;
            showError(t(throttled ? "refreshSoon" : "refreshFailed"), err);
          });
      }}
      style={{
        ...secondaryButtonStyle,
        ...(compact ? { padding: "6px 10px", fontSize: 12.5 } : {}),
        opacity: state === "busy" ? 0.75 : 1,
      }}
    >
      <Icon name="refund" size={13} />{" "}
      {state === "done" ? t("updated") : state === "busy" ? t("updating") : t("updateResults")}
    </button>
  );
}

/** The jump to where results are actually updated. Swiss-Manager uploads to
    chess-results.com; staff go there, upload, and the mirror follows. */
function ChessResultsJump({ id, name, compact }: { id: number; name: string; compact?: boolean }) {
  const t = useTranslations("external");
  return (
    <a
      href={`https://chess-results.com/tnr${id}.aspx?lan=1`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("openFor", { name })}
      onClick={(e) => e.stopPropagation()}
      className="jt-btn-ghost"
      style={{
        ...secondaryButtonStyle,
        ...(compact ? { padding: "6px 10px", fontSize: 12.5 } : {}),
        textDecoration: "none",
      }}
    >
      <Icon name="globe" size={13} /> {compact ? t("shortName") : t("openSource")}
    </a>
  );
}

/* Stable identity: a fresh array each render would re-make the setter. */
const TAB_PARAM = ["tab"];

const TOURNAMENT_STATUSES = ["Upcoming", "Ongoing", "Completed"];

export function TournamentPage({
  detailId,
  detailTab,
}: {
  /* Threaded from the route's searchParams so a reload keeps the open row. */
  detailId?: string;
  detailTab?: string;
}) {
  const t = useTranslations("tournament");
  const tCommon = useTranslations("common");
  const { showError } = useErrorToast();
  const tStatus = useTranslations("status");
  const { tournaments, raw, batch, create, update, remove } = useData();
  /* In the address bar, so a refresh, a shared link and the Back button all
     land on the tournament that was open rather than the list. */
  const [selectedId, setSelectedId] = useUrlBackedState<string>("id", detailId ?? "", TAB_PARAM, "push");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [mode, setMode] = useViewMode("tournaments", CARD_FIRST);
  const [search, setSearch] = useState("");
  /* One view at a time. Stacked "Ongoing / Past / External" sections made the
     page a scroll through three unrelated lists; the tabs match the detail
     page's own idiom. */
  const [view, setView] = useState<"active" | "past" | "external">("active");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<CrudValues>({});
  const [deleting, setDeleting] = useState<Tournament | null>(null);

  const editFields: CrudField[] = useMemo(
    () => [
      { name: "name", label: t("fieldName"), required: true },
      {
        name: "tournament_status",
        label: tCommon("status"),
        kind: "select",
        half: true,
        options: TOURNAMENT_STATUSES.map((s) => ({ value: s, label: tStatus(s) })),
      },
      { name: "organizer_name", label: t("organizer"), half: true },
      { name: "start_date", label: t("fieldDate"), kind: "date", half: true },
      { name: "end_date", label: t("endDate"), kind: "date", half: true },
      { name: "venue_name", label: t("fieldVenue"), half: true },
      { name: "venue_address", label: t("address"), half: true },
      { name: "registration_deadline", label: t("registrationCloses"), kind: "date", half: true },
      { name: "max_participants", label: t("fieldMaxParticipants"), kind: "number", half: true, min: 0 },
      { name: "early_bird_fee", label: t("earlyBirdFee"), kind: "number", half: true, min: 0 },
      { name: "regular_fee", label: t("regularFee"), kind: "number", half: true, min: 0 },
    ],
    [t, tCommon, tStatus],
  );

  function openEdit(tournament: Tournament) {
    const row = raw.tournaments.find((r) => String(r["tournament_id"]) === tournament.id);
    if (!row) return;
    const read = (k: string) => (row[k] == null ? "" : String(row[k]));
    setValues({
      name: read("name"),
      tournament_status: read("tournament_status"),
      organizer_name: read("organizer_name"),
      start_date: read("start_date"),
      end_date: read("end_date"),
      venue_name: read("venue_name"),
      venue_address: read("venue_address"),
      registration_deadline: read("registration_deadline"),
      max_participants: read("max_participants"),
      early_bird_fee: read("early_bird_fee"),
      regular_fee: read("regular_fee"),
    });
    setEditingId(tournament.id);
  }

  /* Registrations and categories point at the tournament, so they go first —
     the backend answers a referenced row with a 409 rather than cascading. */
  async function deleteTournament(tournament: Tournament) {
    await batch(async () => {
      for (const p of tournament.participants) {
        if (p.id) await removeIfPresent(remove, "tournament-registrations", p.id);
      }
      for (const c of tournament.categoryRows ?? []) {
        await removeIfPresent(remove, "tournament-categories", c.id);
      }
      await remove("tournaments", tournament.id);
    });
    setSelectedId("");
  }

  const dialogs = (
    <>
      {editingId && (
        <CrudFormModal
          title={t("editTitle")}
          fields={editFields}
          values={values}
          onChange={setValues}
          onClose={() => setEditingId(null)}
          onSubmit={(payload) => update("tournaments", editingId, payload).then(() => undefined)}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          what={deleting.name}
          note={t("deleteNote")}
          onClose={() => setDeleting(null)}
          onConfirm={() => deleteTournament(deleting)}
        />
      )}
    </>
  );

  const selected = tournaments.find((t) => t.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter((t) => t.name.toLowerCase().includes(q) || t.venue.toLowerCase().includes(q));
  }, [tournaments, search]);

  const ongoing = filtered.filter((t) => t.status === "Ongoing");
  const past = filtered.filter((t) => t.status !== "Ongoing");

  if (wizardOpen) {
    return (
      <CreateWizard
        onCancel={() => setWizardOpen(false)}
        onPublish={async (t) => {
          const iso = (v: string) => {
            const d = new Date(v);
            return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
          };
          const money = (v: string | undefined) => {
            const digits = (v ?? "").replace(/[^0-9.]/g, "");
            return digits ? Number(digits) : null;
          };
          try {
            const created = await create("tournaments", {
              name: t.name,
              tournament_status: "Upcoming",
              start_date: iso(t.date),
              venue_name: t.venue,
              venue_address: t.address,
              organizer_name: t.organizer,
              registration_deadline: iso(t.registrationDeadline),
              early_bird_fee: money(t.earlyBirdFeeMember),
              regular_fee: money(t.entryFeeMember),
              max_participants: t.maxParticipants || null,
            });
            for (const name of t.categories) {
              await create("tournament-categories", { tournament_id: created.tournament_id, name });
            }
            setSelectedId(String(created.tournament_id));
          } catch (e) {
            showError(tCommon("publishFailed"), e);
          }
          setWizardOpen(false);
        }}
      />
    );
  }

  if (selected) {
    return (
      <>
        <TournamentDetail
          tournament={selected}
          initialTab={detailTab}
          onBack={() => setSelectedId("")}
          onEdit={() => openEdit(selected)}
          onDelete={() => setDeleting(selected)}
        />
        {dialogs}
      </>
    );
  }

  function section(title: string, list: Tournament[]) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionTitle>{title}</SectionTitle>
        {list.length === 0 ? (
          <Card>
            <EmptyRow>{t("empty")}</EmptyRow>
          </Card>
        ) : mode === "list" ? (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <Table
              columns={[t("fieldName"), t("fieldDate"), t("fieldVenue"), t("participants"), tCommon("action")]}
              template={TOURNAMENT_TEMPLATE}
              minWidth={820}
            >
              {list.map((item) => {
                const status = statusChipColors(item.status);
                return (
                  <TableRow key={item.id} template={TOURNAMENT_TEMPLATE} onClick={() => setSelectedId(item.id)}>
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.name}
                      </span>
                      <Badge color={status.color} bg={status.bg}>
                        {tStatus(item.status)}
                      </Badge>
                    </span>
                    <span style={{ color: COLORS.textSecondary }}>{item.date}</span>
                    <span
                      style={{
                        color: COLORS.textSecondary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.venue}
                    </span>
                    <span style={{ color: COLORS.textSecondary }}>
                      {t("participantCount", { count: item.currentParticipants })}
                    </span>
                    <span style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      {item.chessResultsId ? (
                        <>
                          <ChessResultsJump id={item.chessResultsId} name={item.name} compact />
                          <UpdateResultsButton tournamentId={item.id} compact />
                        </>
                      ) : null}
                      <RowActions label={item.name} onEdit={() => openEdit(item)} onDelete={() => setDeleting(item)} />
                    </span>
                  </TableRow>
                );
              })}
            </Table>
          </Card>
        ) : (
          <CardGrid min={260}>
            {list.map((item) => {
              const status = statusChipColors(item.status);
              return (
                <Card
                  key={item.id}
                  className="jt-course-card"
                  style={{ display: "flex", flexDirection: "column", gap: 11, cursor: "pointer" }}
                  onClick={() => setSelectedId(item.id)}
                >
                  <TournamentArt name={item.name} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 9 }}>
                    <span style={{ fontFamily: FONT, fontSize: 15.5, fontWeight: 700, color: COLORS.text }}>
                      {item.name}
                    </span>
                    <Badge color={status.color} bg={status.bg}>
                      {tStatus(item.status)}
                    </Badge>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                    <div>{item.date}</div>
                    <div>{item.venue}</div>
                    <div>{t("participantCount", { count: item.currentParticipants })}</div>
                  </div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                    {item.chessResultsId ? (
                      <>
                        <ChessResultsJump id={item.chessResultsId} name={item.name} compact />
                        <UpdateResultsButton tournamentId={item.id} compact />
                      </>
                    ) : null}
                    <RowActions
                      label={item.name}
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleting(item)}
                    />
                  </div>
                </Card>
              );
            })}
          </CardGrid>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {dialogs}
      <PageHeader
        title={t("title")}
        sub={t("sub")}
        action={
          <>
            <ViewToggle value={mode} onChange={setMode} options={CARD_FIRST} />
            <ExportButton
              filename="tournaments"
              columns={[t("fieldName"), t("fieldDate"), t("format"), t("participants")]}
              rows={() => filtered.map((x) => [x.name, x.date, x.venue, x.currentParticipants])}
            />
            <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => setWizardOpen(true)}>
              <Icon name="plus" size={15} color={COLORS.surface} /> {t("create")}
            </button>
          </>
        }
      />

      <div style={{ display: "flex", gap: 18, borderBottom: `1px solid ${COLORS.border}` }}>
        {(
          [
            ["active", t("viewActive", { count: ongoing.length })],
            ["past", t("viewPast", { count: past.length })],
            ["external", t("viewExternal")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "11px 3px",
              fontFamily: FONT,
              fontSize: 14.5,
              fontWeight: 600,
              color: view === key ? COLORS.blue : COLORS.textSecondary,
              borderBottom: `2px solid ${view === key ? COLORS.blue : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view !== "external" && (
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
          label={t("searchLabel")}
          style={{ maxWidth: 340 }}
        />
      )}

      {view === "active" && section(t("ongoing"), ongoing)}
      {view === "past" && section(t("past"), past)}
      {/* Other people's tournaments, read from chess-results.com. */}
      {view === "external" && <ExternalTournaments />}
    </div>
  );
}
