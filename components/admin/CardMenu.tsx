"use client";

import { useEffect, useRef, useState } from "react";
import { EllipsisVertical, SquarePen, Trash2 } from "lucide-react";

export function CardMenu({
  label,
  items,
}: {
  label: string;
  items: { label: string; kind: "edit" | "remove" }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-cream hover:text-ink"
      >
        <EllipsisVertical className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-44 rounded-2xl border-2 border-line bg-card p-1.5 shadow-clay-lg">
          {items.map(({ label: itemLabel, kind }) => {
            const Icon = kind === "remove" ? Trash2 : SquarePen;
            return (
              <button
                key={itemLabel}
                type="button"
                onClick={() => setOpen(false)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${
                  kind === "remove"
                    ? "text-brick hover:bg-brick-soft"
                    : "text-ink hover:bg-cream"
                }`}
              >
                <Icon className="size-4" />
                {itemLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
