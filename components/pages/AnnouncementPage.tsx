"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import {
  AddButton, ConfirmDeleteModal, CrudFormModal, RowActions,
  emptyValues, valuesFrom, type CrudField, type CrudValues,
} from "../crud";
import { EmptyRow, ExportButton, PageHeader } from "../page-kit";
import { Card } from "../ui";

/* The ER model has no audience column, so what a broadcast reaches is not
   something this screen can set — the list has always shown "All". */
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
  const { announcements: rows, meAccountId, create, update, remove } = useData();

  const fields = FIELDS(t);
  const [editing, setEditing] = useState<Editing | null>(startNew ? { mode: "create" } : null);
  const [values, setValues] = useState<CrudValues>(() => emptyValues(fields));
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);

  function openCreate() {
    setValues(emptyValues(fields));
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
              rows={() => rows.map((r) => [r.title, r.audience, r.date, r.body])}
            />
            <AddButton label={t("new")} onClick={openCreate} />
          </>
        }
      />

      {editing && (
        <CrudFormModal
          title={editing.mode === "create" ? t("new") : t("editTitle")}
          fields={fields}
          values={values}
          onChange={setValues}
          onClose={() => setEditing(null)}
          submitLabel={editing.mode === "create" ? t("send") : tCommon("save")}
          onSubmit={async (payload) => {
            if (editing.mode === "create") {
              await create("announcements", {
                ...payload,
                author_user_account_id: meAccountId,
                posted_at: new Date().toISOString(),
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
                    {a.audience} · {a.date}
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
