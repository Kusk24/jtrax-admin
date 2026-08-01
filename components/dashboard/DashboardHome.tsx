"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ClassDef } from "@/lib/data";
import { COLORS, FONT } from "@/lib/theme";
import { useJtrax } from "../JtraxContext";
import { Card, SectionTitle } from "../ui";
import { CheckinTable } from "./CheckinTable";
import { FindStudent } from "./FindStudent";
import { FollowUps } from "./FollowUps";
import { Overview } from "./Overview";
import {
  ADMIN_QUICK_ACTIONS,
  QuickActionPill,
  RECEPTIONIST_QUICK_ACTIONS,
} from "./QuickActions";
import { SessionPanel, type PanelState } from "./SessionPanel";
import { TodaysClasses } from "./TodaysClasses";

function AdminHero({ firstName }: { firstName: string }) {
  const t = useTranslations("dashboard");
  const tShell = useTranslations("shell");
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, color: COLORS.text }}>
          {tShell("greeting", { name: firstName })}
        </div>
        <div style={{ marginTop: 3, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
          {t("heroSub")}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        {ADMIN_QUICK_ACTIONS.map((action, i) => (
          <QuickActionPill key={action.key} action={action} index={i} />
        ))}
      </div>
    </Card>
  );
}

export function DashboardHome() {
  const { person, role } = useJtrax();
  const t = useTranslations("dashboard");
  const [panel, setPanel] = useState<PanelState>(null);

  const isReceptionist = role === "Receptionist";
  const firstName = person.name.split(" ").filter((p) => !p.includes("."))[0] ?? "there";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {isReceptionist ? (
        <div className="jt-split">
          <FindStudent />
          <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionTitle>{t("quickActions")}</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RECEPTIONIST_QUICK_ACTIONS.map((action, i) => (
                <QuickActionPill key={action.key} action={action} index={i} />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="jt-split">
            <AdminHero firstName={firstName} />
            <FollowUps />
          </div>
          <Overview />
        </>
      )}

      <TodaysClasses
        onCreateSession={() => setPanel({ mode: "create" })}
        onViewClass={(def: ClassDef) => setPanel({ mode: "view", def })}
      />

      {isReceptionist && <FollowUps />}

      <CheckinTable />

      <SessionPanel state={panel} onClose={() => setPanel(null)} />
    </div>
  );
}
