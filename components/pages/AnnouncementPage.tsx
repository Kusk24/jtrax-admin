"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useData } from "@/components/DataProvider";
import type { Announcement, AnnouncementAudience } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { liveClasses } from "@/lib/live";
import { COLORS, FONT } from "@/lib/theme";
import {
  AddButton, ConfirmDeleteModal, CrudFormModal, RowActions,
  emptyValues, valuesFrom, type CrudField, type CrudValues,
} from "../crud";
import { MultiSearchSelect } from "../MultiSearchSelect";
import { EmptyRow, ExportButton, PageHeader, labelStyle, selectStyle } from "../page-kit";
import { Card } from "../ui";

const AUDIENCES: AnnouncementAudience[] = ["all", "classes", "parents"];

const FIELDS = (t: (k: string) => string): CrudField[] => [
  { name: "title", label: t("titleField"), required: true },
  { name: "body", label: t("message"), kind: "textarea", required: true },
];

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
  const [editing, setEditing] = useState<Editing | null>(startNew ? { mode: "create" } : null);
  const [values, setValues] = useState<CrudValues>(() => emptyValues(fields));
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  /* Who a new announcement goes to. Every parent unless the office narrows
     it; fixed once it is sent — it has already reached those families. */
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [audienceIds, setAudienceIds] = useState<string[]>([]);

  const classOptions = useMemo(
    () =>
      liveClasses({ classes: raw.classes }).map((c) => ({
        id: String(c["class_id"]),
        label: String(c["name"] ?? ""),
      })),
    [raw.classes],
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
    const nameOf = (id: string) =>
      pool.find((o) => o.id === id)?.label ??
      String(raw.classes.find((c) => String(c["class_id"]) === id)?.["name"] ?? id);
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
    setValues(valuesFrom(fields, { title: row.title, body: row.body }));
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
          submitLabel={editing.mode === "create" ? t("send") : tCommon("save")}
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
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: 15.5, fontWeight: 700, color: COLORS.text }}>
                    {a.title}
                  </div>
                  <div style={{ marginTop: 2, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                    {t("toAudience", { audience: audienceLabel(a) })} · {a.date}
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
