import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/admin/PageHeader";
import { BranchCard } from "@/components/admin/BranchCard";
import { AddBranchModal } from "@/components/admin/AddBranchModal";
import { branches } from "@/lib/super-data";

export default function BranchesPage() {
  const t = useTranslations("branchesPage");
  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={<AddBranchModal />}
      />
      <p className="mt-5 text-right text-xs font-bold text-muted">
        {t("totalBranches", { count: branches.length })}
      </p>
      <div className="mt-2 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((branch) => (
          <BranchCard key={branch.id} branch={branch} />
        ))}
      </div>
    </>
  );
}
