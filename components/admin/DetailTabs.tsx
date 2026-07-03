"use client";

import { useState } from "react";

export function DetailTabs({
  tabs,
}: {
  tabs: { key: string; label: string; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.key);
  return (
    <div>
      <div
        role="tablist"
        className="flex w-full gap-1 overflow-x-auto rounded-2xl border-2 border-line bg-card p-1 shadow-clay sm:w-fit sm:rounded-full"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              active === tab.key
                ? "bg-navy-soft text-navy"
                : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{tabs.find((t) => t.key === active)?.content}</div>
    </div>
  );
}
