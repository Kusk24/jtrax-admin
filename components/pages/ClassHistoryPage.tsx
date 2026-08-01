"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CLASSES_DEFS_REF } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { classDotColor, COLORS, FONT, initialsOf, TODAY_REF } from "@/lib/theme";
import {
  EmptyRow,
  fieldStyle,
  FilterBar,
  PageHeader,
  paginate,
  Pagination,
  SearchInput,
  SelectFilter,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Card, ClassDot } from "../ui";

const TEMPLATE = "120px minmax(150px, 1.4fr) 150px 120px 60px";

type HistoryRow = {
  key: string;
  dateObj: Date;
  date: string;
  className: string;
  time: string;
  attendees: string[];
};

/* RECONSTRUCTED: the design's class-history rows were built past the truncation
   point. Sessions are projected backwards from TODAY_REF, one per class per
   week, which matches the seed's weekly cadence and keeps the demo deterministic. */
function buildHistory(): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (let week = 1; week <= 6; week++) {
    CLASSES_DEFS_REF.forEach((cls, i) => {
      const d = new Date(TODAY_REF);
      d.setDate(d.getDate() - week * 7 - i);
      rows.push({
        key: `${cls.name}-${week}`,
        dateObj: d,
        date: d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
        className: cls.name,
        time: cls.time,
        /* Later weeks trim the tail of the roster so attendance varies. */
        attendees: cls.roster.slice(0, Math.max(2, cls.roster.length - (week % 3))),
      });
    });
  }
  return rows.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
}

export function ClassHistoryPage() {
  const t = useTranslations("classHistory");
  const tCommon = useTranslations("common");
  const all = useMemo(() => buildHistory(), []);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const classOptions = [
    { value: "", label: tCommon("allClasses") },
    ...CLASSES_DEFS_REF.map((c) => ({ value: c.name, label: c.name })),
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTime = from ? new Date(from).getTime() : null;
    const toTime = to ? new Date(to).getTime() : null;
    return all.filter((row) => {
      if (classFilter && row.className !== classFilter) return false;
      if (q && !row.className.toLowerCase().includes(q) && !row.attendees.some((a) => a.toLowerCase().includes(q)))
        return false;
      const t = row.dateObj.getTime();
      if (fromTime !== null && t < fromTime) return false;
      if (toTime !== null && t > toTime) return false;
      return true;
    });
  }, [all, search, classFilter, from, to]);

  const { pageRows, totalPages, page: current } = paginate(filtered, page);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title={t("title")} sub={t("sub")} />

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
          value={classFilter}
          onChange={(v) => {
            setClassFilter(v);
            setPage(0);
          }}
          options={classOptions}
          label={t("filterByClass")}
        />
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(0);
          }}
          aria-label={tCommon("fromDate")}
          style={{ ...fieldStyle, width: "auto", borderRadius: 999, padding: "9px 14px" }}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(0);
          }}
          aria-label={tCommon("toDate")}
          style={{ ...fieldStyle, width: "auto", borderRadius: 999, padding: "9px 14px" }}
        />
      </FilterBar>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table columns={[tCommon("date"), tCommon("class"), t("time"), t("attendance"), ""]} template={TEMPLATE} minWidth={720}>
          {pageRows.length === 0 && <EmptyRow>{t("empty")}</EmptyRow>}
          {pageRows.map((row) => {
            const open = expanded[row.key] ?? false;
            return (
              <div key={row.key}>
                <TableRow
                  template={TEMPLATE}
                  onClick={() => setExpanded({ ...expanded, [row.key]: !open })}
                >
                  <span style={{ color: COLORS.textSecondary }}>{row.date}</span>
                  <span style={{ display: "flex", alignItems: "center", fontWeight: 600 }}>
                    <ClassDot color={classDotColor(row.className)} />
                    {row.className}
                  </span>
                  <span style={{ color: COLORS.textSecondary }}>{row.time}</span>
                  <span style={{ color: COLORS.textSecondary }}>
                    {t("presentCount", { count: row.attendees.length })}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      justifySelf: "end",
                      color: COLORS.textSecondary,
                      transform: open ? "rotate(90deg)" : "none",
                      transition: "transform 160ms ease",
                    }}
                  >
                    <Icon name="chevronRight" size={16} />
                  </span>
                </TableRow>
                {open && (
                  <div
                    className="jtrax-fade-in-up"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      padding: "12px 16px 16px",
                      background: COLORS.bg,
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {row.attendees.map((name) => (
                      <span
                        key={name}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          padding: "5px 11px 5px 5px",
                          borderRadius: 999,
                          background: COLORS.surface,
                          border: `1px solid ${COLORS.border}`,
                          fontFamily: FONT,
                          fontSize: 12.5,
                          color: COLORS.text,
                        }}
                      >
                        <Avatar initials={initialsOf(name)} size={20} />
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Table>
        <Pagination page={current} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}
