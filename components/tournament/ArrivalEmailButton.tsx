"use client";

/* The participant row's email button: the arrival confirmation email.
 *
 * Hovering says what it does, and whether it has gone already. Not sent yet,
 * a click sends it and the icon turns to a tick. Already sent, a click asks
 * first — "Already sent on 13 Oct. Send again?" — so a family is not written
 * to twice by a stray click.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { fmtDate } from "@/lib/live";
import { COLORS, FONT } from "@/lib/theme";
import { iconButtonStyle } from "../crud";

const bubble: React.CSSProperties = {
  position: "absolute",
  zIndex: 30,
  right: 0,
  padding: "6px 10px",
  borderRadius: 8,
  background: COLORS.text,
  color: COLORS.surface,
  fontFamily: FONT,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
  pointerEvents: "none",
};

export function ArrivalEmailButton({
  name,
  remindedAt,
  onSend,
}: {
  name: string;
  /** When the email last went, or undefined if never. */
  remindedAt?: string;
  /** Sends it; true when it went. */
  onSend: () => Promise<boolean>;
}) {
  const t = useTranslations("tournament");
  const [hover, setHover] = useState(false);
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  /* The "send again?" box closes on a click anywhere else. */
  useEffect(() => {
    if (!asking) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setAsking(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [asking]);

  /* The tick reads "Email sent" for a moment, then the button is itself again. */
  useEffect(() => {
    if (!justSent) return;
    const id = setTimeout(() => setJustSent(false), 3000);
    return () => clearTimeout(id);
  }, [justSent]);

  async function send() {
    setAsking(false);
    setSending(true);
    const ok = await onSend();
    setSending(false);
    if (ok) setJustSent(true);
  }

  const sentOn = remindedAt ? fmtDate(remindedAt) : "";
  const tip = justSent
    ? t("emailJustSent")
    : sentOn
      ? t("emailAlreadySentTip", { date: sentOn })
      : t("emailSendTip", { name });

  return (
    <span
      ref={box}
      style={{ position: "relative", display: "inline-flex" }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className="jt-btn-ghost"
        aria-label={tip}
        disabled={sending}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        onClick={() => (sentOn && !justSent ? setAsking((v) => !v) : !justSent && void send())}
        style={{ ...iconButtonStyle, cursor: sending ? "wait" : "pointer", borderColor: justSent ? COLORS.success : COLORS.border }}
      >
        <Icon name={justSent ? "check" : "mail"} size={14} color={justSent ? COLORS.success : COLORS.blue} />
      </button>

      {(hover || justSent) && !asking && (
        <span role="tooltip" style={{ ...bubble, bottom: "calc(100% + 6px)" }}>
          {tip}
        </span>
      )}

      {asking && (
        <span
          role="dialog"
          aria-label={t("emailAlreadySent", { date: sentOn })}
          style={{
            position: "absolute",
            zIndex: 30,
            right: 0,
            top: "calc(100% + 6px)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 200,
            padding: 10,
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.surface,
            boxShadow: "0 10px 28px rgb(0 0 0 / 0.18)",
            fontFamily: FONT,
            fontSize: 13,
            color: COLORS.text,
          }}
        >
          <span style={{ fontWeight: 600 }}>{t("emailAlreadySent", { date: sentOn })}</span>
          <span style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => void send()}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "none", background: COLORS.blue, color: "#fff", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
            >
              {t("emailSendAgain")}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              {t("emailCancel")}
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
