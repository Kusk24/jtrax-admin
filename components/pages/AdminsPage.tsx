"use client";

import { useState } from "react";
import { ADMIN_SEED, type AdminPerson } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, ROLE_COLORS, type JtraxRole } from "@/lib/theme";
import {
  ContactActions,
  Drawer,
  fieldStyle,
  InfoGrid,
  labelStyle,
  Modal,
  PageHeader,
  primaryButtonStyle,
  secondaryButtonStyle,
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

export function AdminsPage() {
  const [admins, setAdmins] = useState<AdminPerson[]>(ADMIN_SEED);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<AdminPerson | null>(null);
  const [resetShown, setResetShown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const detail = admins.find((a) => a.id === detailId) ?? null;

  function closeDrawer() {
    setDetailId(null);
    setEditMode(false);
    setEditDraft(null);
    setResetShown(false);
    setDeleteConfirm(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Admins"
        sub="Manage admin and super admin accounts"
        action={
          <button
            type="button"
            className="jt-btn-primary"
            style={primaryButtonStyle}
            onClick={() => {
              setForm(EMPTY_FORM);
              setCreateOpen(true);
            }}
          >
            <Icon name="plus" size={15} color="#fff" />
            Create Admin
          </button>
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
                  <div style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>
                    {a.name}
                  </div>
                  <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 7 }}>
                    <Badge color={roleColor.color} bg={roleColor.bg}>
                      {a.role}
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

              <div style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{a.email}</div>
                <div>{a.phone}</div>
                <div>Last login: {a.lastLogin}</div>
              </div>

              <ContactActions phone={a.phone} lineId={a.lineId} email={a.email} />
            </Card>
          );
        })}
      </div>

      {detail && (
        <Drawer
          title={detail.name}
          onClose={closeDrawer}
          footer={
            <>
              <button
                type="button"
                className="jt-act-edit"
                style={{ ...secondaryButtonStyle, transition: "all 160ms ease" }}
                onClick={() => {
                  setEditMode((v) => !v);
                  setEditDraft(detail);
                }}
              >
                {editMode ? "Cancel" : "Edit"}
              </button>
              <button
                type="button"
                className="jt-act-reset"
                style={{ ...secondaryButtonStyle, transition: "all 160ms ease" }}
                onClick={() => setResetShown(true)}
              >
                Reset Password
              </button>
              <button
                type="button"
                className="jt-act-danger"
                style={{ ...secondaryButtonStyle, marginLeft: "auto", transition: "all 160ms ease" }}
                onClick={() => setDeleteConfirm(true)}
              >
                Delete
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
                <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: COLORS.text }}>
                  {detail.name}
                </div>
                <Badge color={ROLE_COLORS[detail.role].color} bg={ROLE_COLORS[detail.role].bg}>
                  {detail.role}
                </Badge>
              </div>
            </div>

            {editMode && editDraft ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="ad-name">Full Name</label>
                  <input
                    id="ad-name"
                    value={editDraft.name}
                    onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ad-phone">Phone</label>
                  <input
                    id="ad-phone"
                    value={editDraft.phone}
                    onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })}
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ad-email">Email</label>
                  <input
                    id="ad-email"
                    value={editDraft.email}
                    onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })}
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="ad-role">Role</label>
                  <select
                    id="ad-role"
                    value={editDraft.role}
                    onChange={(e) => setEditDraft({ ...editDraft, role: e.target.value as JtraxRole })}
                    style={fieldStyle}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="jt-btn-primary"
                  style={primaryButtonStyle}
                  onClick={() => {
                    setAdmins(admins.map((a) => (a.id === editDraft.id ? editDraft : a)));
                    setEditMode(false);
                  }}
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <InfoGrid
                rows={[
                  { label: "Email", value: detail.email },
                  { label: "Phone", value: detail.phone },
                  { label: "LINE ID", value: detail.lineId },
                  { label: "Branch", value: detail.branch },
                  { label: "Status", value: detail.status },
                  { label: "Last login", value: detail.lastLogin },
                  { label: "Created", value: `${detail.createdDate} by ${detail.createdBy}` },
                ]}
              />
            )}

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
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                <Icon name="check" size={15} color={COLORS.warning} />
                A password reset link has been sent to {detail.email}.
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
                <div style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 700 }}>
                  Delete {detail.name}?
                </div>
                <p style={{ margin: "5px 0 12px", fontFamily: FONT, fontSize: 12.5 }}>
                  This removes their admin access immediately. This cannot be undone.
                </p>
                <div style={{ display: "flex", gap: 9 }}>
                  <button type="button" style={secondaryButtonStyle} onClick={() => setDeleteConfirm(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={{ ...primaryButtonStyle, background: COLORS.danger }}
                    onClick={() => {
                      setAdmins(admins.filter((a) => a.id !== detail.id));
                      closeDrawer();
                    }}
                  >
                    Delete Admin
                  </button>
                </div>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {createOpen && (
        <Modal
          title="Create Admin"
          onClose={() => setCreateOpen(false)}
          footer={
            <>
              <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setCreateOpen(false)}>
                Cancel
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
                onClick={() => {
                  const password = generateTempPassword();
                  const initials = form.fullName
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  setAdmins([
                    ...admins,
                    {
                      id: `admin-${Date.now()}`,
                      name: form.fullName,
                      role: form.role,
                      phone: form.phone,
                      email: form.email,
                      lineId: form.lineId,
                      branch: "Central",
                      lastLogin: "Never",
                      createdDate: new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
                      createdBy: "Mr. Jirapak",
                      status: "Active",
                      initials,
                    },
                  ]);
                  setCreateOpen(false);
                  setCopied(false);
                  setCreated({ email: form.email, password });
                }}
              >
                Create Admin
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle} htmlFor="ca-name">Full Name</label>
              <input id="ca-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ca-email">Email</label>
              <input id="ca-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ca-phone">Phone</label>
              <input id="ca-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ca-line">LINE ID</label>
              <input id="ca-line" value={form.lineId} onChange={(e) => setForm({ ...form, lineId: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ca-role">Role</label>
              <select id="ca-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as JtraxRole })} style={fieldStyle}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {created && (
        <Modal
          title="Admin Created"
          onClose={() => setCreated(null)}
          width={460}
          footer={
            <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => setCreated(null)}>
              Done
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionTitle>One-time credentials</SectionTitle>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
              Share these with the new admin now — the temporary password is not shown again.
            </p>
            <div
              style={{
                padding: 14,
                borderRadius: 11,
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 13,
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
              {copied ? "Copied" : "Copy credentials"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
