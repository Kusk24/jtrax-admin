"use client";

import { useEffect, useMemo, useState } from "react";
import { CLASSES_DEFS_REF, STUDENTS_SEED, type ClassDef } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
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
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.textSecondary,
              padding: 0,
            }}
          >
            <Icon name="chevronLeft" size={17} color={COLORS.textSecondary} />
            Back
          </button>
          <h2 style={{ margin: 0, fontFamily: FONT, fontSize: 16, fontWeight: 700, color: COLORS.text }}>
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

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontFamily: FONT,
  fontSize: 12.5,
  fontWeight: 600,
  color: COLORS.textSecondary,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 9,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  fontFamily: FONT,
  fontSize: 13.5,
  color: COLORS.text,
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 999,
  border: "none",
  background: COLORS.blue,
  color: "#fff",
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 999,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

function CreateSession({ onClose }: { onClose: () => void }) {
  const [className, setClassName] = useState(CLASSES_DEFS_REF[1]?.name ?? "Master Class");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return STUDENTS_SEED.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [search]);

  function toggle(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  return (
    <PanelFrame
      title="Create Session"
      onClose={onClose}
      footer={
        <>
          <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
            {selected.length} student{selected.length === 1 ? "" : "s"} selected
          </span>
          <span style={{ display: "flex", gap: 10 }}>
            <button type="button" style={ghostBtn} onClick={onClose}>
              Cancel
            </button>
            {/* Mockup parity: there is no persistence layer yet, so this closes
                the panel exactly as the design's own handler did. */}
            <button type="button" className="jt-btn-primary" style={primaryBtn} onClick={onClose}>
              Create Session
            </button>
          </span>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        <div>
          <h3 style={{ margin: "0 0 14px", fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text }}>
            Session Details
          </h3>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="jtrax-class-name">
              Class Name
            </label>
            <select
              id="jtrax-class-name"
              value={className}
              onChange={(e) => {
                setClassName(e.target.value);
                setStartTime("");
                setEndTime("");
              }}
              style={fieldStyle}
            >
              {CLASSES_DEFS_REF.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle} htmlFor="jtrax-start">
                Start Time
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
                End Time
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

          <h3 style={{ margin: "0 0 10px", fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text }}>
            Selected Students ({selected.length})
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {selected.length === 0 && (
              <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                No students selected yet.
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
                  fontSize: 12.5,
                  color: COLORS.text,
                }}
              >
                <Avatar initials={initialsOf(name)} size={20} bg={COLORS.surface} />
                {name}
                <button
                  type="button"
                  onClick={() => toggle(name)}
                  aria-label={`Remove ${name}`}
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
          <h3 style={{ margin: "0 0 14px", fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text }}>
            Add Students
          </h3>
          <div style={{ marginBottom: 12 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students"
              aria-label="Search students to add"
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
                  <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.text }}>{student.name}</span>
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
  const editable = def.status === "Ongoing";
  const [roster, setRoster] = useState<string[]>(def.roster);
  const status = statusChipColors(def.status);

  return (
    <PanelFrame
      title={def.name}
      onClose={onClose}
      footer={
        <>
          <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
            {def.time} · {def.teacher} · {def.room}
          </span>
          <button type="button" style={editable ? primaryBtn : ghostBtn} onClick={onClose}>
            {editable ? "Save Changes" : "Close"}
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
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {def.status}
        </span>
        {!editable && (
          <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            This session has finished — the roster is read-only.
          </span>
        )}
      </div>

      <h3 style={{ margin: "0 0 12px", fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text }}>
        Checked In ({roster.length})
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
            <span style={{ flex: 1, fontFamily: FONT, fontSize: 13, color: COLORS.text }}>{name}</span>
            {editable && (
              <button
                type="button"
                onClick={() => setRoster((prev) => prev.filter((n) => n !== name))}
                aria-label={`Remove ${name} from roster`}
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
              </button>
            )}
          </div>
        ))}
      </div>
    </PanelFrame>
  );
}

export function SessionPanel({ state, onClose }: { state: PanelState; onClose: () => void }) {
  if (!state) return null;
  if (state.mode === "create") return <CreateSession onClose={onClose} />;
  return <ViewClass def={state.def} onClose={onClose} />;
}
