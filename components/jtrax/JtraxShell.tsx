"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Icon } from "@/lib/jtrax/icons";
import { navItemsForRole, SECTION_META } from "@/lib/jtrax/nav";
import { COLORS, FONT, ROLE_COLORS } from "@/lib/jtrax/theme";
import { useJtrax } from "./JtraxContext";

const SIDEBAR_WIDTH = 232;

/** '/jtrax' -> 'home', '/jtrax/students' -> 'students'. */
function sectionFromPath(pathname: string): string {
  const rest = pathname.replace(/^\/jtrax\/?/, "");
  return rest === "" ? "home" : rest.split("/")[0];
}

function Sidebar({ section }: { section: string }) {
  const { role } = useJtrax();
  const items = navItemsForRole(role);

  return (
    <aside
      style={{
        position: "fixed",
        insetBlock: 0,
        left: 0,
        width: SIDEBAR_WIDTH,
        background: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "20px 14px",
        gap: 24,
        zIndex: 20,
      }}
    >
      <Link
        href="/jtrax"
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px", textDecoration: "none" }}
      >
        <Image
          src="/jtrax/jca-logo.png"
          alt=""
          width={38}
          height={38}
          style={{ borderRadius: 9, objectFit: "contain" }}
        />
        <span>
          <span
            style={{
              display: "block",
              fontFamily: FONT,
              fontSize: 17,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.15,
            }}
          >
            JCA
          </span>
          <span
            style={{
              display: "block",
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 500,
              color: COLORS.textSecondary,
            }}
          >
            Chess School
          </span>
        </span>
      </Link>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, overflowY: "auto" }}>
        {items.map((item) => {
          const active = item.id === section;
          const href = item.id === "home" ? "/jtrax" : `/jtrax/${item.id}`;
          return (
            <Link
              key={item.id}
              href={href}
              aria-current={active ? "page" : undefined}
              className="jt-nav-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 8,
                background: active ? COLORS.light : "transparent",
                textDecoration: "none",
              }}
            >
              <span style={{ display: "flex", width: 18, height: 18 }}>
                <Icon name={item.icon} size={18} color={active ? COLORS.blue : COLORS.text} />
              </span>
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? COLORS.blue : COLORS.text,
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        className="jt-nav-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          borderRadius: 8,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", width: 18, height: 18 }}>
          <Icon name="logout" size={18} color={COLORS.textSecondary} />
        </span>
        <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: COLORS.textSecondary }}>
          Logout
        </span>
      </button>
    </aside>
  );
}

/* Today's date resolves on the client only — formatting on the server would use
   the server's locale and timezone and mismatch during hydration. */
const subscribeToNothing = () => () => {};
const formatToday = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function useToday(): string {
  return useSyncExternalStore(subscribeToNothing, formatToday, () => "");
}

function RoleSwitcher({ section }: { section: string }) {
  const { person, people, setPerson } = useJtrax();
  const [open, setOpen] = useState(false);
  const today = useToday();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const roleColor = ROLE_COLORS[person.role];

  const chipStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "6px 10px 6px 6px",
    borderRadius: 999,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surface,
    cursor: "pointer",
    fontFamily: FONT,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "7px 12px",
          borderRadius: 999,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.surface,
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 500,
          color: COLORS.textSecondary,
          /* Reserve the row height before the date resolves on the client. */
          minHeight: 34,
        }}
      >
        <Icon name="calendar" size={15} color={COLORS.blue} />
        {today}
      </div>

      <div ref={wrapRef} style={{ position: "relative" }}>
        <button
          type="button"
          style={chipStyle}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: roleColor.bg,
              color: roleColor.color,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {person.initials}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{person.name}</span>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 999,
              background: roleColor.bg,
              color: roleColor.color,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {person.role}
          </span>
          <span style={{ display: "flex", color: COLORS.textSecondary }}>
            <Icon name="chevronDown" size={15} />
          </span>
        </button>

        {open && (
          <div
            role="listbox"
            className="jtrax-fade-in-up"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              minWidth: 240,
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              boxShadow: "0 12px 28px rgb(36 59 99 / 0.14)",
              padding: 6,
              zIndex: 40,
            }}
          >
            {people.map((option) => {
              const selected = option.id === person.id;
              const optionColor = ROLE_COLORS[option.role];
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="jt-nav-row"
                  onClick={() => {
                    setPerson(option, section);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: selected ? COLORS.light : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: FONT,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: optionColor.bg,
                      color: optionColor.color,
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {option.initials}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: COLORS.text }}>
                    {option.name}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: optionColor.color }}>
                    {option.role}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function JtraxShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = sectionFromPath(pathname);
  const { person, role } = useJtrax();

  const isHome = section === "home";
  const meta = SECTION_META[section];
  const firstName = person.name.split(" ").filter((p) => !p.includes("."))[0] ?? "there";

  const title = isHome
    ? role === "Receptionist"
      ? `Good morning, ${firstName}!`
      : "Dashboard"
    : (meta?.label ?? "JTRAX");
  const sub = isHome
    ? role === "Receptionist"
      ? "What are we doing today?"
      : "Overview of your academy today."
    : (meta?.sub ?? "");

  return (
    <>
      <Sidebar section={section} />
      <main
        style={{
          marginLeft: SIDEBAR_WIDTH,
          minHeight: "100vh",
          padding: "20px 24px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: FONT,
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.text,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h1>
            {sub && (
              <p style={{ margin: "4px 0 0", fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                {sub}
              </p>
            )}
          </div>
          <RoleSwitcher section={section} />
        </header>

        {children}
      </main>
    </>
  );
}
