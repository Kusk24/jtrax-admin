"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { type Payment } from "@/lib/data";
import {
  childIdsOf,
  guardianOf,
  pairFromPayer,
  pairFromStudent,
  type FamilyLink,
  type Pair,
} from "@/lib/payment-pairing";
import { liveClasses, livePackages } from "@/lib/live";
import { useData } from "@/components/DataProvider";
import { CourseName } from "@/components/CourseName";
import { Icon } from "@/lib/icons";
import { classDotColor, COLORS, FONT, initialsOf } from "@/lib/theme";
import {
  ActionButton,
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
  InfoGrid,
  labelStyle,
  Req,
  Modal,
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
import { DetailHeader, EditButton } from "../detail";
import { CardGrid, EmptyCards, EntityCard, ViewToggle } from "../view-mode";
import { useViewMode } from "@/lib/view-mode";
import { useErrorToast } from "../ErrorToast";

const TEMPLATE = equalTemplate(8, 76);
const VIEWS = ["list", "card"] as const;
const METHODS = ["Credit Card", "Bank Transfer", "PromptPay", "Cash"];

/** The day credits bought today run out, from the package's own validity.
    A package with no validity set never expires, and says so with "". */
function expiryFrom(isoDate: string, validityDays: number): string | null {
  if (!validityDays) return null;
  const day = new Date(`${isoDate}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + validityDays);
  return day.toISOString().slice(0, 10);
}

/** Paid is money in the account; the others are not, and the list colours
    them so a pending transfer is never mistaken for a settled one. Expired is
    a tournament fee still owed when its place was released at closing. */
function statusChip(status: Payment["status"]): { color: string; bg: string } {
  if (status === "Pending") return { color: COLORS.warning, bg: COLORS.warningBg };
  if (status === "Cancelled") return { color: COLORS.danger, bg: COLORS.dangerBg };
  return { color: COLORS.success, bg: COLORS.successBg };
}

type PackageOption = {
  id: string;
  classId: string;
  className: string;
  credits: number;
  price: number;
};

/* The package select's value for "no package — type the credits in". */
const CUSTOM = "__custom";

/** Baht off `amount` for a percentage discount, to the satang. */
export function discountBaht(amount: number, percent: number): number {
  const pct = Math.min(100, Math.max(0, percent));
  return Math.round(amount * pct) / 100;
}

type PaymentDraft = {
  studentId: string;
  /* Empty for a custom sale: then `classId` and `credits` say what was bought. */
  creditPackageId: string;
  classId: string;
  credits: number;
  amount: number;
  /* In baht, worked out from the percentage the desk typed. */
  discount: number;
  method: string;
  /* Both were on the form and neither left it: every payment saved as Paid,
     with no reference, however the desk filled these in. */
  status: Payment["status"];
  reference: string;
  /* Snapshots written with the payment: what was true at the till. A payment
     outlives the student it was for, and these are what a detached row has
     left to say who it was about. */
  studentName: string;
  className: string;
  payerName: string;
};

export function RecordPaymentForm({
  initialStudentId,
  initialClassId,
  onCancel,
  onSave,
}: {
  /* Set when the registration wizard sent us here, so the desk lands on a form
     that already knows who it is for. */
  initialStudentId?: string;
  /* Set by a course's "Top up": sell that course's package, not the one for
     whichever class the child happens to be listed under. */
  initialClassId?: string;
  onCancel: () => void;
  /* Returns a promise, and the caller must await it: the save button stays
     disabled for exactly as long as this takes. */
  onSave: (p: PaymentDraft) => Promise<void>;
}) {
  const { students, raw } = useData();
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");

  /* The academy's own packages, priced per class — the form used to carry a
     hard-coded price list, so a package the office edited on the Academy page
     never reached the till. */
  const packages: PackageOption[] = useMemo(
    () =>
      /* What the academy still sells: neither the package nor its class
         retired. Retired ones stay on file — old payments point at them and a
         receipt has to keep adding up — but they leave the till. */
      livePackages({ creditPackages: raw.creditPackages, classes: raw.classes })
        .map((p) => {
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

  const guardians = useMemo(
    () => raw.parents.map((p) => ({ id: String(p["parent_id"]), name: String(p["name"] ?? "") })),
    [raw.parents],
  );

  /* `student_parent` as the pairing rule wants it. Who-pays-for-whom lives in
     lib/payment-pairing.ts, so this screen only has to turn its answers into
     form state. */
  const links: FamilyLink[] = useMemo(
    () =>
      raw.studentParents.map((sp) => ({
        studentId: String(sp["student_id"]),
        parentId: String(sp["parent_id"]),
      })),
    [raw.studentParents],
  );

  const prefilled = initialStudentId ? students.find((s) => s.id === initialStudentId) : undefined;
  /* The package for the student's own class, which is the one the desk is
     about to sell them. */
  const packageFor = (className: string) => packages.find((p) => p.className === className);
  const initialPackage =
    (initialClassId ? packages.find((p) => p.classId === initialClassId) : undefined) ??
    (prefilled ? packageFor(prefilled.className) ?? packages[0] : packages[0]);

  const [studentName, setStudentName] = useState(prefilled?.name ?? "");
  const [studentQuery, setStudentQuery] = useState(prefilled?.name ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  /* Who is paying. The child's own guardian, and blank when they have none. */
  const [payerId, setPayerId] = useState(prefilled ? guardianOf(links, prefilled.id) : "");
  /* No packages set up: custom is the only way to sell credits. */
  const [packageId, setPackageId] = useState(initialPackage?.id ?? CUSTOM);
  const [amount, setAmount] = useState(initialPackage?.price ?? 0);
  /* Percent off, 0–100. Stored as baht on the payment. */
  const [discountPct, setDiscountPct] = useState(0);
  /* Custom sale: any number of credits for any course, at any price. */
  const custom = packageId === CUSTOM;
  const courses = useMemo(
    () =>
      liveClasses({ classes: raw.classes }).map((c) => ({
        id: String(c.class_id),
        name: String(c.name ?? ""),
        pricePerCredit: Number(c.price_per_credit ?? 0) || 0,
      })),
    [raw.classes],
  );
  const [customClassId, setCustomClassId] = useState(
    initialClassId ?? courses.find((c) => c.name === prefilled?.className)?.id ?? courses[0]?.id ?? "",
  );
  const [customCredits, setCustomCredits] = useState(0);
  /* A custom sale's amount starts as credits × the course's price per credit
     — until somebody types an amount of their own, which then stays. */
  const [amountTyped, setAmountTyped] = useState(false);
  function suggestAmount(classId: string, credits: number) {
    if (amountTyped) return;
    const per = courses.find((c) => c.id === classId)?.pricePerCredit ?? 0;
    if (per > 0 && credits > 0) setAmount(Math.round(per * credits * 100) / 100);
  }
  const [method, setMethod] = useState(METHODS[0]);
  const [ref, setRef] = useState("");

  /* Choosing a payer is choosing a family, so this is what the student picker
     narrows to — empty when nobody is linked to them, which leaves the picker
     showing everyone rather than nothing. */
  const payerChildren = useMemo(() => {
    const ids = childIdsOf(links, payerId);
    return students.filter((s) => ids.includes(s.id));
  }, [links, payerId, students]);

  /* An empty box lists everyone rather than nothing: the field is a dropdown
     that also filters, not a search that hides its options until you guess.
     Capped at eight so the list stays a list — `hidden` is how many the cap is
     holding back, which the dropdown says out loud rather than pretending the
     academy has eight students. */
  const { matches, hidden } = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    const scope = payerChildren.length > 0 ? payerChildren : students;
    const pool = q ? scope.filter((s) => s.name.toLowerCase().includes(q)) : scope;
    return { matches: pool.slice(0, 8), hidden: Math.max(0, pool.length - 8) };
  }, [studentQuery, students, payerChildren]);

  const selected = students.find((s) => s.name === studentName);

  /** Puts a pairing decision on screen: the two names, and the package and
      price the child's class carries. */
  function applyPair(pair: Pair) {
    const child = students.find((s) => s.id === pair.studentId);
    setStudentName(child?.name ?? "");
    setStudentQuery(child?.name ?? "");
    setPayerId(pair.payerId);
    const pkg = child ? packageFor(child.className) : undefined;
    if (pkg) {
      setPackageId(pkg.id);
      setAmount(pkg.price);
    }
  }

  function chooseStudent(id: string) {
    setDropdownOpen(false);
    applyPair(pairFromStudent(links, id));
  }

  function choosePayer(id: string) {
    applyPair(pairFromPayer(links, id, selected?.id ?? ""));
  }

  const payerName = guardians.find((g) => g.id === payerId)?.name ?? "";
  const discount = discountBaht(amount, discountPct);
  const finalAmount = Math.max(0, amount - discount);
  const canSave = studentName !== "" && (!custom || (customClassId !== "" && customCredits > 0));

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
          <label style={labelStyle} htmlFor="pay-student">{tCommon("student")}<Req /></label>
          {/* A combobox, not a bare search box: the caret says there is a list
              behind it, and clicking opens the whole list rather than waiting
              for the right guess. */}
          <input
            id="pay-student"
            role="combobox"
            aria-expanded={dropdownOpen}
            aria-controls="pay-student-list"
            value={studentName || studentQuery}
            onChange={(e) => {
              setStudentQuery(e.target.value);
              setStudentName("");
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder={t("studentPlaceholder")}
            style={{ ...selectStyle, cursor: "text" }}
            autoComplete="off"
          />
          <button
            type="button"
            aria-label={t("browseStudents")}
            onClick={() => {
              setDropdownOpen((open) => !open);
              if (studentName) setStudentQuery("");
            }}
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              height: 40,
              width: 34,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
            }}
          />
          {dropdownOpen && matches.length > 0 && (
            <div
              id="pay-student-list"
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
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {/* Whose list this is. Without it a picker holding two names
                  where it held forty looks broken rather than narrowed. */}
              {payerChildren.length > 0 && (
                <p
                  style={{
                    margin: 0,
                    padding: "6px 10px",
                    fontFamily: FONT,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: COLORS.textSecondary,
                  }}
                >
                  {t("childrenOfPayer", { name: payerName })}
                </p>
              )}
              {hidden > 0 && (
                <p
                  style={{
                    margin: 0,
                    padding: "6px 10px",
                    fontFamily: FONT,
                    fontSize: 12.5,
                    color: COLORS.textSecondary,
                  }}
                >
                  {t("moreStudents", { count: hidden })}
                </p>
              )}
              {matches.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="jt-find-row"
                  onClick={() => chooseStudent(s.id)}
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
              {/* Says which list came up empty. "No student matches" is a lie
                  when only one family was being searched. */}
              {payerChildren.length > 0
                ? t("noMatchInFamily", { query: studentQuery, payer: payerName })
                : t("noMatch", { query: studentQuery })}
            </p>
          )}
        </div>

        <div>
          <label style={labelStyle} htmlFor="pay-payer">{t("payer")}</label>
          <select
            id="pay-payer"
            value={payerId}
            onChange={(e) => choosePayer(e.target.value)}
            style={selectStyle}
          >
            <option value="">{t("noPayer")}</option>
            {guardians.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <p style={{ margin: "5px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
            {/* Which way the two fields have just moved, said out loud — a
                picker that quietly rewrites the one above it is worse than one
                that explains itself. */}
            {payerId === ""
              ? selected
                /* The payer is blank because this child is linked to nobody,
                   not because the desk forgot — said plainly, since the only
                   fix is on the Students screen. */
                ? t("studentNoGuardian", { name: selected.name })
                : t("payerHelp")
              : payerChildren.length === 0
                ? t("payerNoChildren")
                : payerChildren.length === 1
                  ? t("payerOneChild", { name: payerChildren[0].name })
                  : t("payerManyChildren", { count: payerChildren.length })}
          </p>
        </div>

        <div className="jt-duo">
          <div>
            <label style={labelStyle} htmlFor="pay-package">{t("creditPackage")}<Req /></label>
            <select
              id="pay-package"
              value={packageId}
              onChange={(e) => {
                setPackageId(e.target.value);
                const pkg = packages.find((p) => p.id === e.target.value);
                setAmountTyped(false);
                if (pkg) setAmount(pkg.price);
                else suggestAmount(customClassId, customCredits);
              }}
              style={selectStyle}
            >
              <option value={CUSTOM}>{t("customCredits")}</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {t("packageOption", { className: p.className, credits: p.credits })}
                </option>
              ))}
            </select>
          </div>
          {custom && (
            <>
              <div>
                <label style={labelStyle} htmlFor="pay-course">{tCommon("class")}<Req /></label>
                <select
                  id="pay-course"
                  value={customClassId}
                  onChange={(e) => {
                    setCustomClassId(e.target.value);
                    suggestAmount(e.target.value, customCredits);
                  }}
                  style={selectStyle}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="pay-credits">{t("credits")}<Req /></label>
                <input
                  id="pay-credits"
                  type="number"
                  min={0}
                  step={0.5}
                  value={customCredits || ""}
                  onChange={(e) => {
                    const credits = Math.max(0, Number(e.target.value) || 0);
                    setCustomCredits(credits);
                    suggestAmount(customClassId, credits);
                  }}
                  style={fieldStyle}
                />
              </div>
            </>
          )}
          <div>
            <label style={labelStyle} htmlFor="pay-amount">{t("amountThb")}</label>
            <input
              id="pay-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => {
                setAmountTyped(true);
                setAmount(Math.max(0, Number(e.target.value) || 0));
              }}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="pay-discount">{t("discountPct")}</label>
            <input
              id="pay-discount"
              type="number"
              min={0}
              max={100}
              value={discountPct}
              onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
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
          {/* One payment per press. Saving takes long enough on the deployed
              backend that a second click feels reasonable, and a second click
              used to be a second payment. */}
          <ActionButton
            className="jt-btn-primary"
            style={primaryButtonStyle}
            disabled={!canSave}
            busyLabel={tCommon("saving")}
            onClick={() =>
              onSave({
                studentId: selected?.id ?? "",
                creditPackageId: custom ? "" : packageId,
                classId: custom ? customClassId : packages.find((k) => k.id === packageId)?.classId ?? "",
                credits: custom ? customCredits : packages.find((k) => k.id === packageId)?.credits ?? 0,
                amount,
                discount,
                method,
                /* Every payment taken at the desk is a paid one: there is no
                   status to choose, so its credits count straight away. */
                status: "Paid",
                reference: ref.trim(),
                studentName: selected?.name ?? studentName,
                /* The class the chosen *package* is for, not the student's
                   own primary course — a child enrolled in two classes has
                   only one `className` on their roster row, and paying for
                   the other one used to record a receipt that named the
                   wrong course. Falls back to the student's own class only
                   when nothing is priced yet — see the note on `pkg` in
                   `onSave` for why this cannot fall back to "" and still be
                   right about which enrolment the money is for. */
                className: custom
                  ? courses.find((c) => c.id === customClassId)?.name ?? ""
                  : packages.find((k) => k.id === packageId)?.className ?? selected?.className ?? "",
                payerName: guardians.find((g) => g.id === payerId)?.name ?? "",
              })
            }
          >
            {t("savePayment")}
          </ActionButton>
        </div>
      </Card>
    </div>
  );
}

/**
 * One payment, in full. A row can only show six columns; this is where the
 * reference number, the discount and the guardian who paid actually live.
 */
export function PaymentDetail({
  payment,
  onClose,
  onEdit,
}: {
  payment: Payment;
  onClose: () => void;
  onEdit: () => void;
}) {
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");

  /* The card link. Fetched on demand, never automatically: pressing the
     button is what creates a chargeable session, so opening the detail to
     read a payment must not quietly mint one. */
  const [cardLink, setCardLink] = useState<string | null>(null);
  const [cardErr, setCardErr] = useState<string | null>(null);
  const [cardBusy, setCardBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const fetchCardLink = async () => {
    if (!payment.id) return;
    setCardBusy(true);
    setCardErr(null);
    try {
      const res = await api.post<{ url: string }>(`payments/${payment.id}/stripe-link`, {});
      setCardLink(res.url);
    } catch (e) {
      setCardErr(e instanceof ApiError && e.status === 503 ? t("cardLinkOff") : t("cardLinkFailed"));
    }
    setCardBusy(false);
  };

  return (
    <Modal title={t("detailTitle")} onClose={onClose} width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <DetailHeader
          avatar={<Avatar initials={initialsOf(payment.name)} size={52} />}
          title={payment.name}
          subtitle={
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <ClassDot color={classDotColor(payment.className)} />
              <CourseName name={payment.className} deleted={payment.courseDeleted} />
            </span>
          }
          badges={
            <>
              <span style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, color: COLORS.text }}>
                {payment.amount}
              </span>
              {/* Only what is not money in the account says what it is:
                  Pending, or a tournament fee Cancelled at closing. */}
              {payment.status !== "Paid" && (
                /* A Pending payment reads "Unpaid": what the desk needs to know. */
                <Badge {...statusChip(payment.status)}>{tStatus(payment.status === "Pending" ? "Unpaid" : payment.status)}</Badge>
              )}
              {payment.credits !== "—" && (
                <Badge color={COLORS.success} bg={COLORS.successBg}>
                  {payment.credits} {tCommon("credits")}
                </Badge>
              )}
              {(payment.detached || payment.publicEntry) && (
                <Badge color={COLORS.textSecondary} bg={COLORS.neutralBg}>
                  {payment.publicEntry ? t("publicEntry") : t("studentRemoved")}
                </Badge>
              )}
            </>
          }
          actions={
            payment.id ? (
              /* Edit only: a payment is corrected, never deleted. */
              <EditButton onClick={onEdit} />
            ) : undefined
          }
        />
        <InfoGrid
          rows={[
            { label: t("colPaidBy"), value: payment.payer || "—" },
            { label: tCommon("class"), value: <CourseName name={payment.className} deleted={payment.courseDeleted} /> },
            { label: t("credits"), value: payment.credits },
            { label: t("amount"), value: payment.gross ?? payment.amount },
            { label: t("discount"), value: payment.discount ?? "—" },
            { label: t("finalAmount"), value: payment.amount },
            { label: tCommon("method"), value: payment.method },
            { label: tCommon("date"), value: payment.date },
            { label: t("reference"), value: payment.reference || "—" },
          ]}
        />
        {payment.id && payment.status === "Pending" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "12px 14px",
              borderRadius: 11,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.light,
            }}
          >
            <span style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>
              {t("cardLink")}
            </span>
            {cardLink ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 12.5,
                    color: COLORS.textSecondary,
                  }}
                >
                  {cardLink}
                </code>
                <button
                  type="button"
                  style={{ ...secondaryButtonStyle, flexShrink: 0 }}
                  onClick={async () => {
                    await navigator.clipboard.writeText(cardLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? t("cardLinkCopied") : t("cardLinkCopy")}
                </button>
              </div>
            ) : (
              <>
                <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                  {t("cardLinkHint")}
                </span>
                <div>
                  <button
                    type="button"
                    style={{ ...secondaryButtonStyle, opacity: cardBusy ? 0.7 : 1 }}
                    disabled={cardBusy}
                    onClick={fetchCardLink}
                  >
                    {t("cardLinkGet")}
                  </button>
                </div>
              </>
            )}
            {cardErr && (
              <span role="alert" style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.danger }}>
                {cardErr}
              </span>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* The API's own spelling of the method column; the filter bar shows the spaced
   labels above, which is why recording one strips the spaces. */
const METHOD_VALUES = ["CreditCard", "BankTransfer", "PromptPay", "Cash"];

export function PaymentPage({
  startStudentId,
  startClassId,
  startNew,
}: {
  startStudentId?: string;
  startClassId?: string;
  /* The dashboard's "Record Payment" pill, which means the form and not the
     ledger it is filed into. */
  startNew?: boolean;
}) {
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");
  const { showError } = useErrorToast();
  const { payments, raw, batch, create, update, loading } = useData();
  /* Arriving with a student means the wizard just registered them and the next
     thing the desk does is take their money. */
  const [formOpen, setFormOpen] = useState(Boolean(startStudentId) || Boolean(startNew));
  const [mode, setMode] = useViewMode("payments", VIEWS);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  /* Tournament fees or course credits; "" is both. */
  const [kind, setKind] = useState("");
  /* A payment list is read by period far more often than by name — "what did
     we take in March" — so it filters by date the way class history does. */
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);

  const [detail, setDetail] = useState<Payment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<CrudValues>({});

  const editFields: CrudField[] = useMemo(
    () => [
      { name: "amount", label: t("amount"), kind: "number", required: true, half: true, min: 0 },
      { name: "discount_pct", label: t("discountPct"), kind: "number", half: true, min: 0, max: 100 },
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
      /* Shown as the percentage it was; saved back as baht. */
      discount_pct: String(
        Number(row["amount"] ?? 0) > 0
          ? Math.round((Number(row["discount_amount"] ?? 0) / Number(row["amount"])) * 10000) / 100
          : 0,
      ),
      payment_method: String(row["payment_method"] ?? ""),
      payment_date: String(row["payment_date"] ?? ""),
      reference_number: String(row["reference_number"] ?? ""),
    });
    setEditingId(payment.id);
  }

  /**
   * Saves an edit, and releases the credits a payment bought if this is the
   * edit that finally marks it Paid.
   *
   * A transfer recorded as Pending buys nothing until it clears, so the ledger
   * entry is written here rather than when it was taken — once, guarded by the
   * fact that a payment that has already released its credits has a
   * transaction pointing back at it.
   */
  /* How long bought credits last: the package's own validity, or for a custom
     sale the course's package, so custom credits expire like any others. */
  function validityFor(pkg: Record<string, unknown> | undefined, classId: string): number {
    const source =
      pkg ?? livePackages({ creditPackages: raw.creditPackages, classes: raw.classes }).find((k) => String(k["class_id"]) === classId);
    return Number(source?.["validity_days"] ?? 0);
  }

  async function saveEdit(id: string, payload: Record<string, unknown>) {
    const before = raw.payments.find((p) => String(p["payment_id"]) === id);
    const wasPaid = String(before?.["status"] ?? "Paid") === "Paid";
    const nowPaid = String(payload.status ?? "") === "Paid";
    const alreadyCredited = raw.creditTransactions.some((tx) => String(tx["payment_id"]) === id);

    await batch(async () => {
      await update("payments", id, payload);
      if (wasPaid || !nowPaid || alreadyCredited || !before) return;
      const pkg = raw.creditPackages.find(
        (k) => String(k["credit_package_id"]) === String(before["credit_package_id"] ?? ""),
      );
      const enrollmentId = String(before["enrollment_id"] ?? "");
      /* The payment's own count first: a custom sale has no package. */
      const credits = Number(before["credit_amount"] ?? 0) || Number(pkg?.["credit_amount"] ?? 0);
      const classId =
        String(pkg?.["class_id"] ?? "") ||
        String(raw.enrollments.find((e) => String(e["enrollment_id"]) === enrollmentId)?.["class_id"] ?? "");
      if (!credits || !enrollmentId) return;
      const day = String(payload.payment_date ?? before["payment_date"] ?? "");
      /* Stamped so the hours survive their enrolment being deleted:
         `student_id` says whose they are, `class_id` what they were bought for
         and therefore what rate they convert at. */
      await create("credit-transactions", {
        enrollment_id: enrollmentId,
        student_id: String(before["student_id"] ?? "") || null,
        class_id: classId || null,
        transaction_type: "purchase",
        amount: credits,
        transaction_date: day,
        expiry_date: expiryFrom(day, validityFor(pkg, classId)),
        payment_id: id,
        notes: String(payload.reference_number ?? "") || null,
      });
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (method && p.method !== method) return false;
      if (kind && p.kind !== kind) return false;
      /* Both bounds are inclusive, and both are plain YYYY-MM-DD, so the
         comparison is a string one — no timezone to shift the boundary day. */
      if (from && (!p.isoDate || p.isoDate < from)) return false;
      if (to && (!p.isoDate || p.isoDate > to)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.className.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [payments, search, method, kind, from, to]);

  const { pageRows, totalPages, page: current } = paginate(filtered, page);
  const totalPaid = filtered
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + parseInt(p.amount.replace(/[^0-9]/g, ""), 10), 0);

  if (formOpen) {
    /* The form reads the student, their guardian and the class price once, as
       it mounts. Opened straight from a link — the desk refreshing, or the
       registration wizard's address pasted in — the collections are still in
       flight at that moment, so it would mount knowing nothing and never look
       again: no child, no payer, no package. Waiting a beat is the difference
       between a prefilled form and an empty one. */
    if (loading) {
      return (
        <Card>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>
            {tCommon("loading")}
          </p>
        </Card>
      );
    }
    return (
      <RecordPaymentForm
        initialStudentId={startStudentId}
        initialClassId={startClassId}
        onCancel={() => setFormOpen(false)}
        onSave={async (p) => {
          const today = new Date().toISOString().slice(0, 10);
          try {
            const pkg = raw.creditPackages.find(
              (k) => String(k["credit_package_id"]) === p.creditPackageId,
            );
            /* The class the office actually chose a package for — not a
               property of the student, who can hold several active
               enrolments at once and no single "current class" of their own.
               Blank when the payment carries no package at all (a tournament
               fee, say), in which case there is nothing to match an enrolment
               to and the old lenient behaviour — any active one — still
               applies below. */
            /* A custom sale names its course directly; a package names its own. */
            const pkgClassId = pkg ? String(pkg["class_id"] ?? "") : p.classId;
            const boughtCredits = pkg ? Number(pkg["credit_amount"] ?? 0) : p.credits;
            /* Matched to that class specifically. This used to be "the
               student's first active enrolment, whichever course", so a
               family enrolled in two classes paying for the second one had
               the credits land on the first — the package was priced and
               charged correctly, the balance just went to the wrong course. */
            const enr = raw.enrollments.find(
              (e) =>
                String(e.student_id) === p.studentId &&
                String(e.status) === "Active" &&
                (!pkgClassId || String(e["class_id"]) === pkgClassId),
            );

            /* The payment and the credits it buys are one act at the till, so
               they are one refetch too — recording the payment alone left the
               student's balance untouched and the desk topping it up by hand
               afterwards. */
            await batch(async () => {
              /* Paying for a course with no matching active enrolment enrols
                 the child in it, the same act "Add Enrolment" used to do on
                 its own with no money behind it — that button now sends the
                 desk here instead. Without this, a payment for a class the
                 child is not yet in either fell back to some other course's
                 enrolment (the original bug) or, once that fallback was
                 removed, would have credited nothing at all and said so
                 nowhere. */
              let enrollmentId = enr ? String(enr.enrollment_id) : "";
              if (!enrollmentId && pkgClassId) {
                const created = await create("enrollments", {
                  student_id: p.studentId,
                  class_id: pkgClassId,
                  enrolled_date: today,
                  status: "Active",
                });
                enrollmentId = String(created.enrollment_id);
              }

              const payment = await create("payments", {
                student_id: p.studentId,
                enrollment_id: enrollmentId || null,
                /* Recorded, not just priced: without it the payment list has no
                   credits column to show and the ledger cannot say what was
                   bought. */
                credit_package_id: p.creditPackageId || null,
                credit_amount: boughtCredits || null,
                student_name: p.studentName,
                class_name: p.className,
                parent_name: p.payerName,
                amount: p.amount,
                discount_amount: p.discount,
                final_amount: Math.max(0, p.amount - p.discount),
                payment_method: p.method.replace(/\s+/g, ""),
                status: p.status,
                payment_date: today,
                reference_number: p.reference || null,
              });

              /* Credits follow the money, not the paperwork: a payment still
                 waiting to clear buys nothing yet, and a refunded one bought
                 nothing in the end. Marking it Paid later on the edit form is
                 what releases them. */
              if (p.status === "Paid" && boughtCredits > 0 && enrollmentId) {
                await create("credit-transactions", {
                  enrollment_id: enrollmentId,
                  student_id: p.studentId,
                  class_id: pkgClassId || null,
                  transaction_type: "purchase",
                  amount: boughtCredits,
                  transaction_date: today,
                  expiry_date: expiryFrom(today, validityFor(pkg, pkgClassId)),
                  payment_id: String(payment.payment_id),
                  notes: p.reference || null,
                });
              }
            });
          } catch (e) {
            showError(tCommon("paymentFailed"), e);
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
          /* This modal has no create form — only ever editing a payment
             already on the books. */
          isEdit={true}
          fields={editFields}
          values={values}
          onChange={setValues}
          onClose={() => setEditingId(null)}
          onSubmit={(payload) => {
            /* The percentage becomes baht, and the final amount follows. */
            const { discount_pct, ...rest } = payload;
            const gross = Number(rest.amount ?? 0);
            const off = discountBaht(gross, Number(discount_pct ?? 0));
            return saveEdit(editingId, { ...rest, discount_amount: off, final_amount: Math.max(0, gross - off) });
          }}
        />
      )}

      {detail && (
        <PaymentDetail
          payment={detail}
          onClose={() => setDetail(null)}
          onEdit={() => { openEdit(detail); setDetail(null); }}
        />
      )}

      <PageHeader
        title={t("title")}
        sub={t("sub", { count: filtered.length, total: totalPaid.toLocaleString() })}
        action={
          <>
            <ExportButton
              filename="payments"
              columns={[tCommon("student"), t("colPaidBy"), t("colItem"), t("credits"), tCommon("amount"), tCommon("date"), tCommon("method")]}
              rows={() => filtered.map((p) => [p.name, p.payer ?? "", p.courseDeleted ? [p.className, tCommon("removed")].filter(Boolean).join(" · ") : p.className, p.credits, p.amount, p.date, p.method])}
            />
            <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => setFormOpen(true)}>
              <Icon name="wallet" size={15} color={COLORS.surface} />
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
          value={kind}
          onChange={(v) => { setKind(v); setPage(0); }}
          options={[
            { value: "", label: t("allTypes") },
            { value: "course", label: t("typeCourse") },
            { value: "tournament", label: t("typeTournament") },
          ]}
          label={t("paymentType")}
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
                onClick={() => setDetail(p)}
                avatar={<Avatar initials={initialsOf(p.name)} size={44} />}
                title={p.name}
                subtitle={
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    <ClassDot color={classDotColor(p.className)} />
                    <CourseName name={p.className} deleted={p.courseDeleted} />
                    {p.detached && ` · ${t("studentRemoved")}`}
                    {p.publicEntry && ` · ${t("publicEntry")}`}
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
                    />
                  ) : undefined
                }
                rows={[
                  { label: tCommon("date"), value: p.date },
                  { label: tCommon("method"), value: p.method },
                  { label: t("colPaidBy"), value: p.payer || "—" },
                ]}
              />
            ))}
          </CardGrid>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </>
      ) : (
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table
          /* No status column: every payment is recorded as Paid, so it would
             read "Paid" on every row. */
          columns={[tCommon("student"), t("colPaidBy"), t("colItem"), t("credits"), tCommon("amount"), tCommon("date"), tCommon("method"), tCommon("action")]}
          template={TEMPLATE}
          minWidth={1060}
        >
          {pageRows.length === 0 && <EmptyRow>{t("empty")}</EmptyRow>}
          {pageRows.map((p, i) => {
            return (
              <TableRow key={p.id ?? `${p.name}-${p.date}-${i}`} template={TEMPLATE} onClick={() => setDetail(p)}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar initials={initialsOf(p.name)} size={30} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </span>
                    {/* The student is gone; this row is the only record of
                        them, so it says so rather than looking like a live one. */}
                    {(p.detached || p.publicEntry) && (
                      <span style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary }}>
                        {p.publicEntry ? t("publicEntry") : t("studentRemoved")}
                      </span>
                    )}
                  </span>
                </span>
                <span style={{ color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.payer || "—"}
                </span>
                <span style={{ display: "flex", alignItems: "center", color: COLORS.textSecondary }}>
                  <ClassDot color={classDotColor(p.className)} />
                  <CourseName name={p.className} deleted={p.courseDeleted} />
                </span>
                <span style={{ color: COLORS.success, fontWeight: 600 }}>{p.credits}</span>
                <span style={{ fontWeight: 600 }}>{p.amount}</span>
                <span style={{ color: COLORS.textSecondary }}>{p.date}</span>
                <span style={{ color: COLORS.textSecondary }}>{p.method}</span>
                {p.id ? (
                  <RowActions
                    label={t("paymentFor", { name: p.name, amount: p.amount })}
                    onEdit={() => openEdit(p)}
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
