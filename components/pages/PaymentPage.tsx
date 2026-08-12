"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { type Payment } from "@/lib/data";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/lib/icons";
import { classDotColor, COLORS, FONT, initialsOf } from "@/lib/theme";
import {
  ConfirmDeleteModal,
  CrudFormModal,
  RowActions,
  type CrudField,
  type CrudValues,
} from "../crud";
import {
  EmptyRow,
  equalTemplate,
  ExportButton,
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
import { Avatar, Card, ClassDot, SectionTitle } from "../ui";

const TEMPLATE = equalTemplate(7, 80);
const METHODS = ["Credit Card", "Bank Transfer", "PromptPay", "Cash"];

/* Credit packages snap the amount, ported from the design's lookup table. */
const PACKAGES: Record<string, number> = {
  "5 Sessions": 1800,
  "10 Sessions": 3500,
  "20 Sessions": 6500,
  "30 Sessions": 9000,
};

type PaymentDraft = {
  studentId: string;
  amount: number;
  discount: number;
  method: string;
};

function RecordPaymentForm({ onCancel, onSave }: { onCancel: () => void; onSave: (p: PaymentDraft) => void }) {
  const { students } = useData();
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
    return students.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [studentQuery, students]);

  const selected = students.find((s) => s.name === studentName);
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
          fontSize: 14,
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
                  <span style={{ fontFamily: FONT, fontSize: 14, color: COLORS.text }}>{s.name}</span>
                  <span style={{ marginLeft: "auto", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                    {s.className}
                  </span>
                </button>
              ))}
            </div>
          )}
          {studentQuery.trim() !== "" && matches.length === 0 && !studentName && (
            <p style={{ margin: "6px 0 0", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
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
          <div style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>{t("finalAmount")}</div>
          <div style={{ fontFamily: FONT, fontSize: 23, fontWeight: 700, color: COLORS.text }}>
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
                studentId: selected?.id ?? "",
                amount,
                discount,
                method,
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

/* The API's own spelling of the method column; the filter bar shows the spaced
   labels above, which is why recording one strips the spaces. */
const METHOD_VALUES = ["CreditCard", "BankTransfer", "PromptPay", "Cash"];

export function PaymentPage() {
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");
  const { payments, raw, create, update, remove } = useData();
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<CrudValues>({});
  const [deleting, setDeleting] = useState<Payment | null>(null);

  const editFields: CrudField[] = useMemo(
    () => [
      { name: "amount", label: t("amount"), kind: "number", required: true, half: true, min: 0 },
      { name: "discount_amount", label: t("discount"), kind: "number", half: true, min: 0 },
      { name: "final_amount", label: t("finalAmount"), kind: "number", required: true, half: true, min: 0 },
      {
        name: "payment_method",
        label: t("paymentMethod"),
        kind: "select",
        required: true,
        half: true,
        options: METHOD_VALUES.map((m) => ({ value: m, label: m })),
      },
      { name: "payment_date", label: tCommon("date"), kind: "date", required: true, half: true },
      { name: "reference_number", label: t("reference"), half: true },
    ],
    [t, tCommon],
  );

  function openEdit(payment: Payment) {
    if (!payment.id) return;
    const row = raw.payments.find((p) => String(p["payment_id"]) === payment.id);
    if (!row) return;
    setValues({
      amount: String(row["amount"] ?? ""),
      discount_amount: String(row["discount_amount"] ?? 0),
      final_amount: String(row["final_amount"] ?? ""),
      payment_method: String(row["payment_method"] ?? ""),
      payment_date: String(row["payment_date"] ?? ""),
      reference_number: String(row["reference_number"] ?? ""),
    });
    setEditingId(payment.id);
  }

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
        onSave={async (p) => {
          try {
            const enr = raw.enrollments.find(
              (e) => String(e.student_id) === p.studentId && String(e.status) === "Active",
            );
            await create("payments", {
              student_id: p.studentId,
              enrollment_id: enr ? enr.enrollment_id : null,
              amount: p.amount,
              discount_amount: p.discount,
              final_amount: Math.max(0, p.amount - p.discount),
              payment_method: p.method.replace(/\s+/g, ""),
              status: "Paid",
              payment_date: new Date().toISOString().slice(0, 10),
            });
          } catch (e) {
            window.alert(e instanceof Error ? e.message : "payment failed");
          }
          setFormOpen(false);
          setPage(0);
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {editingId && (
        <CrudFormModal
          title={t("editTitle")}
          fields={editFields}
          values={values}
          onChange={setValues}
          onClose={() => setEditingId(null)}
          onSubmit={(payload) => update("payments", editingId, payload).then(() => undefined)}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          what={t("paymentFor", { name: deleting.name, amount: deleting.amount })}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove("payments", deleting.id!)}
        />
      )}

      <PageHeader
        title={t("title")}
        sub={t("sub", { count: filtered.length, total: totalPaid.toLocaleString() })}
        action={
          <>
            <ExportButton
              filename="payments"
              columns={[tCommon("student"), tCommon("class"), t("credits"), tCommon("amount"), tCommon("date"), tCommon("method")]}
              rows={() => filtered.map((p) => [p.name, p.className, p.credits, p.amount, p.date, p.method])}
            />
            <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => setFormOpen(true)}>
              <Icon name="wallet" size={15} color="#fff" />
              {t("recordTitle")}
            </button>
          </>
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
          /* No status column — a recorded payment is a paid one, so the
             column was "Paid" on every row. */
          columns={[tCommon("student"), tCommon("class"), t("credits"), tCommon("amount"), tCommon("date"), tCommon("method"), tCommon("action")]}
          template={TEMPLATE}
          minWidth={960}
        >
          {pageRows.length === 0 && <EmptyRow>{t("empty")}</EmptyRow>}
          {pageRows.map((p, i) => {
            return (
              <TableRow key={p.id ?? `${p.name}-${p.date}-${i}`} template={TEMPLATE}>
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
                {p.id ? (
                  <RowActions
                    label={t("paymentFor", { name: p.name, amount: p.amount })}
                    onEdit={() => openEdit(p)}
                    onDelete={() => setDeleting(p)}
                  />
                ) : (
                  <span />
                )}
              </TableRow>
            );
          })}
        </Table>
        <Pagination page={current} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}
