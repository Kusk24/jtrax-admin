"use client";

/* Create Tournament: Details → Review → Publish.
 *
 * Review is the real public registration page, not an imitation of it. When
 * the organiser leaves Details, the tournament is saved as a draft — hidden
 * from every list, closed to registration — and the portal's own page is
 * shown for it in a frame, through a preview link only staff are given (see
 * tournamentdraft.go in jtrax-backend). Going back to edit saves over the same
 * draft, so the frame shows the change the next time it loads.
 *
 * Publish Tournament, at the bottom of Review, is the only thing that makes
 * the event public: the draft becomes a tournament and registration opens,
 * so the link and QR code on the last step work at once.
 *
 * A draft nobody publishes is thrown away — on "Back to Tournaments", and when
 * the wizard is left any other way.
 */
import { reminderDays } from "@/lib/arrival";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Icon } from "@/lib/icons";
import { fmtDate } from "@/lib/live";
import { mapEmbedUrl } from "@/lib/maps";
import { registrationUrl } from "@/lib/registration";
import { COLORS, FONT } from "@/lib/theme";
import { useData } from "../DataProvider";
import { useErrorToast } from "../ErrorToast";
import { ActionButton } from "../crud";
import { fieldStyle, labelStyle, PageHeader, Req, primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Card, SectionTitle } from "../ui";
import { ShareLink } from "./ShareLink";
import { StudentPricingChoice } from "./StudentPricingChoice";
import { TournamentBanner } from "./TournamentBanner";

const STEP_KEYS = ["stepDetails", "stepReview", "stepPublish"];

/** The Details cards Review can send the organiser back to. */
const SECTIONS = [
  { id: "banner", labelKey: "bannerTitle" },
  { id: "info", labelKey: "tournamentInformation" },
  { id: "venue", labelKey: "venueLocation" },
  { id: "pricing", labelKey: "registrationPricing" },
  { id: "categories", labelKey: "categoriesTitle" },
  { id: "regulation", labelKey: "regulationDocument" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const BANNER_TYPES = "image/png,image/jpeg,image/webp";

function iso(v: string): string | null {
  const d = new Date(v);
  return v && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

function money(v: string): number | null {
  const digits = v.replace(/[^0-9.]/g, "");
  return digits ? Number(digits) : null;
}

export function CreateWizard({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  /** Leaves the wizard for the tournament it just published. */
  onDone: (tournamentId: string) => void;
}) {
  const t = useTranslations("tournament");
  const tCommon = useTranslations("common");
  const tReg = useTranslations("registration");
  const { refresh } = useData();
  const { showError } = useErrorToast();
  const [step, setStep] = useState(1);

  const [draft, setDraft] = useState({
    name: "",
    startDate: "",
    endDate: "",
    venue: "",
    maxParticipants: "100",
    regularFee: "",
    earlyBirdFee: "",
    earlyBirdDeadline: "",
    registrationDeadline: "",
    studentDiscountPct: "0",
    arrivalReminderDays: "",
  });
  /* Categories are set here rather than after the event exists, because they
     are how the entry form asks "which section are you in". */
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryDraft, setCategoryDraft] = useState("");
  /* Kept apart from `draft`, which is all text inputs. The defaults are the
     rule every tournament had before the organiser could choose. */
  const [studentPricing, setStudentPricing] = useState({ discount: true, earlyBird: false });

  /* The regulation the organiser sent, and whether that file is the one the
     draft already holds — so going back and forth does not upload it again. */
  const [regulation, setRegulation] = useState<File | null>(null);
  const [regulationSaved, setRegulationSaved] = useState(false);

  /* The custom banner. Optional: without one the pages draw their own from
     the name, date and venue, and that is what the preview here shows. */
  const [banner, setBanner] = useState<File | null>(null);
  const [bannerSaved, setBannerSaved] = useState(false);
  const [bannerOnServer, setBannerOnServer] = useState(false);

  /* The draft on the server, once there is one. */
  const [tournamentId, setTournamentId] = useState("");
  const [savedCategories, setSavedCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [previewToken, setPreviewToken] = useState("");
  /* Bumped on every save, so the frame reloads and shows the edit. */
  const [previewVersion, setPreviewVersion] = useState(0);
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "phone">("desktop");

  /* Read by the unmount cleanup, which must see the latest values. */
  const live = useRef({ id: "", published: false });

  useEffect(() => {
    const state = live.current;
    return () => {
      /* Left without publishing — the sidebar, the browser's back button.
         The draft is nobody's now; throw it away rather than leave a hidden
         tournament behind. */
      if (state.id && !state.published) void api.del(`tournaments/${state.id}/draft`).catch(() => {});
    };
  }, []);

  /* A local address for the picture about to be uploaded, so the banner
     previews before anything is saved. Released when it is replaced. */
  const bannerUrl = useMemo(() => (banner ? URL.createObjectURL(banner) : ""), [banner]);
  useEffect(() => () => {
    if (bannerUrl) URL.revokeObjectURL(bannerUrl);
  }, [bannerUrl]);

  function addCategory() {
    const name = categoryDraft.trim();
    /* Case-insensitively unique: "U8 Boys" and "u8 boys" would be two
       sections on the form and one in everybody's head. */
    if (!name || categories.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    setCategories([...categories, name]);
    setCategoryDraft("");
  }

  function takeRegulation(file: File) {
    setRegulation(file);
    setRegulationSaved(false);
  }

  function takeBanner(file: File) {
    setBanner(file);
    setBannerSaved(false);
  }

  function dropBanner() {
    setBanner(null);
    setBannerSaved(false);
  }

  async function leave() {
    if (tournamentId && !live.current.published) {
      live.current.id = "";
      await api.del(`tournaments/${tournamentId}/draft`).catch(() => {});
    }
    onCancel();
  }

  /** The tournament's own columns, as the form has them now. */
  /* No venue_map_url: that column is on a backend branch that is not merged,
     and this backend refuses a field it has no column for. The Maps link is
     built from the venue name wherever it is shown instead. */
  function body(): Record<string, unknown> {
    const venue = draft.venue.trim();
    return {
      name: draft.name.trim(),
      tournament_status: "Upcoming",
      start_date: iso(draft.startDate),
      end_date: iso(draft.endDate),
      venue_name: venue || null,
      venue_address: venue || null,
      organizer_name: "JCA Chess Academy",
      registration_deadline: iso(draft.registrationDeadline),
      early_bird_fee: money(draft.earlyBirdFee),
      /* Without a deadline the early price can never be charged, so the two
         are written together or not at all. */
      early_bird_deadline: draft.earlyBirdFee ? iso(draft.earlyBirdDeadline) : null,
      regular_fee: money(draft.regularFee),
      max_participants: Number(draft.maxParticipants) || null,
      /* Clamped rather than trusted: a number input accepts -5 and 300
         happily, and the backend refuses anything outside 0–100. */
      student_discount_pct: Math.min(100, Math.max(0, Math.round(Number(draft.studentDiscountPct) || 0))),
      student_gets_discount: studentPricing.discount,
      student_gets_early_bird: studentPricing.earlyBird,
      arrival_reminder_days: reminderDays(draft.arrivalReminderDays),
    };
  }

  /* Saves the form as the draft — the first time as a new, hidden tournament;
     after that over the same one — and moves to Review. */
  async function saveDraft() {
    try {
      let id = tournamentId;
      if (!id) {
        const row = await api.post<Record<string, unknown>>("tournaments", {
          ...body(),
          draft: true,
          public_registration: false,
        });
        id = String(row["tournament_id"]);
        setTournamentId(id);
        live.current.id = id;
      } else {
        await api.patch(`tournaments/${id}`, body());
      }

      let saved = savedCategories;
      for (const c of saved.filter((c) => !categories.includes(c.name))) {
        await api.del(`tournament-categories/${c.id}`);
      }
      saved = saved.filter((c) => categories.includes(c.name));
      for (const name of categories.filter((n) => !saved.some((c) => c.name === n))) {
        const row = await api.post<Record<string, unknown>>("tournament-categories", { tournament_id: id, name });
        saved = [...saved, { id: String(row["tournament_category_id"]), name }];
      }
      setSavedCategories(saved);

      if (regulation && !regulationSaved) {
        const form = new FormData();
        form.append("file", regulation);
        await api.upload(`tournaments/${id}/regulation`, form);
        setRegulationSaved(true);
      }
      if (banner && !bannerSaved) {
        const form = new FormData();
        form.append("file", banner);
        await api.upload(`tournaments/${id}/banner`, form);
        setBannerSaved(true);
        setBannerOnServer(true);
      } else if (!banner && bannerOnServer) {
        await api.del(`tournaments/${id}/banner`);
        setBannerOnServer(false);
      }

      if (!previewToken) {
        const { token } = await api.post<{ token: string }>(`tournaments/${id}/preview`, {});
        setPreviewToken(token);
      }
      setPreviewVersion((v) => v + 1);
      setStep(2);
    } catch (e) {
      showError(t("draftFailed"), e);
    }
  }

  async function publish() {
    try {
      await api.post(`tournaments/${tournamentId}/publish`, {});
      live.current.published = true;
      await refresh();
      setStep(3);
    } catch (e) {
      showError(tCommon("publishFailed"), e);
    }
  }

  /* Review's Edit buttons land on the card they name, once Details has
     rendered again. */
  function edit(section: SectionId) {
    setStep(1);
    setTimeout(() => {
      document.getElementById(`tw-sec-${section}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
  }

  const publicUrl = tournamentId ? registrationUrl(tournamentId) : "";
  const previewUrl = publicUrl && previewToken
    ? `${publicUrl}?preview=${encodeURIComponent(previewToken)}&v=${previewVersion}`
    : "";
  const when = [draft.startDate, draft.endDate]
    .filter(Boolean)
    .map(fmtDate)
    .filter((d, i, all) => all.indexOf(d) === i)
    .join(" – ");

  /* `kind` because a date typed as free text is a date nothing can compare. */
  const fields: Array<{
    key: keyof typeof draft;
    labelKey: string;
    kind?: "text" | "date" | "number";
    hintKey?: string;
  }> = [
    { key: "name", labelKey: "fieldName" },
    { key: "startDate", labelKey: "fieldDate", kind: "date" },
    { key: "endDate", labelKey: "endDate", kind: "date" },
    { key: "venue", labelKey: "fieldVenue" },
    { key: "maxParticipants", labelKey: "fieldMaxParticipants", kind: "number" },
    { key: "registrationDeadline", labelKey: "registrationCloses", kind: "date" },
    { key: "regularFee", labelKey: "entryFee", kind: "number" },
    { key: "studentDiscountPct", labelKey: "discountLabel", kind: "number", hintKey: "discountHint" },
    /* Optional, and paired: a discount with no end date can never be charged. */
    { key: "earlyBirdFee", labelKey: "earlyBirdFee", kind: "number" },
    { key: "earlyBirdDeadline", labelKey: "earlyBirdUntil", kind: "date" },
    { key: "arrivalReminderDays", labelKey: "arrivalReminder", kind: "number", hintKey: "arrivalReminderHint" },
  ];

  const hint = (text: string) => (
    <p style={{ margin: "4px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{text}</p>
  );

  const renderField = (f: (typeof fields)[number]) => (
    <div key={f.key}>
      <label style={labelStyle} htmlFor={`tw-${f.key}`}>{t(f.labelKey)}{f.key === "name" && <Req />}</label>
      <input
        id={`tw-${f.key}`}
        type={f.kind ?? "text"}
        min={f.kind === "number" ? 0 : undefined}
        value={draft[f.key]}
        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
        style={fieldStyle}
      />
      {f.hintKey && hint(t(f.hintKey))}
    </div>
  );

  const section = (id: SectionId, children: React.ReactNode, gap = 14) => (
    <div id={`tw-sec-${id}`} style={{ scrollMarginTop: 16 }}>
      <Card style={{ display: "flex", flexDirection: "column", gap }}>{children}</Card>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1060 }}>
      <button
        type="button"
        onClick={() => void (step === 3 ? onDone(tournamentId) : leave())}
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

      <ol style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: 0, padding: 0, listStyle: "none" }}>
        {STEP_KEYS.map((labelKey, i) => {
          const n = i + 1;
          const done = step > n;
          const current = step === n;
          return (
            <li key={labelKey} aria-current={current ? "step" : undefined} style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              {i < STEP_KEYS.length - 1 && <span style={{ width: 28, height: 1, background: COLORS.border }} />}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <>
          {section("banner", (
            <>
              <div>
                <SectionTitle>{t("bannerTitle")}</SectionTitle>
                {hint(t("bannerHint"))}
              </div>
              <TournamentBanner
                name={draft.name.trim() || t("bannerNamePlaceholder")}
                when={when}
                venue={draft.venue.trim()}
                imageUrl={bannerUrl || undefined}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label className="jt-btn-ghost" style={{ ...secondaryButtonStyle, cursor: "pointer" }}>
                  <Icon name="image" size={14} /> {banner ? t("bannerReplace") : t("bannerUpload")}
                  <input
                    type="file"
                    accept={BANNER_TYPES}
                    aria-label={t("bannerUpload")}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) takeBanner(f);
                    }}
                    style={{ display: "none" }}
                  />
                </label>
                {banner && (
                  <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={dropBanner}>
                    {t("bannerUseDefault")}
                  </button>
                )}
                <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                  {banner ? banner.name : t("bannerSizeHint")}
                </span>
              </div>
            </>
          ))}
          {section("info", (
            <>
              <SectionTitle>{t("tournamentInformation")}</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 13 }}>
                {[fields[0], fields[1], fields[2], fields[4]].map(renderField)}
              </div>
            </>
          ))}
          {section("venue", (
            <>
              <SectionTitle>{t("venueLocation")}</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 13 }}>
                {renderField(fields[3])}
                {draft.venue.trim() ? (
                  <iframe
                    key={draft.venue}
                    title={t("mapPreviewTitle")}
                    src={mapEmbedUrl(draft.venue)}
                    style={{ minHeight: 140, width: "100%", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ minHeight: 78, border: `1px dashed ${COLORS.border}`, borderRadius: 10, background: COLORS.light, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: COLORS.textSecondary, fontFamily: FONT, fontSize: 13 }}>
                    <Icon name="pin" size={16} color={COLORS.blue} />{t("mapHint")}
                  </div>
                )}
              </div>
            </>
          ))}
          {section("pricing", (
            <>
              <SectionTitle>{t("registrationPricing")}</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 13 }}>
                {fields.slice(5).filter((f) => f.key !== "arrivalReminderDays").map(renderField)}
              </div>
              <StudentPricingChoice
                discount={studentPricing.discount}
                earlyBird={studentPricing.earlyBird}
                onChange={setStudentPricing}
              />
            </>
          ))}
          {section("categories", (
            <>
              <SectionTitle>{t("categoriesTitle")}</SectionTitle>
              {categories.length > 0 && (
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {categories.map((name) => (
                    <span
                      key={name}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "5px 10px", borderRadius: 999,
                        background: COLORS.light, fontFamily: FONT, fontSize: 13.5,
                        color: COLORS.text,
                      }}
                    >
                      {name}
                      <button
                        type="button"
                        aria-label={tCommon("deleteThing", { what: name })}
                        onClick={() => setCategories(categories.filter((c) => c !== name))}
                        style={{ display: "inline-flex", border: "none", background: "transparent", padding: 0, cursor: "pointer", color: COLORS.textSecondary }}
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
                  /* Enter adds the category rather than submitting the step. */
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCategory();
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
                  onClick={addCategory}
                >
                  <Icon name="plus" size={13} /> {tCommon("add")}
                </button>
              </div>
            </>
          ), 12)}
          <div id="tw-sec-regulation" style={{ scrollMarginTop: 16 }}>
            <Card style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ display: "flex", width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, background: COLORS.light }}>
                <Icon name="fileText" size={18} color={COLORS.blue} />
              </span>
              <span style={{ flex: 1, minWidth: 200 }}>
                <SectionTitle>{t("regulationDocument")}</SectionTitle>
                <span style={{ display: "block", marginTop: 3, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                  {regulation ? t("regulationAttached", { file: regulation.name }) : t("regulationOptional")}
                </span>
              </span>
              <label className="jt-btn-ghost" style={{ ...secondaryButtonStyle, cursor: "pointer" }}>
                {regulation ? t("replaceFile") : t("chooseFile")}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) takeRegulation(f);
                  }}
                  style={{ display: "none" }}
                />
              </label>
            </Card>
          </div>
          {/* Under the regulation: the last thing to set before review. */}
          <Card>
            {renderField(fields.find((f) => f.key === "arrivalReminderDays")!)}
          </Card>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <ActionButton
              className="jt-btn-primary"
              style={{ ...primaryButtonStyle, opacity: draft.name.trim() ? 1 : 0.75 }}
              disabled={!draft.name.trim()}
              busyLabel={t("preparingReview")}
              onClick={saveDraft}
            >
              {t("continueToReview")} <Icon name="chevronRight" size={14} color={COLORS.surface} />
            </ActionButton>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 320px" }}>
                <SectionTitle>{t("reviewTitle")}</SectionTitle>
                {hint(t("reviewSub"))}
              </div>
              <div role="group" aria-label={t("previewSize")} style={{ display: "inline-flex", border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
                {(["desktop", "phone"] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={previewWidth === w}
                    onClick={() => setPreviewWidth(w)}
                    style={{
                      border: "none", padding: "7px 13px", cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 600,
                      background: previewWidth === w ? COLORS.blue : COLORS.surface,
                      color: previewWidth === w ? COLORS.surface : COLORS.textSecondary,
                    }}
                  >
                    {t(w === "desktop" ? "previewDesktop" : "previewPhone")}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.textSecondary }}>{t("reviewEditLabel")}</span>
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="jt-btn-ghost"
                  onClick={() => edit(s.id)}
                  aria-label={t("reviewEditSection", { section: t(s.labelKey) })}
                  style={{ ...secondaryButtonStyle, padding: "6px 11px", fontSize: 13 }}
                >
                  <Icon name="edit" size={12} /> {t(s.labelKey)}
                </button>
              ))}
            </div>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("reviewFixed")}</p>
          </Card>

          {previewUrl ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <iframe
                key={previewUrl}
                title={t("previewFrameTitle")}
                src={previewUrl}
                style={{
                  width: previewWidth === "phone" ? 390 : "100%",
                  maxWidth: "100%",
                  height: "78vh",
                  minHeight: 520,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 14,
                  background: COLORS.surface,
                  boxShadow: "0 10px 30px rgba(35,53,94,.10)",
                }}
              />
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT, fontSize: 13, color: COLORS.blue }}>
                {t("previewOpenTab")}
              </a>
            </div>
          ) : (
            <Card>
              <p role="alert" style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.warning }}>{t("previewNoPortal")}</p>
            </Card>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setStep(1)}>
              {tCommon("back")}
            </button>
            <ActionButton className="jt-btn-primary" style={primaryButtonStyle} busyLabel={tCommon("saving")} onClick={publish}>
              {t("publishAction")}
            </ActionButton>
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
          <SectionTitle>{t("liveTitle", { name: draft.name.trim() })}</SectionTitle>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>{t("liveSub")}</p>
          {publicUrl ? (
            <div style={{ width: "100%", maxWidth: 560, textAlign: "left" }}>
              <ShareLink
                url={publicUrl}
                qrLabel={tReg("qrLabel", { name: draft.name.trim() })}
                openLabel={tReg("openForm")}
              />
            </div>
          ) : (
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.warning }}>{tReg("portalUnset")}</p>
          )}
          <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => onDone(tournamentId)}>
            {t("viewTournament")}
          </button>
        </Card>
      )}
    </div>
  );
}
