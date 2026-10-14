"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { classTypeOf } from "@/lib/class-face";
import { useCourseLabel } from "../CourseName";
import { useData } from "@/components/DataProvider";
import type { Announcement, AnnouncementAudience } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { fmtDate, liveClasses } from "@/lib/live";
import { COLORS, FONT } from "@/lib/theme";
import {
  AddButton, ConfirmDeleteModal, CrudFormModal, RowActions,
  emptyValues, valuesFrom, type CrudField, type CrudValues,
} from "../crud";
import { MultiSearchSelect } from "../MultiSearchSelect";
import { EmptyRow, ExportButton, PageHeader, labelStyle, selectStyle } from "../page-kit";
import { Badge, Card } from "../ui";

function WindowBadge({ state }: { state: "scheduled" | "showing" | "ended" }) {
  const t = useTranslations("announcement");
  const look = {
    scheduled: { color: COLORS.warning, bg: COLORS.warningBg },
    showing: { color: COLORS.success, bg: COLORS.successBg },
    ended: { color: COLORS.textSecondary, bg: COLORS.light },
  }[state];
  return <Badge color={look.color} bg={look.bg}>{t(`window_${state}`)}</Badge>;
}

const AUDIENCES: AnnouncementAudience[] = ["all", "classes", "parents"];

const FIELDS = (t: (k: string) => string): CrudField[] => [
  { name: "title", label: t("titleField"), required: true },
  { name: "body", label: t("message"), kind: "textarea", required: true },
  /* When parents see it; blank is now / no end. */
  { name: "show_from", label: t("showFrom"), kind: "datetime", half: true, help: t("showFromHelp") },
  { name: "show_until", label: t("showUntil"), kind: "datetime", half: true, help: t("showUntilHelp") },
];

/** Where an announcement stands for parents right now. */
export function windowState(a: { showFrom: string; showUntil: string }, now: string): "scheduled" | "showing" | "ended" {
  if (a.showFrom && a.showFrom > now) return "scheduled";
  if (a.showUntil && a.showUntil <= now) return "ended";
  return "showing";
}

/** Now as "YYYY-MM-DDTHH:MM", the shape the window is stored in. */
function nowMinute(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "12 Oct 2026, 09:00". */
function fmtWhen(v: string): string {
  const [day, time] = v.split("T");
  return `${fmtDate(day)}, ${time}`;
}

/** The end of a window: its time alone when it ends the day it starts, so
    the day is not written twice ("14 Oct 2026, 22:55 – 22:59"). */
function fmtUntil(from: string, until: string): string {
  return from && from.slice(0, 10) === until.slice(0, 10) ? until.split("T")[1] ?? until : fmtWhen(until);
}

type Editing = { mode: "create" } | { mode: "edit"; id: string };

export function AnnouncementPage({
  startNew,
}: {
  /* The dashboard's "New Announcement" pill, which means the composer and not
     the list of what has already gone out. */
  startNew?: boolean;
}) {
  const t = useTranslations("announcement");
  const tCommon = useTranslations("common");
  const { announcements: rows, meAccountId, create, update, remove, raw } = useData();

  const fields = FIELDS(t);
  const now = nowMinute();
  const [editing, setEditing] = useState<Editing | null>(startNew ? { mode: "create" } : null);
  const [values, setValues] = useState<CrudValues>(() => emptyValues(fields));
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  /* Who a new announcement goes to. Every parent unless the office narrows
     it; fixed once it is sent — it has already reached those families. */
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const courseLabel = useCourseLabel();
  const [audienceIds, setAudienceIds] = useState<string[]>([]);

  const classOptions = useMemo(
    () =>
      /* "JCA NXT · Private": one name can run as both. */
      liveClasses({ classes: raw.classes }).map((c) => ({
        id: String(c["class_id"]),
        label: courseLabel(String(c["name"] ?? ""), classTypeOf(c["class_type"])),
      })),
    [raw.classes, courseLabel],
  );
  /* Each parent with their children beside the name, so two Sarahs can be
     told apart. */
  const parentOptions = useMemo(
    () =>
      raw.parents
        .map((p) => {
          const id = String(p["parent_id"]);
          const children = raw.studentParents
            .filter((sp) => String(sp["parent_id"]) === id)
            .map((sp) => raw.students.find((st) => String(st["student_id"]) === String(sp["student_id"])))
            .map((st) => String(st?.["name"] ?? ""))
            .filter(Boolean);
          return {
            id,
            label: String(p["name"] ?? ""),
            sub: children.length ? t("parentOf", { children: children.join(", ") }) : undefined,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [raw.parents, raw.studentParents, raw.students, t],
  );

  /** "All parents", or the names of the classes / parents it went to. */
  function audienceLabel(a: Announcement): string {
    if (a.audienceKind === "all") return t("audienceAll");
    const pool = a.audienceKind === "classes" ? classOptions : parentOptions;
    /* A class since archived still has its name on the raw row. */
    const nameOf = (id: string) => {
      const known = pool.find((o) => o.id === id)?.label;
      if (known) return known;
      const cls = raw.classes.find((c) => String(c["class_id"]) === id);
      return cls ? courseLabel(String(cls["name"] ?? ""), classTypeOf(cls["class_type"])) : id;
    };
    return a.audienceIds.map(nameOf).join(", ");
  }

  function openCreate() {
    setValues(emptyValues(fields));
    setAudience("all");
    setAudienceIds([]);
    setEditing({ mode: "create" });
  }

  function openEdit(row: (typeof rows)[number]) {
    if (!row.id) return;
    setValues(valuesFrom(fields, { title: row.title, body: row.body, show_from: row.showFrom, show_until: row.showUntil }));
    setEditing({ mode: "edit", id: row.id });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title={t("title")}
        sub={t("sub")}
        action={
          <>
            <ExportButton
              filename="announcements"
              columns={[t("titleField"), t("audience"), tCommon("date"), t("message")]}
              rows={() => rows.map((r) => [r.title, audienceLabel(r), r.date, r.body])}
            />
            <AddButton label={t("new")} onClick={openCreate} />
          </>
        }
      />

      {editing && (
        <CrudFormModal
          title={editing.mode === "create" ? t("new") : t("editTitle")}
          isEdit={editing.mode !== "create"}
          fields={fields}
          values={values}
          onChange={setValues}
          onClose={() => setEditing(null)}
          submitLabel={
            editing.mode !== "create" ? tCommon("save")
              : String(values.show_from ?? "") > now ? t("schedule")
              : t("send")
          }
          extra={
            editing.mode === "create" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelStyle}>{t("audience")}</span>
                  <select
                    value={audience}
                    onChange={(e) => {
                      setAudience(e.target.value as AnnouncementAudience);
                      setAudienceIds([]);
                    }}
                    style={selectStyle}
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a} value={a}>
                        {t(`audience_${a}`)}
                      </option>
                    ))}
                  </select>
                </label>
                {audience === "classes" && (
                  <MultiSearchSelect
                    label={t("searchClass")}
                    placeholder={t("searchClassPlaceholder")}
                    options={classOptions}
                    selected={audienceIds}
                    onChange={setAudienceIds}
                    noMatches={t("noClassMatches")}
                  />
                )}
                {audience === "parents" && (
                  <MultiSearchSelect
                    label={t("searchParent")}
                    placeholder={t("searchParentPlaceholder")}
                    options={parentOptions}
                    selected={audienceIds}
                    onChange={setAudienceIds}
                    noMatches={t("noParentMatches")}
                  />
                )}
              </div>
            ) : (
              /* Already sent: who it reached is a fact, not a setting. */
              <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {t("sentTo", { audience: audienceLabel(rows.find((r) => r.id === editing.id)!) })}
              </p>
            )
          }
          onSubmit={async (payload) => {
            const from = String(payload.show_from ?? ""), until = String(payload.show_until ?? "");
            if (from && until && until <= from) throw new Error(t("endBeforeStart"));
            if (editing.mode === "create") {
              if (audience !== "all" && audienceIds.length === 0) {
                throw new Error(audience === "classes" ? t("chooseAClass") : t("chooseAParent"));
              }
              await create("announcements", {
                ...payload,
                author_user_account_id: meAccountId,
                posted_at: new Date().toISOString(),
                audience,
                audience_ids: JSON.stringify(audience === "all" ? [] : audienceIds),
              });
            } else {
              await update("announcements", editing.id, payload);
            }
          }}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          what={deleting.title}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove("announcements", deleting.id)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.length === 0 && (
          <Card>
            <EmptyRow>{t("empty")}</EmptyRow>
          </Card>
        )}
        {rows.map((a, i) => (
          <Card key={a.id ?? `${a.title}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 11, minWidth: 0 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: COLORS.light,
                    flexShrink: 0,
                  }}
                >
                  <Icon name="announcement" size={17} color={COLORS.blue} />
                </span>
                {/* Title with whether it is showing; then who it is to; then
                    when — the day posted and, if it has one, its window. */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FONT, fontSize: 15.5, fontWeight: 700, color: COLORS.text }}>
                      {a.title}
                    </span>
                    {(a.showFrom || a.showUntil) && <WindowBadge state={windowState(a, now)} />}
                  </div>
                  {/* Who it is to: the people icon says "to", so the line is the
                      audience alone; "To: …" stays as its tooltip. */}
                  <div
                    title={t("toAudience", { audience: audienceLabel(a) })}
                    style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6, fontFamily: FONT, fontSize: 13, color: COLORS.text }}
                  >
                    <Icon name="parents" size={14} color={COLORS.textSecondary} />
                    {audienceLabel(a)}
                  </div>
                  {/* The window when it has one (when it shows), else the day
                      it was posted — never both, which wrote the day twice. */}
                  <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 6, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                    <Icon name="clockSmall" size={14} color={COLORS.textSecondary} />
                    {a.showFrom && a.showUntil
                      ? t("windowBoth", { from: fmtWhen(a.showFrom), until: fmtUntil(a.showFrom, a.showUntil) })
                      : a.showFrom
                        ? t("windowFrom", { from: fmtWhen(a.showFrom) })
                        : a.showUntil
                          ? t("windowUntil", { until: fmtWhen(a.showUntil) })
                          : a.date}
                  </div>
                </div>
              </div>
              {a.id && (
                <RowActions
                  label={a.title}
                  onEdit={() => openEdit(a)}
                  onDelete={() => setDeleting({ id: a.id!, title: a.title })}
                />
              )}
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: FONT,
                fontSize: 14,
                lineHeight: 1.55,
                color: COLORS.textSecondary,
              }}
            >
              {a.body}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
