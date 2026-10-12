"use client";

/**
 * A student's certificates, course by course: hours toward the requirement
 * (private and group together), and whether the office has certified them.
 * Reaching the hours does not certify anyone — that is Mark as Certified,
 * after the assessment, once per course.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useData } from "@/components/DataProvider";
import { certify, fmtHours, getCertificates, type CourseCertificate, type StudentCertificates } from "@/lib/certificates";
import { fmtDate } from "@/lib/live";
import { COLORS, FONT } from "@/lib/theme";
import { ConfirmModal } from "../crud";
import { primaryButtonStyle } from "../page-kit";
import { Badge, Card, SectionTitle } from "../ui";

export function CertificatesCard({ studentId, studentName }: { studentId: string; studentName: string }) {
  const t = useTranslations("certificates");
  const { raw } = useData();
  const [data, setData] = useState<StudentCertificates | null>(null);
  const [failed, setFailed] = useState(false);
  const [asking, setAsking] = useState<CourseCertificate | null>(null);

  /* Read again whenever attendance changes, so the hours follow a check-in
     or a correction without a reload. */
  useEffect(() => {
    let live = true;
    getCertificates(studentId)
      .then((d) => {
        if (!live) return;
        /* Anything but the expected shape reads as nothing to show. */
        setData(d && Array.isArray(d.courses) ? d : { required_hours: 50, courses: [] });
        setFailed(false);
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [studentId, raw.attendance]);

  const required = data?.required_hours ?? 50;
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionTitle>{t("title")}</SectionTitle>
      {failed && <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.danger }}>{t("failed")}</p>}
      {data && data.courses.length === 0 && (
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary }}>{t("empty")}</p>
      )}
      {data?.courses.map((c) => {
        const done = c.status === "certified";
        const enough = c.hours >= required;
        const pct = Math.min(100, Math.round((c.hours / required) * 100));
        return (
          <div key={c.course} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 16px", padding: "12px 0", borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>{t(`course_${c.course}`)}</span>
                <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary, fontVariantNumeric: "tabular-nums" }}>
                  {t("hoursOf", { hours: fmtHours(c.hours), required: fmtHours(required) })}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={t(`course_${c.course}`)}
                aria-valuemin={0}
                aria-valuemax={required}
                aria-valuenow={Math.min(c.hours, required)}
                style={{ height: 6, borderRadius: 999, background: COLORS.light, overflow: "hidden" }}
              >
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: done ? COLORS.success : COLORS.blue }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {done ? (
                <>
                  <Badge color={COLORS.success} bg={COLORS.successBg}>{t("certified")}</Badge>
                  {c.certified_at && (
                    <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                      {t("certifiedOn", { date: fmtDate(c.certified_at) })}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Badge color={COLORS.blue} bg={COLORS.light}>{t("inProgress")}</Badge>
                  <button
                    type="button"
                    className="jt-btn-primary"
                    style={{ ...primaryButtonStyle, padding: "6px 13px", fontSize: 12.5, opacity: enough ? 1 : 0.5 }}
                    disabled={!enough}
                    title={enough ? undefined : t("needsHours", { required: fmtHours(required) })}
                    onClick={() => setAsking(c)}
                  >
                    {t("markCertified")}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
      {asking && (
        <ConfirmModal
          title={t("confirmTitle", { name: studentName })}
          prompt={t("confirmBody", { course: t(`course_${asking.course}`), hours: fmtHours(asking.hours) })}
          confirmLabel={t("confirm")}
          failedText={t("failed")}
          onClose={() => setAsking(null)}
          onConfirm={async () => {
            setData(await certify(studentId, asking.course));
            setAsking(null);
          }}
        />
      )}
    </Card>
  );
}
