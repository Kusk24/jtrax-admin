"use client";

/* The courses a child is in.

   Active by default: the courses they are in now, with their status, credits,
   credit status and dates. A course they have left but that still holds
   credits shows too — it is the one row that needs a decision.

   All is the whole story as one table, newest first on a timeline: each row
   also says what last happened to it — joined, moved from one course, moved
   on to another, or left — and when. */
import { useTranslations } from "next-intl";
import type { CreditMoveIn, EnrolmentEvent } from "@/lib/course-history";
import type { Student } from "@/lib/data";
import { fmtDate } from "@/lib/live";
import { classDotColor, COLORS, FONT, statusChipColors } from "@/lib/theme";
import { useViewMode } from "@/lib/view-mode";
import { MoreMenu, type MoreMenuItem } from "../MoreMenu";
import { Table, TableRow } from "../page-kit";
import { Badge, Card, ClassDot } from "../ui";
import { CardGrid, ViewToggle } from "../view-mode";

export type EnrolmentItem = {
  id: string;
  className: string;
  /** The enrolment's own status: Active, Withdrawn, Completed. */
  status: string;
  active: boolean;
  /** Deleted by the office; kept for the history, shown only under All. */
  deleted?: boolean;
  balance: number;
  /** The balance right after the latest top-up — the "50" in "20 / 50"; null when nothing was added. */
  creditsOf: number | null;
  /** Classes of this course the child was checked in to. */
  classes: number;
  /** This course's own condition; null for a course the child has left. */
  creditStatus: Student["status"] | null;
  enrolledDate: string;
  /** ISO date, or "" for never expires. */
  expires: string;
  expired: boolean;
};

export type EnrolmentFilter = "active" | "all";

const VIEWS = ["list", "card"] as const;
const TEMPLATE_ACTIVE =
  "minmax(190px, 2fr) minmax(100px, 0.8fr) minmax(130px, 1fr) minmax(80px, 0.6fr) minmax(110px, 0.9fr) minmax(110px, 0.9fr) minmax(120px, 1fr) 44px";
/* All adds the timeline rail and what happened. */
const TEMPLATE_ALL =
  "22px minmax(170px, 1.6fr) minmax(170px, 1.5fr) minmax(95px, 0.8fr) minmax(125px, 1fr) minmax(75px, 0.6fr) minmax(105px, 0.9fr) minmax(105px, 0.9fr) minmax(115px, 1fr) 44px";

/** The credit figure takes the colour of the condition. */
function creditTone(item: EnrolmentItem): string {
  if (item.balance < 0 || item.creditStatus === "Expired") return COLORS.danger;
  if (item.creditStatus === "Low Credit" || item.creditStatus === "Expiring") return COLORS.warning;
  return COLORS.text;
}

export function useEnrolmentView() {
  return useViewMode("enrolments", VIEWS);
}

export function EnrolmentViewToggle() {
  const [mode, setMode] = useEnrolmentView();
  return <ViewToggle value={mode} onChange={setMode} options={VIEWS} />;
}

/** Active | All, the same pill shape as the view switch beside it. */
export function EnrolmentFilterToggle({
  value,
  onChange,
  counts,
}: {
  value: EnrolmentFilter;
  onChange: (next: EnrolmentFilter) => void;
  counts: Record<EnrolmentFilter, number>;
}) {
  const t = useTranslations("students");
  return (
    <div
      role="radiogroup"
      aria-label={t("enrolmentFilter")}
      style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface }}
    >
      {(["active", "all"] as const).map((f) => (
        <button
          key={f}
          type="button"
          role="radio"
          aria-checked={value === f}
          onClick={() => onChange(f)}
          style={{
            padding: "5px 12px",
            borderRadius: 7,
            border: "none",
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 600,
            background: value === f ? COLORS.light : "transparent",
            color: value === f ? COLORS.blue : COLORS.textSecondary,
          }}
        >
          {t(f === "active" ? "filterActive" : "filterAll", { count: counts[f] })}
        </button>
      ))}
    </div>
  );
}

export function EnrolmentList({
  items,
  filter,
  events,
  moves,
  onOpen,
  actionsFor,
}: {
  /** In display order: newest event first for All. */
  items: EnrolmentItem[];
  filter: EnrolmentFilter;
  events: Map<string, EnrolmentEvent>;
  /** Credits moved into each course, and where a deleted course's went. */
  moves: { movesIn: Map<string, CreditMoveIn[]>; movedTo: Map<string, string[]> };
  onOpen: (id: string) => void;
  actionsFor: (item: EnrolmentItem) => MoreMenuItem[];
}) {
  const t = useTranslations("students");
  const tc = useTranslations("common");
  const tStatus = useTranslations("status");
  const [mode] = useEnrolmentView();
  const all = filter === "all";
  const shown = all ? items : items.filter((i) => i.active || i.balance !== 0);

  const statusBadge = (item: EnrolmentItem) => (
    <Badge
      color={item.active ? COLORS.success : item.deleted ? COLORS.danger : COLORS.textSecondary}
      bg={item.active ? COLORS.successBg : item.deleted ? COLORS.dangerBg : COLORS.neutralBg}
    >
      {tStatus(item.status || "Active")}
    </Badge>
  );
  const credits = (item: EnrolmentItem, size: number) =>
    item.active || item.balance !== 0 ? (
      <span style={{ fontFamily: FONT, fontSize: size, fontWeight: 700, color: creditTone(item), fontVariantNumeric: "tabular-nums" }}>
        {/* Left, then what the last top-up brought it to: "12 / 15". The
            column's header already says these are credits. */}
        {item.balance}
        {item.creditsOf !== null && (
          <span style={{ fontWeight: 500, color: COLORS.textSecondary }}> / {item.creditsOf}</span>
        )}
      </span>
    ) : (
      <span style={{ color: COLORS.textSecondary }}>—</span>
    );
  const condition = (item: EnrolmentItem) => {
    if (!item.creditStatus) return <span style={{ color: COLORS.textSecondary }}>—</span>;
    const chip = statusChipColors(item.creditStatus);
    return <Badge color={chip.color} bg={chip.bg}>{tStatus(item.creditStatus)}</Badge>;
  };
  const expires = (item: EnrolmentItem) => (
    <span style={{ color: item.expired ? COLORS.danger : undefined, fontWeight: item.expired ? 600 : 400 }}>
      {item.expires ? fmtDate(item.expires) : t("neverExpires")}
    </span>
  );
  const happened = (item: EnrolmentItem) => {
    const ev = events.get(item.id);
    if (!ev) return <span />;
    const went = moves.movedTo.get(item.id) ?? [];
    const text =
      ev.kind === "joined"
        ? t("eventJoined")
        : ev.kind === "movedFrom"
          ? t("eventMovedFrom", { className: ev.other })
          : ev.kind === "movedTo"
            ? t("eventMovedTo", { className: ev.other })
            : ev.kind === "deleted"
              ? went.length
                ? t("eventDeletedMoved", { classNames: went.join(", ") })
                : t("eventDeleted")
              : t("eventLeft");
    const ended = ev.kind === "left" || ev.kind === "movedTo" || ev.kind === "deleted";
    return (
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 600, color: ev.kind === "deleted" ? COLORS.danger : ended ? COLORS.textSecondary : COLORS.text }}>
          {text}
        </span>
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{ev.date ? fmtDate(ev.date) : t("eventUndated")}</span>
        {/* Credits this course received from another, one line per move. */}
        {(moves.movesIn.get(item.id) ?? []).map((m, i) => (
          <span key={i} style={{ fontSize: 12, color: COLORS.success, fontWeight: 600 }}>
            {t("eventCreditsIn", { credits: m.amount, classNames: m.from.join(", "), date: fmtDate(m.date) })}
          </span>
        ))}
      </span>
    );
  };
  const name = (item: EnrolmentItem) => (
    <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <ClassDot color={classDotColor(item.className)} />
      {/* A real button, so the keyboard has a way into the enrolment. */}
      <button
        type="button"
        aria-label={t("viewEnrolment", { className: item.className })}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(item.id);
        }}
        style={{
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: FONT,
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.className}
      </button>
    </span>
  );
  const menu = (item: EnrolmentItem) => {
    const actions = actionsFor(item);
    return actions.length ? <MoreMenu label={t("enrolmentActions", { className: item.className })} items={actions} /> : <span />;
  };
  /* The timeline's rail: a dot per row, joined by a line through the table. */
  const rail = (item: EnrolmentItem, i: number) => (
    <span aria-hidden style={{ position: "relative", alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span
        style={{
          position: "absolute",
          left: "50%",
          width: 2,
          marginLeft: -1,
          top: i === 0 ? "50%" : -12,
          bottom: i === shown.length - 1 ? "50%" : -12,
          background: COLORS.border,
        }}
      />
      <span
        style={{
          position: "relative",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: item.active ? COLORS.blue : COLORS.surface,
          border: `2px solid ${item.active ? COLORS.blue : COLORS.textSecondary}`,
        }}
      />
    </span>
  );

  if (shown.length === 0) {
    return <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>{t("noActiveEnrolments")}</p>;
  }

  if (mode === "card") {
    return (
      <CardGrid min={240}>
        {shown.map((item) => (
          <div
            key={item.id}
            data-enrolment-row={item.id}
            onClick={() => onOpen(item.id)}
            style={{ cursor: "pointer", opacity: item.active ? 1 : 0.8 }}
          >
            <Card style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                {name(item)}
                {menu(item)}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {statusBadge(item)}
                {condition(item)}
              </span>
              {credits(item, 20)}
              <span style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 10px", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                <span>{t("colClassesJoined")}</span>
                <span style={{ color: COLORS.text }}>{item.classes}</span>
                <span>{t("enrolledDate")}</span>
                <span style={{ color: COLORS.text }}>{fmtDate(item.enrolledDate)}</span>
                <span>{t("expires")}</span>
                {expires(item)}
              </span>
              {all && (
                <span style={{ fontFamily: FONT, fontSize: 13, paddingTop: 8, borderTop: `1px solid ${COLORS.border}` }}>
                  {happened(item)}
                </span>
              )}
            </Card>
          </div>
        ))}
      </CardGrid>
    );
  }

  const template = all ? TEMPLATE_ALL : TEMPLATE_ACTIVE;
  const columns = [
    ...(all ? [""] : []),
    tc("class"),
    ...(all ? [t("colHappened")] : []),
    tc("status"),
    t("colCredits"),
    t("colClassesJoined"),
    t("colCreditStatus"),
    t("enrolledDate"),
    t("expires"),
    "",
  ];
  return (
    <Table columns={columns} template={template} minWidth={all ? 1180 : 1020}>
      {shown.map((item, i) => (
        <div key={item.id} data-enrolment-row={item.id} style={{ opacity: item.active ? 1 : 0.8 }}>
          <TableRow template={template} onClick={() => onOpen(item.id)}>
            {all && rail(item, i)}
            {name(item)}
            {all && happened(item)}
            <span>{statusBadge(item)}</span>
            {credits(item, 14)}
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{item.classes}</span>
            <span>{condition(item)}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtDate(item.enrolledDate)}</span>
            {expires(item)}
            <span style={{ display: "flex", justifyContent: "flex-end" }}>{menu(item)}</span>
          </TableRow>
        </div>
      ))}
    </Table>
  );
}
