"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useData } from "@/components/DataProvider";
import { fmtTHB, liveClasses, livePackages } from "@/lib/live";
import { CLASS_ICONS, CLASS_TYPES, badgeOf, classTypeOf, iconOf, type ClassType } from "@/lib/class-face";
import { Icon, type IconName } from "@/lib/icons";
import { COLORS, FONT, initialsOf } from "@/lib/theme";
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
  ContactActions,
  fieldStyle,
  InfoGrid,
  labelStyle,
  Modal,
  dangerSolidButtonStyle,
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
import { Avatar, Badge, Card, SectionTitle } from "../ui";
import { DangerPanel, DeleteButton, DetailHeader, EditButton } from "../detail";
import { CardGrid, EntityCard, ViewToggle } from "../view-mode";
import { useViewMode } from "@/lib/view-mode";
import { useErrorToast } from "../ErrorToast";

/* The picker's options and the two "what do we draw when nothing was chosen"
   rules live in lib/class-face.ts. */
const PIECE_OPTIONS = CLASS_ICONS;

/* Three lists on one screen, each remembered separately: the office tends to
   want courses as cards and packages as a table at the same time. */
const CARD_FIRST = ["card", "list"] as const;
const LIST_FIRST = ["list", "card"] as const;
const COURSE_TEMPLATE = equalTemplate(4, 110);
const TEACHER_TEMPLATE = equalTemplate(4, 110);

/* `classType` is the ER model's `class.class_type` — how a class is taught,
   not what it is called. It was named `category` here, which is most of why
   nobody could tell where it came from: two words for one column, and the
   console's word was not the one in the database. */
type Course = { id: string; name: string; desc: string; badge: string; icon: IconName; classType: ClassType };
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
  const { showError } = useErrorToast();
  const tStatus = useTranslations("status");
  const tClassType = useTranslations("classType");
  const { raw, batch, create, update, remove } = useData();
  /* Retired classes drop out of the list, the pickers and the export. The
     rows they left behind — enrolments, sessions, receipts — still find them
     by id, which is the whole reason the row is kept. */
  /* The icon and the badge are read from the class, not worked out from its
     type. They used to be derived here — badge was class_type under another
     name, and the icon was a three-way guess on it — so the picker set a value
     that this line overwrote on the very next render. Picking the pawn and
     pressing Save changed nothing, which is what the office reported.

     The fallbacks are the old derivation, for a class written before there
     was anywhere to put a choice. `iconOf` also guards against a name that
     has since left the icon set, which would otherwise render nothing. */
  const courses: Course[] = liveClasses(raw).map((c) => ({
    id: String(c.class_id),
    name: String(c.name ?? ""),
    desc: String(c.description ?? ""),
    badge: badgeOf(c.badge, String(c.class_type ?? "")),
    icon: iconOf(c.icon, String(c.class_type ?? "")),
    classType: classTypeOf(c.class_type),
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
  /* Retired packages, and the packages of retired classes, leave the price
     list — the same way their class leaves the list above. */
  const packages: CreditPackage[] = livePackages({
    creditPackages: raw.creditPackages,
    classes: raw.classes,
  }).map((p) => {
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

  const [courseMode, setCourseMode] = useViewMode("courses", CARD_FIRST);
  const [packageMode, setPackageMode] = useViewMode("packages", LIST_FIRST);
  const [teacherMode, setTeacherMode] = useViewMode("teachers", CARD_FIRST);

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
  /* Adding a teacher is an account then a teacher row; the button stops taking
     clicks between the two. */
  const [savingTeacher, setSavingTeacher] = useState(false);

  const [courseDraft, setCourseDraft] = useState<Omit<Course, "id">>({
    name: "",
    desc: "",
    badge: "",
    icon: "pawn",
    classType: "Group",
  });
  /* A class with no package cannot be sold, cannot be paid for and cannot give
     anyone credits — so its first one is asked for here rather than left as a
     second errand on another card. Prefilled with the commonest terms, which
     makes it a glance and a Save rather than three more questions. */
  const [firstPackage, setFirstPackage] = useState({ credits: "20", price: "12000", days: "90" });
  /* Every one of the three is required and must be a real number. A package of
     zero credits, or one that expires the day it is bought, is not a package —
     and price is the only one allowed to be nothing, because a free trial
     class is a real thing an academy runs. */
  const firstPackageComplete =
    Number(firstPackage.credits) > 0 &&
    firstPackage.price.trim() !== "" &&
    Number(firstPackage.price) >= 0 &&
    Number(firstPackage.days) > 0;
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
      course === "new" ? { name: "", desc: "", badge: "", icon: "pawn", classType: "Group" } : { ...course },
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
          note={t("packageDeleteNote")}
          onClose={() => setDeletingPackage(null)}
          /* Archived, not deleted. A payment points at the package and the
             console reads it to say what that payment bought, so removing the
             row stops old receipts adding up — and the database refuses it
             outright the moment the package has been sold once. */
          onConfirm={() =>
            update("credit-packages", deletingPackage.id, {
              archived_at: new Date().toISOString(),
            }).then(() => undefined)
          }
        />
      )}

      {deletingCourse && (
        <ConfirmDeleteModal
          what={deletingCourse.name}
          note={t("courseDeleteNote")}
          onClose={() => setDeletingCourse(null)}
          onConfirm={async () => {
            /* Archived, not deleted. class_id is NOT NULL on enrolments,
               sessions and packages, so removing the row would take last
               term's attendance and a year of receipts with it — and the
               database refuses outright, which is what the office kept
               running into. This retires the class everywhere it can be
               chosen and leaves what it taught alone. */
            await update("classes", deletingCourse.id, {
              archived_at: new Date().toISOString(),
            });
            setCourseDetail(null);
          }}
        />
      )}

      <PageHeader
        title={t("coursesTitle")}
        sub={t("coursesSub")}
        action={
          <>
            <ViewToggle value={courseMode} onChange={setCourseMode} options={CARD_FIRST} />
            <ExportButton
              filename="courses"
              columns={[t("courseName"), t("badge"), t("classType"), t("description")]}
              rows={() => courses.map((c) => [c.name, c.badge, tClassType(c.classType), c.desc])}
            />
            <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => openCourseModal("new")}>
              <Icon name="plus" size={15} color={COLORS.surface} /> {t("addCourse")}
            </button>
          </>
        }
      />

      {courseMode === "card" ? (
        <CardGrid>
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
        </CardGrid>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Table
            columns={[t("courseName"), t("badge"), t("description"), tCommon("action")]}
            template={COURSE_TEMPLATE}
            minWidth={760}
          >
            {courses.length === 0 && <EmptyRow>{t("noCourses")}</EmptyRow>}
            {courses.map((c) => (
              <TableRow key={c.id} template={COURSE_TEMPLATE} onClick={() => setCourseDetail(c)}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Icon name={c.icon} size={18} color={COLORS.blue} />
                  <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </span>
                </span>
                <Badge color={COLORS.blue} bg={COLORS.light} style={{ justifySelf: "start" }}>
                  {c.badge}
                </Badge>
                <span
                  style={{
                    color: COLORS.textSecondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.desc}
                </span>
                <RowActions label={c.name} onEdit={() => openCourseModal(c)} onDelete={() => setDeletingCourse(c)} />
              </TableRow>
            ))}
          </Table>
        </Card>
      )}

      <div>
        <PageHeader
          level={2}
          title={t("packagesTitle")}
          sub={t("packagesSub")}
          action={
            <>
              <ViewToggle value={packageMode} onChange={setPackageMode} options={LIST_FIRST} />
              <AddButton label={t("addPackage")} onClick={() => openPackageModal("new")} />
            </>
          }
        />
        {packageMode === "card" ? (
          <div style={{ marginTop: 12 }}>
            <CardGrid>
              {packages.map((p) => (
                <EntityCard
                  key={p.id}
                  title={p.className}
                  subtitle={t("validityDays", { days: p.validityDays })}
                  badges={
                    <>
                      <span style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: COLORS.text }}>
                        {fmtTHB(p.price)}
                      </span>
                      <Badge color={COLORS.success} bg={COLORS.successBg}>
                        +{p.creditAmount}
                      </Badge>
                    </>
                  }
                  actions={
                    <RowActions
                      label={t("packageFor", { className: p.className, credits: p.creditAmount })}
                      onEdit={() => openPackageModal(p)}
                      onDelete={() => setDeletingPackage(p)}
                    />
                  }
                />
              ))}
            </CardGrid>
          </div>
        ) : (
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
        )}
      </div>

      <PageHeader
        level={2}
        title={t("teachersTitle")}
        sub={t("teachersSub")}
        action={
          <>
            <ViewToggle value={teacherMode} onChange={setTeacherMode} options={CARD_FIRST} />
            <ExportButton
              filename="teachers"
              columns={[tCommon("name"), tCommon("email"), tCommon("phone"), tCommon("lineId"), tCommon("status")]}
              rows={() => teachers.map((x) => [x.name, x.email, x.phone, x.lineId, x.status])}
            />
            <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => openTeacherModal("new")}>
              <Icon name="plus" size={15} color={COLORS.surface} /> {t("addTeacher")}
            </button>
          </>
        }
      />

      {teacherMode === "card" ? (
        <CardGrid>
          {teachers.map((teacher) => (
            <EntityCard
              key={teacher.id}
              onClick={() => setTeacherDetail(teacher)}
              avatar={<Avatar initials={initialsOf(teacher.name)} size={44} />}
              title={teacher.name}
              badges={
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: teacher.status === "Active" ? COLORS.success : COLORS.textSecondary,
                    }}
                  />
                  <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                    {tStatus(teacher.status)}
                  </span>
                </>
              }
              rows={[
                { label: tCommon("email"), value: teacher.email },
                { label: tCommon("phone"), value: teacher.phone },
              ]}
              footer={<ContactActions phone={teacher.phone} lineId={teacher.lineId} email={teacher.email} />}
            />
          ))}
        </CardGrid>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Table
            columns={[tCommon("name"), tCommon("email"), tCommon("phone"), tCommon("status")]}
            template={TEACHER_TEMPLATE}
            minWidth={760}
          >
            {teachers.length === 0 && <EmptyRow>{t("noTeachers")}</EmptyRow>}
            {teachers.map((teacher) => (
              <TableRow key={teacher.id} template={TEACHER_TEMPLATE} onClick={() => setTeacherDetail(teacher)}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar initials={initialsOf(teacher.name)} size={30} />
                  <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {teacher.name}
                  </span>
                </span>
                <span style={{ color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {teacher.email}
                </span>
                <span style={{ color: COLORS.textSecondary }}>{teacher.phone}</span>
                <span style={{ color: COLORS.textSecondary }}>{tStatus(teacher.status)}</span>
              </TableRow>
            ))}
          </Table>
        </Card>
      )}

      {courseDetail && (
        <Modal
          title={courseDetail.name}
          onClose={() => setCourseDetail(null)}
          footer={
            <>
              <DeleteButton
                onClick={() => {
                  setDeletingCourse(courseDetail);
                  setCourseDetail(null);
                }}
              />
              <EditButton
                label={t("editCourse")}
                onClick={() => {
                  openCourseModal(courseDetail);
                  setCourseDetail(null);
                }}
              />
            </>
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
            <InfoGrid rows={[{ label: t("badge"), value: courseDetail.badge }, { label: t("classType"), value: tClassType(courseDetail.classType) }]} />
          </div>
        </Modal>
      )}

      {teacherDetail && (
        <Modal title={teacherDetail.name} onClose={closeTeacherDetail} width={600}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <DetailHeader
              avatar={<Avatar initials={initialsOf(teacherDetail.name)} size={52} />}
              title={teacherDetail.name}
              badges={
                <Badge
                  color={teacherDetail.status === "Active" ? COLORS.success : COLORS.textSecondary}
                  bg={teacherDetail.status === "Active" ? COLORS.successBg : COLORS.neutralBg}
                >
                  {tStatus(teacherDetail.status)}
                </Badge>
              }
              actions={
                <>
                  <EditButton
                    onClick={() => {
                      openTeacherModal(teacherDetail);
                      closeTeacherDetail();
                    }}
                  />
                  <DeleteButton onClick={() => setTeacherDeleteConfirm(true)} />
                </>
              }
            />
            <InfoGrid
              rows={[
                { label: tCommon("email"), value: teacherDetail.email },
                { label: tCommon("phone"), value: teacherDetail.phone },
                { label: tCommon("lineId"), value: teacherDetail.lineId },
              ]}
            />
            <ContactActions phone={teacherDetail.phone} lineId={teacherDetail.lineId} email={teacherDetail.email} />

            {teacherDeleteConfirm && (
              <DangerPanel
                title={t("deleteTeacherTitle", { name: teacherDetail.name })}
                body={t("deleteTeacherBody")}
              >
                <div style={{ display: "flex", gap: 9 }}>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => setTeacherDeleteConfirm(false)}
                  >
                    {tCommon("cancel")}
                  </button>
                  <ActionButton
                    style={dangerSolidButtonStyle}
                    busyLabel={tCommon("deleting")}
                    onClick={async () => {
                      try {
                        await remove("teachers", teacherDetail.id);
                        closeTeacherDetail();
                      } catch (e) {
                        showError(tCommon("deleteFailed"), e);
                      }
                    }}
                  >
                    {t("deleteTeacher")}
                  </ActionButton>
                </div>
              </DangerPanel>
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
              <ActionButton
                className="jt-btn-primary"
                style={primaryButtonStyle}
                disabled={!courseDraft.name || (courseModal === "new" && !firstPackageComplete)}
                busyLabel={tCommon("saving")}
                onClick={async () => {
                  try {
                    if (courseModal === "new") {
                      /* One act: a class and the package that makes it
                         sellable, batched so the screen refetches once and
                         neither is left behind if the other fails. */
                      await batch(async () => {
                        const cls = await create("classes", {
                          name: courseDraft.name,
                          description: courseDraft.desc,
                          class_type: courseDraft.classType,
                          /* The two the form has always asked for and never
                             sent. Without them the picker is decoration. */
                          icon: courseDraft.icon,
                          badge: courseDraft.badge,
                        });
                        await create("credit-packages", {
                          class_id: cls.class_id,
                          credit_amount: Number(firstPackage.credits),
                          standard_price: Number(firstPackage.price),
                          validity_days: Number(firstPackage.days),
                        });
                      });
                    } else {
                      await update("classes", courseModal.id, {
                        name: courseDraft.name,
                        description: courseDraft.desc,
                        class_type: courseDraft.classType,
                        icon: courseDraft.icon,
                        badge: courseDraft.badge,
                      });
                    }
                  } catch (e) {
                    showError(tCommon("saveFailed"), e);
                  }
                  setCourseModal(null);
                }}
              >
                {tCommon("save")}
              </ActionButton>
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
            {/* The column has existed since the first migration and this form
                has never asked for it, so every class the academy created came
                out "Group" whether it was one or not. */}
            <div>
              <label style={labelStyle} htmlFor="co-type">{t("classType")}</label>
              <select
                id="co-type"
                value={courseDraft.classType}
                onChange={(e) => setCourseDraft({ ...courseDraft, classType: e.target.value as ClassType })}
                style={selectStyle}
              >
                {CLASS_TYPES.map((v) => (
                  <option key={v} value={v}>{tClassType(v)}</option>
                ))}
              </select>
              <p style={{ margin: "5px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                {t("classTypeHelp")}
              </p>
            </div>
            <div>
              <span style={labelStyle}>{t("icon")}</span>
              <IconPicker value={courseDraft.icon} onChange={(icon) => setCourseDraft({ ...courseDraft, icon })} />
            </div>

            {/* Only when creating. Editing a class must not quietly add a
                second package to one that already has its prices. */}
            {courseModal === "new" && (
              <>
                <div style={{ height: 1, background: COLORS.border, margin: "3px 0" }} />
                <div>
                  <SectionTitle>{t("firstPackageTitle")}</SectionTitle>
                  <p style={{ margin: "5px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                    {t("firstPackageHelp")}
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  <div>
                    <label style={labelStyle} htmlFor="co-credits">{t("creditAmount")}</label>
                    <input
                      id="co-credits"
                      type="number"
                      min={0}
                      step={0.5}
                      value={firstPackage.credits}
                      onChange={(e) => setFirstPackage({ ...firstPackage, credits: e.target.value })}
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="co-price">{t("price")}</label>
                    <input
                      id="co-price"
                      type="number"
                      min={0}
                      value={firstPackage.price}
                      onChange={(e) => setFirstPackage({ ...firstPackage, price: e.target.value })}
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="co-days">{t("validity")}</label>
                    <input
                      id="co-days"
                      type="number"
                      min={1}
                      value={firstPackage.days}
                      onChange={(e) => setFirstPackage({ ...firstPackage, days: e.target.value })}
                      style={fieldStyle}
                    />
                  </div>
                </div>
                {!firstPackageComplete && (
                  <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                    {t("firstPackageIncomplete")}
                  </p>
                )}
              </>
            )}
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
                  opacity: teacherDraft.name && !savingTeacher ? 1 : 0.75,
                  cursor: !teacherDraft.name ? "not-allowed" : savingTeacher ? "wait" : "pointer",
                }}
                disabled={!teacherDraft.name || savingTeacher}
                onClick={async () => {
                  setSavingTeacher(true);
                  try {
                    if (teacherModal === "new") {
                      /* A record of who teaches, not an account. The academy
                         has no teacher workflow — the desk takes attendance —
                         so there is no portal to sign in to, and this used to
                         mint a login anyway: a fabricated @jca.ac.th address
                         and a random password nobody was ever shown. The
                         column is nullable since backend 0023. */
                      await create("teachers", {
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
                    showError(tCommon("saveFailed"), e);
                  } finally {
                    setSavingTeacher(false);
                  }
                  setTeacherModal(null);
                }}
              >
                {savingTeacher ? tCommon("saving") : tCommon("save")}
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
