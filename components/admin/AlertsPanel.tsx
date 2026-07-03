"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, TriangleAlert } from "lucide-react";
import { attendanceAlerts, notificationLogs } from "@/lib/super-data";

export function AlertsPanel() {
  const [openId, setOpenId] = useState<string | null>(null);
  const t = useTranslations("attendancePage");
  const tc = useTranslations("common");

  return (
    <div className="grid gap-4">
      <section className="rounded-card border-2 border-line bg-card p-4 shadow-clay">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <TriangleAlert className="size-4 text-brick" />
          {t("alerts")}
        </h2>
        <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
          {attendanceAlerts.map((alert) => (
            <div key={alert.id}>
              <div className="flex items-center gap-2.5 rounded-xl border-2 border-brick-soft bg-brick-soft/40 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brick-soft text-xs font-bold text-maroon ring-2 ring-card">
                  {alert.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink">
                    {t("missedClasses", { name: alert.name, count: alert.missed })}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {tc("idLabel", { id: alert.id })} | {alert.meta}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOpenId(openId === alert.id ? null : alert.id)
                  }
                  className="cursor-pointer text-xs font-bold text-navy hover:underline"
                >
                  {t("notify")}
                </button>
              </div>
              {openId === alert.id && (
                <div className="mt-2 rounded-xl border-2 border-line bg-card p-3.5 shadow-clay">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-full bg-peach text-xs font-bold text-peach-ink ring-2 ring-card">
                      {alert.guardian[0]}
                    </span>
                    <p className="text-xs font-bold text-ink">
                      {alert.guardian}{" "}
                      <span className="font-normal text-muted">
                        | {t("guardianLabel")}
                      </span>
                    </p>
                  </div>
                  <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs leading-relaxed text-ink">
                    {t("defaultMessage", {
                      name: alert.name,
                      count: alert.missed,
                    })}
                  </p>
                  <div className="mt-2.5 flex flex-wrap justify-between gap-2">
                    <a
                      href="tel:+661234567"
                      className="text-xs font-bold text-navy hover:underline"
                    >
                      {t("callDirectly")}
                    </a>
                    <button
                      type="button"
                      onClick={() => setOpenId(null)}
                      className="cursor-pointer text-xs font-bold text-navy hover:underline"
                    >
                      {t("sendNotification")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-card border-2 border-line bg-card p-4 shadow-clay">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Bell className="size-4 text-navy" />
          {t("notificationLogs")}
        </h2>
        <div className="mt-3 grid gap-2.5">
          {notificationLogs.map((log) => (
            <div key={log.name} className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-soft text-xs font-bold text-navy ring-2 ring-card">
                {log.name[0]}
              </span>
              <div>
                <p className="text-xs font-bold text-ink">
                  {t("lowAttendance", { name: log.name })}
                </p>
                <p className="text-[11px] text-muted">{log.stamp}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
