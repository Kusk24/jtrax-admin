"use client";

/**
 * The header's search box: one field over students, parents, classes and
 * tournaments, grouped by kind. Picking a hit goes straight to that record —
 * the search is navigation, not a filter.
 *
 * Reads the data context null-tolerantly: outside the provider (the auth
 * pages share this shell chrome) it renders nothing rather than throwing.
 */

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { globalSearch, type SearchHit } from "@/lib/global-search";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { DataContext } from "./DataProvider";

const GROUP_KEY: Record<SearchHit["kind"], string> = {
  student: "students",
  parent: "parents",
  class: "academy",
  tournament: "tournament",
};

export function GlobalSearch() {
  const data = useContext(DataContext);
  const router = useRouter();
  const t = useTranslations("shell");
  const tNav = useTranslations("nav");
  const boxRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  /* Which side the list hangs from. Anchored to the box's left when there is
     room to grow rightward — which there is everywhere except a box sitting
     hard against the right edge — else to its right. Right-only anchoring
     pushed the whole list off the left of a 390px phone. */
  const [anchorLeft, setAnchorLeft] = useState(true);

  const pools = useMemo(() => {
    if (!data) return null;
    return {
      students: data.students.map((s) => ({ id: s.id, name: s.name, className: s.className })),
      parents: data.parents.map((p) => ({ id: p.id, name: p.name, phone: p.phone })),
      classes: data.raw.classes.map((c) => ({
        id: String(c["class_id"] ?? ""),
        name: String(c["name"] ?? ""),
        category: String(c["class_type"] ?? ""),
      })),
      tournaments: data.tournaments.map((x) => ({ id: x.id, name: x.name, date: x.date })),
    };
  }, [data]);

  const hits = useMemo(() => (pools ? globalSearch(q, pools) : []), [q, pools]);

  if (!data) return null;

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQ("");
    router.push(hit.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[Math.min(active, hits.length - 1)]);
    }
  };

  const showList = open && q.trim().length >= 2;

  useEffect(() => {
    if (!showList) return;
    const r = boxRef.current?.getBoundingClientRect();
    if (r) setAnchorLeft(r.left + 340 <= window.innerWidth - 12);
  }, [showList]);

  return (
    <div
      ref={boxRef}
      className="jt-global-search"
      style={{ position: "relative" }}
      /* Blur closes, unless the focus went to something inside the list —
         a click on a hit fires pointerdown first, which navigates. */
      onBlur={(e) => {
        if (!boxRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          borderRadius: 999,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.surface,
          minHeight: 34,
        }}
      >
        <Icon name="search" size={15} color={COLORS.textSecondary} />
        <input
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: FONT,
            fontSize: 13.5,
            color: COLORS.text,
            width: "100%",
            minWidth: 0,
          }}
        />
      </div>

      {showList && (
        <div
          role="listbox"
          aria-label={t("searchLabel")}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            ...(anchorLeft ? { left: 0 } : { right: 0 }),
            width: "min(340px, 88vw)",
            maxHeight: "min(420px, 60vh)",
            overflowY: "auto",
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            boxShadow: "0 12px 32px rgb(20 33 58 / 0.16)",
            padding: 6,
            zIndex: 40,
          }}
        >
          {hits.length === 0 ? (
            <p style={{ margin: 0, padding: "10px 12px", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
              {t("searchNoResults", { q: q.trim() })}
            </p>
          ) : (
            hits.map((hit, i) => {
              const groupStart = i === 0 || hits[i - 1].kind !== hit.kind;
              return (
                <div key={`${hit.kind}:${hit.id}`}>
                  {groupStart && (
                    <div
                      style={{
                        padding: "8px 12px 3px",
                        fontFamily: FONT,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: COLORS.textSecondary,
                      }}
                    >
                      {tNav(GROUP_KEY[hit.kind])}
                    </div>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    /* pointerdown, so the choice lands before the input's blur
                       closes the list. */
                    onPointerDown={(e) => {
                      e.preventDefault();
                      go(hit);
                    }}
                    onMouseEnter={() => setActive(i)}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 10,
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: 8,
                      background: i === active ? COLORS.light : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.text, minWidth: 0 }}>
                      {hit.title}
                    </span>
                    {hit.sub && (
                      <span
                        style={{
                          fontFamily: FONT,
                          fontSize: 12,
                          color: COLORS.textSecondary,
                          flexShrink: 0,
                          maxWidth: "45%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {hit.sub}
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
