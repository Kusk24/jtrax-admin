"use client";

import { canRoleAccess } from "@/lib/nav";
import { useJtrax } from "./JtraxContext";
import { SectionPlaceholder } from "./SectionPlaceholder";
import { AcademyPage } from "./pages/AcademyPage";
import { AdminsPage } from "./pages/AdminsPage";
import { AnnouncementPage } from "./pages/AnnouncementPage";
import { ClassHistoryPage } from "./pages/ClassHistoryPage";
import { MessagesPage } from "./pages/MessagesPage";
import { ParentsPage } from "./pages/ParentsPage";
import { PaymentPage } from "./pages/PaymentPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StudentsPage } from "./pages/StudentsPage";
import { TournamentPage } from "./pages/TournamentPage";

/**
 * Maps a nav section id to its page. Role visibility is enforced here rather
 * than in the route segment because the active role lives in client state —
 * a Receptionist deep-linking to /settings gets the no-access notice.
 */
export function SectionRouter({
  section,
  newStudentName,
}: {
  section: string;
  /* Threaded from the server component rather than read with useSearchParams,
     which would bail the whole route out of server rendering. */
  newStudentName?: string;
}) {
  const { role } = useJtrax();

  if (!canRoleAccess(role, section)) {
    return <SectionPlaceholder section={section} noAccess />;
  }

  switch (section) {
    case "students":
      return <StudentsPage key={newStudentName ?? "list"} startWizard={newStudentName} />;
    case "parents":
      return <ParentsPage />;
    case "payment":
      return <PaymentPage />;
    case "classhistory":
      return <ClassHistoryPage />;
    case "announcement":
      return <AnnouncementPage />;
    case "settings":
      return <SettingsPage />;
    case "admins":
      return <AdminsPage />;
    case "academy":
      return <AcademyPage />;
    case "chat":
      return <MessagesPage />;
    case "tournament":
      return <TournamentPage />;
    default:
      return <SectionPlaceholder section={section} />;
  }
}
