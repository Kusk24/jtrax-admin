import { useTranslations } from "next-intl";
import type { FollowUpStatus, StudentAlert } from "@/lib/admin-types";

const tones: Record<StudentAlert | Exclude<FollowUpStatus, "none">, string> = {
  expiring: "bg-peach text-peach-ink",
  lowCredit: "bg-brick-soft text-brick",
  healthy: "bg-olive-soft text-ink",
  expired: "bg-brick-soft text-maroon",
  notContacted: "bg-brick-soft text-brick",
  contacted: "bg-navy-soft text-navy",
  renewed: "bg-olive-soft text-ink",
};

export function StatusChip({
  status,
}: {
  status: StudentAlert | FollowUpStatus;
}) {
  const t = useTranslations("status");
  if (status === "none") return <span className="text-muted">–</span>;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[status]}`}
    >
      {t(status)}
    </span>
  );
}
