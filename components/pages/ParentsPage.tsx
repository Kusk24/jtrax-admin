"use client";

/* Parents list and detail. Mirrors StudentsPage's list/detail shape and reuses
   the same page-kit primitives — a parent is the other half of a student row,
   so the two screens are deliberately navigable in the same way. */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { generateTempPassword, removeIfPresent } from "@/lib/credentials";
import { type ParentPerson } from "@/lib/data";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/lib/icons";
import { classDotColor, COLORS, FONT, initialsOf } from "@/lib/theme";
import {
  AddButton,
  ConfirmDeleteModal,
  CrudFormModal,
  ErrorNote,
  RowActions,
  errorText,
  type CrudField,
  type CrudValues,
} from "../crud";
import {
  EmptyRow,
  equalTemplate,
  ExportButton,
  FilterBar,
  InfoGrid,
  labelStyle,
  Modal,
  PageHeader,
  paginate,
  Pagination,
  SearchInput,
  SelectFilter,
  secondaryButtonStyle,
  selectStyle,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";
import { BackLink, DeleteButton, DetailHeader, EditButton } from "../detail";
import { ResetPasswordButton } from "../ResetPassword";
import { CardGrid, EmptyCards, EntityCard, ViewToggle } from "../view-mode";
import { useViewMode } from "@/lib/view-mode";

const TEMPLATE = equalTemplate(5, 90);
const VIEWS = ["list", "card"] as const;

type View = { kind: "list" } | { kind: "detail"; id: string };

/* A parent is spread over four tables — the account it signs in with, the
   parent row, its contact rows and the links to its children. The form is one
   flat set of fields; these writes put it back where it belongs. */
const parentFields = (t: (k: string) => string, tCommon: (k: string) => string): CrudField[] => [
  { name: "name", label: tCommon("name"), required: true },
  { name: "loginEmail", label: t("loginEmail"), required: true, half: true },
  { name: "phone", label: tCommon("phone"), half: true },
  { name: "email", label: tCommon("email"), half: true },
  { name: "lineId", label: tCommon("lineId"), half: true },
];

/* ---------------------------------------------------------------- detail --- */

function ParentDetail({
  parent,
  onBack,
  onEdit,
  onDelete,
  unlinkedStudents,
  onLinkChild,
  onUnlinkChild,
}: {
  parent: ParentPerson;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /* Students with no parent yet — linking one that already has a parent would
     silently move them, so they are not offered. */
  unlinkedStudents: Array<{ id: string; name: string }>;
  onLinkChild: (studentId: string, relation: string) => Promise<void>;
  onUnlinkChild: (studentId: string) => Promise<void>;
}) {
  const t = useTranslations("parents");
  const tCommon = useTranslations("common");
  const { update } = useData();
  const [linking, setLinking] = useState(false);
  const [childId, setChildId] = useState("");
  const [relation, setRelation] = useState("Mother");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(job: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await job();
      setLinking(false);
      setChildId("");
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  const creditChip = (credit: number) =>
    credit <= 0
      ? { color: COLORS.danger, bg: COLORS.dangerBg }
      : credit <= 3
        ? { color: COLORS.warning, bg: COLORS.warningBg }
        : { color: COLORS.success, bg: COLORS.successBg };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <BackLink label={t("backToParents")} onClick={onBack} />

      <DetailHeader
        avatar={<Avatar initials={initialsOf(parent.name)} size={54} />}
        title={parent.name}
        subtitle={t("childCount", { count: parent.children.length })}
        badges={
          <>
            {parent.phone && (
              <a href={`tel:${parent.phone.replace(/\s/g, "")}`} className="jt-qa-call" style={contactPillStyle}>
                <Icon name="phone" size={12} /> {t("call")}
              </a>
            )}
            {parent.email && (
              <a href={`mailto:${parent.email}`} className="jt-qa-call" style={contactPillStyle}>
                <Icon name="mail" size={12} /> {t("emailAction")}
              </a>
            )}
          </>
        }
        actions={
          <>
            {/* A parent has a real address and can use the sign-in page's own
                Forgot-password link, which never puts their password in a
                third person's hands. This is for the desk visit where that has
                not worked — a full mailbox, a typo in the address, a family
                standing at the counter now. */}
            <ResetPasswordButton
              accountId={parent.accountId ?? ""}
              identifier={parent.loginEmail || parent.email}
              name={parent.name}
              update={update}
              onError={() => setError(tCommon("saveFailed"))}
            />
            <EditButton onClick={onEdit} />
            <DeleteButton onClick={onDelete} />
          </>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Card>
          <SectionTitle>{t("contactInfo")}</SectionTitle>
          <InfoGrid
            rows={[
              { label: t("loginEmail"), value: parent.loginEmail || "—" },
              { label: tCommon("phone"), value: parent.phone || "—" },
              { label: tCommon("email"), value: parent.email || "—" },
              { label: tCommon("lineId"), value: parent.lineId || "—" },
            ]}
          />
          {/* Registration used to invent an address when the box was left
              empty, so rows written before it started asking still carry one.
              Nothing can be sent there, which means the forgot-password link
              silently does nothing for these families — and the only way the
              office would find out is a parent saying the email never came.
              Said here, where it can be fixed, rather than left to be
              discovered. */}
          {parent.loginEmail.endsWith("@parent.jca.ac.th") && (
            <p style={{ margin: "10px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.warning }}>
              {t("inventedLogin")}
            </p>
          )}
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <SectionTitle>{t("children")}</SectionTitle>
            <button
              type="button"
              className="jt-btn-ghost"
              style={{ ...secondaryButtonStyle, padding: "6px 12px", fontSize: 13 }}
              onClick={() => setLinking((v) => !v)}
            >
              <Icon name="plus" size={13} /> {t("linkChild")}
            </button>
          </div>

          {linking && (
            <div
              className="jtrax-fade-in-up"
              style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 4px" }}
            >
              {unlinkedStudents.length === 0 ? (
                <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                  {t("noUnlinked")}
                </p>
              ) : (
                <>
                  <select
                    aria-label={t("linkChildLabel")}
                    value={childId}
                    onChange={(e) => setChildId(e.target.value)}
                    style={{ ...selectStyle, flex: "1 1 160px", width: "auto" }}
                  >
                    <option value="">—</option>
                    {unlinkedStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={t("relation")}
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    style={{ ...selectStyle, flex: "0 1 130px", width: "auto" }}
                  >
                    <option value="Mother">{t("relationMother")}</option>
                    <option value="Father">{t("relationFather")}</option>
                    <option value="Guardian">{t("relationGuardian")}</option>
                  </select>
                  <button
                    type="button"
                    className="jt-btn-primary"
                    style={{ ...secondaryButtonStyle, opacity: !childId || busy ? 0.75 : 1 }}
                    disabled={!childId || busy}
                    onClick={() => run(() => onLinkChild(childId, relation))}
                  >
                    {tCommon("add")}
                  </button>
                </>
              )}
            </div>
          )}

          {parent.children.length === 0 ? (
            <p style={{ margin: "12px 0 0", fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
              {t("noChildren")}
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {parent.children.map((child) => {
                const chip = creditChip(child.credit);
                return (
                  <div
                    key={child.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <Avatar initials={initialsOf(child.name)} size={30} />
                    <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                      <span style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>
                        {child.name}
                      </span>
                      <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                        {child.relation} · {child.className}
                      </span>
                    </span>
                    <Badge color={chip.color} bg={chip.bg}>
                      {t("creditsShort", { count: child.credit })}
                    </Badge>
                    <button
                      type="button"
                      className="jt-btn-ghost"
                      aria-label={t("unlinkChild", { name: child.name })}
                      disabled={busy}
                      onClick={() => run(() => onUnlinkChild(child.id))}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.surface,
                        cursor: busy ? "wait" : "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="x" size={13} color={COLORS.textSecondary} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

const contactPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 999,
  border: `1px solid ${COLORS.border}`,
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 600,
  color: COLORS.text,
  textDecoration: "none",
  transition: "all 160ms ease",
} as const;

/* ------------------------------------------------------------------ list --- */

/* `detailId` opens straight onto one parent. The student card sends the office
   here to change a guardian's own details — a parent is their own record, and
   editing one through a child's page edits a person nobody is looking at — so
   the link has to land on them rather than on a list to search again. */
export function ParentsPage({ detailId }: { detailId?: string }) {
  const t = useTranslations("parents");
  /* The temporary-password modal reuses the students namespace, which is where
     that string already lives. */
  const tStudents = useTranslations("students");
  const tCommon = useTranslations("common");
  const { parents, students, raw, loading, error, batch, create, update, remove, removePerson } = useData();
  const [view, setView] = useState<View>(detailId ? { kind: "detail", id: detailId } : { kind: "list" });
  const [mode, setMode] = useViewMode("parents", VIEWS);
  const [search, setSearch] = useState("");
  /* "" is "all", so the label can be localised without changing the compare. */
  const [linked, setLinked] = useState("");
  const [page, setPage] = useState(0);

  const fields = parentFields(t, tCommon);
  /* A guardian created from this screen can be attached to a child straight
     away. Only unclaimed students are offered: a child has one guardian, and
     linking one who already has a parent would silently move them. */
  const [linkChildId, setLinkChildId] = useState("");
  const [linkRelation, setLinkRelation] = useState("Mother");
  const [editing, setEditing] = useState<{ mode: "create" } | { mode: "edit"; parent: ParentPerson } | null>(null);
  const [values, setValues] = useState<CrudValues>({});
  const [deleting, setDeleting] = useState<ParentPerson | null>(null);
  /* Off by default: a parent leaving does not mean the children are leaving.
     Usually another guardian is linked to them afterwards. */
  const [deleteChildren, setDeleteChildren] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  /* Only students nobody has claimed. Offering one that already has a parent
     would move them, because a link is deleted by student_id. */
  const unlinkedStudents = useMemo(() => {
    const claimed = new Set(raw.studentParents.map((sp) => String(sp["student_id"])));
    return students.filter((s) => !claimed.has(s.id)).map((s) => ({ id: s.id, name: s.name }));
  }, [students, raw.studentParents]);

  function accountIdOf(parentId: string): string {
    const row = raw.parents.find((p) => String(p["parent_id"]) === parentId);
    return row ? String(row["user_account_id"] ?? "") : "";
  }

  function contactId(parentId: string, kind: string): string | undefined {
    const row = raw.parentContacts.find(
      (c) => String(c["parent_id"]) === parentId && String(c["contact_type"]) === kind,
    );
    return row ? String(row["parent_contact_id"]) : undefined;
  }

  /** Writes one contact row, creating, updating or clearing it to match. */
  async function saveContact(parentId: string, kind: string, value: string) {
    const id = contactId(parentId, kind);
    const trimmed = value.trim();
    if (!trimmed) {
      if (id) await removeIfPresent(remove, "parent-contacts", id);
      return;
    }
    if (id) await update("parent-contacts", id, { value: trimmed });
    else await create("parent-contacts", { parent_id: parentId, contact_type: kind, value: trimmed });
  }

  /* Six writes — account, parent, three contacts, notification preferences —
     as one unit, so the screen refetches once at the end rather than six
     times over. */
  async function createParent(payload: Record<string, unknown>) {
    const password = generateTempPassword();
    const loginEmail = String(payload.loginEmail ?? "").trim();
    const name = String(payload.name ?? "").trim();

    await batch(async () => {
      const account = await create("user-accounts", {
        email: loginEmail,
        password,
        role: "Parent",
        display_name: name,
      });
      const parent = await create("parents", {
        user_account_id: account.user_account_id,
        name,
      });
      const parentId = String(parent.parent_id);
      await saveContact(parentId, "phone", String(payload.phone ?? ""));
      await saveContact(parentId, "email", String(payload.email ?? ""));
      await saveContact(parentId, "line_id", String(payload.lineId ?? ""));
      /* Alerts default to on, matching what the seed gives a parent. */
      await create("notification-preferences", { parent_id: parentId }).catch(() => {});
      if (linkChildId) {
        await create("student-parents", {
          student_id: linkChildId,
          parent_id: parentId,
          relationship_type: linkRelation,
        });
      }
      setCreated({ email: loginEmail, password });
      setCopied(false);
    });
  }

  async function editParent(parent: ParentPerson, payload: Record<string, unknown>) {
    const name = String(payload.name ?? "").trim();
    await batch(async () => {
      await update("parents", parent.id, { name });
      const accountId = accountIdOf(parent.id);
      if (accountId) {
        await update("user-accounts", accountId, {
          email: String(payload.loginEmail ?? "").trim(),
          display_name: name,
        });
      }
      await saveContact(parent.id, "phone", String(payload.phone ?? ""));
      await saveContact(parent.id, "email", String(payload.email ?? ""));
      await saveContact(parent.id, "line_id", String(payload.lineId ?? ""));
    });
  }

  /* One request. The backend removes the contacts, alert preferences, family
     links, the parent and their login in a transaction — and, when asked, each
     child with everything referencing them. Doing it from here meant a dozen
     ordered deletes and nothing to undo a half-finished attempt. */
  async function deleteParent(parent: ParentPerson) {
    await removePerson("parents", parent.id, { children: deleteChildren });
    setView({ kind: "list" });
  }

  function openCreate() {
    setValues({ name: "", loginEmail: "", phone: "", email: "", lineId: "" });
    setLinkChildId("");
    setLinkRelation("Mother");
    setEditing({ mode: "create" });
  }

  function openDelete(parent: ParentPerson) {
    setDeleteChildren(false);
    setDeleting(parent);
  }

  function openEdit(parent: ParentPerson) {
    setValues({
      name: parent.name,
      loginEmail: parent.loginEmail,
      phone: parent.phone,
      email: parent.email,
      lineId: parent.lineId,
    });
    setEditing({ mode: "edit", parent });
  }

  const linkedOptions = useMemo(
    () => [
      { value: "", label: t("allParents") },
      { value: "linked", label: t("withChildren") },
      { value: "unlinked", label: t("withoutChildren") },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parents.filter((p) => {
      if (linked === "linked" && p.children.length === 0) return false;
      if (linked === "unlinked" && p.children.length > 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.loginEmail.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.children.some((c) => c.name.toLowerCase().includes(q))
      );
    });
  }, [parents, search, linked]);

  const { pageRows, totalPages, page: current } = paginate(filtered, page);

  /* Rendered from both the list and the detail branch, so opening a dialog from
     a parent's own screen does not depend on the list being mounted. */
  const dialogs = (
    <>
      {editing && (
        <CrudFormModal
          title={editing.mode === "create" ? t("add") : t("editParent")}
          fields={fields}
          values={values}
          onChange={setValues}
          onClose={() => setEditing(null)}
          onSubmit={(payload) =>
            editing.mode === "create" ? createParent(payload) : editParent(editing.parent, payload)
          }
          extra={
            editing.mode === "create" && unlinkedStudents.length > 0 ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 180px" }}>
                  <label htmlFor="parent-link-child" style={labelStyle}>{t("linkChildOnCreate")}</label>
                  <select
                    id="parent-link-child"
                    value={linkChildId}
                    onChange={(e) => setLinkChildId(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">{tCommon("none")}</option>
                    {unlinkedStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                {linkChildId && (
                  <div style={{ flex: "0 1 150px" }}>
                    <label htmlFor="parent-link-relation" style={labelStyle}>{t("relation")}</label>
                    <select
                      id="parent-link-relation"
                      value={linkRelation}
                      onChange={(e) => setLinkRelation(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="Mother">{t("relationMother")}</option>
                      <option value="Father">{t("relationFather")}</option>
                      <option value="Guardian">{t("relationGuardian")}</option>
                    </select>
                  </div>
                )}
              </div>
            ) : undefined
          }
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          what={deleting.name}
          note={deleting.children.length > 0 ? t("deleteNote") : undefined}
          extra={
            deleting.children.length > 0 ? (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  fontFamily: FONT,
                  fontSize: 13.5,
                  color: COLORS.text,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={deleteChildren}
                  onChange={(e) => setDeleteChildren(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: COLORS.danger, cursor: "pointer" }}
                />
                {t("alsoDeleteChildren", {
                  count: deleting.children.length,
                  names: deleting.children.map((c) => c.name).join(", "),
                })}
              </label>
            ) : undefined
          }
          onClose={() => { setDeleting(null); setDeleteChildren(false); }}
          onConfirm={() => deleteParent(deleting)}
        />
      )}

      {created && (
        <Modal title={t("createdTitle")} width={420} onClose={() => setCreated(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <InfoGrid
              rows={[
                { label: t("loginEmail"), value: created.email },
                {
                  label: tStudents("tempPassword"),
                  value: <strong style={{ letterSpacing: "0.04em" }}>{created.password}</strong>,
                },
              ]}
            />
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
              {t("createdHint")}
            </p>
            <button
              type="button"
              className="jt-btn-ghost"
              style={{ ...secondaryButtonStyle, alignSelf: "flex-start" }}
              onClick={() => {
                navigator.clipboard?.writeText(`${created.email} / ${created.password}`);
                setCopied(true);
              }}
            >
              <Icon name="copy" size={13} /> {copied ? t("copied") : t("copy")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );

  if (view.kind === "detail") {
    const parent = parents.find((p) => p.id === view.id);
    if (parent) {
      return (
        <>
          <ParentDetail
            parent={parent}
            onBack={() => setView({ kind: "list" })}
            onEdit={() => openEdit(parent)}
            onDelete={() => openDelete(parent)}
            unlinkedStudents={unlinkedStudents}
            onLinkChild={(studentId, relation) =>
              create("student-parents", {
                student_id: studentId,
                parent_id: parent.id,
                relationship_type: relation,
              }).then(() => undefined)
            }
            onUnlinkChild={(studentId) => remove("student-parents", studentId)}
          />
          {dialogs}
        </>
      );
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {dialogs}
      <PageHeader
        title={t("title")}
        sub={t("sub")}
        action={
          <>
            <ExportButton
              filename="parents"
              columns={[t("colParent"), tCommon("email"), tCommon("phone"), t("colChildren")]}
              rows={() =>
                filtered.map((p) => [p.name, p.loginEmail || p.email, p.phone, p.children.map((c) => c.name).join(", ")])
              }
            />
            <AddButton label={t("add")} onClick={openCreate} />
          </>
        }
      />

      <FilterBar>
        <SearchInput
          style={{ flex: "1 1 220px" }}
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder={t("searchPlaceholder")}
          label={t("searchLabel")}
        />
        <SelectFilter
          value={linked}
          onChange={(v) => {
            setLinked(v);
            setPage(0);
          }}
          options={linkedOptions}
          label={t("colChildren")}
        />
        <ViewToggle value={mode} onChange={setMode} options={VIEWS} style={{ marginLeft: "auto" }} />
      </FilterBar>

      {mode === "card" ? (
        <>
          <CardGrid>
            {pageRows.length === 0 && (
              <EmptyCards>{loading ? tCommon("loading") : error ? error : t("empty")}</EmptyCards>
            )}
            {pageRows.map((p) => (
              <EntityCard
                key={p.id}
                onClick={() => setView({ kind: "detail", id: p.id })}
                avatar={<Avatar initials={initialsOf(p.name)} size={44} />}
                title={p.name}
                subtitle={t("childCount", { count: p.children.length })}
                actions={<RowActions label={p.name} onEdit={() => openEdit(p)} onDelete={() => openDelete(p)} />}
                rows={[
                  { label: t("loginEmail"), value: p.loginEmail || p.email || "—" },
                  { label: tCommon("phone"), value: p.phone || "—" },
                  {
                    label: t("colChildren"),
                    value:
                      p.children.length === 0 ? (
                        "—"
                      ) : (
                        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {p.children.map((c) => (
                            <span key={c.id} style={{ display: "inline-flex", alignItems: "center" }}>
                              <ClassDot color={classDotColor(c.className)} />
                              {c.name}
                            </span>
                          ))}
                        </span>
                      ),
                  },
                ]}
                footer={
                  p.phone || p.email ? (
                    <span style={{ display: "flex", gap: 7 }}>
                      {p.phone && (
                        <a
                          href={`tel:${p.phone.replace(/\s/g, "")}`}
                          onClick={(e) => e.stopPropagation()}
                          className="jt-qa-call"
                          style={{ ...contactPillStyle, flex: 1, justifyContent: "center" }}
                        >
                          <Icon name="phone" size={12} /> {t("call")}
                        </a>
                      )}
                      {p.email && (
                        <a
                          href={`mailto:${p.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="jt-qa-call"
                          style={{ ...contactPillStyle, flex: 1, justifyContent: "center" }}
                        >
                          <Icon name="mail" size={12} /> {t("emailAction")}
                        </a>
                      )}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </CardGrid>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </>
      ) : (
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table
          columns={[t("colParent"), tCommon("email"), t("colChildren"), tCommon("phone"), tCommon("action")]}
          template={TEMPLATE}
          minWidth={860}
        >
          {pageRows.length === 0 && (
            <EmptyRow>{loading ? tCommon("loading") : error ? error : t("empty")}</EmptyRow>
          )}
          {pageRows.map((p) => (
            <TableRow key={p.id} template={TEMPLATE} onClick={() => setView({ kind: "detail", id: p.id })}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Avatar initials={initialsOf(p.name)} size={30} />
                <span
                  style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {p.name}
                </span>
              </span>
              <span
                style={{
                  color: COLORS.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.loginEmail || p.email || "—"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
                {p.children.length === 0 ? (
                  <span style={{ color: COLORS.textSecondary }}>—</span>
                ) : (
                  p.children.map((c) => (
                    <span
                      key={c.id}
                      style={{ display: "inline-flex", alignItems: "center", color: COLORS.textSecondary }}
                    >
                      <ClassDot color={classDotColor(c.className)} />
                      {c.name}
                    </span>
                  ))
                )}
              </span>
              {p.phone ? (
                <a
                  href={`tel:${p.phone.replace(/\s/g, "")}`}
                  onClick={(e) => e.stopPropagation()}
                  className="jt-qa-call"
                  style={{ ...contactPillStyle, justifySelf: "start" }}
                >
                  <Icon name="phone" size={12} /> {t("call")}
                </a>
              ) : (
                <span style={{ color: COLORS.textSecondary }}>—</span>
              )}
              <RowActions label={p.name} onEdit={() => openEdit(p)} onDelete={() => openDelete(p)} />
            </TableRow>
          ))}
        </Table>
        <Pagination page={current} totalPages={totalPages} onChange={setPage} />
      </Card>
      )}
    </div>
  );
}
