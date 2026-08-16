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
import { Avatar, Badge, Card, ClassDot, SectionTitle } from "../ui";
import { CardGrid, EmptyCards, EntityCard, ViewToggle } from "../view-mode";
import { useViewMode } from "@/lib/view-mode";

const TEMPLATE = equalTemplate(7, 80);
const VIEWS = ["list", "card"] as const;
const METHODS = ["Credit Card", "Bank Transfer", "PromptPay", "Cash"];

type PackageOption = {
  id: string;
  classId: string;
  className: string;
  credits: number;
  price: number;
};

type PaymentDraft = {
  studentId: string;
  creditPackageId: string;
  amount: number;
  discount: number;
  method: string;
};

function RecordPaymentForm({
  initialStudentId,
  onCancel,
  onSave,
}: {
  /* Set when the registration wizard sent us here, so the desk lands on a form
     that already knows who it is for. */
  initialStudentId?: string;
  onCancel: () => void;
  onSave: (p: PaymentDraft) => void;
}) {
  const { students, raw } = useData();
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");

  /* The academy's own packages, priced per class — the form used to carry a
     hard-coded price list, so a package the office edited on the Academy page
     never reached the till. */
  const packages: PackageOption[] = useMemo(
    () =>
      raw.creditPackages.map((p) => {
        const cls = raw.classes.find((c) => String(c["class_id"]) === String(p["class_id"]));
        return {
          id: String(p["credit_package_id"]),
          classId: String(p["class_id"] ?? ""),
          className: cls ? String(cls["name"] ?? "") : "—",
          credits: Number(p["credit_amount"] ?? 0),
          price: Number(p["standard_price"] ?? 0),
        };
      }),
    [raw.creditPackages, raw.classes],
  );

  const prefilled = initialStudentId ? students.find((s) => s.id === initialStudentId) : undefined;
  /* The package for the student's own class, which is the one the desk is
     about to sell them. */
  const packageFor = (className: string) => packages.find((p) => p.className === className);
  const initialPackage = prefilled ? packageFor(prefilled.className) ?? packages[0] : packages[0];

  const [studentName, setStudentName] = useState(prefilled?.name ?? "");
  const [studentQuery, setStudentQuery] = useState(prefilled?.name ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [packageId, setPackageId] = useState(initialPackage?.id ?? "");
  const [amount, setAmount] = useState(initialPackage?.price ?? 0);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState(METHODS[0]);
  const [status, setStatus] = useState<Payment["status"]>("Paid");
  const [ref, setRef] = useState("");

  const matches = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return [];
    return students.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [studentQuery, students]);

  /** Picking a student re-points the package at their class and its price. */
  function chooseStudent(name: string, className: string) {
    setStudentName(name);
    setStudentQuery(name);
    setDropdownOpen(false);
    const pkg = packageFor(className);
    if (pkg) {
      setPackageId(pkg.id);
      setAmount(pkg.price);
    }
  }

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

      {prefilled && (
        <Card style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
          <Icon name="check" size={16} color={COLORS.success} />
          <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.text }}>
            {t("prefilledFor", { name: prefilled.name, className: prefilled.className })}
          </span>
        </Card>
      )}

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
                  onClick={() => chooseStudent(s.name, s.className)}
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
              value={packageId}
              onChange={(e) => {
                setPackageId(e.target.value);
                const pkg = packages.find((p) => p.id === e.target.value);
                if (pkg) setAmount(pkg.price);
              }}
              style={selectStyle}
            >
              {packages.length === 0 && <option value="">{t("noPackages")}</option>}
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {t("packageOption", { className: p.className, credits: p.credits })}
                </option>
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
                creditPackageId: packageId,
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

export function PaymentPage({ startStudentId }: { startStudentId?: string }) {
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");
  const { payments, raw, create, update, remove } = useData();
  /* Arriving with a student means the wizard just registered them and the next
     thing the desk does is take their money. */
  const [formOpen, setFormOpen] = useState(Boolean(startStudentId));
  const [mode, setMode] = useViewMode("payments", VIEWS);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  /* A payment list is read by period far more often than by name — "what did
     we take in March" — so it filters by date the way class history does. */
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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
      /* Both bounds are inclusive, and both are plain YYYY-MM-DD, so the
         comparison is a string one — no timezone to shift the boundary day. */
      if (from && (!p.isoDate || p.isoDate < from)) return false;
      if (to && (!p.isoDate || p.isoDate > to)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.className.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [payments, search, method, from, to]);

  const { pageRows, totalPages, page: current } = paginate(filtered, page);
  const totalPaid = filtered
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + parseInt(p.amount.replace(/[^0-9]/g, ""), 10), 0);

  if (formOpen) {
    return (
      <RecordPaymentForm
        initialStudentId={startStudentId}
        onCancel={() => setFormOpen(false)}
        onSave={async (p) => {
          try {
            const enr = raw.enrollments.find(
              (e) => String(e.student_id) === p.studentId && String(e.status) === "Active",
            );
            await create("payments", {
              student_id: p.studentId,
              enrollment_id: enr ? enr.enrollment_id : null,
              /* Recorded, not just priced: without it the payment list has no
                 credits column to show and the ledger cannot say what was
                 bought. */
              credit_package_id: p.creditPackageId || null,
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
        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(0); }}
          aria-label={tCommon("fromDate")}
          style={{ ...fieldStyle, width: "auto", borderRadius: 999, padding: "9px 14px" }}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(0); }}
          aria-label={tCommon("toDate")}
          style={{ ...fieldStyle, width: "auto", borderRadius: 999, padding: "9px 14px" }}
        />
        {(from || to) && (
          <button
            type="button"
            className="jt-btn-ghost"
            style={{ ...secondaryButtonStyle, padding: "8px 14px" }}
            onClick={() => { setFrom(""); setTo(""); setPage(0); }}
          >
            {t("clearDates")}
          </button>
        )}
        <ViewToggle value={mode} onChange={setMode} options={VIEWS} style={{ marginLeft: "auto" }} />
      </FilterBar>

      {mode === "card" ? (
        <>
          <CardGrid>
            {pageRows.length === 0 && <EmptyCards>{t("empty")}</EmptyCards>}
            {pageRows.map((p, i) => (
              <EntityCard
                key={p.id ?? `${p.name}-${p.date}-${i}`}
                avatar={<Avatar initials={initialsOf(p.name)} size={44} />}
                title={p.name}
                subtitle={
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    <ClassDot color={classDotColor(p.className)} />
                    {p.className}
                  </span>
                }
                badges={
                  <>
                    <span style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: COLORS.text }}>
                      {p.amount}
                    </span>
                    {p.credits !== "—" && (
                      <Badge color={COLORS.success} bg={COLORS.successBg}>
                        {p.credits} {tCommon("credits")}
                      </Badge>
                    )}
                  </>
                }
                actions={
                  p.id ? (
                    <RowActions
                      label={t("paymentFor", { name: p.name, amount: p.amount })}
                      onEdit={() => openEdit(p)}
                      onDelete={() => setDeleting(p)}
                    />
                  ) : undefined
                }
                rows={[
                  { label: tCommon("date"), value: p.date },
                  { label: tCommon("method"), value: p.method },
                ]}
              />
            ))}
          </CardGrid>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </>
      ) : (
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
      )}
    </div>
  );
}
