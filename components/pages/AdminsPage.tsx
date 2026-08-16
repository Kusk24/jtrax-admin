"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ActionButton } from "../crud";
import { generateTempPassword } from "@/lib/credentials";
import { type AdminPerson } from "@/lib/data";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, ROLE_COLORS, type JtraxRole } from "@/lib/theme";
import {
  ContactActions,
  EmptyRow,
  equalTemplate,
  fieldStyle,
  InfoGrid,
  labelStyle,
  Modal,
  dangerSolidButtonStyle,
  ExportButton,
  PageHeader,
  primaryButtonStyle,
  secondaryButtonStyle,
  selectStyle,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, SectionTitle } from "../ui";
import { DangerPanel, DeleteButton, DetailHeader, EditButton } from "../detail";
import { CardGrid, EntityCard, ViewToggle } from "../view-mode";
import { useViewMode } from "@/lib/view-mode";

const ROLES: JtraxRole[] = ["Admin", "Receptionist"];
/* Card first here: this screen was cards from the start, and staff are
   recognised by face-and-role rather than scanned down a column. */
const VIEWS = ["card", "list"] as const;
const TEMPLATE = equalTemplate(5, 100);

const EMPTY_FORM = { fullName: "", phone: "", email: "", lineId: "", role: "Admin" as JtraxRole };

export function AdminsPage() {
  const t = useTranslations("admins");
  const tCommon = useTranslations("common");
  const tRole = useTranslations("roles");
  const { admins, raw, batch, create, update, remove } = useData();
  const [mode, setMode] = useViewMode("admins", VIEWS);
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
  /* Creating an admin is an account and an admin row; the button has to stop
     taking clicks between them, or the second press fails on the unique email
     with the first one already written. */
  const [saving, setSaving] = useState(false);

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
            <ViewToggle value={mode} onChange={setMode} options={VIEWS} />
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

      {mode === "card" ? (
        <CardGrid>
          {admins.map((a) => {
            const roleColor = ROLE_COLORS[a.role];
            return (
              <EntityCard
                key={a.id}
                onClick={() => setDetailId(a.id)}
                avatar={<Avatar initials={a.initials} size={44} color={roleColor.color} bg={roleColor.bg} />}
                title={a.name}
                badges={
                  <>
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
                  </>
                }
                rows={[
                  { label: tCommon("email"), value: a.email },
                  { label: tCommon("phone"), value: a.phone },
                  { label: t("lastLoginLabel"), value: a.lastLogin },
                ]}
                footer={<ContactActions phone={a.phone} lineId={a.lineId} email={a.email} />}
              />
            );
          })}
        </CardGrid>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Table
            columns={[tCommon("name"), t("role"), tCommon("email"), tCommon("phone"), tCommon("status")]}
            template={TEMPLATE}
            minWidth={820}
          >
            {admins.length === 0 && <EmptyRow>{tCommon("loading")}</EmptyRow>}
            {admins.map((a) => {
              const roleColor = ROLE_COLORS[a.role];
              return (
                <TableRow key={a.id} template={TEMPLATE} onClick={() => setDetailId(a.id)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Avatar initials={a.initials} size={30} color={roleColor.color} bg={roleColor.bg} />
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.name}
                    </span>
                  </span>
                  <Badge color={roleColor.color} bg={roleColor.bg} style={{ justifySelf: "start" }}>
                    {tRole(a.role)}
                  </Badge>
                  <span style={{ color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.email}
                  </span>
                  <span style={{ color: COLORS.textSecondary }}>{a.phone}</span>
                  <span style={{ color: COLORS.textSecondary }}>{a.status}</span>
                </TableRow>
              );
            })}
          </Table>
        </Card>
      )}

      {detail && (
        <Modal title={detail.name} onClose={closeDetail} width={600}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Same block as every other detail view: who, what they are under
                the name, and the actions written out. */}
            <DetailHeader
              avatar={
                <Avatar
                  initials={detail.initials}
                  size={54}
                  color={ROLE_COLORS[detail.role].color}
                  bg={ROLE_COLORS[detail.role].bg}
                />
              }
              title={detail.name}
              badges={
                <Badge color={ROLE_COLORS[detail.role].color} bg={ROLE_COLORS[detail.role].bg}>
                  {tRole(detail.role)}
                </Badge>
              }
              actions={
                <>
                  <button
                    type="button"
                    className="jt-act-reset"
                    style={secondaryButtonStyle}
                    onClick={() => setResetShown(true)}
                  >
                    {t("resetPassword")}
                  </button>
                  <EditButton
                    onClick={() => {
                      openAdminModal(detail);
                      closeDetail();
                    }}
                  />
                  <DeleteButton onClick={() => setDeleteConfirm(true)} />
                </>
              }
            />

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
              <DangerPanel title={t("deleteTitle", { name: detail.name })} body={t("deleteBody")}>
                <div style={{ display: "flex", gap: 9 }}>
                  <button type="button" style={secondaryButtonStyle} onClick={() => setDeleteConfirm(false)}>
                    {tCommon("cancel")}
                  </button>
                  <ActionButton
                    style={dangerSolidButtonStyle}
                    busyLabel={tCommon("deleting")}
                    onClick={async () => {
                      const row = raw.admins.find((a) => String(a.admin_id) === detail.id);
                      try {
                        await batch(async () => {
                          await remove("admins", detail.id);
                          if (row?.user_account_id) await remove("user-accounts", String(row.user_account_id));
                        });
                      } catch (e) {
                        window.alert(e instanceof Error ? e.message : "delete failed");
                      }
                      closeDetail();
                    }}
                  >
                    {t("deleteConfirm")}
                  </ActionButton>
                </div>
              </DangerPanel>
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
                  opacity: form.fullName && form.email && !saving ? 1 : 0.5,
                  cursor: !form.fullName || !form.email ? "not-allowed" : saving ? "wait" : "pointer",
                }}
                disabled={!form.fullName || !form.email || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    if (adminModal !== "new") {
                      await update("admins", adminModal.id, {
                        name: form.fullName,
                        phone: form.phone,
                        email: form.email,
                        line_id: form.lineId,
                      });
                      setAdminModal(null);
                      return;
                    }

                    const password = generateTempPassword();
                    await batch(async () => {
                      const acct = await create("user-accounts", {
                        email: form.email,
                        password,
                        role: form.role,
                        display_name: form.fullName,
                      });
                      await create("admins", {
                        user_account_id: acct.user_account_id,
                        name: form.fullName,
                        phone: form.phone,
                        email: form.email,
                        line_id: form.lineId,
                      });
                    });
                    setAdminModal(null);
                    setCopied(false);
                    setCreated({ email: form.email, password });
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : "save failed");
                    setAdminModal(null);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? tCommon("saving") : adminModal === "new" ? t("create") : tCommon("save")}
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
