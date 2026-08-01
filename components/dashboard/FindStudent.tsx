"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { searchStudents } from "@/lib/derive";
import { CLASSES_DEFS_REF } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import { Avatar, Badge, Card, SectionTitle } from "../ui";

const CREDIT_TOP_UPS = [5, 10, 20];

/** Per-student desk state: where a walk-in is in the check-in → class → dismiss cycle. */
type DeskState = {
  status: "none" | "checked_in" | "in_class" | "dismissed";
  className?: string;
  extraCredits: number;
};

type PopoverKind = "class" | "credit" | null;

export function FindStudent() {
  const router = useRouter();
  const t = useTranslations("find");
  const [query, setQuery] = useState("");
  const [desk, setDesk] = useState<Record<string, DeskState>>({});
  const [popover, setPopover] = useState<{ id: string; kind: PopoverKind }>({ id: "", kind: null });

  const results = useMemo(() => searchStudents(query), [query]);
  const showResults = query.trim().length > 0;

  function deskFor(id: string): DeskState {
    return desk[id] ?? { status: "none", extraCredits: 0 };
  }

  function update(id: string, patch: Partial<DeskState>) {
    setDesk((prev) => ({ ...prev, [id]: { ...deskFor(id), ...patch } }));
  }

  function togglePopover(id: string, kind: PopoverKind) {
    setPopover((prev) => (prev.id === id && prev.kind === kind ? { id: "", kind: null } : { id, kind }));
  }

  return (
    <div style={{ position: "relative" }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 18, overflow: "hidden" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionTitle>{t("title")}</SectionTitle>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "10px 14px",
              borderRadius: 999,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
            }}
          >
            <Icon name="search" size={17} color={COLORS.textSecondary} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholder")}
              aria-label={t("label")}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: FONT,
                fontSize: 13.5,
                color: COLORS.text,
              }}
            />
          </div>
        </div>
      </Card>

      {showResults && (
        <Card
          className="jtrax-fade-in-up"
          style={{
            marginTop: 8,
            padding: 8,
            boxShadow: "0 12px 28px rgb(36 59 99 / 0.12)",
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "26px 16px",
              }}
            >
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("noStudent")}
              </p>
              <button
                type="button"
                className="jt-btn-primary"
                onClick={() => router.push(`/students?new=${encodeURIComponent(query)}`)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 16px",
                  borderRadius: 999,
                  border: "none",
                  background: COLORS.blue,
                  color: "#fff",
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Icon name="usersPlus" size={16} color="#fff" />
                {t("registerStudent")}
              </button>
            </div>
          ) : (
            results.map((student) => {
              const state = deskFor(student.id);
              const credit = student.credit + state.extraCredits;
              const chip = statusChipColors(student.status);
              const open = popover.id === student.id ? popover.kind : null;

              const checkinLabel =
                state.status === "in_class"
                  ? t("inClass", { className: state.className ?? "" })
                  : state.status === "checked_in"
                    ? t("checkedIn")
                    : state.status === "dismissed"
                      ? t("dismissed")
                      : t("notCheckedIn");

              return (
                <div key={student.id}>
                  <div
                    className="jt-find-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 12px",
                      borderRadius: 10,
                    }}
                  >
                    <Avatar initials={initialsOf(student.name)} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text }}>
                        {student.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
                        <Badge color={COLORS.textSecondary} bg={COLORS.neutralBg}>
                          {checkinLabel}
                        </Badge>
                        <Badge color={chip.color} bg={chip.bg}>
                          {t("creditCount", { count: credit })}
                        </Badge>
                      </div>
                    </div>

                    {state.status === "none" && (
                      <button
                        type="button"
                        className="jt-btn-primary"
                        onClick={() => update(student.id, { status: "checked_in" })}
                        style={primaryBtn}
                      >
                        {t("checkIn")}
                      </button>
                    )}
                    {state.status === "checked_in" && (
                      <button
                        type="button"
                        className="jt-btn-primary"
                        onClick={() => togglePopover(student.id, "class")}
                        style={primaryBtn}
                      >
                        {t("assignClass")}
                      </button>
                    )}
                    {state.status === "in_class" && (
                      <button
                        type="button"
                        className="jt-chip"
                        onClick={() => update(student.id, { status: "dismissed" })}
                        style={ghostBtn}
                      >
                        {t("dismiss")}
                      </button>
                    )}

                    <button
                      type="button"
                      className="jt-chip"
                      onClick={() => togglePopover(student.id, "credit")}
                      style={ghostBtn}
                    >
                      {t("addCredits")}
                    </button>
                  </div>

                  {open === "class" && (
                    <div className="jtrax-fade-in-up" style={popoverStyle}>
                      {CLASSES_DEFS_REF.map((cls) => (
                        <button
                          key={cls.name}
                          type="button"
                          className="jt-chip"
                          onClick={() => {
                            update(student.id, { status: "in_class", className: cls.name });
                            setPopover({ id: "", kind: null });
                          }}
                          style={chipBtn}
                        >
                          {cls.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {open === "credit" && (
                    <div className="jtrax-fade-in-up" style={popoverStyle}>
                      {CREDIT_TOP_UPS.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          className="jt-chip"
                          onClick={() => {
                            update(student.id, { extraCredits: state.extraCredits + amount });
                            setPopover({ id: "", kind: null });
                          }}
                          style={chipBtn}
                        >
                          +{amount}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Card>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 999,
  border: "none",
  background: COLORS.blue,
  color: "#fff",
  fontFamily: FONT,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  flexShrink: 0,
};

const ghostBtn: React.CSSProperties = {
  padding: "6px 13px",
  borderRadius: 999,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  fontFamily: FONT,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 160ms ease",
  flexShrink: 0,
};

const chipBtn: React.CSSProperties = {
  padding: "6px 13px",
  borderRadius: 999,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  fontFamily: FONT,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 160ms ease",
};

const popoverStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  padding: "4px 12px 12px 60px",
};
