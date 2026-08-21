"use client";

import { canRoleAccess } from "@/lib/nav";
import { useJtrax } from "./JtraxContext";
import { SectionPlaceholder } from "./SectionPlaceholder";
import { AcademyPage } from "./pages/AcademyPage";
import { AdminsPage } from "./pages/AdminsPage";
import { AnnouncementPage } from "./pages/AnnouncementPage";
import { ClassHistoryPage } from "./pages/ClassHistoryPage";
import { GamesPage } from "./pages/GamesPage";
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
  status,
  studentId,
  detailId,
  detailTab,
}: {
  section: string;
  /* Threaded from the server component rather than read with useSearchParams,
     which would bail the whole route out of server rendering. */
  newStudentName?: string;
  /* Which condition the dashboard sent us to look at — a student status. */
  status?: string;
  /* The student a payment is about to be recorded for, straight off the end of
     the registration wizard. */
  studentId?: string;
  /* Which row is open, and which of its tabs — so a refresh, a shared link and
     the Back button all land where the person was. */
  detailId?: string;
  detailTab?: string;
}) {
  const { role } = useJtrax();

  if (!canRoleAccess(role, section)) {
    return <SectionPlaceholder section={section} noAccess />;
  }

  switch (section) {
    case "students":
      /* Keyed so arriving from a different follow-up card resets the filter
         rather than keeping the state of the previous visit. */
      return (
        <StudentsPage
          key={`${newStudentName ?? ""}|${status ?? ""}`}
          startWizard={newStudentName}
          startStatus={status}
        />
      );
    case "parents":
      return <ParentsPage />;
    case "payment":
      /* Keyed so arriving for a second student opens the form for them rather
         than keeping the first one's draft. */
      return <PaymentPage key={studentId ?? "list"} startStudentId={studentId} />;
    case "classhistory":
      return <ClassHistoryPage />;
    case "games":
      return <GamesPage />;
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
      return <TournamentPage detailId={detailId} detailTab={detailTab} />;
    default:
      return <SectionPlaceholder section={section} />;
  }
}
