"use client";

/* How families reach the academy: phone, email, LINE, social pages, website,
 * opening hours and one or more addresses. What is saved here is what the
 * public pages' footer, the registration form, the payment pages and every
 * email's footer show (academy_* in system_configuration). A field left empty
 * is left out of the public footer; the emails fall back to the website's.
 *
 * Read-only until the pencil is pressed, so a stray tap cannot change what
 * every family sees; Cancel puts back what is saved.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { ErrorNote, errorText } from "../crud";
import { useData } from "../DataProvider";
import { fieldStyle, labelStyle, primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Card } from "../ui";

const FIELDS = [
  { key: "academy_phone", label: "contactPhone", hint: "contactPhoneHint", type: "tel" },
  { key: "academy_email", label: "contactEmail", type: "email" },
  { key: "academy_line_id", label: "contactLine", hint: "contactLineHint", type: "text" },
  { key: "academy_facebook", label: "contactFacebook", type: "url" },
  { key: "academy_instagram", label: "contactInstagram", type: "url" },
  { key: "academy_website", label: "contactWebsite", type: "url" },
  { key: "academy_hours", label: "contactHours", hint: "contactHoursHint", type: "text" },
] as const;

const ADDRESS = "academy_address";

export function AcademyContactCard() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const { raw, setConfig } = useData();
  const saved = (key: string) => String(raw.systemConfig.find((r) => r["config_key"] === key)?.["config_value"] ?? "");

  /* Only what the admin has typed; anything untouched shows what is saved. */
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [addresses, setAddresses] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [editing, setEditing] = useState(false);

  const value = (key: string) => edits[key] ?? saved(key);
  const shownAddresses = addresses ?? (saved(ADDRESS) ? saved(ADDRESS).split("\n") : [""]);
  const addressValue = shownAddresses.map((a) => a.trim()).filter(Boolean).join("\n");
  const changed =
    FIELDS.some((f) => edits[f.key] !== undefined && edits[f.key].trim() !== saved(f.key)) ||
    (addresses !== null && addressValue !== saved(ADDRESS));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      for (const f of FIELDS) {
        const next = value(f.key).trim();
        if (next !== saved(f.key)) await setConfig(f.key, next);
      }
      if (addressValue !== saved(ADDRESS)) await setConfig(ADDRESS, addressValue);
      setEdits({});
      setAddresses(null);
      setEditing(false);
      setDone(true);
      setTimeout(() => setDone(false), 2200);
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  const hint = { fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary, marginTop: 4 } as const;
  /* Read-only fields look like text in a box, not like something to type in. */
  const field = editing ? fieldStyle : { ...fieldStyle, background: COLORS.neutralBg, color: COLORS.text, cursor: "default" };

  function cancel() {
    setEdits({});
    setAddresses(null);
    setError(null);
    setEditing(false);
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>{t("contactDesc")}</p>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setEditing(true);
            }}
            style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
          >
            <Icon name="edit" size={14} /> {t("contactEdit")}
          </button>
        )}
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {FIELDS.map((f) => (
          <label key={f.key} style={{ display: "block" }}>
            <span style={labelStyle}>{t(f.label)}</span>
            <input
              type={f.type}
              value={value(f.key)}
              readOnly={!editing}
              placeholder={editing ? undefined : "—"}
              onChange={(e) => setEdits({ ...edits, [f.key]: e.target.value })}
              style={field}
            />
            {editing && "hint" in f && f.hint && <span style={{ ...hint, display: "block" }}>{t(f.hint)}</span>}
          </label>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={labelStyle}>{t("contactAddresses")}</span>
        {shownAddresses.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <textarea
              rows={2}
              value={a}
              aria-label={t("contactAddressN", { n: i + 1 })}
              readOnly={!editing}
              onChange={(e) => {
                const next = [...shownAddresses];
                next[i] = e.target.value.replace(/\n/g, " ");
                setAddresses(next);
              }}
              style={{ ...field, flex: 1, resize: editing ? "vertical" : "none", minHeight: 52 }}
            />
            {editing && shownAddresses.length > 1 && (
              <button
                type="button"
                aria-label={t("contactRemoveAddress", { n: i + 1 })}
                onClick={() => setAddresses(shownAddresses.filter((_, j) => j !== i))}
                style={{ ...secondaryButtonStyle, padding: "8px 10px" }}
              >
                <Icon name="trash" size={15} />
              </button>
            )}
          </div>
        ))}
        {editing && (
          <button
            type="button"
            onClick={() => setAddresses([...shownAddresses, ""])}
            style={{ ...secondaryButtonStyle, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="plus" size={14} /> {t("contactAddAddress")}
          </button>
        )}
      </div>

      {done && !editing && (
        <span role="status" style={{ fontFamily: FONT, fontSize: 13, color: COLORS.success, alignSelf: "flex-end" }}>
          {t("contactSaved")}
        </span>
      )}
      {editing && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} disabled={busy} onClick={cancel}>
            {tCommon("cancel")}
          </button>
          <button type="button" className="jt-btn-primary" style={primaryButtonStyle} disabled={!changed || busy} onClick={save}>
            {busy ? tCommon("saving") : tCommon("save")}
          </button>
        </div>
      )}
    </Card>
  );
}
