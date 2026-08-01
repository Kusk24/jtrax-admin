"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/lib/jtrax/icons";
import { COLORS, FONT, initialsOf } from "@/lib/jtrax/theme";
import {
  ContactActions,
  fieldStyle,
  InfoGrid,
  labelStyle,
  Modal,
  PageHeader,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../page-kit";
import { Avatar, Badge, Card } from "../ui";

/* The design's icon picker offers the six chess pieces plus the trophy the
   Master Class seed uses. */
const PIECE_OPTIONS: IconName[] = ["king", "queen", "rook", "knight", "bishop", "pawn", "trophy"];

type Course = { id: string; name: string; desc: string; badge: string; icon: IconName; category: string };
type Teacher = { id: string; name: string; email: string; phone: string; lineId: string; status: string };

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
  const [courses, setCourses] = useState<Course[]>(COURSES_SEED);
  const [teachers, setTeachers] = useState<Teacher[]>(TEACHERS_SEED);
  const [courseModal, setCourseModal] = useState<Course | "new" | null>(null);
  const [teacherModal, setTeacherModal] = useState<Teacher | "new" | null>(null);
  const [courseDetail, setCourseDetail] = useState<Course | null>(null);
  const [teacherDetail, setTeacherDetail] = useState<Teacher | null>(null);

  const [courseDraft, setCourseDraft] = useState<Omit<Course, "id">>({
    name: "",
    desc: "",
    badge: "",
    icon: "pawn",
    category: "Beginner",
  });
  const [teacherDraft, setTeacherDraft] = useState<Omit<Teacher, "id" | "status">>({
    name: "",
    email: "",
    phone: "",
    lineId: "",
  });

  function openCourseModal(course: Course | "new") {
    setCourseModal(course);
    setCourseDraft(
      course === "new" ? { name: "", desc: "", badge: "", icon: "pawn", category: "Beginner" } : { ...course },
    );
  }

  function openTeacherModal(teacher: Teacher | "new") {
    setTeacherModal(teacher);
    setTeacherDraft(
      teacher === "new"
        ? { name: "", email: "", phone: "", lineId: "" }
        : { name: teacher.name, email: teacher.email, phone: teacher.phone, lineId: teacher.lineId },
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <PageHeader
        title="Courses"
        sub="What the academy teaches"
        action={
          <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => openCourseModal("new")}>
            <Icon name="plus" size={15} color="#fff" /> Add Course
          </button>
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
              <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>{c.name}</div>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, lineHeight: 1.55, color: COLORS.textSecondary }}>
                {c.desc}
              </p>
            </div>
            <button
              type="button"
              className="jt-btn-ghost"
              style={{ ...secondaryButtonStyle, alignSelf: "flex-start" }}
              onClick={() => openCourseModal(c)}
            >
              <Icon name="edit" size={13} /> Edit
            </button>
          </Card>
        ))}
      </div>

      <PageHeader
        title="Teachers"
        sub="Who teaches at the academy"
        action={
          <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => openTeacherModal("new")}>
            <Icon name="plus" size={15} color="#fff" /> Add Teacher
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {teachers.map((t) => (
          <Card key={t.id} className="jt-adm-card" style={{ display: "flex", flexDirection: "column", gap: 13, cursor: "pointer" }}>
            <div onClick={() => setTeacherDetail(t)} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Avatar initials={initialsOf(t.name)} size={44} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>{t.name}</div>
                <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: t.status === "Active" ? COLORS.success : COLORS.textSecondary,
                    }}
                  />
                  <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>{t.status}</span>
                </div>
              </div>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.6 }}>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.email}</div>
              <div>{t.phone}</div>
            </div>
            <ContactActions phone={t.phone} lineId={t.lineId} email={t.email} />
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
              Edit Course
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
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, lineHeight: 1.6, color: COLORS.textSecondary }}>
              {courseDetail.desc}
            </p>
            <InfoGrid rows={[{ label: "Badge", value: courseDetail.badge }, { label: "Category", value: courseDetail.category }]} />
          </div>
        </Modal>
      )}

      {teacherDetail && (
        <Modal title={teacherDetail.name} onClose={() => setTeacherDetail(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar initials={initialsOf(teacherDetail.name)} size={52} />
              <div>
                <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: COLORS.text }}>
                  {teacherDetail.name}
                </div>
                <Badge
                  color={teacherDetail.status === "Active" ? COLORS.success : COLORS.textSecondary}
                  bg={teacherDetail.status === "Active" ? COLORS.successBg : COLORS.neutralBg}
                >
                  {teacherDetail.status}
                </Badge>
              </div>
            </div>
            <InfoGrid
              rows={[
                { label: "Email", value: teacherDetail.email },
                { label: "Phone", value: teacherDetail.phone },
                { label: "LINE ID", value: teacherDetail.lineId },
              ]}
            />
            <ContactActions phone={teacherDetail.phone} lineId={teacherDetail.lineId} email={teacherDetail.email} />
          </div>
        </Modal>
      )}

      {courseModal && (
        <Modal
          title={courseModal === "new" ? "Add Course" : "Edit Course"}
          onClose={() => setCourseModal(null)}
          footer={
            <>
              <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setCourseModal(null)}>
                Cancel
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
                    setCourses([...courses, { ...courseDraft, id: `course-${Date.now()}` }]);
                  } else {
                    setCourses(courses.map((c) => (c.id === courseModal.id ? { ...courseDraft, id: courseModal.id } : c)));
                  }
                  setCourseModal(null);
                }}
              >
                Save Course
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div>
              <label style={labelStyle} htmlFor="co-name">Course Name</label>
              <input id="co-name" value={courseDraft.name} onChange={(e) => setCourseDraft({ ...courseDraft, name: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="co-desc">Description</label>
              <textarea
                id="co-desc"
                rows={3}
                value={courseDraft.desc}
                onChange={(e) => setCourseDraft({ ...courseDraft, desc: e.target.value })}
                style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="co-badge">Badge</label>
              <input id="co-badge" value={courseDraft.badge} onChange={(e) => setCourseDraft({ ...courseDraft, badge: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <span style={labelStyle}>Icon</span>
              <IconPicker value={courseDraft.icon} onChange={(icon) => setCourseDraft({ ...courseDraft, icon })} />
            </div>
          </div>
        </Modal>
      )}

      {teacherModal && (
        <Modal
          title={teacherModal === "new" ? "Add Teacher" : "Edit Teacher"}
          onClose={() => setTeacherModal(null)}
          footer={
            <>
              <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setTeacherModal(null)}>
                Cancel
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
                onClick={() => {
                  if (teacherModal === "new") {
                    setTeachers([...teachers, { ...teacherDraft, id: `teacher-${Date.now()}`, status: "Active" }]);
                  } else {
                    setTeachers(
                      teachers.map((t) => (t.id === teacherModal.id ? { ...t, ...teacherDraft } : t)),
                    );
                  }
                  setTeacherModal(null);
                }}
              >
                Save Teacher
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div>
              <label style={labelStyle} htmlFor="te-name">Full Name</label>
              <input id="te-name" value={teacherDraft.name} onChange={(e) => setTeacherDraft({ ...teacherDraft, name: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="te-email">Email</label>
              <input id="te-email" type="email" value={teacherDraft.email} onChange={(e) => setTeacherDraft({ ...teacherDraft, email: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="te-phone">Phone</label>
              <input id="te-phone" value={teacherDraft.phone} onChange={(e) => setTeacherDraft({ ...teacherDraft, phone: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="te-line">LINE ID</label>
              <input id="te-line" value={teacherDraft.lineId} onChange={(e) => setTeacherDraft({ ...teacherDraft, lineId: e.target.value })} style={fieldStyle} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
