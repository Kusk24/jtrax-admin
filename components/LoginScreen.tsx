"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { LanguageToggle } from "./LanguageToggle";
import { signIn, type SignInState } from "@/app/actions/auth";
import { Icon, type IconName } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";

/* The three lines on the brand panel, each with one of the mockup's icons. */
const POINTS: Array<{ key: string; icon: IconName }> = [
  { key: "pointRoster", icon: "students" },
  { key: "pointDesk", icon: "userCheck" },
  { key: "pointCredits", icon: "wallet" },
];

const inputWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "11px 13px",
  borderRadius: 10,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
} as const;

/* The wrapper carries the border, so the input inside it is chrome-free — its
   own focus ring would sit inside the box and look doubled. */
const bareInputStyle = {
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: FONT,
  fontSize: 15,
  color: COLORS.text,
} as const;

export function BrandPanel() {
  const t = useTranslations("auth");

  return (
    <aside className="jt-login-brand">
      {/* Oversized knight, clipped by the panel — the mockup's own icon set,
          not decoration imported from elsewhere. */}
      <span aria-hidden className="jt-login-motif">
        <Icon name="knight" size={420} color={COLORS.surface} />
      </span>

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
        <Image
          src="/jca-logo.png"
          alt=""
          width={46}
          height={46}
          style={{ borderRadius: 11, objectFit: "contain", background: COLORS.surface, padding: 3 }}
        />
        <span>
          <span
            style={{
              display: "block",
              fontFamily: FONT,
              fontSize: 22,
              fontWeight: 700,
              color: COLORS.surface,
              lineHeight: 1.15,
            }}
          >
            JTRAX
          </span>
          <span
            style={{ display: "block", fontFamily: FONT, fontSize: 13.5, color: "rgb(255 255 255 / 0.72)" }}
          >
            {t("brandSub")}
          </span>
        </span>
      </div>

      <p
        className="jt-login-tagline"
        style={{
          position: "relative",
          margin: 0,
          maxWidth: 380,
          fontFamily: FONT,
          fontSize: 27,
          fontWeight: 700,
          lineHeight: 1.32,
          letterSpacing: "-0.01em",
          color: COLORS.surface,
        }}
      >
        {t("tagline")}
      </p>

      <ul className="jt-login-points">
        {POINTS.map(({ key, icon }) => (
          <li key={key} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgb(255 255 255 / 0.14)",
                flexShrink: 0,
              }}
            >
              <Icon name={icon} size={17} color={COLORS.surface} />
            </span>
            <span style={{ fontFamily: FONT, fontSize: 14.5, color: "rgb(255 255 255 / 0.88)" }}>
              {t(key)}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function LoginScreen({ justReset }: { justReset?: boolean }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {});

  /* Controlled so the show/hide toggle can re-render without losing the value. */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="jt-login">
      <BrandPanel />

      <div className="jt-login-panel">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <LanguageToggle />
        </div>

        <div style={{ width: "100%", maxWidth: 400, margin: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: FONT,
                fontSize: 26,
                fontWeight: 700,
                color: COLORS.text,
                letterSpacing: "-0.01em",
              }}
            >
              {t("title")}
            </h1>
            <p style={{ margin: "6px 0 0", fontFamily: FONT, fontSize: 14.5, color: COLORS.textSecondary }}>
              {t("sub")}
            </p>
          </div>

          {justReset && !state.error && (
            <div
              role="status"
              className="jtrax-fade-in-up"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "10px 13px",
                borderRadius: 10,
                background: COLORS.successBg,
                color: COLORS.success,
                fontFamily: FONT,
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <Icon name="check" size={16} />
              {t("resetDone")}
            </div>
          )}

          {state.error && (
            <div
              role="alert"
              className="jtrax-fade-in-up"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "10px 13px",
                borderRadius: 10,
                background: COLORS.dangerBg,
                color: COLORS.danger,
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <Icon name="alertTriangle" size={17} color={COLORS.danger} />
              {t(
                state.error === "missing"
                  ? "errorMissing"
                  : state.error === "unreachable"
                    ? "errorUnreachable"
                    /* Being briefly over the sign-in budget is not a wrong
                       password, and telling someone it is sends them off to
                       reset a password that was correct. */
                    : state.error === "tooMany"
                      ? "errorTooMany"
                      : "errorInvalid",
              )}
            </div>
          )}

          <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontFamily: FONT,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: COLORS.textSecondary,
                }}
              >
                {t("email")}
              </label>
              <span style={inputWrapStyle}>
                <Icon name="mail" size={17} color={COLORS.textSecondary} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={bareInputStyle}
                />
              </span>
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontFamily: FONT,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: COLORS.textSecondary,
                }}
              >
                {t("password")}
              </label>
              <span style={inputWrapStyle}>
                <Icon name="lock" size={17} color={COLORS.textSecondary} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  /* No dotted placeholder — it reads as an already-filled field. */
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={bareInputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    fontFamily: FONT,
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.blue,
                    cursor: "pointer",
                  }}
                >
                  {t(showPassword ? "hide" : "show")}
                </button>
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: FONT,
                  fontSize: 14,
                  color: COLORS.text,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name="remember"
                  defaultChecked
                  style={{ width: 15, height: 15, accentColor: COLORS.blue, cursor: "pointer" }}
                />
                {t("remember")}
              </label>

              <Link
                href="/forgot-password"
                style={{
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.blue,
                  textDecoration: "none",
                }}
              >
                {t("forgot")}
              </Link>
            </div>


            <button
              type="submit"
              disabled={pending}
              className="jt-btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                width: "100%",
                padding: "12px 16px",
                borderRadius: 999,
                border: "none",
                background: COLORS.blue,
                color: COLORS.surface,
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 600,
                cursor: pending ? "wait" : "pointer",
                opacity: pending ? 0.75 : 1,
              }}
            >
              {pending && (
                <span
                  aria-hidden
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    border: "2px solid rgb(255 255 255 / 0.4)",
                    borderTopColor: COLORS.surface,
                    animation: "jtrax-spin 0.8s linear infinite",
                  }}
                />
              )}
              {t(pending ? "signingIn" : "submit")}
            </button>
          </form>

        </div>

        <p
          style={{
            margin: 0,
            textAlign: "center",
            fontFamily: FONT,
            fontSize: 12.5,
            color: COLORS.textSecondary,
          }}
        >
          {t("footer")}
        </p>
      </div>
    </main>
  );
}
