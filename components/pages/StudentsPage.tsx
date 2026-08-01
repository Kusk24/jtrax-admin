"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { STUDENTS_SEED, type Student } from "@/lib/data";
import { buildAttendanceRows, buildPracticeStrip, buildStudentPayments } from "@/lib/derive";
import { Icon } from "@/lib/icons";
import { classDotColor, COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import {
  EmptyRow,
  fieldStyle,
  FilterBar,
  InfoGrid,
  labelStyle,
  PageHeader,
  paginate,
  Pagination,
  primaryButtonStyle,
  SearchInput,
  secondaryButtonStyle,
  SelectFilter,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";

const TEMPLATE = "minmax(160px, 1.6fr) minmax(130px, 1.2fr) 90px 110px 120px";
const CLASS_OPTIONS = ["Group Class", "Private Class", "Master Class", "Weekend Class"];
const STATUS_VALUES = ["Normal", "Low Credit", "Expiring", "Expired", "Inactive"] as const;

type View = { kind: "list" } | { kind: "detail"; id: string } | { kind: "wizard" };

/* ---------------------------------------------------------------- detail --- */

const DETAIL_TABS = ["Overview", "Attendance", "Practice", "Payments"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

function StudentDetail({ student, onBack }: { student: Student; onBack: () => void }) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const [tab, setTab] = useState<DetailTab>("Overview");
  const seedIdx = STUDENTS_SEED.findIndex((s) => s.id === student.id);
  const attendance = useMemo(() => buildAttendanceRows(seedIdx, student.className), [seedIdx, student.className]);
  const practice = useMemo(() => buildPracticeStrip(seedIdx), [seedIdx]);
  const payments = useMemo(
    () => buildStudentPayments(seedIdx, student.name, student.className),
    [seedIdx, student.name, student.className],
  );

  const chip = statusChipColors(student.status);
  const presentCount = attendance.filter((a) => a.status === "Present").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.textSecondary,
          padding: 0,
        }}
      >
        <Icon name="chevronLeft" size={16} color={COLORS.textSecondary} /> {t("backToStudents")}
      </button>

      <Card style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Avatar initials={initialsOf(student.name)} size={54} />
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: COLORS.text }}>
            {student.name}
          </div>
          <div style={{ marginTop: 3, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
{t("yrs", { age: student.age })} · {student.level} · {student.id}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Badge color={chip.color} bg={chip.bg}>
            {tStatus(student.status)}
          </Badge>
          <Badge color={COLORS.blue} bg={COLORS.light}>
            {student.credit} {tCommon("credits")}
          </Badge>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 18, borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap" }}>
        {DETAIL_TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "10px 2px",
              fontFamily: FONT,
              fontSize: 13.5,
              fontWeight: 600,
              color: tab === name ? COLORS.blue : COLORS.textSecondary,
              borderBottom: `2px solid ${tab === name ? COLORS.blue : "transparent"}`,
            }}
          >
            {t(`tab${name}`)}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="jt-duo">
          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionTitle>{t("studentSection")}</SectionTitle>
            <InfoGrid
              rows={[
                { label: tCommon("class"), value: student.className },
                { label: tCommon("branch"), value: student.branch },
                { label: t("level"), value: student.level },
                { label: t("membership"), value: student.membershipType },
                { label: t("joined"), value: student.joinedDate },
                { label: t("creditsExpire"), value: student.expires },
                { label: tCommon("lineId"), value: student.studentLineId },
              ]}
            />
          </Card>
          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionTitle>{t("parentSection")}</SectionTitle>
            <InfoGrid
              rows={[
                { label: tCommon("name"), value: student.parentName },
                { label: t("relation"), value: student.parentRelation },
                { label: tCommon("phone"), value: student.parentPhone },
                { label: tCommon("email"), value: student.parentEmail },
                { label: tCommon("lineId"), value: student.parentLineId },
              ]}
            />
          </Card>
        </div>
      )}

      {tab === "Attendance" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 16px 0" }}>
            <SectionTitle>
              {t("attendanceSummary", { present: presentCount, total: attendance.length })}
            </SectionTitle>
          </div>
          <div style={{ marginTop: 12 }}>
            <Table columns={[tCommon("date"), tCommon("class"), tCommon("status")]} template="140px 1fr 110px" minWidth={480}>
              {attendance.map((row) => {
                const s = statusChipColors(row.status === "Present" ? "Paid" : "Expired");
                return (
                  <TableRow key={row.date} template="140px 1fr 110px">
                    <span style={{ color: COLORS.textSecondary }}>{row.date}</span>
                    <span style={{ display: "flex", alignItems: "center" }}>
                      <ClassDot color={classDotColor(row.className)} />
                      {row.className}
                    </span>
                    <Badge color={s.color} bg={s.bg} style={{ justifySelf: "start" }}>
                      {tStatus(row.status)}
                    </Badge>
                  </TableRow>
                );
              })}
            </Table>
          </div>
        </Card>
      )}

      {tab === "Practice" && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionTitle>{t("practiceSummary", { days: practice.streak })}</SectionTitle>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {t("practiceHint")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, maxWidth: 320 }}>
            {practice.days.map((on, i) => (
              <span
                key={i}
                title={on ? t("practised") : t("noPractice")}
                style={{
                  aspectRatio: "1",
                  borderRadius: 5,
                  background: on ? COLORS.blue : COLORS.neutralBg,
                  opacity: on ? 0.85 : 1,
                }}
              />
            ))}
          </div>
        </Card>
      )}

      {tab === "Payments" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Table columns={[tCommon("class"), t("colCredit"), tCommon("amount"), tCommon("date"), tCommon("method")]} template="1.4fr 90px 120px 130px 130px" minWidth={640}>
            {payments.map((p, i) => (
              <TableRow key={`${p.date}-${i}`} template="1.4fr 90px 120px 130px 130px">
                <span style={{ display: "flex", alignItems: "center" }}>
                  <ClassDot color={classDotColor(p.className)} />
                  {p.className}
                </span>
                <span style={{ color: COLORS.success, fontWeight: 600 }}>{p.credits}</span>
                <span style={{ fontWeight: 600 }}>{p.amount}</span>
                <span style={{ color: COLORS.textSecondary }}>{p.date}</span>
                <span style={{ color: COLORS.textSecondary }}>{p.method}</span>
              </TableRow>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- wizard --- */

type Draft = {
  name: string;
  className: string;
  school: string;
  fideId: string;
  fideRating: string;
  parentName: string;
  parentRelation: string;
  parentPhone: string;
  parentEmail: string;
  parentLineId: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  className: "Group Class",
  school: "",
  fideId: "",
  fideRating: "",
  parentName: "",
  parentRelation: "Mother",
  parentPhone: "",
  parentEmail: "",
  parentLineId: "",
};

function AddStudentWizard({
  initialName,
  onCancel,
  onCreate,
}: {
  initialName: string;
  onCancel: () => void;
  onCreate: (draft: Draft) => void;
}) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const [stage, setStage] = useState<"choice" | "upload" | "form">(initialName ? "form" : "choice");
  const [draft, setDraft] = useState<Draft>({ ...EMPTY_DRAFT, name: initialName });
  const [docName, setDocName] = useState("");
  const [extracting, setExtracting] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  /* Mirrors the mockup's fake OCR: guess a name from the filename, pause, then
     drop the user into a pre-filled form. */
  function extractFrom(file: File) {
    setDocName(file.name);
    setExtracting(true);
    const guessed = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    setTimeout(() => {
      setDraft((d) => ({ ...d, name: guessed || d.name }));
      setExtracting(false);
      setStage("form");
    }, 900);
  }

  const canSubmit = draft.name.trim() !== "" && draft.parentPhone.trim() !== "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 820 }}>
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
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.textSecondary,
          padding: 0,
        }}
      >
        <Icon name="chevronLeft" size={16} color={COLORS.textSecondary} /> {t("backToStudents")}
      </button>

      <PageHeader title={t("registerTitle")} sub={t("registerSub")} />

      {stage === "choice" && (
        <div className="jt-duo">
          {(
            [
              { key: "upload", icon: "fileText" as const, titleKey: "uploadChoice", descKey: "uploadChoiceDesc" },
              { key: "manual", icon: "edit" as const, titleKey: "manualChoice", descKey: "manualChoiceDesc" },
            ]
          ).map((choice) => (
            <button
              key={choice.key}
              type="button"
              className="jt-reg-choice"
              onClick={() => setStage(choice.key === "upload" ? "upload" : "form")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 9,
                padding: 20,
                borderRadius: 14,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.surface,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 200ms ease",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: COLORS.light,
                }}
              >
                <Icon name={choice.icon} size={19} color={COLORS.blue} />
              </span>
              <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
                {t(choice.titleKey)}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                {t(choice.descKey)}
              </span>
            </button>
          ))}
        </div>
      )}

      {stage === "upload" && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", padding: 32 }}>
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
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("reading", { file: docName })}
              </span>
            </>
          ) : (
            <>
              <Icon name="fileText" size={30} color={COLORS.blue} />
              <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text }}>
                {t("uploadPrompt")}
              </span>
              <label style={{ ...primaryButtonStyle, cursor: "pointer" }}>
                {t("chooseFile")}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) extractFrom(file);
                  }}
                  style={{ display: "none" }}
                />
              </label>
              <button
                type="button"
                onClick={() => setStage("choice")}
                style={{ ...secondaryButtonStyle, border: "none", background: "transparent" }}
              >
                {tCommon("back")}
              </button>
            </>
          )}
        </Card>
      )}

      {stage === "form" && (
        <>
          {docName && (
            <Card style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 14px" }}>
              <Icon name="check" size={15} color={COLORS.success} />
              <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                {t("prefilled", { file: docName })}
              </span>
            </Card>
          )}

          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionTitle>{t("studentInfo")}</SectionTitle>
            <div className="jt-duo">
              <div>
                <label style={labelStyle} htmlFor="w-name">{t("fullName")}</label>
                <input id="w-name" value={draft.name} onChange={(e) => set("name", e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-class">{tCommon("class")}</label>
                <select id="w-class" value={draft.className} onChange={(e) => set("className", e.target.value)} style={fieldStyle}>
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-school">{t("currentSchool")}</label>
                <input id="w-school" value={draft.school} onChange={(e) => set("school", e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-fide">{t("fideId")}</label>
                <input id="w-fide" value={draft.fideId} onChange={(e) => set("fideId", e.target.value)} style={fieldStyle} />
              </div>
            </div>
          </Card>

          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionTitle>{t("parentSection")}</SectionTitle>
            <div className="jt-duo">
              <div>
                <label style={labelStyle} htmlFor="w-pname">{tCommon("name")}</label>
                <input id="w-pname" value={draft.parentName} onChange={(e) => set("parentName", e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-prel">{t("relation")}</label>
                <select id="w-prel" value={draft.parentRelation} onChange={(e) => set("parentRelation", e.target.value)} style={fieldStyle}>
                  {["Mother", "Father", "Guardian"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-pphone">{tCommon("phone")}</label>
                <input id="w-pphone" value={draft.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="w-pmail">{tCommon("email")}</label>
                <input id="w-pmail" type="email" value={draft.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} style={fieldStyle} />
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={onCancel}>
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              className="jt-btn-primary"
              style={{ ...primaryButtonStyle, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
              disabled={!canSubmit}
              onClick={() => onCreate(draft)}
            >
              {t("registerTitle")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ list --- */

export function StudentsPage({ startWizard }: { startWizard?: string }) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const [students, setStudents] = useState<Student[]>(STUDENTS_SEED);
  const [view, setView] = useState<View>(startWizard ? { kind: "wizard" } : { kind: "list" });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [branch, setBranch] = useState("");
  const [page, setPage] = useState(0);

  /* Filter values stay "" for "all" so the label can be localised without
     changing what the filter compares against. */
  const branchOptions = useMemo(
    () => [
      { value: "", label: tCommon("allBranches") },
      ...Array.from(new Set(STUDENTS_SEED.map((s) => s.branch))).map((b) => ({ value: b, label: b })),
    ],
    [tCommon],
  );
  const statusOptions = useMemo(
    () => [
      { value: "", label: tCommon("allStatuses") },
      ...STATUS_VALUES.map((v) => ({ value: v, label: tStatus(v) })),
    ],
    [tCommon, tStatus],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (status && s.status !== status) return false;
      if (branch && s.branch !== branch) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.parentPhone.includes(q)) return false;
      return true;
    });
  }, [students, search, status, branch]);

  const { pageRows, totalPages, page: current } = paginate(filtered, page);

  if (view.kind === "detail") {
    const student = students.find((s) => s.id === view.id);
    if (student) return <StudentDetail student={student} onBack={() => setView({ kind: "list" })} />;
  }

  if (view.kind === "wizard") {
    return (
      <AddStudentWizard
        initialName={startWizard ?? ""}
        onCancel={() => setView({ kind: "list" })}
        onCreate={(draft) => {
          const id = `STU-${1052 + students.length - STUDENTS_SEED.length}`;
          setStudents([
            {
              ...draft,
              id,
              branch: "Central",
              credit: 0,
              expires: "—",
              status: "Expired",
              age: 0,
              level: "Beginner",
              parentLineIdNo: "",
              studentLineId: "",
              studentLineIdNo: "",
              membershipType: "Standard",
              joinedDate: new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
            },
            ...students,
          ]);
          setView({ kind: "list" });
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title={t("title")}
        sub={t("sub")}
        action={
          <button
            type="button"
            className="jt-btn-primary"
            style={primaryButtonStyle}
            onClick={() => setView({ kind: "wizard" })}
          >
            <Icon name="usersPlus" size={15} color="#fff" />
            {t("registerTitle")}
          </button>
        }
      />

      <FilterBar>
        <SearchInput
          style={{ flex: "1 1 220px" }}
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder={t("searchPlaceholder")}
          label={t("searchLabel")}
        />
        <SelectFilter value={branch} onChange={(v) => { setBranch(v); setPage(0); }} options={branchOptions} label={tCommon("branch")} />
        <SelectFilter value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={statusOptions} label={tCommon("status")} />
      </FilterBar>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table columns={[tCommon("student"), tCommon("class"), t("colCredit"), tCommon("status"), tCommon("action")]} template={TEMPLATE} minWidth={760}>
          {pageRows.length === 0 && <EmptyRow>{t("empty")}</EmptyRow>}
          {pageRows.map((s) => {
            const chip = statusChipColors(s.status);
            const creditChip =
              s.credit <= 0
                ? { color: COLORS.danger, bg: COLORS.dangerBg }
                : s.credit <= 3
                  ? { color: COLORS.warning, bg: COLORS.warningBg }
                  : { color: COLORS.success, bg: COLORS.successBg };
            return (
              <TableRow key={s.id} template={TEMPLATE} onClick={() => setView({ kind: "detail", id: s.id })}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar initials={initialsOf(s.name)} size={30} />
                  <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </span>
                </span>
                <span style={{ display: "flex", alignItems: "center", color: COLORS.textSecondary }}>
                  <ClassDot color={classDotColor(s.className)} />
                  {s.className}
                </span>
                <Badge color={creditChip.color} bg={creditChip.bg} style={{ justifySelf: "start" }}>
                  {s.credit}
                </Badge>
                <Badge color={chip.color} bg={chip.bg} style={{ justifySelf: "start" }}>
                  {tStatus(s.status)}
                </Badge>
                <a
                  href={`tel:${s.parentPhone.replace(/\s/g, "")}`}
                  onClick={(e) => e.stopPropagation()}
                  className="jt-qa-call"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    justifySelf: "start",
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: `1px solid ${COLORS.border}`,
                    fontFamily: FONT,
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.text,
                    textDecoration: "none",
                    transition: "all 160ms ease",
                  }}
                >
                  <Icon name="phone" size={12} /> {t("contact")}
                </a>
              </TableRow>
            );
          })}
        </Table>
        <Pagination page={current} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}
