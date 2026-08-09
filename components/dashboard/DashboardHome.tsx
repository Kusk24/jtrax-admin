"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ClassDef } from "@/lib/data";
import { useJtrax } from "../JtraxContext";
import { Card, SectionTitle } from "../ui";
import { CheckinTable } from "./CheckinTable";
import { FindStudent } from "./FindStudent";
import { FollowUps } from "./FollowUps";
import { KpiStrip } from "./KpiStrip";
import { RevenueTrend } from "./RevenueTrend";
import {
  ADMIN_QUICK_ACTIONS,
  QuickActionPill,
  RECEPTIONIST_QUICK_ACTIONS,
} from "./QuickActions";
import { SessionPanel, type PanelState } from "./SessionPanel";
import { TodaysClasses } from "./TodaysClasses";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {isReceptionist ? (
        <>
          {/* The desk's whole job starts here, so the search owns the top of
              the screen and its results have the full width to open into. */}
          <FindStudent />
          <QuickActions actions={RECEPTIONIST_QUICK_ACTIONS} />
          <FollowUps wide />
        </>
      ) : (
        <>
          <KpiStrip />
          <div className="jt-split">
            <RevenueTrend />
            <FollowUps />
          </div>
          <QuickActions actions={ADMIN_QUICK_ACTIONS} />
        </>
      )}

      <TodaysClasses
        onCreateSession={() => setPanel({ mode: "create" })}
        onViewClass={(def: ClassDef) => setPanel({ mode: "view", def })}
      />

      <CheckinTable />

      <SessionPanel state={panel} onClose={() => setPanel(null)} />
    </div>
  );
}
