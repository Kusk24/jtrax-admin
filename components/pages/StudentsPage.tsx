"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { generateTempPassword } from "@/lib/credentials";
import { type Student } from "@/lib/data";
import { useData } from "@/components/DataProvider";
import { fmtDate, fmtTHB, practiceStrip } from "@/lib/live";
import { Icon } from "@/lib/icons";
import { classDotColor, COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import {
  ActionButton,
  AddButton,
  ConfirmDeleteModal,
  CrudFormModal,
  RowActions,
  type CrudField,
  type CrudValues,
} from "../crud";
import {
  EmptyRow,
  fieldStyle,
  FilterBar,
  InfoGrid,
  labelStyle,
  Modal,
  equalTemplate,
  ExportButton,
  PageHeader,
  paginate,
  pageSizeFor,
  Pagination,
  primaryButtonStyle,
  SearchInput,
  secondaryButtonStyle,
  SelectFilter,
  selectStyle,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";
import { CardGrid, EmptyCards, EntityCard, ViewToggle } from "../view-mode";
import { useViewMode } from "@/lib/view-mode";

const TEMPLATE = equalTemplate(5, 90);
const VIEWS = ["list", "card"] as const;
const ATTENDANCE_TEMPLATE = equalTemplate(2, 120);
const CLASS_OPTIONS = ["Group Class", "Private Class", "Master Class", "Weekend Class"];
const STATUS_VALUES = ["Normal", "Low Credit", "Expiring", "Expired", "Inactive"] as const;
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];
const RELATION_OPTIONS = ["Mother", "Father", "Guardian"];

/* The registration wizard's class list and the seed's class names don't fully
   overlap, so the edit form unions them — otherwise opening a seeded student
   would show a picker that doesn't contain their own class and silently move
   them to the first option on save. */
const BRANCH_OPTIONS = ["Bangkok"];

/* Credit reads as a warning before it reads as a number, so the chip is
   coloured by how close to empty the balance is — shared by both views. */
function creditChipFor(credit: number): { color: string; bg: string } {
  if (credit <= 0) return { color: COLORS.danger, bg: COLORS.dangerBg };
  if (credit <= 3) return { color: COLORS.warning, bg: COLORS.warningBg };
  return { color: COLORS.success, bg: COLORS.successBg };
}

/* Same convention the roster import uses, so an address created here and one
   imported in bulk look alike: first.last@student.jca.ac.th. */
function studentEmailFor(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
  return `${slug || "student"}@student.jca.ac.th`;
}

type View = { kind: "list" } | { kind: "detail"; id: string } | { kind: "wizard" };

/* ---------------------------------------------------------------- detail --- */

const DETAIL_TABS = ["Overview", "Attendance", "Credits", "Practice", "Payments"] as const;
const CREDIT_TEMPLATE = equalTemplate(5, 90);
const CREDIT_TYPES = ["purchase", "consumption", "manual_adjustment"];
const ENROLMENT_STATUSES = ["Active", "Completed", "Withdrawn"];
type DetailTab = (typeof DETAIL_TABS)[number];

function StudentDetail({
  student,
  guardianOptions,
  onBack,
  onSave,
  onDelete,
  onLinkGuardian,
  onUnlinkGuardian,
}: {
  student: Student;
  /* Every guardian on file. A child has one, so this is a picker rather than
     a create form — making a new guardian is the Parents screen's job. */
  guardianOptions: Array<{ id: string; name: string }>;
  onBack: () => void;
  /* Awaited by the Save button, which stays disabled until it resolves. */
  onSave: (student: Student) => Promise<void>;
  /* `alsoParent` is only ever offered when this is the guardian's last child;
     a guardian with other children is never touched. */
  onDelete: (id: string, alsoParent: boolean) => void;
  onLinkGuardian: (parentId: string, relation: string) => Promise<void>;
  onUnlinkGuardian: () => void;
}) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const [tab, setTab] = useState<DetailTab>("Overview");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Student>(student);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [alsoParent, setAlsoParent] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [guardianId, setGuardianId] = useState("");
  const [guardianRelation, setGuardianRelation] = useState(RELATION_OPTIONS[0]);

  function setField<K extends keyof Student>(key: K, value: Student[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  const { raw, create, update, remove } = useData();
  const EDIT_CLASS_OPTIONS = Array.from(
    new Set([...raw.classes.map((c) => String(c.name ?? "")), ...CLASS_OPTIONS]),
  );

  /* Real attendance: the sessions this student was checked in to, newest first. */
  const attendance = useMemo(() => {
    return raw.attendance
      .filter((a) => String(a["student_id"]) === student.id)
      .map((a) => {
        const session = raw.classSessions.find((s) => String(s["session_id"]) === String(a["session_id"]));
        const cls = session
          ? raw.classes.find((c) => String(c["class_id"]) === String(session["class_id"]))
          : undefined;
        return {
          id: String(a["attendance_id"]),
          date: session ? String(session["session_date"] ?? "") : "",
          className: cls ? String(cls["name"] ?? "") : "—",
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [raw.attendance, raw.classSessions, raw.classes, student.id]);

  /* Credit ledger for this student's enrolments — what actually adds up to the
     balance shown on the header chip. */
  const enrolmentIds = useMemo(
    () =>
      raw.enrollments
        .filter((e) => String(e["student_id"]) === student.id)
        .map((e) => String(e["enrollment_id"])),
    [raw.enrollments, student.id],
  );

  const creditRows = useMemo(() => {
    return raw.creditTransactions
      .filter((tx) => enrolmentIds.includes(String(tx["enrollment_id"])))
      .map((tx) => ({
        id: String(tx["credit_transaction_id"]),
        enrollmentId: String(tx["enrollment_id"]),
        type: String(tx["transaction_type"] ?? ""),
        amount: Number(tx["amount"] ?? 0),
        date: String(tx["transaction_date"] ?? ""),
        expiry: String(tx["expiry_date"] ?? ""),
        notes: String(tx["notes"] ?? ""),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [raw.creditTransactions, enrolmentIds]);

  const enrolments = useMemo(
    () =>
      raw.enrollments
        .filter((e) => String(e["student_id"]) === student.id)
        .map((e) => {
          const cls = raw.classes.find((c) => String(c["class_id"]) === String(e["class_id"]));
          return {
            id: String(e["enrollment_id"]),
            classId: String(e["class_id"] ?? ""),
            className: cls ? String(cls["name"] ?? "") : "—",
            enrolledDate: String(e["enrolled_date"] ?? ""),
            status: String(e["status"] ?? ""),
          };
        }),
    [raw.enrollments, raw.classes, student.id],
  );

  const [enrolmentModal, setEnrolmentModal] = useState<(typeof enrolments)[number] | "new" | null>(null);
  const [enrolmentValues, setEnrolmentValues] = useState<CrudValues>({});
  const [deletingEnrolment, setDeletingEnrolment] = useState<(typeof enrolments)[number] | null>(null);

  const enrolmentFields: CrudField[] = useMemo(
    () => [
      {
        name: "class_id",
        label: tCommon("class"),
        kind: "select",
        required: true,
        options: raw.classes.map((c) => ({ value: String(c["class_id"]), label: String(c["name"] ?? "") })),
      },
      { name: "enrolled_date", label: t("enrolledDate"), kind: "date", required: true, half: true },
      {
        name: "status",
        label: tCommon("status"),
        kind: "select",
        half: true,
        options: ENROLMENT_STATUSES.map((v) => ({ value: v, label: tStatus(v) })),
      },
    ],
    [raw.classes, t, tCommon, tStatus],
  );

  function openEnrolmentModal(row: (typeof enrolments)[number] | "new") {
    setEnrolmentModal(row);
    setEnrolmentValues(
      row === "new"
        ? {
            class_id: raw.classes[0] ? String(raw.classes[0]["class_id"]) : "",
            enrolled_date: new Date().toISOString().slice(0, 10),
            status: "Active",
          }
        : { class_id: row.classId, enrolled_date: row.enrolledDate, status: row.status },
    );
  }

  const [creditModal, setCreditModal] = useState<(typeof creditRows)[number] | "new" | null>(null);
  const [creditValues, setCreditValues] = useState<CrudValues>({});
  const [deletingCredit, setDeletingCredit] = useState<(typeof creditRows)[number] | null>(null);

  const creditFields: CrudField[] = useMemo(
    () => [
      {
        name: "enrollment_id",
        label: t("enrolment"),
        kind: "select",
        required: true,
        options: raw.enrollments
          .filter((e) => String(e["student_id"]) === student.id)
          .map((e) => {
            const cls = raw.classes.find((c) => String(c["class_id"]) === String(e["class_id"]));
            return {
              value: String(e["enrollment_id"]),
              label: cls ? String(cls["name"] ?? "") : String(e["enrollment_id"]),
            };
          }),
      },
      {
        name: "transaction_type",
        label: t("creditType"),
        kind: "select",
        required: true,
        half: true,
        options: CREDIT_TYPES.map((v) => ({ value: v, label: t(`creditType_${v}`) })),
      },
      {
        name: "amount",
        label: tCommon("amount"),
        kind: "number",
        required: true,
        half: true,
        help: t("creditAmountHelp"),
      },
      { name: "transaction_date", label: tCommon("date"), kind: "date", required: true, half: true },
      { name: "expiry_date", label: t("expires"), kind: "date", half: true },
      { name: "notes", label: t("notes"), kind: "textarea" },
    ],
    [raw.enrollments, raw.classes, student.id, t, tCommon],
  );

  function openCreditModal(row: (typeof creditRows)[number] | "new") {
    setCreditModal(row);
    const today = new Date().toISOString().slice(0, 10);
    setCreditValues(
      row === "new"
        ? {
            enrollment_id: enrolmentIds[0] ?? "",
            transaction_type: "manual_adjustment",
            amount: "",
            transaction_date: today,
            expiry_date: "",
            notes: "",
          }
        : {
            enrollment_id: row.enrollmentId,
            transaction_type: row.type,
            amount: String(row.amount),
            transaction_date: row.date,
            expiry_date: row.expiry,
            notes: row.notes,
          },
    );
  }

  const practice = useMemo(() => practiceStrip(raw, student.id), [raw, student.id]);

  /* This student's real payments, newest first — the tab used to show a
     generated set that had nothing to do with what the office recorded. */
  const payments = useMemo(
    () =>
      raw.payments
        .filter((p) => String(p["student_id"]) === student.id)
        .map((p) => {
          const enr = raw.enrollments.find((e) => String(e["enrollment_id"]) === String(p["enrollment_id"]));
          const cls = enr ? raw.classes.find((c) => String(c["class_id"]) === String(enr["class_id"])) : undefined;
          const pkg = raw.creditPackages.find(
            (k) => String(k["credit_package_id"]) === String(p["credit_package_id"]),
          );
          return {
            id: String(p["payment_id"]),
            className: cls ? String(cls["name"] ?? "") : "—",
            credits: pkg ? `+${Number(pkg["credit_amount"] ?? 0)}` : "—",
            amount: fmtTHB(Number(p["final_amount"] ?? 0)),
            date: String(p["payment_date"] ?? ""),
            method: String(p["payment_method"] ?? ""),
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [raw.payments, raw.enrollments, raw.classes, raw.creditPackages, student.id],
  );

  /* The guardian's name when this student is their only child, so the delete
     panel can offer to take them too — otherwise null and nothing is asked. */
  const onlyChildOf = useMemo(() => {
    const link = raw.studentParents.find((sp) => String(sp["student_id"]) === student.id);
    if (!link) return null;
    const parentId = String(link["parent_id"]);
    const siblings = raw.studentParents.filter(
      (sp) => String(sp["parent_id"]) === parentId && String(sp["student_id"]) !== student.id,
    );
    if (siblings.length > 0) return null;
    const parent = raw.parents.find((p) => String(p["parent_id"]) === parentId);
    return parent ? String(parent["name"] ?? "") : null;
  }, [raw.studentParents, raw.parents, student.id]);

  /* `toStudents` writes "—" when there is no link at all. */
  const hasGuardian = student.parentName !== "" && student.parentName !== "—";

  const chip = statusChipColors(student.status);
  /* Every attendance row is a session the student was checked in to, so the
     count of them is the count present. */
  const presentCount = attendance.length;

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
          fontSize: 14,
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
          <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, color: COLORS.text }}>
            {student.name}
          </div>
          <div style={{ marginTop: 3, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
{/* The STU-xxxx id is an internal key — the desk identifies students by
                name, so it isn't shown. */}
            {t("yrs", { age: student.age })} · {student.level}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <Badge color={chip.color} bg={chip.bg}>
            {tStatus(student.status)}
          </Badge>
          <Badge color={COLORS.blue} bg={COLORS.light}>
            {tCommon("creditsCount", { count: student.credit })}
          </Badge>
          {!editing && (
            <>
              <button
                type="button"
                className="jt-act-edit"
                style={secondaryButtonStyle}
                onClick={() => {
                  setDraft(student);
                  setDeleteConfirm(false);
                  setTab("Overview");
                  setEditing(true);
                }}
              >
                <Icon name="edit" size={13} /> {tCommon("edit")}
              </button>
              <button
                type="button"
                className="jt-act-danger"
                style={secondaryButtonStyle}
                onClick={() => setDeleteConfirm(true)}
              >
                {tCommon("delete")}
              </button>
            </>
          )}
        </div>
      </Card>

      {deleteConfirm && (
        <div
          className="jtrax-fade-in-up"
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid #B13F3F",
            background: "#FAE2E2",
            color: "#541111",
          }}
        >
          <div style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 700 }}>
            {t("deleteTitle", { name: student.name })}
          </div>
          <p style={{ margin: "5px 0 12px", fontFamily: FONT, fontSize: 13.5 }}>{t("deleteBody")}</p>
          {/* Only when this is the guardian's last child. With siblings left
              the guardian is simply kept, and there is nothing to ask. */}
          {onlyChildOf && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                margin: "0 0 12px",
                fontFamily: FONT,
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={alsoParent}
                onChange={(e) => setAlsoParent(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: COLORS.danger, cursor: "pointer" }}
              />
              {t("alsoDeleteParent", { name: onlyChildOf })}
            </label>
          )}
          <div style={{ display: "flex", gap: 9 }}>
            <button type="button" style={secondaryButtonStyle} onClick={() => setDeleteConfirm(false)}>
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              style={{
                ...primaryButtonStyle,
                background: COLORS.danger,
                opacity: deleting ? 0.6 : 1,
                cursor: deleting ? "wait" : "pointer",
              }}
              disabled={deleting}
              onClick={() => {
                setDeleting(true);
                onDelete(student.id, alsoParent);
              }}
            >
              {deleting ? tCommon("deleting") : t("deleteConfirm")}
            </button>
          </div>
        </div>
      )}

      {/* Hidden while editing: the form only covers Overview, and leaving the
          tabs live would let a half-finished edit scroll out of sight. */}
      <div
        style={{
          display: editing ? "none" : "flex",
          gap: 18,
          borderBottom: `1px solid ${COLORS.border}`,
          flexWrap: "wrap",
        }}
      >
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
              fontSize: 14.5,
              fontWeight: 600,
              color: tab === name ? COLORS.blue : COLORS.textSecondary,
              borderBottom: `2px solid ${tab === name ? COLORS.blue : "transparent"}`,
            }}
          >
            {t(`tab${name}`)}
          </button>
        ))}
      </div>

      {tab === "Overview" && editing && (
        <>
          <div className="jt-duo">
            <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionTitle>{t("studentSection")}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="ed-name">{t("fullName")}</label>
                  <input id="ed-name" value={draft.name} onChange={(e) => setField("name", e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-class">{tCommon("class")}</label>
                  <select id="ed-class" value={draft.className} onChange={(e) => setField("className", e.target.value)} style={selectStyle}>
                    {EDIT_CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-branch">{tCommon("branch")}</label>
                  <select id="ed-branch" value={draft.branch} onChange={(e) => setField("branch", e.target.value)} style={selectStyle}>
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-level">{t("level")}</label>
                  <select id="ed-level" value={draft.level} onChange={(e) => setField("level", e.target.value)} style={selectStyle}>
                    {LEVEL_OPTIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-membership">{t("membership")}</label>
                  <input id="ed-membership" value={draft.membershipType} onChange={(e) => setField("membershipType", e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-sline">{tCommon("lineId")}</label>
                  <input id="ed-sline" value={draft.studentLineId} onChange={(e) => setField("studentLineId", e.target.value)} style={fieldStyle} />
                </div>
              </div>
            </Card>

            <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionTitle>{t("parentSection")}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="ed-pname">{tCommon("name")}</label>
                  <input id="ed-pname" value={draft.parentName} onChange={(e) => setField("parentName", e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-prel">{t("relation")}</label>
                  <select id="ed-prel" value={draft.parentRelation} onChange={(e) => setField("parentRelation", e.target.value)} style={selectStyle}>
                    {RELATION_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-pphone">{tCommon("phone")}</label>
                  <input id="ed-pphone" value={draft.parentPhone} onChange={(e) => setField("parentPhone", e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-pmail">{tCommon("email")}</label>
                  <input id="ed-pmail" type="email" value={draft.parentEmail} onChange={(e) => setField("parentEmail", e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ed-pline">{tCommon("lineId")}</label>
                  <input id="ed-pline" value={draft.parentLineId} onChange={(e) => setField("parentLineId", e.target.value)} style={fieldStyle} />
                </div>
              </div>
            </Card>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setEditing(false)}>
              {tCommon("cancel")}
            </button>
            <ActionButton
              className="jt-btn-primary"
              style={primaryButtonStyle}
              disabled={!draft.name.trim()}
              busyLabel={tCommon("saving")}
              onClick={async () => {
                await onSave(draft);
                setEditing(false);
              }}
            >
              {tCommon("save")}
            </ActionButton>
          </div>
        </>
      )}

      {tab === "Overview" && !editing && (
        <div className="jt-duo">
          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionTitle>{t("studentSection")}</SectionTitle>
            <InfoGrid
              rows={[
                { label: tCommon("class"), value: student.className },
                { label: tCommon("branch"), value: student.branch },
                { label: t("level"), value: student.level },
                { label: t("membership"), value: student.membershipType },
                { label: tCommon("email"), value: student.email || t("noAccountYet") },
                { label: t("joined"), value: student.joinedDate },
                { label: t("creditsExpire"), value: student.expires },
                { label: tCommon("lineId"), value: student.studentLineId },
              ]}
            />
          </Card>
          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <SectionTitle>{t("parentSection")}</SectionTitle>
              {hasGuardian && (
                <button
                  type="button"
                  className="jt-btn-ghost"
                  style={{ ...secondaryButtonStyle, padding: "6px 12px", fontSize: 13 }}
                  onClick={() => onUnlinkGuardian()}
                >
                  {t("unlinkGuardian")}
                </button>
              )}
            </div>
            {hasGuardian ? (
              <InfoGrid
                rows={[
                  { label: tCommon("name"), value: student.parentName },
                  { label: t("relation"), value: student.parentRelation },
                  { label: tCommon("phone"), value: student.parentPhone },
                  { label: tCommon("email"), value: student.parentEmail },
                  { label: tCommon("lineId"), value: student.parentLineId },
                ]}
              />
            ) : (
              /* A child can end up here by being registered without one, or by
                 having their guardian deleted. Either way the fix belongs on
                 this page — the office is already looking at the child. */
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
                  {t("noGuardian")}
                </p>
                {guardianOptions.length === 0 ? (
                  <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                    {t("noGuardiansYet")}
                  </p>
                ) : (
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: "1 1 170px" }}>
                      <label style={labelStyle} htmlFor="sd-guardian">{t("chooseGuardian")}</label>
                      <select
                        id="sd-guardian"
                        value={guardianId}
                        onChange={(e) => setGuardianId(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">—</option>
                        {guardianOptions.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: "0 1 140px" }}>
                      <label style={labelStyle} htmlFor="sd-relation">{t("relation")}</label>
                      <select
                        id="sd-relation"
                        value={guardianRelation}
                        onChange={(e) => setGuardianRelation(e.target.value)}
                        style={selectStyle}
                      >
                        {RELATION_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <ActionButton
                      className="jt-btn-primary"
                      style={primaryButtonStyle}
                      disabled={!guardianId}
                      busyLabel={tCommon("saving")}
                      onClick={() => onLinkGuardian(guardianId, guardianRelation)}
                    >
                      {t("linkGuardian")}
                    </ActionButton>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {creditModal && (
        <CrudFormModal
          title={creditModal === "new" ? t("addCredit") : t("editCredit")}
          fields={creditFields}
          values={creditValues}
          onChange={setCreditValues}
          onClose={() => setCreditModal(null)}
          onSubmit={async (payload) => {
            if (creditModal === "new") await create("credit-transactions", payload);
            else await update("credit-transactions", creditModal.id, payload);
          }}
        />
      )}

      {deletingCredit && (
        <ConfirmDeleteModal
          what={t("creditEntry", { amount: deletingCredit.amount, date: fmtDate(deletingCredit.date) })}
          onClose={() => setDeletingCredit(null)}
          onConfirm={() => remove("credit-transactions", deletingCredit.id)}
        />
      )}

      {tab === "Overview" && !editing && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <SectionTitle>{t("enrolments")}</SectionTitle>
            <AddButton label={t("addEnrolment")} onClick={() => openEnrolmentModal("new")} />
          </div>
          {enrolments.length === 0 ? (
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
              {t("noEnrolments")}
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {enrolments.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <ClassDot color={classDotColor(e.className)} />
                  <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14.5, fontWeight: 600 }}>
                    {e.className}
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                    {fmtDate(e.enrolledDate)}
                  </span>
                  <Badge
                    color={e.status === "Active" ? COLORS.success : COLORS.textSecondary}
                    bg={e.status === "Active" ? COLORS.successBg : COLORS.neutralBg}
                  >
                    {tStatus(e.status)}
                  </Badge>
                  <RowActions
                    label={e.className}
                    onEdit={() => openEnrolmentModal(e)}
                    onDelete={() => setDeletingEnrolment(e)}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {enrolmentModal && (
        <CrudFormModal
          title={enrolmentModal === "new" ? t("addEnrolment") : t("editEnrolment")}
          fields={enrolmentFields}
          values={enrolmentValues}
          onChange={setEnrolmentValues}
          onClose={() => setEnrolmentModal(null)}
          onSubmit={async (payload) => {
            if (enrolmentModal === "new") await create("enrollments", { ...payload, student_id: student.id });
            else await update("enrollments", enrolmentModal.id, payload);
          }}
        />
      )}

      {deletingEnrolment && (
        <ConfirmDeleteModal
          what={deletingEnrolment.className}
          note={t("enrolmentDeleteNote")}
          onClose={() => setDeletingEnrolment(null)}
          onConfirm={() => remove("enrollments", deletingEnrolment.id)}
        />
      )}

      {tab === "Credits" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, flexWrap: "wrap" }}>
            <SectionTitle>{t("creditBalance", { count: student.credit })}</SectionTitle>
            <span style={{ marginLeft: "auto" }}>
              <AddButton label={t("addCredit")} onClick={() => openCreditModal("new")} />
            </span>
          </div>
          <Table
            columns={[tCommon("date"), t("creditType"), tCommon("amount"), t("expires"), tCommon("action")]}
            template={CREDIT_TEMPLATE}
            minWidth={720}
          >
            {creditRows.length === 0 && <EmptyRow>{t("noCredits")}</EmptyRow>}
            {creditRows.map((row) => (
              <TableRow key={row.id} template={CREDIT_TEMPLATE}>
                <span style={{ color: COLORS.textSecondary }}>{fmtDate(row.date)}</span>
                <span>{t(`creditType_${row.type}`)}</span>
                <span style={{ fontWeight: 700, color: row.amount < 0 ? COLORS.danger : COLORS.success }}>
                  {row.amount > 0 ? `+${row.amount}` : row.amount}
                </span>
                <span style={{ color: COLORS.textSecondary }}>{row.expiry ? fmtDate(row.expiry) : "—"}</span>
                <RowActions
                  label={t("creditEntry", { amount: row.amount, date: fmtDate(row.date) })}
                  onEdit={() => openCreditModal(row)}
                  onDelete={() => setDeletingCredit(row)}
                />
              </TableRow>
            ))}
          </Table>
        </Card>
      )}

      {tab === "Attendance" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 16px 0" }}>
            <SectionTitle>
              {t("attendanceSummary", { present: presentCount, total: attendance.length })}
            </SectionTitle>
          </div>
          <div style={{ marginTop: 12 }}>
            {/* No status column: every row in this list is an attended
                session, so a column reading "Present" all the way down told
                the reader nothing. */}
            <Table columns={[tCommon("date"), tCommon("class")]} template={ATTENDANCE_TEMPLATE} minWidth={420}>
              {attendance.length === 0 && <EmptyRow>{t("noAttendance")}</EmptyRow>}
              {attendance.map((row) => (
                <TableRow key={row.id} template={ATTENDANCE_TEMPLATE}>
                  <span style={{ color: COLORS.textSecondary }}>{fmtDate(row.date)}</span>
                  <span style={{ display: "flex", alignItems: "center" }}>
                    <ClassDot color={classDotColor(row.className)} />
                    {row.className}
                  </span>
                </TableRow>
              ))}
            </Table>
          </div>
        </Card>
      )}

      {tab === "Practice" && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionTitle>{t("practiceSummary", { days: practice.streak })}</SectionTitle>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
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
          <Table columns={[tCommon("class"), t("colCredit"), tCommon("amount"), tCommon("date"), tCommon("method")]} template={equalTemplate(5, 80)} minWidth={640}>
            {payments.length === 0 && <EmptyRow>{t("noPayments")}</EmptyRow>}
            {payments.map((p) => (
              <TableRow key={p.id} template={equalTemplate(5, 80)}>
                <span style={{ display: "flex", alignItems: "center" }}>
                  <ClassDot color={classDotColor(p.className)} />
                  {p.className}
                </span>
                <span style={{ color: COLORS.success, fontWeight: 600 }}>{p.credits}</span>
                <span style={{ fontWeight: 600 }}>{p.amount}</span>
                <span style={{ color: COLORS.textSecondary }}>{fmtDate(p.date)}</span>
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
  /* Set when the guardian already exists: the wizard then links to them
     instead of making a second account for the same person. A child has one
     guardian; a guardian can have any number of children. */
  parentId: string;
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
  parentId: "",
  parentName: "",
  parentRelation: "Mother",
  parentPhone: "",
  parentEmail: "",
  parentLineId: "",
};

function AddStudentWizard({
  initialName,
  classOptions,
  parentOptions,
  onCancel,
  onCreate,
}: {
  initialName: string;
  /* The academy's real classes. The picker used to offer a fixed four that no
     longer match what the school teaches, so registering someone silently
     enrolled them in nothing — and nothing is what the payment form then had
     to price. */
  classOptions: string[];
  /* Every guardian already on file, so a second child joins the first one's
     parent rather than getting a duplicate account. */
  parentOptions: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onCreate: (draft: Draft) => Promise<void>;
}) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const [stage, setStage] = useState<"choice" | "upload" | "form">(initialName ? "form" : "choice");
  const [draft, setDraft] = useState<Draft>({
    ...EMPTY_DRAFT,
    name: initialName,
    className: classOptions[0] ?? "",
  });
  const [docName, setDocName] = useState("");
  const [extracting, setExtracting] = useState(false);
  /* Registering writes nine rows. Until they all land the button has to stop
     accepting clicks, or a second press starts the whole thing again and the
     only sign of it is "email must be unique". */
  const [saving, setSaving] = useState(false);

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

  /* An existing guardian already has a phone number on file; only a new one
     has to be given here. */
  const canSubmit =
    draft.name.trim() !== "" && (draft.parentId !== "" || draft.parentPhone.trim() !== "");

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
          fontSize: 14,
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
              <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: COLORS.text }}>
                {t(choice.titleKey)}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
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
              <span style={{ fontFamily: FONT, fontSize: 14.5, color: COLORS.textSecondary }}>
                {t("reading", { file: docName })}
              </span>
            </>
          ) : (
            <>
              <Icon name="fileText" size={30} color={COLORS.blue} />
              <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text }}>
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
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
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
                <select id="w-class" value={draft.className} onChange={(e) => set("className", e.target.value)} style={selectStyle}>
                  {classOptions.map((c) => (
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <SectionTitle>{t("parentSection")}</SectionTitle>
              {parentOptions.length > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    gap: 2,
                    padding: 3,
                    borderRadius: 999,
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.surface,
                  }}
                >
                  {([
                    { existing: false, label: t("newGuardian") },
                    { existing: true, label: t("existingGuardian") },
                  ] as const).map((option) => {
                    const active = (draft.parentId !== "") === option.existing;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          set("parentId", option.existing ? parentOptions[0].id : "")
                        }
                        style={{
                          padding: "6px 14px",
                          borderRadius: 999,
                          border: "none",
                          background: active ? COLORS.light : "transparent",
                          color: active ? COLORS.blue : COLORS.textSecondary,
                          fontFamily: FONT,
                          fontSize: 13.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </span>
              )}
            </div>

            {draft.parentId ? (
              <div className="jt-duo">
                <div>
                  <label style={labelStyle} htmlFor="w-pexisting">{t("chooseGuardian")}</label>
                  <select
                    id="w-pexisting"
                    value={draft.parentId}
                    onChange={(e) => set("parentId", e.target.value)}
                    style={selectStyle}
                  >
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="w-prel-existing">{t("relation")}</label>
                  <select
                    id="w-prel-existing"
                    value={draft.parentRelation}
                    onChange={(e) => set("parentRelation", e.target.value)}
                    style={selectStyle}
                  >
                    {RELATION_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="jt-duo">
                <div>
                  <label style={labelStyle} htmlFor="w-pname">{tCommon("name")}</label>
                  <input id="w-pname" value={draft.parentName} onChange={(e) => set("parentName", e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="w-prel">{t("relation")}</label>
                  <select id="w-prel" value={draft.parentRelation} onChange={(e) => set("parentRelation", e.target.value)} style={selectStyle}>
                    {RELATION_OPTIONS.map((r) => (
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
            )}
          </Card>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={onCancel}>
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              className="jt-btn-primary"
              style={{
                ...primaryButtonStyle,
                opacity: canSubmit && !saving ? 1 : 0.5,
                cursor: !canSubmit ? "not-allowed" : saving ? "wait" : "pointer",
              }}
              disabled={!canSubmit || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onCreate(draft);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? t("registering") : t("registerTitle")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ list --- */

export function StudentsPage({
  startWizard,
  startStatus,
}: {
  startWizard?: string;
  /* The condition the dashboard's follow-up card was clicked on, if we got
     here from one. */
  startStatus?: string;
}) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { students, raw, batch, create, update, remove, removePerson, loading, error } = useData();
  const [view, setView] = useState<View>(startWizard ? { kind: "wizard" } : { kind: "list" });
  const [mode, setMode] = useViewMode("students", VIEWS);
  const router = useRouter();
  const [createdLogins, setCreatedLogins] = useState<{
    studentId: string;
    student: { email: string; password: string };
    parent: { email: string; password: string } | null;
  } | null>(null);
  const [search, setSearch] = useState("");
  /* One control for the student's condition. There used to be two — a raw
     status picker and a follow-up bucket picker — which offered the same
     thing twice under different names. The dashboard links here with
     `?status=`; anything the list does not know is ignored rather than
     silently emptying the screen. */
  const [status, setStatus] = useState(
    STATUS_VALUES.includes(startStatus as (typeof STATUS_VALUES)[number]) ? startStatus! : "",
  );
  const [branch, setBranch] = useState("");
  const [page, setPage] = useState(0);

  /* Filter values stay "" for "all" so the label can be localised without
     changing what the filter compares against. */
  const branchOptions = useMemo(
    () => [
      { value: "", label: tCommon("allBranches") },
      ...Array.from(new Set(students.map((s) => s.branch))).map((b) => ({ value: b, label: b })),
    ],
    [tCommon, students],
  );
  /* Each option carries its own count, so the number on a dashboard card can
     be checked against the list it links to without counting rows. */
  const statusOptions = useMemo(
    () => [
      { value: "", label: tCommon("allStatuses") },
      ...STATUS_VALUES.map((v) => ({
        value: v,
        label: `${tStatus(v)} (${students.filter((s) => s.status === v).length})`,
      })),
    ],
    [tCommon, tStatus, students],
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

  const { pageRows, totalPages, page: current } = paginate(filtered, page, pageSizeFor(mode));

  const parentOptions = useMemo(
    () => raw.parents.map((p) => ({ id: String(p["parent_id"]), name: String(p["name"] ?? "") })),
    [raw.parents],
  );

  /* Falls back to the design's list only while the classes are still loading,
     so the picker is never empty. */
  const classNames = useMemo(() => {
    const live = raw.classes.map((c) => String(c["name"] ?? "")).filter(Boolean);
    return live.length > 0 ? live : CLASS_OPTIONS;
  }, [raw.classes]);

  function toPayment(studentId: string) {
    setCreatedLogins(null);
    router.push(`/payment?student=${encodeURIComponent(studentId)}`);
  }

  /**
   * Registers a student: their login, their row, an enrolment in the class the
   * form chose, and — when the form named one — a guardian with their own
   * login, contacts and the link to this child.
   *
   * All of it inside one `batch`. Each write used to refetch all twenty-two
   * collections on its own, so nine writes cost 189 requests and the wizard
   * sat there looking hung while they ran.
   */
  async function registerStudent(draft: Draft) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await batch(async () => {
        /* A student who can sign in to the portal, not just a row on a list.
           The address follows the roster convention so the office can predict
           it; the password is shown once, at the end. */
        const studentPassword = generateTempPassword();
        const studentAccount = await create("user-accounts", {
          email: studentEmailFor(draft.name),
          password: studentPassword,
          role: "Student",
          display_name: draft.name,
        });
        const created = await create("students", {
          user_account_id: studentAccount.user_account_id,
          name: draft.name,
          current_level: "Beginner",
          fide_rating: draft.fideRating ? Number(draft.fideRating) : null,
        });

        const cls = raw.classes.find((c) => String(c.name) === draft.className);
        if (cls) {
          await create("enrollments", {
            student_id: created.student_id,
            class_id: cls.class_id,
            enrolled_date: today,
            status: "Active",
          });
        }

        let parentCredentials: { email: string; password: string } | null = null;
        if (draft.parentId) {
          /* An existing guardian: link, and leave their account alone. */
          await create("student-parents", {
            student_id: created.student_id,
            parent_id: draft.parentId,
            relationship_type: draft.parentRelation || "Guardian",
          });
        } else if (draft.parentName.trim() && draft.parentEmail.trim()) {
          const parentPassword = generateTempPassword();
          const parentAccount = await create("user-accounts", {
            email: draft.parentEmail.trim(),
            password: parentPassword,
            role: "Parent",
            display_name: draft.parentName.trim(),
          });
          const parent = await create("parents", {
            user_account_id: parentAccount.user_account_id,
            name: draft.parentName.trim(),
          });
          const parentId = String(parent.parent_id);
          for (const [kind, value] of [
            ["phone", draft.parentPhone],
            ["email", draft.parentEmail],
            ["line_id", draft.parentLineId],
          ] as const) {
            if (value.trim()) {
              await create("parent-contacts", { parent_id: parentId, contact_type: kind, value: value.trim() });
            }
          }
          await create("notification-preferences", { parent_id: parentId }).catch(() => {});
          await create("student-parents", {
            student_id: created.student_id,
            parent_id: parentId,
            relationship_type: draft.parentRelation || "Guardian",
          });
          parentCredentials = { email: draft.parentEmail.trim(), password: parentPassword };
        }

        setCreatedLogins({
          studentId: String(created.student_id),
          student: { email: studentEmailFor(draft.name), password: studentPassword },
          parent: parentCredentials,
        });
      });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "create failed");
    }
    setView({ kind: "list" });
  }

  if (view.kind === "detail") {
    const student = students.find((s) => s.id === view.id);
    if (student)
      return (
        <StudentDetail
          student={student}
          guardianOptions={parentOptions}
          onLinkGuardian={(parentId, relation) =>
            create("student-parents", {
              student_id: student.id,
              parent_id: parentId,
              relationship_type: relation,
            }).then(() => undefined)
          }
          onUnlinkGuardian={() => {
            /* The link is keyed by student, so this detaches only this child —
               the guardian and their other children are untouched. */
            remove("student-parents", student.id).catch((e) =>
              window.alert(e instanceof Error ? e.message : "could not unlink"),
            );
          }}
          onBack={() => setView({ kind: "list" })}
          onSave={async (next) => {
            try {
              await update("students", next.id, { name: next.name, current_level: next.level });
            } catch (e) {
              window.alert(e instanceof Error ? e.message : "save failed");
            }
          }}
          onDelete={(id, alsoParent) => {
            /* One request: the backend removes the attendance, credits,
               payments, enrolments and family link in a transaction. */
            removePerson("students", id, { parent: alsoParent })
              .then(() => setView({ kind: "list" }))
              .catch((e) => window.alert(e instanceof Error ? e.message : "delete failed"));
          }}
        />
      );
  }

  if (view.kind === "wizard") {
    return (
      <AddStudentWizard
        initialName={startWizard ?? ""}
        classOptions={classNames}
        parentOptions={parentOptions}
        onCancel={() => setView({ kind: "list" })}
        onCreate={registerStudent}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {createdLogins && (
        /* Registering someone is the first half of enrolling them; the second
           is taking the payment. Closing this dialog — by the button, the X or
           Escape — carries on to the payment form with them already chosen. */
        <Modal
          title={t("loginsTitle")}
          width={460}
          onClose={() => toPayment(createdLogins.studentId)}
          footer={
            <button
              type="button"
              className="jt-btn-primary"
              style={primaryButtonStyle}
              onClick={() => toPayment(createdLogins.studentId)}
            >
              <Icon name="wallet" size={14} color="#fff" /> {t("continueToPayment")}
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
              {t("loginsHint")}
            </p>
            <div>
              <SectionTitle>{t("studentLogin")}</SectionTitle>
              <InfoGrid
                rows={[
                  { label: tCommon("email"), value: createdLogins.student.email },
                  {
                    label: t("tempPassword"),
                    value: <strong style={{ letterSpacing: "0.04em" }}>{createdLogins.student.password}</strong>,
                  },
                ]}
              />
            </div>
            {createdLogins.parent && (
              <div>
                <SectionTitle>{t("parentLogin")}</SectionTitle>
                <InfoGrid
                  rows={[
                    { label: tCommon("email"), value: createdLogins.parent.email },
                    {
                      label: t("tempPassword"),
                      value: <strong style={{ letterSpacing: "0.04em" }}>{createdLogins.parent.password}</strong>,
                    },
                  ]}
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      <PageHeader
        title={t("title")}
        sub={t("sub")}
        action={
          <>
            <ExportButton
              filename="students"
              columns={[tCommon("student"), tCommon("class"), tCommon("branch"), t("colCredit"), tCommon("status"), tCommon("phone")]}
              rows={() => filtered.map((s) => [s.name, s.className, s.branch, s.credit, s.status, s.parentPhone])}
            />
            <button
              type="button"
              className="jt-btn-primary"
              style={primaryButtonStyle}
              onClick={() => setView({ kind: "wizard" })}
            >
              <Icon name="usersPlus" size={15} color="#fff" />
              {t("registerTitle")}
            </button>
          </>
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
        <ViewToggle value={mode} onChange={setMode} options={VIEWS} style={{ marginLeft: "auto" }} />
      </FilterBar>

      {mode === "card" ? (
        <>
          <CardGrid>
            {pageRows.length === 0 && (
              <EmptyCards>{loading ? tCommon("loading") : error ? error : t("empty")}</EmptyCards>
            )}
            {pageRows.map((s) => {
              const chip = statusChipColors(s.status);
              const creditChip = creditChipFor(s.credit);
              return (
                <EntityCard
                  key={s.id}
                  onClick={() => setView({ kind: "detail", id: s.id })}
                  avatar={<Avatar initials={initialsOf(s.name)} size={44} />}
                  title={s.name}
                  subtitle={
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      <ClassDot color={classDotColor(s.className)} />
                      {s.className}
                    </span>
                  }
                  badges={
                    <>
                      <Badge color={chip.color} bg={chip.bg}>{tStatus(s.status)}</Badge>
                      <Badge color={creditChip.color} bg={creditChip.bg}>
                        {tCommon("creditsCount", { count: s.credit })}
                      </Badge>
                    </>
                  }
                  rows={[
                    { label: t("level"), value: s.level },
                    { label: t("creditsExpire"), value: s.expires || "—" },
                    { label: t("parentLabel"), value: s.parentName },
                  ]}
                  footer={
                    s.parentPhone ? (
                      <ContactPill
                        phone={s.parentPhone}
                        label={t("contact")}
                        style={{ justifyContent: "center" }}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </CardGrid>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Table columns={[tCommon("student"), tCommon("class"), t("colCredit"), tCommon("status"), tCommon("action")]} template={TEMPLATE} minWidth={760}>
            {pageRows.length === 0 && (
              <EmptyRow>{loading ? tCommon("loading") : error ? error : t("empty")}</EmptyRow>
            )}
            {pageRows.map((s) => {
              const chip = statusChipColors(s.status);
              const creditChip = creditChipFor(s.credit);
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
                  <ContactPill phone={s.parentPhone} label={t("contact")} style={{ justifySelf: "start" }} />
                </TableRow>
              );
            })}
          </Table>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </Card>
      )}
    </div>
  );
}

/** Tel link styled as a pill. Its click never reaches the row behind it. */
function ContactPill({
  phone,
  label,
  style,
}: {
  phone: string;
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <a
      href={`tel:${phone.replace(/\s/g, "")}`}
      onClick={(e) => e.stopPropagation()}
      className="jt-qa-call"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${COLORS.border}`,
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: 600,
        color: COLORS.text,
        textDecoration: "none",
        transition: "all 160ms ease",
        ...style,
      }}
    >
      <Icon name="phone" size={12} /> {label}
    </a>
  );
}
