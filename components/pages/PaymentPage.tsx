"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PAYMENTS_SEED, STUDENTS_SEED, type Payment } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { classDotColor, COLORS, FONT, initialsOf, statusChipColors, TODAY_REF } from "@/lib/theme";
import {
  EmptyRow,
  fieldStyle,
  FilterBar,
  labelStyle,
  PageHeader,
  paginate,
  Pagination,
  primaryButtonStyle,
  SearchInput,
  secondaryButtonStyle,
  SelectFilter,
  selectStyle,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";

const TEMPLATE = "minmax(150px, 1.5fr) minmax(130px, 1.2fr) 80px 110px 120px 120px 100px";
const METHODS = ["Credit Card", "Bank Transfer", "PromptPay", "Cash"];

/* Credit packages snap the amount, ported from the design's lookup table. */
const PACKAGES: Record<string, number> = {
  "5 Sessions": 1800,
  "10 Sessions": 3500,
  "20 Sessions": 6500,
  "30 Sessions": 9000,
};

function RecordPaymentForm({ onCancel, onSave }: { onCancel: () => void; onSave: (p: Payment) => void }) {
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const [studentName, setStudentName] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [creditPackage, setCreditPackage] = useState("10 Sessions");
  const [amount, setAmount] = useState(PACKAGES["10 Sessions"]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState(METHODS[0]);
  const [status, setStatus] = useState<Payment["status"]>("Paid");
  const [ref, setRef] = useState("");

  const matches = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return [];
    return STUDENTS_SEED.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [studentQuery]);

  const selected = STUDENTS_SEED.find((s) => s.name === studentName);
  const finalAmount = Math.max(0, amount - discount);
  const canSave = studentName !== "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      <button
        type="button"
        onClick={onCancel}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.textSecondary,
          padding: 0,
        }}
      >
        <Icon name="chevronLeft" size={16} color={COLORS.textSecondary} /> {t("backToPayments")}
      </button>

      <PageHeader title={t("recordTitle")} sub={t("recordSub")} />

      <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SectionTitle>{t("details")}</SectionTitle>

        <div style={{ position: "relative" }}>
          <label style={labelStyle} htmlFor="pay-student">{tCommon("student")}</label>
          <input
            id="pay-student"
            value={studentName || studentQuery}
            onChange={(e) => {
              setStudentQuery(e.target.value);
              setStudentName("");
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder={t("studentPlaceholder")}
            style={fieldStyle}
            autoComplete="off"
          />
          {dropdownOpen && matches.length > 0 && !studentName && (
            <div
              className="jtrax-fade-in-up"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 4,
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                boxShadow: "0 12px 28px rgb(36 59 99 / 0.14)",
                padding: 5,
                zIndex: 10,
              }}
            >
              {matches.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="jt-find-row"
                  onClick={() => {
                    setStudentName(s.name);
                    setStudentQuery(s.name);
                    setDropdownOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Avatar initials={initialsOf(s.name)} size={26} />
                  <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.text }}>{s.name}</span>
                  <span style={{ marginLeft: "auto", fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary }}>
                    {s.className}
                  </span>
                </button>
              ))}
            </div>
          )}
          {studentQuery.trim() !== "" && matches.length === 0 && !studentName && (
            <p style={{ margin: "6px 0 0", fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>
              {t("noMatch", { query: studentQuery })}
            </p>
          )}
        </div>

        <div className="jt-duo">
          <div>
            <label style={labelStyle} htmlFor="pay-package">{t("creditPackage")}</label>
            <select
              id="pay-package"
              value={creditPackage}
              onChange={(e) => {
                setCreditPackage(e.target.value);
                setAmount(PACKAGES[e.target.value] ?? amount);
              }}
              style={selectStyle}
            >
              {Object.keys(PACKAGES).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="pay-amount">{t("amountThb")}</label>
            <input
              id="pay-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="pay-discount">{t("discountThb")}</label>
            <input
              id="pay-discount"
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="pay-method">{t("paymentMethod")}</label>
            <select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)} style={selectStyle}>
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="pay-status">{tCommon("status")}</label>
            <select
              id="pay-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Payment["status"])}
              style={selectStyle}
            >
              {(["Paid", "Pending", "Refunded"] as const).map((s) => (
                <option key={s} value={s}>{tStatus(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="pay-ref">{t("refNumber")}</label>
            <input id="pay-ref" value={ref} onChange={(e) => setRef(e.target.value)} style={fieldStyle} />
          </div>
        </div>
      </Card>

      <Card
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>{t("finalAmount")}</div>
          <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: COLORS.text }}>
            {finalAmount.toLocaleString()} THB
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={onCancel}>
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            className="jt-btn-primary"
            style={{ ...primaryButtonStyle, opacity: canSave ? 1 : 0.5, cursor: canSave ? "pointer" : "not-allowed" }}
            disabled={!canSave}
            onClick={() =>
              onSave({
                name: studentName,
                className: selected?.className ?? "—",
                credits: `+${creditPackage.split(" ")[0]}`,
                amount: `${finalAmount.toLocaleString()} THB`,
                date: TODAY_REF.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
                method,
                status,
              })
            }
          >
            {t("savePayment")}
          </button>
        </div>
      </Card>
    </div>
  );
}

export function PaymentPage() {
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const [payments, setPayments] = useState<Payment[]>(PAYMENTS_SEED);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (method && p.method !== method) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.className.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [payments, search, method]);

  const { pageRows, totalPages, page: current } = paginate(filtered, page);
  const totalPaid = filtered
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + parseInt(p.amount.replace(/[^0-9]/g, ""), 10), 0);

  if (formOpen) {
    return (
      <RecordPaymentForm
        onCancel={() => setFormOpen(false)}
        onSave={(p) => {
          setPayments([p, ...payments]);
          setFormOpen(false);
          setPage(0);
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title={t("title")}
        sub={t("sub", { count: filtered.length, total: totalPaid.toLocaleString() })}
        action={
          <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => setFormOpen(true)}>
            <Icon name="wallet" size={15} color="#fff" />
            {t("recordTitle")}
          </button>
        }
      />

      <FilterBar>
        <SearchInput
          style={{ flex: "1 1 220px" }}
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder={t("searchPlaceholder")}
          label={t("searchLabel")}
        />
        <SelectFilter
          value={method}
          onChange={(v) => { setMethod(v); setPage(0); }}
          options={[{ value: "", label: tCommon("allMethods") }, ...METHODS.map((m) => ({ value: m, label: m }))]}
          label={t("paymentMethod")}
        />
      </FilterBar>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table
          columns={[tCommon("student"), tCommon("class"), t("credits"), tCommon("amount"), tCommon("date"), tCommon("method"), tCommon("status")]}
          template={TEMPLATE}
          minWidth={900}
        >
          {pageRows.length === 0 && <EmptyRow>{t("empty")}</EmptyRow>}
          {pageRows.map((p, i) => {
            const chip = statusChipColors(p.status);
            return (
              <TableRow key={`${p.name}-${p.date}-${i}`} template={TEMPLATE}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar initials={initialsOf(p.name)} size={30} />
                  <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </span>
                </span>
                <span style={{ display: "flex", alignItems: "center", color: COLORS.textSecondary }}>
                  <ClassDot color={classDotColor(p.className)} />
                  {p.className}
                </span>
                <span style={{ color: COLORS.success, fontWeight: 600 }}>{p.credits}</span>
                <span style={{ fontWeight: 600 }}>{p.amount}</span>
                <span style={{ color: COLORS.textSecondary }}>{p.date}</span>
                <span style={{ color: COLORS.textSecondary }}>{p.method}</span>
                <Badge color={chip.color} bg={chip.bg} style={{ justifySelf: "start" }}>
                  {tStatus(p.status)}
                </Badge>
              </TableRow>
            );
          })}
        </Table>
        <Pagination page={current} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}
