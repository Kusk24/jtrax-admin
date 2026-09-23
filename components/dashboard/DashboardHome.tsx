"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ClassDef } from "@/lib/data";
import { useJtrax } from "../JtraxContext";
import { Card, SectionTitle } from "../ui";
import { CheckinTable } from "./CheckinTable";
import { CreateClassCard } from "./CreateClassCard";
import { FindStudent } from "./FindStudent";
import {
  ADMIN_QUICK_ACTIONS,
  QuickActionPill,
  RECEPTIONIST_QUICK_ACTIONS,
} from "./QuickActions";
import { SessionPanel, type PanelState } from "./SessionPanel";
import { StudentStatus } from "./StudentStatus";
import { TodaySummary } from "./TodaySummary";
import { TodaysClasses } from "./TodaysClasses";
import { WeekStrip } from "./WeekStrip";

/**
 * Quick actions as a full-width strip. They used to sit inside a greeting card
 * that repeated the shell's own greeting and left half its width empty.
 */
function QuickActions({ actions }: { actions: typeof ADMIN_QUICK_ACTIONS }) {
  const t = useTranslations("dashboard");
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionTitle>{t("quickActions")}</SectionTitle>
      <div className="jt-qa-grid">
        {actions.map((action, i) => (
          <QuickActionPill key={action.key} action={action} index={i} />
        ))}
      </div>
    </Card>
  );
}

export function DashboardHome() {
  const { role } = useJtrax();
  const [panel, setPanel] = useState<PanelState>(null);

  const isReceptionist = role === "Receptionist";

  return (
    /* Two columns, not a stack of full-width rows. The left column is what the
       desk reads and works through in order; the rail is the state of the day
       — which day it is, what is running, the one thing you add to it — and it
       stays in view while the check-in table below is scrolled. Both collapse
       to a single column under 1080px, rail last. */
    <div className="jt-dashboard">
      <div className="jt-dashboard-main">
        <div className="jt-dashboard-overview">
          <TodaySummary />
          <StudentStatus />
        </div>

        {/* The desk's whole job starts with a name; management roles can use
            the denser overview without carrying a search result between
            tasks. */}
        {isReceptionist && <FindStudent />}

        <QuickActions actions={isReceptionist ? RECEPTIONIST_QUICK_ACTIONS : ADMIN_QUICK_ACTIONS} />

        <CheckinTable />
      </div>

      <aside className="jt-dashboard-rail">
        <WeekStrip />
        <CreateClassCard onCreate={() => setPanel({ mode: "create" })} />
        <TodaysClasses onViewClass={(def: ClassDef) => setPanel({ mode: "view", def })} />
      </aside>

      <SessionPanel state={panel} onClose={() => setPanel(null)} />
    </div>
  );
}
