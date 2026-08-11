"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { type AdminPerson } from "@/lib/data";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, ROLE_COLORS, type JtraxRole } from "@/lib/theme";
import {
  ContactActions,
  fieldStyle,
  InfoGrid,
  labelStyle,
  Modal,
  ExportButton,
  PageHeader,
  primaryButtonStyle,
  secondaryButtonStyle,
  selectStyle,
} from "../page-kit";
import { Avatar, Badge, Card, SectionTitle } from "../ui";

const ROLES: JtraxRole[] = ["Super Admin", "Admin", "Receptionist"];

/** Mirrors the mockup's generateTempPassword: 8 chars mixing the four classes. */
function generateTempPassword(): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%&*"];
  const out: string[] = [];
  for (let i = 0; i < 8; i++) {
    const set = sets[i % sets.length];
    out.push(set[Math.floor(Math.random() * set.length)]);
  }
  /* Shuffle so the class order isn't predictable. */
  return out.sort(() => Math.random() - 0.5).join("");
}

const EMPTY_FORM = { fullName: "", phone: "", email: "", lineId: "", role: "Admin" as JtraxRole };

/* Admin names carry an honorific, so the shared `initialsOf` (first two words)
   would badge Ms. Chloe Claire "MC". The seed takes the last two words —
   Mr. Jirapak MJ, Ms. Chloe Claire CC — and renaming has to keep matching it. */
function adminInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function AdminsPage() {
  const t = useTranslations("admins");
  const tCommon = useTranslations("common");
  const tRole = useTranslations("roles");
  const { admins, raw, create, update, remove } = useData();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [resetShown, setResetShown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  /* One modal for both jobs, as on the Academy page: "new" creates, an admin
     edits. Editing opens the same form rather than unfolding fields inside the
     drawer. */
  const [adminModal, setAdminModal] = useState<AdminPerson | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const detail = admins.find((a) => a.id === detailId) ?? null;

  function closeDetail() {
    setDetailId(null);
    setResetShown(false);
    setDeleteConfirm(false);
  }

  function openAdminModal(admin: AdminPerson | "new") {
    setAdminModal(admin);
    setForm(
      admin === "new"
        ? EMPTY_FORM
        : {
            fullName: admin.name,
            phone: admin.phone,
            email: admin.email,
            lineId: admin.lineId,
            role: admin.role,
          },
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title={t("title")}
        sub={t("sub")}
        action={
          <>
            <ExportButton
              filename="admins"
              columns={[tCommon("name"), t("role"), tCommon("email"), tCommon("phone"), tCommon("branch"), tCommon("status")]}
              rows={() => admins.map((a) => [a.name, a.role, a.email, a.phone, a.branch, a.status])}
            />
            <button
              type="button"
              className="jt-btn-primary"
              style={primaryButtonStyle}
              onClick={() => openAdminModal("new")}
            >
              <Icon name="plus" size={15} color="#fff" />
              {t("create")}
            </button>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {admins.map((a) => {
          const roleColor = ROLE_COLORS[a.role];
          return (
            <Card
              key={a.id}
              className="jt-adm-card"
              style={{ display: "flex", flexDirection: "column", gap: 13, cursor: "pointer" }}
            >
              <div
                onClick={() => setDetailId(a.id)}
                style={{ display: "flex", alignItems: "center", gap: 11 }}
              >
                <Avatar initials={a.initials} size={44} color={roleColor.color} bg={roleColor.bg} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: 15.5, fontWeight: 700, color: COLORS.text }}>
                    {a.name}
                  </div>
                  <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 7 }}>
                    <Badge color={roleColor.color} bg={roleColor.bg}>
                      {tRole(a.role)}
                    </Badge>
                    <span
                      style={{
                        display: "inline-block",
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: a.status === "Active" ? COLORS.success : COLORS.textSecondary,
                      }}
                      title={a.status}
                    />
                  </div>
                </div>
              </div>

              <div style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{a.email}</div>
                <div>{a.phone}</div>
                <div>{t("lastLogin", { value: a.lastLogin })}</div>
              </div>

              <ContactActions phone={a.phone} lineId={a.lineId} email={a.email} />
            </Card>
          );
        })}
      </div>

      {detail && (
        <Modal
          title={detail.name}
          onClose={closeDetail}
          footer={
            <>
              {/* Delete carries the auto margin so it sits apart from the two
                  routine actions — the footer justifies to the end. */}
              <button
                type="button"
                className="jt-act-danger"
                style={{ ...secondaryButtonStyle, marginRight: "auto" }}
                onClick={() => setDeleteConfirm(true)}
              >
                {tCommon("delete")}
              </button>
              <button
                type="button"
                className="jt-act-reset"
                style={secondaryButtonStyle}
                onClick={() => setResetShown(true)}
              >
                {t("resetPassword")}
              </button>
              <button
                type="button"
                className="jt-act-edit"
                style={secondaryButtonStyle}
                onClick={() => {
                  openAdminModal(detail);
                  closeDetail();
                }}
              >
                <Icon name="edit" size={13} /> {tCommon("edit")}
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar
                initials={detail.initials}
                size={54}
                color={ROLE_COLORS[detail.role].color}
                bg={ROLE_COLORS[detail.role].bg}
              />
              <div>
                <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: COLORS.text }}>
                  {detail.name}
                </div>
                <Badge color={ROLE_COLORS[detail.role].color} bg={ROLE_COLORS[detail.role].bg}>
                  {tRole(detail.role)}
                </Badge>
              </div>
            </div>

            <InfoGrid
              rows={[
                { label: tCommon("email"), value: detail.email },
                { label: tCommon("phone"), value: detail.phone },
                { label: tCommon("lineId"), value: detail.lineId },
                { label: tCommon("branch"), value: detail.branch },
                { label: tCommon("status"), value: detail.status },
                { label: t("lastLoginLabel"), value: detail.lastLogin },
                { label: t("created"), value: t("createdValue", { date: detail.createdDate, by: detail.createdBy }) },
              ]}
            />

            {resetShown && (
              <div
                className="jtrax-fade-in-up"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 13px",
                  borderRadius: 10,
                  background: COLORS.warningBg,
                  color: COLORS.warning,
                  fontFamily: FONT,
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                <Icon name="check" size={15} color={COLORS.warning} />
                {t("resetSent", { email: detail.email })}
              </div>
            )}

            {deleteConfirm && (
              <div
                className="jtrax-fade-in-up"
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #B13F3F",
                  background: "#FAE2E2",
                  color: "#541111",
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 700 }}>
                  {t("deleteTitle", { name: detail.name })}
                </div>
                <p style={{ margin: "5px 0 12px", fontFamily: FONT, fontSize: 13.5 }}>
                  {t("deleteBody")}
                </p>
                <div style={{ display: "flex", gap: 9 }}>
                  <button type="button" style={secondaryButtonStyle} onClick={() => setDeleteConfirm(false)}>
                    {tCommon("cancel")}
                  </button>
                  <button
                    type="button"
                    style={{ ...primaryButtonStyle, background: COLORS.danger }}
                    onClick={() => {
                      const row = raw.admins.find((a) => String(a.admin_id) === detail.id);
                      remove("admins", detail.id)
                        .then(() => (row?.user_account_id ? remove("user-accounts", String(row.user_account_id)) : undefined))
                        .catch((e) => window.alert(e instanceof Error ? e.message : "delete failed"));
                      closeDetail();
                    }}
                  >
                    {t("deleteConfirm")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {adminModal && (
        <Modal
          title={adminModal === "new" ? t("create") : t("editAdmin")}
          onClose={() => setAdminModal(null)}
          footer={
            <>
              <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setAdminModal(null)}>
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                className="jt-btn-primary"
                style={{
                  ...primaryButtonStyle,
                  opacity: form.fullName && form.email ? 1 : 0.5,
                  cursor: form.fullName && form.email ? "pointer" : "not-allowed",
                }}
                disabled={!form.fullName || !form.email}
                onClick={async () => {
                  if (adminModal !== "new") {
                    try {
                      await update("admins", adminModal.id, {
                        name: form.fullName,
                        phone: form.phone,
                        email: form.email,
                        line_id: form.lineId,
                      });
                    } catch (e) {
                      window.alert(e instanceof Error ? e.message : "save failed");
                    }
                    setAdminModal(null);
                    return;
                  }

                  const password = generateTempPassword();
                  try {
                    const acct = await create("user-accounts", {
                      email: form.email,
                      password,
                      role: form.role === "Receptionist" ? "Receptionist" : "Admin",
                      display_name: form.fullName,
                    });
                    await create("admins", {
                      user_account_id: acct.user_account_id,
                      name: form.fullName,
                      phone: form.phone,
                      email: form.email,
                      line_id: form.lineId,
                    });
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : "create failed");
                    setAdminModal(null);
                    return;
                  }
                  setAdminModal(null);
                  setCopied(false);
                  setCreated({ email: form.email, password });
                }}
              >
                {adminModal === "new" ? t("create") : tCommon("save")}
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle} htmlFor="ca-name">{tCommon("name")}</label>
              <input id="ca-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ca-email">{tCommon("email")}</label>
              <input id="ca-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ca-phone">{tCommon("phone")}</label>
              <input id="ca-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ca-line">{tCommon("lineId")}</label>
              <input id="ca-line" value={form.lineId} onChange={(e) => setForm({ ...form, lineId: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ca-role">{t("role")}</label>
              <select id="ca-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as JtraxRole })} style={selectStyle}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{tRole(r)}</option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {created && (
        <Modal
          title={t("createdTitle")}
          onClose={() => setCreated(null)}
          width={460}
          footer={
            <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => setCreated(null)}>
              {tCommon("done")}
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionTitle>{t("credentials")}</SectionTitle>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
              {t("credentialsHint")}
            </p>
            <div
              style={{
                padding: 14,
                borderRadius: 11,
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 14,
                color: COLORS.text,
                lineHeight: 1.8,
                wordBreak: "break-all",
              }}
            >
              <div>{created.email}</div>
              <div style={{ fontWeight: 700 }}>{created.password}</div>
            </div>
            <button
              type="button"
              className="jt-btn-ghost"
              style={secondaryButtonStyle}
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(`${created.email} / ${created.password}`)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false));
              }}
            >
              <Icon name={copied ? "check" : "copy"} size={14} />
              {copied ? t("copied") : t("copyCredentials")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
