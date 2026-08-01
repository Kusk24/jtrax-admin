"use client";

import { useSearchParams } from "next/navigation";
import { canRoleAccess } from "@/lib/jtrax/nav";
import { useJtrax } from "./JtraxContext";
import { SectionPlaceholder } from "./SectionPlaceholder";
import { AcademyPage } from "./pages/AcademyPage";
import { AdminsPage } from "./pages/AdminsPage";
import { AnnouncementPage } from "./pages/AnnouncementPage";
import { ClassHistoryPage } from "./pages/ClassHistoryPage";
import { MessagesPage } from "./pages/MessagesPage";
import { PaymentPage } from "./pages/PaymentPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StudentsPage } from "./pages/StudentsPage";
import { TournamentPage } from "./pages/TournamentPage";

/**
 * Maps a nav section id to its page. Role visibility is enforced here rather
 * than in the route segment because the active role lives in client state —
 * a Receptionist deep-linking to /jtrax/settings gets the no-access notice.
 */
export function SectionRouter({ section }: { section: string }) {
  const { role } = useJtrax();
  const params = useSearchParams();

  if (!canRoleAccess(role, section)) {
    return <SectionPlaceholder section={section} noAccess />;
  }

  switch (section) {
    case "students": {
      const preset = params.get("new");
      return (
        <StudentsPage
          key={preset ?? "list"}
          presetSearch={params.get("followUp") ? "" : undefined}
          startWizard={preset ?? undefined}
        />
      );
    }
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
