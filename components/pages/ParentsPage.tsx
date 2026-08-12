"use client";

/* Parents list and detail. Mirrors StudentsPage's list/detail shape and reuses
   the same page-kit primitives — a parent is the other half of a student row,
   so the two screens are deliberately navigable in the same way. */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { type ParentPerson } from "@/lib/data";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/lib/icons";
import { classDotColor, COLORS, FONT, initialsOf } from "@/lib/theme";
import {
  EmptyRow,
  equalTemplate,
  ExportButton,
  FilterBar,
  InfoGrid,
  PageHeader,
  paginate,
  Pagination,
  SearchInput,
  SelectFilter,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";

const TEMPLATE = equalTemplate(4, 90);

type View = { kind: "list" } | { kind: "detail"; id: string };

/* ---------------------------------------------------------------- detail --- */

function ParentDetail({ parent, onBack }: { parent: ParentPerson; onBack: () => void }) {
  const t = useTranslations("parents");
  const tCommon = useTranslations("common");

  const creditChip = (credit: number) =>
    credit <= 0
      ? { color: COLORS.danger, bg: COLORS.dangerBg }
      : credit <= 3
        ? { color: COLORS.warning, bg: COLORS.warningBg }
        : { color: COLORS.success, bg: COLORS.successBg };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: FONT,
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.textSecondary,
          padding: 0,
        }}
      >
        <Icon name="chevronLeft" size={16} color={COLORS.textSecondary} /> {t("backToParents")}
      </button>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Avatar initials={initialsOf(parent.name)} size={54} />
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: FONT,
                fontSize: 21,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              {parent.name}
            </h1>
            <p style={{ margin: "3px 0 0", fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
              {t("childCount", { count: parent.children.length })}
            </p>
          </div>
          <span style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
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
          </span>
        </div>
      </Card>

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
        </Card>

        <Card>
          <SectionTitle>{t("children")}</SectionTitle>
          {parent.children.length === 0 ? (
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
              {t("noChildren")}
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
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

export function ParentsPage() {
  const t = useTranslations("parents");
  const tCommon = useTranslations("common");
  const { parents, loading, error } = useData();
  const [view, setView] = useState<View>({ kind: "list" });
  const [search, setSearch] = useState("");
  /* "" is "all", so the label can be localised without changing the compare. */
  const [linked, setLinked] = useState("");
  const [page, setPage] = useState(0);

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

  if (view.kind === "detail") {
    const parent = parents.find((p) => p.id === view.id);
    if (parent) return <ParentDetail parent={parent} onBack={() => setView({ kind: "list" })} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title={t("title")}
        sub={t("sub")}
        action={
          <ExportButton
            filename="parents"
            columns={[t("colParent"), tCommon("email"), tCommon("phone"), t("colChildren")]}
            rows={() =>
              filtered.map((p) => [p.name, p.loginEmail || p.email, p.phone, p.children.map((c) => c.name).join(", ")])
            }
          />
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
      </FilterBar>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table
          columns={[t("colParent"), tCommon("email"), t("colChildren"), tCommon("action")]}
          template={TEMPLATE}
          minWidth={760}
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
            </TableRow>
          ))}
        </Table>
        <Pagination page={current} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}
