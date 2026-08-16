"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { type ClassDef } from "@/lib/data";
import { todayISO } from "@/lib/live";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
/* Shared with the rest of the forms so the panel's fields keep the same box —
   this file used to carry its own near-identical copies. */
import { ActionButton } from "../crud";
import { useData } from "../DataProvider";
import { fieldStyle, labelStyle, selectStyle } from "../page-kit";
import { Avatar } from "../ui";

export type PanelState = { mode: "create" } | { mode: "view"; def: ClassDef } | null;

function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgb(20 33 58 / 0.38)",
        zIndex: 50,
      }}
    />
  );
}

function PanelFrame({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const tCommon = useTranslations("common");

  /* Escape closes; body scroll is locked while the panel owns the screen. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <>
      <Scrim onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="jtrax-fade-in-up"
        style={{
          /* Centred with auto margins, not translateX — the fade-in keyframe
             animates `transform` and would otherwise cancel the centering. */
          position: "fixed",
          top: "5vh",
          left: 0,
          right: 0,
          marginInline: "auto",
          width: "min(920px, 92vw)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          boxShadow: "0 24px 60px rgb(20 33 58 / 0.28)",
          zIndex: 60,
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
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
            <Icon name="chevronLeft" size={17} color={COLORS.textSecondary} />
            {tCommon("back")}
          </button>
          <h2 style={{ margin: 0, fontFamily: FONT, fontSize: 17, fontWeight: 700, color: COLORS.text }}>
            {title}
          </h2>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>{children}</div>

        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 20px",
            borderTop: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
          }}
        >
          {footer}
        </footer>
      </div>
    </>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 999,
  border: "none",
  background: COLORS.blue,
  color: "#fff",
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 18px",
  borderRadius: 999,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

function CreateSession({ onClose }: { onClose: () => void }) {
  const t = useTranslations("session");
  const tCommon = useTranslations("common");
  const { raw, students, create } = useData();
  const classes = raw.classes.map((c) => ({ id: String(c.class_id), name: String(c.name ?? "") }));
  const [className, setClassName] = useState(classes[0]?.name ?? "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [search, students]);

  const canCreate = Boolean(className && startTime && endTime) && !busy;

  /* Creates the session, then checks in everyone picked — the panel used to
     close without writing anything. */
  async function createSession() {
    const cls = classes.find((c) => c.name === className);
    if (!cls) return;
    setBusy(true);
    try {
      const session = await create("class-sessions", {
        class_id: cls.id,
        session_date: todayISO(),
        start_time: startTime,
        end_time: endTime,
        session_status: "Ongoing",
      });
      for (const name of selected) {
        const student = students.find((s) => s.name === name);
        if (student) {
          await create("attendance", {
            student_id: student.id,
            session_id: session.session_id,
            check_in_time: new Date().toISOString(),
          });
        }
      }
      onClose();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "could not create the session");
    } finally {
      setBusy(false);
    }
  }

  function toggle(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  return (
    <PanelFrame
      title={t("createTitle")}
      onClose={onClose}
      footer={
        <>
          <span style={{ fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
            {t("selectedCount", { count: selected.length })}
          </span>
          <span style={{ display: "flex", gap: 10 }}>
            <button type="button" style={ghostBtn} onClick={onClose}>
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              className="jt-btn-primary"
              style={{ ...primaryBtn, opacity: canCreate ? 1 : 0.5, cursor: canCreate ? "pointer" : "not-allowed" }}
              disabled={!canCreate}
              onClick={createSession}
            >
              {t("createTitle")}
            </button>
          </span>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        <div>
          <h3 style={{ margin: "0 0 14px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
            {t("sessionDetails")}
          </h3>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="jtrax-class-name">
              {t("className")}
            </label>
            <select
              id="jtrax-class-name"
              value={className}
              onChange={(e) => {
                setClassName(e.target.value);
                setStartTime("");
                setEndTime("");
              }}
              style={selectStyle}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle} htmlFor="jtrax-start">
                {t("startTime")}
              </label>
              <input
                id="jtrax-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle} htmlFor="jtrax-end">
                {t("endTime")}
              </label>
              <input
                id="jtrax-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={fieldStyle}
              />
            </div>
          </div>

          <div style={{ height: 1, background: COLORS.border, margin: "4px 0 16px" }} />

          <h3 style={{ margin: "0 0 10px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
            {t("selectedStudents", { count: selected.length })}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {selected.length === 0 && (
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("noneSelected")}
              </span>
            )}
            {selected.map((name) => (
              <span
                key={name}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 8px 5px 5px",
                  borderRadius: 999,
                  background: COLORS.light,
                  fontFamily: FONT,
                  fontSize: 13.5,
                  color: COLORS.text,
                }}
              >
                <Avatar initials={initialsOf(name)} size={20} bg={COLORS.surface} />
                {name}
                <button
                  type="button"
                  onClick={() => toggle(name)}
                  aria-label={t("removeStudent", { name })}
                  style={{
                    display: "inline-flex",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 0,
                    color: COLORS.textSecondary,
                  }}
                >
                  <Icon name="x" size={13} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ margin: "0 0 14px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
            {t("addStudents")}
          </h3>
          <div style={{ marginBottom: 12 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchStudents")}
              aria-label={t("searchStudentsLabel")}
              style={fieldStyle}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
            {available.map((student) => {
              const checked = selected.includes(student.name);
              return (
                <label
                  key={student.id}
                  className="jt-find-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 9,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(student.name)}
                    style={{ accentColor: COLORS.blue, width: 15, height: 15 }}
                  />
                  <Avatar initials={initialsOf(student.name)} size={26} />
                  <span style={{ fontFamily: FONT, fontSize: 14, color: COLORS.text }}>{student.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}

function ViewClass({ def, onClose }: { def: ClassDef; onClose: () => void }) {
  const t = useTranslations("session");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { students, raw, create, remove } = useData();
  const editable = def.status === "Ongoing";
  /* The roster comes from attendance, so adding or removing someone writes a
     row rather than editing a local array that the next refresh discards. */
  const roster = def.roster;
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const status = statusChipColors(def.status);

  /* Latecomers are the point of this panel: a student who turns up after the
     session started is added here, so the picker only offers people who
     aren't on the roster yet. */
  const addable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter(
      (student) => !roster.includes(student.name) && (!q || student.name.toLowerCase().includes(q)),
    );
  }, [roster, search, students]);

  return (
    <PanelFrame
      title={def.name}
      onClose={onClose}
      footer={
        <>
          <span style={{ fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
            {def.time} · {def.teacher} · {def.room}
          </span>
          <button type="button" style={editable ? primaryBtn : ghostBtn} onClick={onClose}>
            {editable ? t("saveChanges") : tCommon("close")}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: status.bg,
            color: status.color,
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {tStatus(def.status)}
        </span>
        {!editable && (
          <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
            {t("readOnly")}
          </span>
        )}
      </div>

      <h3 style={{ margin: "0 0 12px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
        {t("checkedInCount", { count: roster.length })}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 9 }}>
        {roster.map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "9px 11px",
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Avatar initials={initialsOf(name)} size={28} />
            <span style={{ flex: 1, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>{name}</span>
            {editable && (
              <ActionButton
                onClick={async () => {
                  const student = students.find((s) => s.name === name);
                  const row = raw.attendance.find(
                    (a) => String(a.session_id) === def.id && String(a.student_id) === student?.id,
                  );
                  if (row) await remove("attendance", String(row.attendance_id)).catch(() => {});
                }}
                ariaLabel={t("removeFromRoster", { name })}
                style={{
                  display: "inline-flex",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                  color: COLORS.textSecondary,
                }}
              >
                <Icon name="x" size={14} />
              </ActionButton>
            )}
          </div>
        ))}
      </div>

      {editable && (
        <div style={{ marginTop: 18 }}>
          {addOpen ? (
            <div
              className="jtrax-fade-in-up"
              style={{
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.bg,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
                  {t("addStudents")}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    setSearch("");
                  }}
                  aria-label={tCommon("close")}
                  style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: COLORS.textSecondary, padding: 0 }}
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchStudents")}
                aria-label={t("searchStudentsLabel")}
                style={fieldStyle}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto", marginTop: 10 }}>
                {addable.length === 0 && (
                  <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary, padding: "8px 10px" }}>
                    {t("allAdded")}
                  </span>
                )}
                {addable.map((student) => (
                  <ActionButton
                    key={student.id}
                    className="jt-find-row"
                    onClick={async () => {
                      try {
                        await create("attendance", {
                          student_id: student.id,
                          session_id: def.id,
                          check_in_time: new Date().toISOString(),
                        });
                      } catch {
                        /* Already added, most likely — the list refreshes. */
                      }
                      setSearch("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 9,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Avatar initials={initialsOf(student.name)} size={26} />
                    <span style={{ flex: 1, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>
                      {student.name}
                    </span>
                    <Icon name="plus" size={15} color={COLORS.blue} />
                  </ActionButton>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" className="jt-btn-ghost" style={ghostBtn} onClick={() => setAddOpen(true)}>
              <Icon name="usersPlus" size={15} /> {t("addStudent")}
            </button>
          )}
        </div>
      )}
    </PanelFrame>
  );
}

export function SessionPanel({ state, onClose }: { state: PanelState; onClose: () => void }) {
  if (!state) return null;
  if (state.mode === "create") return <CreateSession onClose={onClose} />;
  return <ViewClass def={state.def} onClose={onClose} />;
}
