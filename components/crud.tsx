"use client";

/**
 * The pieces every managed table needs: a form modal driven by a field spec, a
 * delete confirmation, and the row buttons that open them.
 *
 * Written once because the console manages twenty-odd resources and hand-rolling
 * a form per resource is how they drift apart — a required field enforced on one
 * screen and not the next, an error swallowed here and alerted there.
 */

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { fieldStyle, labelStyle, Modal, primaryButtonStyle, secondaryButtonStyle, selectStyle } from "./page-kit";

export type FieldKind = "text" | "number" | "date" | "time" | "select" | "textarea" | "checkbox";

export type CrudField = {
  name: string;
  label: string;
  kind?: FieldKind;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
  help?: string;
  /* Half-width, so two short fields share a row. */
  half?: boolean;
  min?: number;
  step?: number;
};

export type CrudValues = Record<string, string | number | boolean>;

/** Blank values for a spec, so a create form starts controlled. */
export function emptyValues(fields: CrudField[]): CrudValues {
  const out: CrudValues = {};
  for (const f of fields) out[f.name] = f.kind === "checkbox" ? false : "";
  return out;
}

/** Reads a row into the shape the form wants, leaving absent keys blank. */
export function valuesFrom(fields: CrudField[], row: Record<string, unknown>): CrudValues {
  const out: CrudValues = {};
  for (const f of fields) {
    const raw = row[f.name];
    if (f.kind === "checkbox") out[f.name] = raw === true || raw === 1;
    else out[f.name] = raw == null ? "" : String(raw);
  }
  return out;
}

/**
 * Turns form values into a request body: numbers parsed, checkboxes made
 * boolean, blank optional text dropped so a PATCH does not overwrite a column
 * with an empty string the user never touched.
 */
export function toPayload(fields: CrudField[], values: CrudValues): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.kind === "checkbox") {
      body[f.name] = Boolean(v);
      continue;
    }
    const s = String(v ?? "").trim();
    if (s === "") {
      if (f.required) body[f.name] = "";
      continue;
    }
    body[f.name] = f.kind === "number" ? Number(s) : s;
  }
  return body;
}

/** The first required field left blank, or undefined when the form is complete. */
export function firstMissing(fields: CrudField[], values: CrudValues): CrudField | undefined {
  return fields.find((f) => f.required && f.kind !== "checkbox" && String(values[f.name] ?? "").trim() === "");
}

/** A failed request in the user's terms — the API's message when it sent one. */
export function errorText(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "9px 12px",
        borderRadius: 9,
        background: COLORS.dangerBg,
        color: COLORS.danger,
        fontFamily: FONT,
        fontSize: 13.5,
        lineHeight: 1.45,
      }}
    >
      <Icon name="alertTriangle" size={15} color={COLORS.danger} />
      <span>{children}</span>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
  id,
}: {
  field: CrudField;
  value: string | number | boolean;
  onChange: (v: string | boolean) => void;
  id: string;
}) {
  const kind = field.kind ?? "text";

  if (kind === "checkbox") {
    return (
      <label
        htmlFor={id}
        style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: FONT, fontSize: 14.5, color: COLORS.text, cursor: "pointer" }}
      >
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: COLORS.blue, cursor: "pointer" }}
        />
        {field.label}
      </label>
    );
  }

  const control =
    kind === "select" ? (
      <select id={id} value={String(value)} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        <option value="">—</option>
        {(field.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ) : kind === "textarea" ? (
      <textarea
        id={id}
        rows={4}
        value={String(value)}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }}
      />
    ) : (
      <input
        id={id}
        type={kind === "number" ? "number" : kind === "date" ? "date" : kind === "time" ? "time" : "text"}
        value={String(value)}
        placeholder={field.placeholder}
        min={field.min}
        step={field.step}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    );

  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {field.label}
        {field.required && <span style={{ color: COLORS.danger }}> *</span>}
      </label>
      {control}
      {field.help && (
        <p style={{ margin: "5px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
          {field.help}
        </p>
      )}
    </div>
  );
}

/**
 * Create/edit dialog. `onSubmit` receives the payload and may throw — the
 * message is shown in the form and the dialog stays open, rather than closing
 * over a failed write.
 */
export function CrudFormModal({
  title,
  fields,
  values,
  onChange,
  onClose,
  onSubmit,
  submitLabel,
  extra,
}: {
  title: string;
  fields: CrudField[];
  values: CrudValues;
  onChange: (values: CrudValues) => void;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
  /* Anything the resource needs beyond a flat field list — child pickers,
     generated-password notices — rendered under the fields. */
  extra?: ReactNode;
}) {
  const t = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const missing = firstMissing(fields, values);
    if (missing) {
      setError(t("fieldRequired", { field: missing.label }));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(toPayload(fields, values));
      onClose();
    } catch (e) {
      setError(errorText(e, t("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="jt-btn-primary"
            style={{ ...primaryButtonStyle, opacity: busy ? 0.6 : 1, cursor: busy ? "wait" : "pointer" }}
            disabled={busy}
            onClick={submit}
          >
            {submitLabel ?? t("save")}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
          {fields.map((f) => (
            <div key={f.name} style={{ gridColumn: f.half ? "span 1" : "span 2" }}>
              <Field
                field={f}
                id={`crud-${f.name}`}
                value={values[f.name]}
                onChange={(v) => onChange({ ...values, [f.name]: v })}
              />
            </div>
          ))}
        </div>
        {extra}
      </div>
    </Modal>
  );
}

/**
 * Delete confirmation. Names the row and says what else goes with it, because
 * the backend answers a referenced row with a 409 rather than cascading.
 */
export function ConfirmDeleteModal({
  what,
  note,
  onClose,
  onConfirm,
}: {
  what: string;
  note?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      title={t("deleteTitle")}
      width={440}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            style={{
              ...primaryButtonStyle,
              background: COLORS.danger,
              opacity: busy ? 0.6 : 1,
              cursor: busy ? "wait" : "pointer",
            }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onConfirm();
                onClose();
              } catch (e) {
                setError(errorText(e, t("deleteFailed")));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("delete")}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {error && <ErrorNote>{error}</ErrorNote>}
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 14.5, lineHeight: 1.55, color: COLORS.text }}>
          {t("deleteConfirm", { what })}
        </p>
        {note && (
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, lineHeight: 1.5, color: COLORS.textSecondary }}>
            {note}
          </p>
        )}
      </div>
    </Modal>
  );
}

const iconButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  cursor: "pointer",
  flexShrink: 0,
} as const;

/** Edit + delete buttons for a table row. Clicks stop here so a row that also
    opens a detail view does not fire underneath them. */
export function RowActions({
  onEdit,
  onDelete,
  label,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  /* Names the row, so the buttons read as "Edit Emma Carter" to a screen reader
     instead of nine identical "Edit"s. */
  label: string;
}) {
  const t = useTranslations("common");
  const stop = (e: React.MouseEvent, run?: () => void) => {
    e.stopPropagation();
    run?.();
  };
  return (
    <div style={{ display: "flex", gap: 7 }}>
      {onEdit && (
        <button
          type="button"
          className="jt-btn-ghost"
          aria-label={t("editThing", { what: label })}
          onClick={(e) => stop(e, onEdit)}
          style={iconButtonStyle}
        >
          <Icon name="edit" size={14} color={COLORS.textSecondary} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="jt-btn-ghost"
          aria-label={t("deleteThing", { what: label })}
          onClick={(e) => stop(e, onDelete)}
          style={iconButtonStyle}
        >
          <Icon name="trash" size={14} color={COLORS.danger} />
        </button>
      )}
    </div>
  );
}

/** "Add <thing>" button, the entry point on every managed list. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={onClick}>
      <Icon name="plus" size={14} color="#fff" /> {label}
    </button>
  );
}
