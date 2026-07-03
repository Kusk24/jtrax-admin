import { StudentProfilePage } from "@/components/admin/pages/StudentProfilePage";

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <StudentProfilePage studentId={studentId} base="/branch" />;
}
