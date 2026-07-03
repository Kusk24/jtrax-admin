import { AdminNav } from "@/components/admin/AdminNav";

export default function SuperAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      <AdminNav />
      <main className="pt-16 lg:pl-56">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
