"use client";

import { canRoleAccess } from "@/lib/nav";
import { opensCreate } from "@/lib/quick-actions";
import { useJtrax } from "./JtraxContext";
import { SectionPlaceholder } from "./SectionPlaceholder";
import { AcademyPage } from "./pages/AcademyPage";
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
  startNew,
  status,
  studentId,
  detailId,
  detailTab,
}: {
  section: string;
  /* A Quick Action asking this section to open its create form; the value
     prefills the first field where there is one. Threaded from the server
     component rather than read with useSearchParams, which would bail the
     whole route out of server rendering. */
  startNew?: string;
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

  /* Every key below carries `startNew`, so arriving from a Quick Action at a
     section that is already on screen remounts it with its form open. Without
     it, going to /payment and then to /payment?new= keeps the mounted list —
     the initial state that reads the flag never runs again, and the pill does
     nothing at all.

     Prefixed rather than `startNew ?? ""`, which is the same trap the flag
     itself sets: absent and present-but-empty both become "", the key does
     not change, and nothing remounts. */
  const newKey = startNew === undefined ? "" : `new:${startNew}`;

  switch (section) {
    case "students":
      /* Keyed so arriving from a different follow-up card resets the filter
         rather than keeping the state of the previous visit. */
      return (
        <StudentsPage
          key={`${newKey}|${status ?? ""}`}
          startWizard={startNew}
          startStatus={status}
        />
      );
    case "parents":
      /* Keyed so arriving from a second child's page opens *their* guardian
         rather than keeping the first one on screen. */
      return <ParentsPage key={detailId ?? "list"} detailId={detailId} />;
    case "payment":
      /* Keyed so arriving for a second student opens the form for them rather
         than keeping the first one's draft. */
      return (
        <PaymentPage
          key={`${studentId ?? "list"}|${newKey}`}
          startStudentId={studentId}
          startNew={opensCreate(startNew)}
        />
      );
    case "classhistory":
      return <ClassHistoryPage />;
    /* Lichess and the console's own boards share this one; /lichess redirects
       here. Staff accounts live under Settings the same way. */
    case "games":
      return <GamesPage />;
    case "announcement":
      return <AnnouncementPage key={newKey} startNew={opensCreate(startNew)} />;
    case "settings":
      return <SettingsPage />;
    case "academy":
      return <AcademyPage />;
    case "chat":
      return <MessagesPage />;
    case "tournament":
      return (
        <TournamentPage
          key={newKey}
          detailId={detailId}
          detailTab={detailTab}
          startNew={opensCreate(startNew)}
        />
      );
    default:
      return <SectionPlaceholder section={section} />;
  }
}
