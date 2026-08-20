"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { LanguageToggle } from "./LanguageToggle";
import { signOut } from "@/app/actions/auth";
import { Icon } from "@/lib/icons";
import { navItemsForRole } from "@/lib/nav";
import { COLORS, FONT, FONT_DISPLAY, ROLE_COLORS } from "@/lib/theme";
import { useJtrax } from "./JtraxContext";


/** '/' -> 'home', '/students' -> 'students'. */
function sectionFromPath(pathname: string): string {
  const rest = pathname.replace(/^\/+/, "");
  return rest === "" ? "home" : rest.split("/")[0];
}

function Sidebar({ section }: { section: string }) {
  const { role } = useJtrax();
  const t = useTranslations("nav");
  const items = navItemsForRole(role);

  return (
    /* Layout lives in `.jt-sidebar` in globals.css, not here: it changes with
       the viewport, and an inline style cannot carry a media query — nor be
       overridden by one, which is the trap. Only the colours stay inline. */
    <aside
      className="jt-sidebar"
      style={{ background: COLORS.surface, zIndex: 20 }}
    >
      <Link
        href="/"
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px", textDecoration: "none" }}
      >
        <Image
          src="/jca-logo.png"
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
              fontSize: 18,
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
              fontSize: 13,
              fontWeight: 500,
              color: COLORS.textSecondary,
            }}
          >
            {t("brandSub")}
          </span>
        </span>
      </Link>

      {/* Layout (direction, flex, overflow) lives in `.jt-sidebar nav` in
          globals.css — it changes between the phone strip and the desktop
          column, and an inline style would beat both media-query variants. */}
      <nav style={{ display: "flex" }}>
        {items.map((item) => {
          const active = item.id === section;
          const href = item.id === "home" ? "/" : `/${item.id}`;
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
                  fontSize: 15,
                  fontWeight: active ? 600 : 500,
                  color: active ? COLORS.blue : COLORS.text,
                }}
              >
                {t(item.id)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Clearing the session cookie has to happen on the server, so logout is
          a form posting to the sign-out action rather than a click handler. */}
      <form action={signOut}>
        <button
          type="submit"
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
          <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 500, color: COLORS.textSecondary }}>
            {t("logout")}
          </span>
        </button>
      </form>
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

/* Identity, not a control. This used to be a dropdown that switched between
   mock people; the role now comes from the signed-in account, so the only way
   to see the console as someone else is to sign in as them. */
function AccountChip() {
  const { person } = useJtrax();
  const tRole = useTranslations("roles");
  const today = useToday();
  const roleColor = ROLE_COLORS[person.role];

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
          fontSize: 14,
          fontWeight: 500,
          color: COLORS.textSecondary,
          /* Reserve the row height before the date resolves on the client. */
          minHeight: 34,
        }}
      >
        <Icon name="calendar" size={15} color={COLORS.blue} />
        {today}
      </div>

      <div
        title={person.email}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "6px 12px 6px 6px",
          borderRadius: 999,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.surface,
          fontFamily: FONT,
        }}
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
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {person.initials}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{person.name}</span>
        <span
          style={{
            padding: "3px 8px",
            borderRadius: 999,
            background: roleColor.bg,
            color: roleColor.color,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {tRole(person.role)}
        </span>
      </div>
    </div>
  );
}

export function JtraxShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = sectionFromPath(pathname);
  const { person, role } = useJtrax();
  const t = useTranslations("shell");

  const isHome = section === "home";
  const firstName = person.name.split(" ").filter((p) => !p.includes("."))[0] ?? "there";

  /* Only the dashboard titles itself from the shell. Every other section owns
     its own PageHeader — the shell used to repeat that title above it, which
     read as the same heading twice. */
  const title = isHome ? t("greeting", { name: firstName }) : "";
  const sub = isHome
    ? role === "Receptionist"
      ? t("receptionistSub")
      : t("dashboardSub")
    : "";

  return (
    <>
      <Sidebar section={section} />
      <main
        className="jt-main"
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column", gap: 18 }}
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
            {title && (
              <h1
                style={{
                  margin: 0,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 23,
                  fontWeight: 700,
                  color: COLORS.text,
                  letterSpacing: "-0.01em",
                }}
              >
                {title}
              </h1>
            )}
            {sub && (
              <p style={{ margin: "4px 0 0", fontFamily: FONT, fontSize: 14.5, color: COLORS.textSecondary }}>
                {sub}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <LanguageToggle />
            <AccountChip />
          </div>
        </header>

        {children}
      </main>
    </>
  );
}
