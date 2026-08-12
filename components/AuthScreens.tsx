"use client";

/* The forgot-password and reset screens. They share LoginScreen's split shell —
   brand panel left, card right — so the three read as one flow rather than
   three pages that happen to be about passwords. */
import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { BrandPanel } from "./LoginScreen";
import { LanguageToggle } from "./LanguageToggle";
import {
  requestPasswordReset,
  resetPassword,
  type ResetRequestState,
  type ResetState,
} from "@/app/actions/auth";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";

const inputWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "11px 13px",
  borderRadius: 10,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
} as const;

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

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontFamily: FONT,
  fontSize: 13.5,
  fontWeight: 600,
  color: COLORS.textSecondary,
} as const;

const linkStyle = {
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 600,
  color: COLORS.blue,
  textDecoration: "none",
} as const;

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <main className="jt-login">
      <BrandPanel />
      <div className="jt-login-panel">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <LanguageToggle />
        </div>
        <div style={{ width: "100%", maxWidth: 400, margin: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.01em" }}>
              {title}
            </h1>
            <p style={{ margin: "6px 0 0", fontFamily: FONT, fontSize: 14.5, color: COLORS.textSecondary }}>{sub}</p>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}

function Alert({ children, tone = "danger" }: { children: React.ReactNode; tone?: "danger" | "success" }) {
  return (
    <div
      role="alert"
      className="jtrax-fade-in-up"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "10px 13px",
        borderRadius: 10,
        background: tone === "danger" ? COLORS.dangerBg : COLORS.successBg,
        color: tone === "danger" ? COLORS.danger : COLORS.success,
        fontFamily: FONT,
        fontSize: 13.5,
        fontWeight: 600,
      }}
    >
      <Icon name={tone === "danger" ? "alertTriangle" : "check"} size={16} />
      {children}
    </div>
  );
}

export function ForgotPasswordScreen() {
  const t = useTranslations("reset");
  const [state, formAction, pending] = useActionState<ResetRequestState, FormData>(requestPasswordReset, {});

  return (
    <Shell title={t("requestTitle")} sub={t("requestHint")}>
      {state.status === "sent" ? (
        <>
          <Alert tone="success">{t("sentTitle")}</Alert>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.5 }}>
            {t("sentBody")}
          </p>
          <Link href="/login" className="jt-btn-primary" style={{ textAlign: "center", textDecoration: "none" }}>
            {t("backToSignIn")}
          </Link>
        </>
      ) : (
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {state.error && <Alert>{t(state.error === "missing" ? "errorMissing" : "errorUnreachable")}</Alert>}
          <div>
            <label htmlFor="email" style={labelStyle}>{t("email")}</label>
            <span style={inputWrapStyle}>
              <Icon name="mail" size={16} color={COLORS.textSecondary} />
              <input id="email" name="email" type="email" autoComplete="email" style={bareInputStyle} />
            </span>
          </div>
          <button type="submit" disabled={pending} className="jt-btn-primary">
            {t(pending ? "sending" : "sendLink")}
          </button>
          <Link href="/login" style={{ ...linkStyle, textAlign: "center" }}>{t("backToSignIn")}</Link>
        </form>
      )}
    </Shell>
  );
}

export function ResetPasswordScreen({ token }: { token: string }) {
  const t = useTranslations("reset");
  const [state, formAction, pending] = useActionState<ResetState, FormData>(resetPassword, {});

  /* No token means the link was cut short somewhere — say so, rather than
     showing a form that cannot succeed. */
  if (!token) {
    return (
      <Shell title={t("setTitle")} sub={t("rule")}>
        <Alert>{t("noToken")}</Alert>
        <Link href="/forgot-password" className="jt-btn-primary" style={{ textAlign: "center", textDecoration: "none" }}>
          {t("requestAnother")}
        </Link>
      </Shell>
    );
  }

  const errorKey =
    state.error === "missing"
      ? "errorMissing"
      : state.error === "short"
        ? "errorShort"
        : state.error === "mismatch"
          ? "errorMismatch"
          : state.error === "invalid"
            ? "errorInvalid"
            : "errorUnreachable";

  return (
    <Shell title={t("setTitle")} sub={t("rule")}>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="hidden" name="token" value={token} />
        {state.error && <Alert>{t(errorKey)}</Alert>}
        <div>
          <label htmlFor="password" style={labelStyle}>{t("newPassword")}</label>
          <span style={inputWrapStyle}>
            <Icon name="lock" size={16} color={COLORS.textSecondary} />
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} style={bareInputStyle} />
          </span>
        </div>
        <div>
          <label htmlFor="confirm" style={labelStyle}>{t("confirmPassword")}</label>
          <span style={inputWrapStyle}>
            <Icon name="lock" size={16} color={COLORS.textSecondary} />
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} style={bareInputStyle} />
          </span>
        </div>
        <button type="submit" disabled={pending} className="jt-btn-primary">
          {t(pending ? "saving" : "setPassword")}
        </button>
        {state.error === "invalid" && (
          <Link href="/forgot-password" style={{ ...linkStyle, textAlign: "center" }}>{t("requestAnother")}</Link>
        )}
      </form>
    </Shell>
  );
}
