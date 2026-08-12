"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useData } from "@/components/DataProvider";
import { fmtTHB } from "@/lib/live";
import { Icon, type IconName } from "@/lib/icons";
import { COLORS, FONT, initialsOf } from "@/lib/theme";
import {
  AddButton,
  ConfirmDeleteModal,
  CrudFormModal,
  RowActions,
  type CrudField,
  type CrudValues,
} from "../crud";
import {
  ContactActions,
  fieldStyle,
  InfoGrid,
  labelStyle,
  Modal,
  EmptyRow,
  equalTemplate,
  ExportButton,
  PageHeader,
  primaryButtonStyle,
  secondaryButtonStyle,
  selectStyle,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card } from "../ui";

/* The design's icon picker offers the six chess pieces plus the trophy the
   Master Class seed uses. */
const PIECE_OPTIONS: IconName[] = ["king", "queen", "rook", "knight", "bishop", "pawn", "trophy"];

type Course = { id: string; name: string; desc: string; badge: string; icon: IconName; category: string };
type Teacher = { id: string; name: string; email: string; phone: string; lineId: string; status: string };
type CreditPackage = {
  id: string;
  classId: string;
  className: string;
  creditAmount: number;
  price: number;
  validityDays: number;
};

const PACKAGE_TEMPLATE = equalTemplate(5, 90);

const COURSES_SEED: Course[] = [
  {
    id: "private",
    name: "Private Class",
    desc: "One-on-one coaching tailored to the student's pace, with a dedicated teacher and flexible scheduling.",
    badge: "Private",
    icon: "king",
    category: "Intermediate",
  },
  {
    id: "group",
    name: "Group Class",
    desc: "Small-group sessions that build fundamentals through friendly practice games and peer learning.",
    badge: "Group",
    icon: "queen",
    category: "Beginner",
  },
  {
    id: "master",
    name: "Master Class",
    desc: "Advanced training for students preparing to compete in tournaments, with strategy and endgame focus.",
    badge: "For Tournament Players",
    icon: "trophy",
    category: "Master",
  },
];

const TEACHERS_SEED: Teacher[] = [
  { id: "jessica", name: "Jessica Tan", email: "jessica.tan@jca.ac.th", phone: "+66 86 330 7712", lineId: "jessica.tan", status: "Active" },
  { id: "somchai", name: "Somchai Prasert", email: "somchai.p@jca.ac.th", phone: "+66 81 774 2210", lineId: "somchai.p", status: "Active" },
  { id: "nadia", name: "Nadia Rahman", email: "nadia.r@jca.ac.th", phone: "+66 92 551 8834", lineId: "nadia.r", status: "Active" },
  { id: "peter", name: "Peter Lim", email: "peter.lim@jca.ac.th", phone: "+66 89 220 1176", lineId: "peter.lim", status: "Active" },
  { id: "aran", name: "Aran Chaiyo", email: "aran.c@jca.ac.th", phone: "+66 84 663 9028", lineId: "aran.c", status: "Inactive" },
];

function IconPicker({ value, onChange }: { value: IconName; onChange: (i: IconName) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {PIECE_OPTIONS.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            aria-label={p}
            aria-pressed={active}
            onClick={() => onChange(p)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              borderRadius: 11,
              border: `1.5px solid ${active ? COLORS.blue : COLORS.border}`,
              background: active ? COLORS.light : COLORS.surface,
              cursor: "pointer",
            }}
          >
            <Icon name={p} size={20} color={active ? COLORS.blue : COLORS.textSecondary} />
          </button>
        );
      })}
    </div>
  );
}

export function AcademyPage() {
  const t = useTranslations("academy");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { raw, create, update, remove } = useData();
  const courses: Course[] = raw.classes.map((c) => ({
    id: String(c.class_id),
    name: String(c.name ?? ""),
    desc: String(c.description ?? ""),
    badge: String(c.class_type ?? ""),
    icon: c.class_type === "Master" ? "trophy" : c.class_type === "Private" ? "king" : "queen",
    category: String(c.class_type ?? ""),
  }));
  const teachers: Teacher[] = raw.teachers.map((t) => ({
    id: String(t.teacher_id),
    name: String(t.name ?? ""),
    email: String(t.email ?? ""),
    phone: String(t.phone ?? ""),
    lineId: String(t.line_id ?? ""),
    status: "Active",
  }));
  /* A package is priced per class, so the list joins the class name in rather
     than showing a bare class id. */
  const packages: CreditPackage[] = raw.creditPackages.map((p) => {
    const cls = raw.classes.find((c) => String(c.class_id) === String(p.class_id));
    return {
      id: String(p.credit_package_id),
      classId: String(p.class_id ?? ""),
      className: cls ? String(cls.name ?? "") : "—",
      creditAmount: Number(p.credit_amount ?? 0),
      price: Number(p.standard_price ?? 0),
      validityDays: Number(p.validity_days ?? 0),
    };
  });

  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [packageModal, setPackageModal] = useState<CreditPackage | "new" | null>(null);
  const [packageValues, setPackageValues] = useState<CrudValues>({});
  const [deletingPackage, setDeletingPackage] = useState<CreditPackage | null>(null);

  const packageFields: CrudField[] = [
    {
      name: "class_id",
      label: tCommon("class"),
      kind: "select",
      required: true,
      options: courses.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: "credit_amount", label: t("creditAmount"), kind: "number", required: true, half: true, min: 0 },
    { name: "standard_price", label: t("price"), kind: "number", required: true, half: true, min: 0 },
    { name: "validity_days", label: t("validity"), kind: "number", required: true, half: true, min: 0 },
  ];

  function openPackageModal(p: CreditPackage | "new") {
    setPackageModal(p);
    setPackageValues(
      p === "new"
        ? { class_id: "", credit_amount: "", standard_price: "", validity_days: "" }
        : {
            class_id: p.classId,
            credit_amount: String(p.creditAmount),
            standard_price: String(p.price),
            validity_days: String(p.validityDays),
          },
    );
  }

  const [courseModal, setCourseModal] = useState<Course | "new" | null>(null);
  const [teacherModal, setTeacherModal] = useState<Teacher | "new" | null>(null);
  const [courseDetail, setCourseDetail] = useState<Course | null>(null);
  const [teacherDetail, setTeacherDetail] = useState<Teacher | null>(null);
  const [teacherDeleteConfirm, setTeacherDeleteConfirm] = useState(false);

  const [courseDraft, setCourseDraft] = useState<Omit<Course, "id">>({
    name: "",
    desc: "",
    badge: "",
    icon: "pawn",
    category: "Beginner",
  });
  const [teacherDraft, setTeacherDraft] = useState<Omit<Teacher, "id">>({
    name: "",
    email: "",
    phone: "",
    lineId: "",
    status: "Active",
  });

  function openCourseModal(course: Course | "new") {
    setCourseModal(course);
    setCourseDraft(
      course === "new" ? { name: "", desc: "", badge: "", icon: "pawn", category: "Beginner" } : { ...course },
    );
  }

  function closeTeacherDetail() {
    setTeacherDetail(null);
    setTeacherDeleteConfirm(false);
  }

  function openTeacherModal(teacher: Teacher | "new") {
    setTeacherModal(teacher);
    setTeacherDraft(
      teacher === "new"
        ? { name: "", email: "", phone: "", lineId: "", status: "Active" }
        : {
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone,
            lineId: teacher.lineId,
            status: teacher.status,
          },
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {packageModal && (
        <CrudFormModal
          title={packageModal === "new" ? t("addPackage") : t("editPackage")}
          fields={packageFields}
          values={packageValues}
          onChange={setPackageValues}
          onClose={() => setPackageModal(null)}
          onSubmit={async (payload) => {
            if (packageModal === "new") await create("credit-packages", payload);
            else await update("credit-packages", packageModal.id, payload);
          }}
        />
      )}

      {deletingPackage && (
        <ConfirmDeleteModal
          what={t("packageFor", { className: deletingPackage.className, credits: deletingPackage.creditAmount })}
          onClose={() => setDeletingPackage(null)}
          onConfirm={() => remove("credit-packages", deletingPackage.id)}
        />
      )}

      {deletingCourse && (
        <ConfirmDeleteModal
          what={deletingCourse.name}
          note={t("courseDeleteNote")}
          onClose={() => setDeletingCourse(null)}
          onConfirm={async () => {
            await remove("classes", deletingCourse.id);
            setCourseDetail(null);
          }}
        />
      )}

      <PageHeader
        title={t("coursesTitle")}
        sub={t("coursesSub")}
        action={
          <>
            <ExportButton
              filename="courses"
              columns={[t("courseName"), t("badge"), t("category"), t("description")]}
              rows={() => courses.map((c) => [c.name, c.badge, c.category, c.desc])}
            />
            <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => openCourseModal("new")}>
              <Icon name="plus" size={15} color="#fff" /> {t("addCourse")}
            </button>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {courses.map((c) => (
          <Card
            key={c.id}
            className="jt-course-card"
            style={{ display: "flex", flexDirection: "column", gap: 11, cursor: "pointer" }}
          >
            <div onClick={() => setCourseDetail(c)} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: COLORS.light,
                  }}
                >
                  <Icon name={c.icon} size={21} color={COLORS.blue} />
                </span>
                <Badge color={COLORS.blue} bg={COLORS.light}>
                  {c.badge}
                </Badge>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: COLORS.text }}>{c.name}</div>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, lineHeight: 1.55, color: COLORS.textSecondary }}>
                {c.desc}
              </p>
            </div>
            <RowActions
              label={c.name}
              onEdit={() => openCourseModal(c)}
              onDelete={() => setDeletingCourse(c)}
            />
          </Card>
        ))}
      </div>

      <div>
        <PageHeader
          level={2}
          title={t("packagesTitle")}
          sub={t("packagesSub")}
          action={<AddButton label={t("addPackage")} onClick={() => openPackageModal("new")} />}
        />
        <Card style={{ padding: 0, overflow: "hidden", marginTop: 12 }}>
          <Table
            columns={[tCommon("class"), t("creditAmount"), t("price"), t("validity"), tCommon("action")]}
            template={PACKAGE_TEMPLATE}
            minWidth={720}
          >
            {packages.length === 0 && <EmptyRow>{t("noPackages")}</EmptyRow>}
            {packages.map((p) => (
              <TableRow key={p.id} template={PACKAGE_TEMPLATE}>
                <span style={{ fontWeight: 600 }}>{p.className}</span>
                <span style={{ color: COLORS.success, fontWeight: 600 }}>+{p.creditAmount}</span>
                <span>{fmtTHB(p.price)}</span>
                <span style={{ color: COLORS.textSecondary }}>{t("validityDays", { days: p.validityDays })}</span>
                <RowActions
                  label={t("packageFor", { className: p.className, credits: p.creditAmount })}
                  onEdit={() => openPackageModal(p)}
                  onDelete={() => setDeletingPackage(p)}
                />
              </TableRow>
            ))}
          </Table>
        </Card>
      </div>

      <PageHeader
        level={2}
        title={t("teachersTitle")}
        sub={t("teachersSub")}
        action={
          <>
            <ExportButton
              filename="teachers"
              columns={[tCommon("name"), tCommon("email"), tCommon("phone"), tCommon("lineId"), tCommon("status")]}
              rows={() => teachers.map((x) => [x.name, x.email, x.phone, x.lineId, x.status])}
            />
            <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => openTeacherModal("new")}>
              <Icon name="plus" size={15} color="#fff" /> {t("addTeacher")}
            </button>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {teachers.map((teacher) => (
          <Card key={teacher.id} className="jt-adm-card" style={{ display: "flex", flexDirection: "column", gap: 13, cursor: "pointer" }}>
            <div onClick={() => setTeacherDetail(teacher)} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Avatar initials={initialsOf(teacher.name)} size={44} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: 15.5, fontWeight: 700, color: COLORS.text }}>{teacher.name}</div>
                <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: teacher.status === "Active" ? COLORS.success : COLORS.textSecondary,
                    }}
                  />
                  <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>{tStatus(teacher.status)}</span>
                </div>
              </div>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 1.6 }}>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{teacher.email}</div>
              <div>{teacher.phone}</div>
            </div>
            <ContactActions phone={teacher.phone} lineId={teacher.lineId} email={teacher.email} />
          </Card>
        ))}
      </div>

      {courseDetail && (
        <Modal
          title={courseDetail.name}
          onClose={() => setCourseDetail(null)}
          footer={
            <button
              type="button"
              className="jt-btn-primary"
              style={primaryButtonStyle}
              onClick={() => {
                openCourseModal(courseDetail);
                setCourseDetail(null);
              }}
            >
              {t("editCourse")}
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 52,
                height: 52,
                borderRadius: 14,
                background: COLORS.light,
              }}
            >
              <Icon name={courseDetail.icon} size={25} color={COLORS.blue} />
            </span>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 14.5, lineHeight: 1.6, color: COLORS.textSecondary }}>
              {courseDetail.desc}
            </p>
            <InfoGrid rows={[{ label: t("badge"), value: courseDetail.badge }, { label: t("category"), value: courseDetail.category }]} />
          </div>
        </Modal>
      )}

      {teacherDetail && (
        <Modal
          title={teacherDetail.name}
          onClose={closeTeacherDetail}
          footer={
            <>
              {/* Modal footers justify to the end, so the auto margin on the
                  first child is what parks Delete away from Edit. */}
              <button
                type="button"
                className="jt-act-danger"
                style={{ ...secondaryButtonStyle, marginRight: "auto" }}
                onClick={() => setTeacherDeleteConfirm(true)}
              >
                {tCommon("delete")}
              </button>
              <button
                type="button"
                className="jt-act-edit"
                style={secondaryButtonStyle}
                onClick={() => {
                  openTeacherModal(teacherDetail);
                  closeTeacherDetail();
                }}
              >
                <Icon name="edit" size={13} /> {tCommon("edit")}
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar initials={initialsOf(teacherDetail.name)} size={52} />
              <div>
                <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: COLORS.text }}>
                  {teacherDetail.name}
                </div>
                <Badge
                  color={teacherDetail.status === "Active" ? COLORS.success : COLORS.textSecondary}
                  bg={teacherDetail.status === "Active" ? COLORS.successBg : COLORS.neutralBg}
                >
                  {tStatus(teacherDetail.status)}
                </Badge>
              </div>
            </div>
            <InfoGrid
              rows={[
                { label: tCommon("email"), value: teacherDetail.email },
                { label: tCommon("phone"), value: teacherDetail.phone },
                { label: tCommon("lineId"), value: teacherDetail.lineId },
              ]}
            />
            <ContactActions phone={teacherDetail.phone} lineId={teacherDetail.lineId} email={teacherDetail.email} />

            {teacherDeleteConfirm && (
              <div
                className="jtrax-fade-in-up"
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #B13F3F",
                  background: "#FAE2E2",
                  color: "#541111",
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 700 }}>
                  {t("deleteTeacherTitle", { name: teacherDetail.name })}
                </div>
                <p style={{ margin: "5px 0 12px", fontFamily: FONT, fontSize: 13.5 }}>
                  {t("deleteTeacherBody")}
                </p>
                <div style={{ display: "flex", gap: 9 }}>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => setTeacherDeleteConfirm(false)}
                  >
                    {tCommon("cancel")}
                  </button>
                  <button
                    type="button"
                    style={{ ...primaryButtonStyle, background: COLORS.danger }}
                    onClick={() => {
                      remove("teachers", teacherDetail.id).catch((e) =>
                        window.alert(e instanceof Error ? e.message : "delete failed"),
                      );
                      closeTeacherDetail();
                    }}
                  >
                    {t("deleteTeacher")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {courseModal && (
        <Modal
          title={courseModal === "new" ? t("addCourse") : t("editCourse")}
          onClose={() => setCourseModal(null)}
          footer={
            <>
              <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setCourseModal(null)}>
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                className="jt-btn-primary"
                style={{
                  ...primaryButtonStyle,
                  opacity: courseDraft.name ? 1 : 0.5,
                  cursor: courseDraft.name ? "pointer" : "not-allowed",
                }}
                disabled={!courseDraft.name}
                onClick={() => {
                  if (courseModal === "new") {
                    create("classes", {
                      name: courseDraft.name,
                      description: courseDraft.desc,
                      class_type: ["Private", "Group", "Master"].includes(courseDraft.category) ? courseDraft.category : "Group",
                    }).catch((e) => window.alert(e instanceof Error ? e.message : "create failed"));
                  } else {
                    update("classes", courseModal.id, {
                      name: courseDraft.name,
                      description: courseDraft.desc,
                    }).catch((e) => window.alert(e instanceof Error ? e.message : "save failed"));
                  }
                  setCourseModal(null);
                }}
              >
                {tCommon("save")}
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div>
              <label style={labelStyle} htmlFor="co-name">{t("courseName")}</label>
              <input id="co-name" value={courseDraft.name} onChange={(e) => setCourseDraft({ ...courseDraft, name: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="co-desc">{t("description")}</label>
              <textarea
                id="co-desc"
                rows={3}
                value={courseDraft.desc}
                onChange={(e) => setCourseDraft({ ...courseDraft, desc: e.target.value })}
                style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="co-badge">{t("badge")}</label>
              <input id="co-badge" value={courseDraft.badge} onChange={(e) => setCourseDraft({ ...courseDraft, badge: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <span style={labelStyle}>{t("icon")}</span>
              <IconPicker value={courseDraft.icon} onChange={(icon) => setCourseDraft({ ...courseDraft, icon })} />
            </div>
          </div>
        </Modal>
      )}

      {teacherModal && (
        <Modal
          title={teacherModal === "new" ? t("addTeacher") : t("editTeacher")}
          onClose={() => setTeacherModal(null)}
          footer={
            <>
              <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setTeacherModal(null)}>
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                className="jt-btn-primary"
                style={{
                  ...primaryButtonStyle,
                  opacity: teacherDraft.name ? 1 : 0.5,
                  cursor: teacherDraft.name ? "pointer" : "not-allowed",
                }}
                disabled={!teacherDraft.name}
                onClick={async () => {
                  try {
                    if (teacherModal === "new") {
                      const acct = await create("user-accounts", {
                        email: teacherDraft.email || `${teacherDraft.name.toLowerCase().replace(/\s+/g, ".")}@jca.ac.th`,
                        password: `teach-${Math.random().toString(36).slice(2, 10)}`,
                        role: "Teacher",
                        display_name: teacherDraft.name,
                      });
                      await create("teachers", {
                        user_account_id: acct.user_account_id,
                        name: teacherDraft.name,
                        email: teacherDraft.email,
                        phone: teacherDraft.phone,
                        line_id: teacherDraft.lineId,
                      });
                    } else {
                      await update("teachers", teacherModal.id, {
                        name: teacherDraft.name,
                        email: teacherDraft.email,
                        phone: teacherDraft.phone,
                        line_id: teacherDraft.lineId,
                      });
                    }
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : "save failed");
                  }
                  setTeacherModal(null);
                }}
              >
                {tCommon("save")}
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div>
              <label style={labelStyle} htmlFor="te-name">{tCommon("name")}</label>
              <input id="te-name" value={teacherDraft.name} onChange={(e) => setTeacherDraft({ ...teacherDraft, name: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="te-email">{tCommon("email")}</label>
              <input id="te-email" type="email" value={teacherDraft.email} onChange={(e) => setTeacherDraft({ ...teacherDraft, email: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="te-phone">{tCommon("phone")}</label>
              <input id="te-phone" value={teacherDraft.phone} onChange={(e) => setTeacherDraft({ ...teacherDraft, phone: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="te-line">{tCommon("lineId")}</label>
              <input id="te-line" value={teacherDraft.lineId} onChange={(e) => setTeacherDraft({ ...teacherDraft, lineId: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="te-status">{tCommon("status")}</label>
              <select
                id="te-status"
                value={teacherDraft.status}
                onChange={(e) => setTeacherDraft({ ...teacherDraft, status: e.target.value })}
                style={selectStyle}
              >
                {["Active", "Inactive"].map((s) => (
                  <option key={s} value={s}>{tStatus(s)}</option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
