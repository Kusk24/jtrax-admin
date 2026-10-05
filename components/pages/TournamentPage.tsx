"use client";

import { arrivalState, reminderDay, reminderDays, type ArrivalState } from "@/lib/arrival";
import { useMemo, useState } from "react";
import { ResultsTab } from "../tournament/ResultsTab";
import { ExternalTournaments } from "../tournament/ExternalTournaments";
import { ParticipantProfile, type ResultsLink } from "../tournament/ParticipantProfile";
import { api } from "@/lib/api";
import { fmtDate, fmtDateTime, fmtTHB, todayISO } from "@/lib/live";
import { ageOn } from "@/lib/age-group";
import { RegistrationCard } from "../tournament/RegistrationCard";
import { RegistrationQueue } from "../tournament/RegistrationQueue";
import { RegulationCard } from "../tournament/RegulationCard";
import { CreateWizard } from "../tournament/CreateWizard";
import { TournamentBanner } from "../tournament/TournamentBanner";
import { BannerCard } from "../tournament/BannerCard";
import { mapEmbedUrl } from "@/lib/maps";
import { useNewParticipants } from "@/lib/seen-participants";
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
  ConfirmModal,
  CrudFormModal,
  ErrorNote,
  RowActions,
  errorText,
  type CrudField,
  type CrudValues,
} from "../crud";
import {
  EmptyRow,
  fieldStyle,
  InfoGrid,
  labelStyle,
  Req,
  ExportButton,
  equalTemplate,
  PageHeader,
  paginate,
  Pagination,
  primaryButtonStyle,
  SearchInput,
  secondaryButtonStyle,
  selectStyle,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, SectionTitle } from "../ui";
import { BackLink, DeleteButton, EditButton } from "../detail";
import { CardGrid, EmptyCards, EntityCard, ViewToggle } from "../view-mode";
import { useViewMode } from "@/lib/view-mode";
import { useErrorToast } from "../ErrorToast";
import { useUrlBackedState } from "@/lib/url-state";
import { ApiError } from "@/lib/api";
import { refreshLinkedResults } from "@/lib/chess-results";

/* Every column the same width, the office's own request — a grid that reads
   as a grid rather than a layout that happens to use one. */
const PARTICIPANT_TEMPLATE = "repeat(9, 1fr)";

/* Answers to the arrival reminder, in the order the desk reads them. */
const ARRIVAL = ["Pending", "Confirmed", "NotAttending"] as const;

/** Where an entrant stands with the confirmation email. */
function ArrivalBadge({ state }: { state: ArrivalState }) {
  const t = useTranslations("tournament");
  const look: Record<ArrivalState, { color: string; bg: string }> = {
    notSent: { color: COLORS.textSecondary, bg: COLORS.neutralBg },
    sent: { color: COLORS.blue, bg: COLORS.light },
    attending: { color: COLORS.success, bg: COLORS.successBg },
    notAttending: { color: COLORS.danger, bg: COLORS.dangerBg },
    noResponse: { color: COLORS.warning, bg: COLORS.warningBg },
  };
  return (
    <span>
      <Badge color={look[state].color} bg={look[state].bg}>{t(`arrivalState.${state}`)}</Badge>
    </span>
  );
}
const TOURNAMENT_TEMPLATE = equalTemplate(5, 100);
const CARD_FIRST = ["card", "list"] as const;
const LIST_FIRST = ["list", "card"] as const;


/* ---------------------------------------------------------------- detail --- */

/** The tournament's own fields, read as edit-form-ready strings straight from
    the raw backend row — never from the formatted `Tournament` object, whose
    numbers and dates are already turned into display text. Shared by the
    Edit button (on this page) and the "Edit" shortcut on the tournament list
    (which lands here already in edit mode). */
function draftFromRow(row: Record<string, unknown> | undefined): Record<string, string> {
  if (!row) return {};
  const read = (k: string) => (row[k] == null ? "" : String(row[k]));
  return {
    name: read("name"),
    /* "auto" unless the office pinned a status by hand. */
    tournament_status: Number(row["status_locked"] ?? 0) === 1 ? read("tournament_status") : "auto",
    organizer_name: read("organizer_name"),
    start_date: read("start_date"),
    end_date: read("end_date"),
    venue_name: read("venue_name"),
    venue_address: read("venue_address"),
    registration_deadline: read("registration_deadline"),
    max_participants: read("max_participants"),
    regular_fee: read("regular_fee"),
    early_bird_fee: read("early_bird_fee"),
    early_bird_deadline: read("early_bird_deadline"),
    student_discount_pct: read("student_discount_pct"),
    arrival_reminder_days: read("arrival_reminder_days"),
  };
}

function TournamentDetail({
  tournament,
  initialTab,
  startInEditing,
  onBack,
  onDelete,
}: {
  /* Which tab the address bar asked for. */
  initialTab?: string;
  tournament: Tournament;
  /* The list's own "Edit" shortcut skips straight past the read-only view —
     it exists to get here, not to look around first. */
  startInEditing?: boolean;
  onBack: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("tournament");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { students, raw, batch, create, update, remove, refresh } = useData();
  const { showError: toastError } = useErrorToast();
  /* Also in the address bar: refreshing while reading Results should not
     silently return to Overview. */
  const [tab, setTab] = useUrlBackedState<"overview" | "participants" | "results">(
    "tab",
    initialTab === "participants" || initialTab === "results" ? initialTab : "overview",
  );
  const [participantModal, setParticipantModal] = useState<"new" | Participant | null>(null);
  const [participantValues, setParticipantValues] = useState<CrudValues>({});
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);

  /* Editing the tournament's own fields, in place — see the Tournament
     Information / Venue & Location / Registration & Pricing / Categories
     cards below. Lazily initialised rather than set in an effect: this
     component is freshly mounted every time the list opens a tournament (Back
     unmounts it), so "populate the draft if we're arriving already in edit
     mode" only ever needs to run once, at that mount. */
  const [editing, setEditing] = useState(() => Boolean(startInEditing));
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    startInEditing
      ? draftFromRow(raw.tournaments.find((r) => String(r["tournament_id"]) === tournament.id))
      : {},
  );
  const [draftCategories, setDraftCategories] = useState<Array<{ id?: string; name: string }>>(() =>
    startInEditing ? (tournament.categoryRows ?? []).map((c) => ({ id: c.id, name: c.name })) : [],
  );
  const [categoryDraft, setCategoryDraft] = useState("");
  /* The age group whose removal is waiting to be agreed to — set only when
     somebody is in it. See removeDraftCategory. */
  const [categoryToRemove, setCategoryToRemove] = useState<{ id?: string; name: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  /* Memoised because the participant field spec depends on it — a fresh []
     every render would rebuild that spec on every keystroke. */
  const categoryRows = useMemo(() => tournament.categoryRows ?? [], [tournament.categoryRows]);

  function startEdit() {
    setDraft(draftFromRow(raw.tournaments.find((r) => String(r["tournament_id"]) === tournament.id)));
    setDraftCategories(categoryRows.map((c) => ({ id: c.id, name: c.name })));
    setCategoryDraft("");
    setEditError(null);
    setEditing(true);
  }

  /* Nothing to unwind: the draft is rebuilt from scratch next time Edit is
     pressed, so leaving edit mode is enough to discard it. */
  function cancelEdit() {
    setEditing(false);
    setEditError(null);
  }

  function addDraftCategory() {
    const name = categoryDraft.trim();
    /* Case-insensitively unique, same rule as the Create wizard: "U8 Boys"
       and "u8 boys" would be two sections on the form and one in everybody's
       head. */
    if (!name || draftCategories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    setDraftCategories([...draftCategories, { name }]);
    setCategoryDraft("");
  }

  /** How many entrants picked this age group. Only a saved category can have
      any — one staged in this edit has no id for an entry to point at. */
  function entrantsIn(target: { id?: string }) {
    return target.id ? tournament.participants.filter((p) => p.categoryId === target.id).length : 0;
  }

  /**
   * Taking an age group off the tournament.
   *
   * Asks first when anybody is in it. The entrants are not deleted — they
   * entered the tournament, not the category, so the backend clears the group
   * off their entry and leaves them in the event — but "your three U19s are
   * now uncategorised" is a consequence somebody should agree to rather than
   * discover, and nothing on the chip says how many that is.
   *
   * An empty group goes without a word. A confirmation nobody could answer
   * wrongly is a click, not a safeguard.
   */
  function removeDraftCategory(target: { id?: string; name: string }) {
    if (entrantsIn(target) > 0) {
      setCategoryToRemove(target);
      return;
    }
    setDraftCategories(draftCategories.filter((c) => c !== target));
  }

  /* Category adds/removes are staged in draftCategories like every other
     field — nothing hits the API until Save, and Cancel discards them for
     free. The diff below is what actually commits them, alongside the
     tournament row, in one batch. */
  async function saveEdit() {
    setSavingEdit(true);
    setEditError(null);
    try {
      await batch(async () => {
        for (const removed of categoryRows.filter((c) => !draftCategories.some((d) => d.id === c.id))) {
          await remove("tournament-categories", removed.id);
        }
        for (const added of draftCategories.filter((d) => !d.id)) {
          await create("tournament-categories", { tournament_id: tournament.id, name: added.name });
        }
        const venueName = (draft.venue_name ?? "").trim();
        await update("tournaments", tournament.id, {
          name: draft.name,
          /* Automatic: the server sets it from the dates on save. */
          ...(draft.tournament_status === "auto" || !draft.tournament_status
            ? { status_locked: false }
            : { status_locked: true, tournament_status: draft.tournament_status }),
          organizer_name: draft.organizer_name || null,
          start_date: draft.start_date || null,
          end_date: draft.end_date || null,
          venue_name: venueName || null,
          venue_address: draft.venue_address || null,
          /* No venue_map_url: the column is on an unmerged backend branch,
             and this backend refuses a field it has no column for. The map
             is drawn from the venue name instead. */
          registration_deadline: draft.registration_deadline || null,
          max_participants: draft.max_participants ? Number(draft.max_participants) : null,
          regular_fee: draft.regular_fee ? Number(draft.regular_fee) : null,
          early_bird_fee: draft.early_bird_fee ? Number(draft.early_bird_fee) : null,
          early_bird_deadline: draft.early_bird_deadline || null,
          student_discount_pct: Math.min(100, Math.max(0, Math.round(Number(draft.student_discount_pct) || 0))),
          arrival_reminder_days: reminderDays(draft.arrival_reminder_days),
        });
      });
      setEditing(false);
    } catch (e) {
      setEditError(errorText(e, tCommon("saveFailed")));
    } finally {
      setSavingEdit(false);
    }
  }

  const participantFields: CrudField[] = useMemo(
    () => [
      /* The same fields as the public registration form, less the ID card:
         at the desk the office looks at the card itself. A player from
         outside JCA is entered the same way, with no student picked. */
      {
        name: "student_id",
        label: t("participantStudent"),
        kind: "select",
        options: students.map((s) => ({ value: s.id, label: s.name })),
        help: t("participantStudentHelp"),
      },
      /* In pairs, as the desk reads an entry: the names, nickname and date of
         birth, age and category; then how to reach the family; then the
         money; then whether they are coming. */
      { name: "participant_name", label: t("nameEnglish"), required: true, half: true },
      { name: "participant_name_th", label: t("nameThai"), half: true },
      { name: "nickname", label: t("nickname"), required: true, half: true },
      { name: "participant_date_of_birth", label: t("dateOfBirth"), kind: "date", required: true, half: true },
      /* Worked out from the date of birth on the tournament's first day. */
      { name: AGE, label: t("age"), kind: "number", half: true, readOnly: true, help: t("ageFromDob") },
      {
        name: "tournament_category_id",
        label: t("category"),
        kind: "select",
        required: true,
        half: true,
        options: categoryRows.map((c) => ({ value: c.id, label: c.name })),
      },
      { name: "contact_email", label: t("parentEmail"), required: true, half: true },
      { name: "contact_phone", label: tCommon("phone"), required: true, half: true },
      { name: "fee_charged", label: t("feeCharged"), kind: "number", min: 0 },
      /* The entry's payment, editable here: how it was paid and its status. */
      ...(participantModal !== "new"
        ? [
            {
              name: PAY_METHOD,
              label: t("paymentMethod"),
              kind: "select" as const,
              half: true,
              options: ALL_METHODS.map((m) => ({ value: m, label: t(`method${m}`) })),
            },
            {
              name: PAY_STATUS,
              label: t("paymentStatus"),
              kind: "select" as const,
              half: true,
              placeholder: t("noPaymentYet"),
              options: PAY_STATUSES.map((st) => ({ value: st, label: tStatus(st) })),
            },
            /* The answer to the arrival reminder — or a phone call the desk took. */
            {
              name: "arrival_status",
              label: t("arrivalStatus"),
              kind: "select" as const,
              options: ARRIVAL.map((a) => ({ value: a, label: t(`arrival${a}`) })),
            },
          ]
        : []),
      /* Paying at sign-up: recorded with the entry, as the desk takes it.
         Only on a new entry — a later payment is taken on the profile. */
      ...(participantModal === "new"
        ? [
            {
              name: PAY_METHOD,
              label: t("paymentMethod"),
              kind: "select" as const,
              half: true,
              placeholder: t("notPaidYet"),
              options: DESK_METHODS.map((m) => ({ value: m, label: t(`method${m}`) })),
            },
            ...(participantValues[PAY_METHOD] && participantValues[PAY_METHOD] !== "Cash"
              ? [{ name: PAY_REFERENCE, label: t("referenceNumber"), half: true, placeholder: t("referencePlaceholder") }]
              : []),
          ]
        : []),
    ],
    [students, categoryRows, t, tCommon, tStatus, participantModal, participantValues],
  );

  /* Sends the confirmation email again to someone who has not answered. */
  async function resendArrival(p: Participant) {
    if (!p.id) return;
    try {
      await api.post(`tournament-registrations/${p.id}/arrival-reminder`, {});
      await refresh();
    } catch (e) {
      toastError(t("resendFailed"), e);
    }
  }

  function openParticipant(p: Participant | "new") {
    setParticipantModal(p);
    setParticipantValues(
      p === "new"
        ? {
            student_id: "", participant_name: "", participant_name_th: "", nickname: "",
            participant_date_of_birth: "", contact_phone: "", contact_email: "",
            tournament_category_id: "", fee_charged: "",
          }
        : {
            student_id: p.studentId ?? "",
            participant_name: p.name,
            participant_name_th: p.nameTh ?? "",
            nickname: p.nickname ?? "",
            participant_date_of_birth: p.dateOfBirth ?? "",
            /* Older desk entries kept the phone in participant_contact. */
            contact_phone: p.contactPhone || (p.contact === "—" ? "" : p.contact),
            contact_email: p.contactEmail ?? "",
            tournament_category_id: p.categoryId ?? "",
            fee_charged: p.feeCharged ? String(p.feeCharged) : "",
            arrival_status: p.arrival ?? "Pending",
            [AGE]: p.dateOfBirth ? String(ageOn(p.dateOfBirth, tournament.startISO || todayISO())) : p.age ? String(p.age) : "",
            [PAY_STATUS]: p.payment?.status ?? "",
            [PAY_METHOD]: p.payment?.method ?? "",
          },
    );
  }

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [mode, setMode] = useViewMode("participants", LIST_FIRST);
  const [drawer, setDrawer] = useState<Participant | null>(null);
  /* Which chess-results player an entry is, when staff picked one because the
     names did not match. Null goes back to matching by name. */
  const linkResults = async (participantId: string, link: ResultsLink) => {
    await update("tournament-registrations", participantId, {
      results_section_id: link?.sectionId ?? null,
      results_player_name: link?.name ?? null,
    });
  };

  const status = statusChipColors(tournament.status);
  /* Entries that arrived since this desk last looked at Participants. */
  const newEntries = useNewParticipants(
    tournament.id,
    tournament.participants.map((p) => p.id ?? "").filter(Boolean),
  );
  const filled = tournament.maxParticipants
    ? Math.round((tournament.currentParticipants / tournament.maxParticipants) * 100)
    : 0;

  const infoFields: Array<{ key: string; labelKey: string; kind?: "text" | "date" | "number" }> = [
    { key: "name", labelKey: "fieldName" },
    { key: "start_date", labelKey: "fieldDate", kind: "date" },
    { key: "end_date", labelKey: "endDate", kind: "date" },
    { key: "max_participants", labelKey: "fieldMaxParticipants", kind: "number" },
    { key: "organizer_name", labelKey: "organizer" },
  ];
  const pricingFields: Array<{ key: string; labelKey: string; kind?: "text" | "date" | "number"; hintKey?: string }> = [
    { key: "registration_deadline", labelKey: "registrationCloses", kind: "date" },
    { key: "regular_fee", labelKey: "entryFee", kind: "number" },
    { key: "student_discount_pct", labelKey: "discountLabel", kind: "number", hintKey: "discountHint" },
    { key: "early_bird_fee", labelKey: "earlyBirdFee", kind: "number" },
    { key: "early_bird_deadline", labelKey: "earlyBirdUntil", kind: "date" },
    { key: "arrival_reminder_days", labelKey: "arrivalReminder", kind: "number", hintKey: "arrivalReminderHint" },
  ];
  const renderDraftField = (f: (typeof infoFields)[number] & { hintKey?: string }) => (
    /* The arrival reminder spans the whole row, as it does on the create form. */
    <div key={f.key} style={f.key === "arrival_reminder_days" ? { gridColumn: "1 / -1" } : undefined}>
      <label style={labelStyle} htmlFor={`td-${f.key}`}>{t(f.labelKey)}{f.key === "name" && <Req />}</label>
      <input
        id={`td-${f.key}`}
        type={f.kind ?? "text"}
        min={f.kind === "number" ? 0 : undefined}
        value={draft[f.key] ?? ""}
        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
        style={fieldStyle}
      />
      {f.hintKey && <p style={{ margin: "4px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t(f.hintKey)}</p>}
    </div>
  );

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

      {/* The banner is the header: the status sits on it, and the tournament's
          own actions — chess-results, Edit, Delete — sit under it. */}
      <BannerCard
        tournament={tournament}
        badge={
          <Badge color={status.color} bg={status.bg}>
            {tStatus(tournament.status)}
          </Badge>
        }
        actions={
          editing ? (
            /* The only actions while editing: nothing else at the top makes
               sense mid-edit, least of all Delete. */
            <>
              <button
                type="button"
                className="jt-btn-ghost"
                style={secondaryButtonStyle}
                disabled={savingEdit}
                onClick={cancelEdit}
              >
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                className="jt-btn-primary"
                style={primaryButtonStyle}
                disabled={savingEdit || !draft.name?.trim()}
                onClick={saveEdit}
              >
                {savingEdit ? tCommon("saving") : tCommon("saveChanges")}
              </button>
            </>
          ) : (
            <>
              <EditButton onClick={startEdit} />
              <DeleteButton onClick={onDelete} />
            </>
          )
        }
      />

      {editError && <ErrorNote>{editError}</ErrorNote>}

      {participantModal && (
        <CrudFormModal
          title={participantModal === "new" ? t("addParticipant") : t("editParticipant")}
          isEdit={participantModal !== "new"}
          fields={participantFields}
          values={participantValues}
          onChange={(next) => {
            /* Picking a JCA student fills what their record already knows.
               Changing to another student replaces what the first one filled
               in; anything typed by hand stays as typed. Clearing the student
               clears what they filled in. */
            if (next.student_id !== participantValues.student_id) {
              const from = studentFill(students.find((s) => s.id === participantValues.student_id));
              const to = studentFill(students.find((s) => s.id === next.student_id));
              const filled = { ...next };
              for (const key of Object.keys(to) as Array<keyof typeof to>) {
                const now = String(next[key] ?? "");
                if (now === "" || now === from[key]) filled[key] = to[key];
              }
              next = filled;
            }
            if (next.participant_date_of_birth !== participantValues.participant_date_of_birth) {
              const dob = String(next.participant_date_of_birth ?? "");
              next = { ...next, [AGE]: dob ? String(ageOn(dob, tournament.startISO || todayISO())) : "" };
            }
            setParticipantValues(next);
          }}
          onClose={() => setParticipantModal(null)}
          onSubmit={async (payload) => {
            if (participantModal === "new") {
              /* The payment fields are not the entry's own columns. */
              const { [PAY_METHOD]: method, [PAY_REFERENCE]: reference, ...entry } = payload;
              if (method && !(Number(entry.fee_charged) > 0)) throw new Error(t("needFeeForPayment"));
              const row = await create("tournament-registrations", {
                ...entry,
                tournament_id: tournament.id,
                registered_at: new Date().toISOString(),
              });
              if (method) {
                /* The entry is saved by now. A failed payment is reported on
                   the page rather than here, so a retry cannot add them twice. */
                try {
                  await api.post(`tournament-registrations/${String(row.tournament_registration_id)}/desk-payment`, {
                    payment_method: method,
                    reference_number: method === "Cash" ? "" : String(reference ?? ""),
                  });
                  await refresh();
                } catch (e) {
                  setEditError(t("paymentNotRecorded", { error: errorText(e, tCommon("saveFailed")) }));
                }
              }
            } else {
              /* The payment fields are the payment's, not the entry's. */
              const { [PAY_STATUS]: payStatus, [PAY_METHOD]: payMethod, ...entry } = payload;
              await update("tournament-registrations", participantModal.id!, entry);
              const pay = participantModal.payment;
              const status = String(payStatus ?? "");
              const method = String(payMethod ?? "");
              if (pay) {
                if ((status && status !== pay.status) || (method && method !== pay.method)) {
                  await update("payments", pay.id, {
                    ...(status && status !== pay.status ? { status } : {}),
                    ...(method && method !== pay.method ? { payment_method: method } : {}),
                  });
                }
              } else if (status === "Paid") {
                /* Nothing recorded yet: marking it paid records the money as
                   the desk takes it, which needs how it was paid. */
                if (!(DESK_METHODS as readonly string[]).includes(method)) throw new Error(t("needDeskMethod"));
                await api.post(`tournament-registrations/${participantModal.id}/desk-payment`, { payment_method: method });
                await refresh();
              }
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

      {/* Straight into the tabs; the registration and regulation cards
          belong to the Overview. */}
      <div style={{ display: "flex", gap: 26, borderBottom: `1px solid ${COLORS.border}` }}>
        {(["overview", "participants", "results"] as const).map((tab_) => (
          <button
            key={tab_}
            type="button"
            onClick={() => {
              /* Opening Participants, or leaving it, counts as having seen
                 everybody in it. */
              if (tab_ === "participants" || tab === "participants") newEntries.markSeen();
              setTab(tab_);
            }}
            style={{
              position: "relative",
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
            {tab_ === "participants" && tab !== "participants" && newEntries.count > 0 && (
              <span
                aria-label={t("newParticipants", { count: newEntries.count })}
                style={{
                  position: "absolute", top: -2, right: -16,
                  minWidth: 19, height: 19, padding: "0 5px", borderRadius: 999,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: COLORS.danger, color: COLORS.surface,
                  fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1,
                  boxShadow: `0 0 0 2px ${COLORS.surface}`,
                }}
              >
                {newEntries.count > 99 ? "99+" : newEntries.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <RegistrationCard
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            open={tournament.publicRegistration}
            onChange={async (patch) => {
              await update("tournaments", tournament.id, patch);
            }}
          />

          <RegulationCard tournamentId={tournament.id} />

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
            <SectionTitle>{t("tournamentInformation")}</SectionTitle>
            {editing ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 13 }}>
                {infoFields.map(renderDraftField)}
                <div>
                  <label style={labelStyle} htmlFor="td-status">{t("statusField")}</label>
                  <select
                    id="td-status"
                    value={draft.tournament_status || "auto"}
                    onChange={(e) => setDraft({ ...draft, tournament_status: e.target.value })}
                    style={selectStyle}
                  >
                    <option value="auto">{t("statusAuto")}</option>
                    <option value="Upcoming">{tStatus("Upcoming")}</option>
                    <option value="Ongoing">{tStatus("Ongoing")}</option>
                    <option value="Completed">{tStatus("Completed")}</option>
                  </select>
                </div>
              </div>
            ) : (
              <InfoGrid
                rows={[
                  { label: t("fieldName"), value: tournament.name },
                  { label: t("fieldDate"), value: tournament.date },
                  { label: t("endDate"), value: tournament.endDate || "—" },
                  { label: t("fieldMaxParticipants"), value: tournament.maxParticipants ? String(tournament.maxParticipants) : "—" },
                  { label: t("organizer"), value: tournament.organizer || "—" },
                  {
                    label: t("confirmationEmail"),
                    value: tournament.arrivalReminderDays
                      ? t("confirmationEmailOn", {
                          days: tournament.arrivalReminderDays,
                          date: fmtDate(reminderDay(tournament.startISO ?? "", tournament.arrivalReminderDays)) || "—",
                        })
                      : t("confirmationEmailOff"),
                  },
                ]}
              />
            )}
            {/* The age groups, as part of what the tournament is. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.textSecondary }}>{t("categoriesTitle")}</span>
              {editing ? (
                <>
                  {draftCategories.length > 0 && (
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {draftCategories.map((c) => (
                        <span
                          key={c.id ?? c.name}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "5px 10px", borderRadius: 999,
                            background: COLORS.light, fontFamily: FONT, fontSize: 13.5,
                            color: COLORS.text,
                          }}
                        >
                          {c.name}
                          {/* How many are in it, so the cost of the × beside it
                              is visible before it is pressed rather than only in
                              the dialog after. */}
                          {entrantsIn(c) > 0 && (
                            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                              {entrantsIn(c)}
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label={tCommon("deleteThing", { what: c.name })}
                            onClick={() => removeDraftCategory(c)}
                            style={{
                              display: "inline-flex", border: "none", background: "transparent",
                              padding: 0, cursor: "pointer", color: COLORS.textSecondary,
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addDraftCategory();
                        }
                      }}
                      placeholder={t("categoryPlaceholder")}
                      aria-label={t("categoryPlaceholder")}
                      style={{ ...fieldStyle, flex: "1 1 180px", width: "auto" }}
                    />
                    <button
                      type="button"
                      className="jt-btn-ghost"
                      style={secondaryButtonStyle}
                      disabled={!categoryDraft.trim()}
                      onClick={addDraftCategory}
                    >
                      <Icon name="plus" size={13} /> {tCommon("add")}
                    </button>
                  </div>
                </>
              ) : categoryRows.length === 0 ? (
                <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
                  {t("noCategories")}
                </p>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {categoryRows.map((c) => (
                    <span
                      key={c.id}
                      style={{
                        display: "inline-flex", alignItems: "center",
                        padding: "6px 12px", borderRadius: 999,
                        border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 13.5,
                        color: COLORS.text,
                      }}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Pricing on the left, where it is, beside the venue on the right;
              one column on a narrow screen. */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 16 }}>
            <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionTitle>{t("registrationPricing")}</SectionTitle>
              {editing ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 13 }}>
                  {pricingFields.map(renderDraftField)}
                </div>
              ) : (
                <InfoGrid
                  rows={[
                    { label: t("registrationCloses"), value: tournament.registrationDeadline || "—" },
                    { label: t("entryFee"), value: tournament.entryFeeMember },
                    { label: t("earlyBirdFee"), value: tournament.earlyBirdFeeMember || "—" },
                    { label: t("earlyBirdUntil"), value: tournament.earlyBirdEnd || "—" },
                    { label: t("discountLabel"), value: String(tournament.studentDiscountPct) },
                  ]}
                />
              )}
            </Card>
            <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionTitle>{t("venueLocation")}</SectionTitle>
              {editing ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 13 }}>
                  <div>
                    <label style={labelStyle} htmlFor="td-venue-name">{t("fieldVenue")}</label>
                    <input
                      id="td-venue-name"
                      style={fieldStyle}
                      value={draft.venue_name ?? ""}
                      onChange={(e) => setDraft({ ...draft, venue_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="td-venue-address">{t("address")}</label>
                    <input
                      id="td-venue-address"
                      style={fieldStyle}
                      value={draft.venue_address ?? ""}
                      onChange={(e) => setDraft({ ...draft, venue_address: e.target.value })}
                    />
                  </div>
                  {(draft.venue_name ?? "").trim() && (
                    <iframe
                      title={t("mapPreviewTitle")}
                      src={mapEmbedUrl(draft.venue_name)}
                      style={{ minHeight: 140, width: "100%", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}
                      loading="lazy"
                    />
                  )}
                </div>
              ) : (
                <>
                  <InfoGrid
                    rows={[
                      { label: t("fieldVenue"), value: tournament.venue || "—" },
                      { label: t("address"), value: tournament.address || "—" },
                    ]}
                  />
                  {/* The map is the link: Google's embed opens the venue in
                      Maps when it is clicked. */}
                  {tournament.venue && (
                    <iframe
                      title={t("mapPreviewTitle")}
                      src={mapEmbedUrl(tournament.venue)}
                      style={{ minHeight: 160, width: "100%", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}
                      loading="lazy"
                    />
                  )}
                </>
              )}
            </Card>
          </div>


        </>
      ) : tab === "participants" ? (
        <>
        {/* Above the roster: the public door specifically, then everyone who
            came through any of them. Nobody waits to be let in any more, so
            this is a record rather than a queue. */}
        <RegistrationQueue tournamentId={tournament.id} />
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
                  return (
                    <EntityCard
                      key={p.name}
                      onClick={() => setDrawer(p)}
                      avatar={<Avatar initials={initialsOf(p.name)} size={44} />}
                      title={p.name}
                      subtitle={`#${p.rank}`}
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
            /* "No.", not "Rank": this is the order entries came in. Placings are
               the Results tab's, from chess-results — the first three sign-ups
               used to be labelled Champion, Runner-up and 2nd Runner-up.
               Age sits beside the category, with a flag when the two do not
               fit, so the desk can check an entry the ID scan may have
               misread. Payment shows who still owes: an unpaid place is
               released when registration closes. */
            columns={[t("entryNo"), t("registered"), t("player"), t("age"), t("category"), t("amount"), t("payment"), t("arrivalStatus"), tCommon("action")]}
            template={PARTICIPANT_TEMPLATE}
            minWidth={1080}
          >
            {pageRows.length === 0 && <EmptyRow>{t("noParticipants")}</EmptyRow>}
            {pageRows.map((p) => {
              return (
                <TableRow key={p.name} template={PARTICIPANT_TEMPLATE} onClick={() => setDrawer(p)}>
                  <span style={{ fontWeight: 700, color: COLORS.textSecondary }}>#{p.rank}</span>
                  <span style={{ color: COLORS.textSecondary }}>{p.registeredAt ? fmtDateTime(p.registeredAt) : "—"}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    <Avatar initials={initialsOf(p.name)} size={28} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </span>
                      {p.nameTh && (
                        <span lang="th" style={{ display: "block", fontSize: 12, color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.nameTh}
                        </span>
                      )}
                    </span>
                  </span>
                  <span style={{ color: COLORS.textSecondary }}>{p.age || "—"}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: COLORS.textSecondary }}>
                    {p.category}
                    {p.ageCheck && (
                      <span title={t(`ageCheck.${p.ageCheck}`)}>
                        <Badge
                          color={p.ageCheck === "tooOld" ? COLORS.danger : COLORS.warning}
                          bg={p.ageCheck === "tooOld" ? COLORS.dangerBg : COLORS.warningBg}
                        >
                          <Icon name="alertTriangle" size={11} /> {t("ageCheckFlag")}
                        </Badge>
                      </span>
                    )}
                  </span>
                  {/* What the entry owes — the figure the Payment badge is about. */}
                  <span style={{ color: (p.feeCharged ?? 0) > 0 ? COLORS.text : COLORS.textSecondary, fontWeight: 600 }}>
                    {(p.feeCharged ?? 0) > 0 ? fmtTHB(p.feeCharged!) : "—"}
                  </span>
                  <span>
                    {(p.feeCharged ?? 0) <= 0 ? (
                      <span style={{ color: COLORS.textSecondary }}>—</span>
                    ) : p.paymentStatus === "Paid" ? (
                      <Badge color={COLORS.success} bg={COLORS.successBg}>{t("paid")}</Badge>
                    ) : (
                      <Badge color={COLORS.warning} bg={COLORS.warningBg}>{t("unpaid")}</Badge>
                    )}
                  </span>
                  <ArrivalBadge state={arrivalState(p.arrival, p.arrivalRemindedAt)} />
                  {p.id ? (
                    <RowActions
                      label={p.name}
                      /* Only while they have not answered, and before the day. */
                      onEmail={
                        (p.arrival ?? "Pending") === "Pending" && !(tournament.startISO && tournament.startISO < todayISO())
                          ? () => resendArrival(p)
                          : undefined
                      }
                      emailLabel={t("resendConfirmation", { name: p.name })}
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
        {(tournament.released?.length ?? 0) > 0 && (
          /* Places the closing-date rule gave back because nobody paid.
             Restoring one puts it back in the roster, unpaid. */
          <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionTitle>{t("releasedTitle")}</SectionTitle>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("releasedHint")}</p>
            {tournament.released!.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderTop: `1px solid ${COLORS.border}` }}>
                <span style={{ flex: "1 1 200px", fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text }}>{r.name}</span>
                <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{r.category}</span>
                <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{t("releasedOn", { date: r.releasedAt })}</span>
                <ActionButton
                  className="jt-btn-ghost"
                  style={{ ...secondaryButtonStyle, padding: "6px 12px" }}
                  onClick={() => update("tournament-registrations", r.id, { status: "Approved" })}
                >
                  {t("restorePlace")}
                </ActionButton>
              </div>
            ))}
          </Card>
        )}
        </>
      ) : (
        <ResultsTab
          tournamentId={tournament.id}
          tournamentName={tournament.name}
          /* Each age group is published as its own chess-results event, so the
             tab strip is one link per group rather than one list divided up. */
          categories={categoryRows}
          /* The declared round count. chess-results publishes no page for a
             round that has not happened, so without this the table ends at
             whatever the arbiter has uploaded and a live event reads as over. */
          totalRounds={tournament.rounds}
          resultsPublic={tournament.published}
          onPublishChange={async (next) => {
            await update("tournaments", tournament.id, { results_public: next });
          }}
          participants={tournament.participants}
          onLinkParticipant={linkResults}
        />
      )}

      {/* The same profile the Results tab opens: one participant, one place. */}
      {drawer?.id && (
        <ParticipantProfile
          tournamentId={tournament.id}
          participants={tournament.participants}
          target={{ participantId: drawer.id }}
          onLink={linkResults}
          onClose={() => setDrawer(null)}
          onEdit={(p) => {
            setDrawer(null);
            openParticipant(p);
          }}
          onDelete={(p) => {
            setDrawer(null);
            setDeletingParticipant(p);
          }}
        />
      )}

      {/* Removing an age group somebody is already in. Staged like the rest of
          the edit — this agrees to the removal, Save is what commits it, and
          Cancel on the edit still discards the whole thing. */}
      {categoryToRemove && (
        /* ConfirmModal rather than ConfirmDeleteModal: that one says "this
           cannot be undone", which is not true here. Nothing is deleted yet —
           this stages the removal, Save commits it, and Cancel on the edit
           throws it away. A warning that overstates itself teaches people to
           click through warnings. */
        <ConfirmModal
          title={t("removeCategoryTitle")}
          prompt={t("removeCategoryPrompt", { name: categoryToRemove.name })}
          confirmLabel={t("removeCategoryConfirm")}
          failedText={tCommon("saveFailed")}
          note={t("removeCategoryNote", { count: entrantsIn(categoryToRemove) })}
          onClose={() => setCategoryToRemove(null)}
          onConfirm={async () => {
            setDraftCategories(draftCategories.filter((c) => c !== categoryToRemove));
            setCategoryToRemove(null);
          }}
        />
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



/** What a student's record fills in on the Add participant form. Student
    records carry no nickname, so their name is the starting point; the email
    is the parent's, as on the public form, not the child's login. */
function studentFill(s: { name: string; dateOfBirth?: string; parentPhone?: string; parentEmail?: string } | undefined) {
  return {
    participant_name: s?.name ?? "",
    nickname: s?.name ?? "",
    participant_date_of_birth: s?.dateOfBirth ?? "",
    contact_phone: s?.parentPhone ?? "",
    contact_email: s?.parentEmail ?? "",
  };
}
/* Paying at sign-up, from the Add participant form. The names are the form's
   own, not columns: they are taken out before the entry is saved. */
const DESK_METHODS = ["Cash", "PromptPay", "BankTransfer"] as const;
/* Every way an entry can have been paid, card included — for editing one. */
const ALL_METHODS = ["Cash", "PromptPay", "BankTransfer", "CreditCard"] as const;
/* Entry fees are non-refundable (the terms), so there is no Refunded here. */
/* Cancelled: not paid by the closing date, so the place was released. */
const PAY_STATUSES = ["Pending", "Paid", "Cancelled"] as const;
const PAY_STATUS = "pay_status";
const AGE = "participant_age_shown";
const PAY_METHOD = "pay_method";
const PAY_REFERENCE = "pay_reference";
export function TournamentPage({
  detailId,
  detailTab,
  startNew,
}: {
  /* Threaded from the route's searchParams so a reload keeps the open row. */
  detailId?: string;
  detailTab?: string;
  /* The dashboard's "Create Tournament" pill, which means the wizard and not
     the list of tournaments that already exist. */
  startNew?: boolean;
}) {
  const t = useTranslations("tournament");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { tournaments, batch, remove } = useData();
  /* In the address bar, so a refresh, a shared link and the Back button all
     land on the tournament that was open rather than the list. */
  const [selectedId, setSelectedId] = useUrlBackedState<string>("id", detailId ?? "", TAB_PARAM, "push");
  const [wizardOpen, setWizardOpen] = useState(Boolean(startNew));
  const [mode, setMode] = useViewMode("tournaments", CARD_FIRST);
  const [search, setSearch] = useState("");
  /* One view at a time. Stacked "Ongoing / Past / External" sections made the
     page a scroll through three unrelated lists; the tabs match the detail
     page's own idiom. */
  const [view, setView] = useState<"active" | "past" | "external">("active");
  const [deleting, setDeleting] = useState<Tournament | null>(null);
  /* The list's own "Edit" shortcut opens the detail page already in edit
     mode, rather than a modal of its own — read once by TournamentDetail at
     mount, so it is set right alongside selectedId and cleared by every
     other way of opening a tournament (a plain row click). */
  const [editFromList, setEditFromList] = useState(false);

  function openEdit(tournament: Tournament) {
    setSelectedId(tournament.id);
    setEditFromList(true);
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

  /* Running now or still to come; Completed is past. */
  const ongoing = filtered.filter((t) => t.status !== "Completed");
  const past = filtered.filter((t) => t.status === "Completed");

  if (wizardOpen) {
    return (
      <CreateWizard
        onCancel={() => setWizardOpen(false)}
        onDone={(id) => {
          setWizardOpen(false);
          setSelectedId(id);
          setEditFromList(false);
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
          startInEditing={editFromList}
          onBack={() => setSelectedId("")}
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
                  <TableRow
                    key={item.id}
                    template={TOURNAMENT_TEMPLATE}
                    onClick={() => { setSelectedId(item.id); setEditFromList(false); }}
                  >
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
                  onClick={() => { setSelectedId(item.id); setEditFromList(false); }}
                >
                  <TournamentBanner
                    name={item.name}
                    when={item.date}
                    venue={item.venue}
                    imageUrl={item.hasBanner ? `/api/tournaments/${item.id}/banner` : undefined}
                    height={124}
                    radius={11}
                  />
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
              columns={[t("fieldName"), t("fieldDate"), t("fieldVenue"), t("participants")]}
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

      {view === "active" && section(t("activeTitle"), ongoing)}
      {view === "past" && section(t("past"), past)}
      {/* Other people's tournaments, read from chess-results.com. */}
      {view === "external" && <ExternalTournaments />}
    </div>
  );
}
