import { AdminNav } from "@/components/admin/AdminNav";

/* Branch admin portal — same interface as /super, scoped to one branch.
   The signed-in admin's branch is mocked until auth exists. */
export default function BranchAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      <AdminNav role="branch" branchLabel="Bangkok Branch" />
      <main className="pt-16 lg:pl-56">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
