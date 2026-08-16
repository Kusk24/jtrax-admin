"use client";

/* Where an admin installs the LINE channel credentials.
 *
 * A deliberate exception to "secrets come from the environment": these belong
 * to the academy's LINE account rather than to the deployment, and rotating
 * them should not need a redeploy. The server seals them before storage under a
 * key that *does* come from the environment, and refuses to store them at all
 * when that key is missing — which is what `sealingKeySet` reports here.
 *
 * Nothing on this screen can read a stored credential back. The four-character
 * hint is enough to tell two tokens apart and useless for anything else.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getChannel, removeChannel, saveChannel, type LineChannel } from "@/lib/line";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { ErrorNote, errorText } from "../crud";
import { primaryButtonStyle, secondaryButtonStyle } from "../page-kit";
import { Badge, Card, SectionTitle } from "../ui";

const fieldStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 9,
  border: `1px solid ${COLORS.border}`,
  fontFamily: FONT,
  fontSize: 14,
  color: COLORS.text,
  outline: "none",
} as const;

export function LineChannelCard() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");

  const [channel, setChannel] = useState<LineChannel | null>(null);
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    try {
      setChannel(await getChannel());
      setError(null);
    } catch (e) {
      setError(errorText(e, tCommon("loadFailed")));
    }
  }, [tCommon]);

  /* The first read is written out rather than calling `reload`, so the state
     is only touched after the request resolves and never after unmount. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getChannel();
        if (!cancelled) setChannel(next);
      } catch {
        /* Left to the card's empty state; `reload` reports failures the user
           caused, and a failed first read is usually just a cold API. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveChannel(token.trim(), secret.trim());
      // Cleared immediately: there is no reason for a credential to sit in a
      // form field after it has been stored.
      setToken("");
      setSecret("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
      await reload();
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await removeChannel();
      await reload();
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  async function copyWebhook() {
    if (!channel) return;
    try {
      await navigator.clipboard.writeText(channel.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Refused clipboard access; the URL is selectable on screen anyway. */
    }
  }

  const canSave = token.trim().length > 0 && secret.trim().length > 0 && !busy && channel?.sealingKeySet;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <Icon name="chat" size={18} color={COLORS.line} />
        <SectionTitle style={{ flex: 1 }}>{t("lineTitle")}</SectionTitle>
        {channel && (
          <Badge
            color={channel.configured ? COLORS.line : COLORS.textSecondary}
            bg={channel.configured ? "#E8F9EE" : COLORS.neutralBg}
          >
            {t(channel.configured ? "lineConnected" : "lineNotConnected")}
          </Badge>
        )}
      </div>

      <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, lineHeight: 1.55, color: COLORS.textSecondary }}>
        {t("lineDesc")}
      </p>

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* Without a sealing key the server will not store credentials at all,
          so say that before the form rather than after a failed save. */}
      {channel && !channel.sealingKeySet && (
        <div
          role="note"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 9,
            padding: "11px 13px",
            borderRadius: 10,
            background: COLORS.warningBg,
            color: COLORS.warning,
            fontFamily: FONT,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <Icon name="alertTriangle" size={16} color={COLORS.warning} />
          <span>{t("lineNoKey")}</span>
        </div>
      )}

      {channel?.configured && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
          <Icon name="lock" size={14} color={COLORS.textSecondary} />
          {t("lineInstalled", { hint: channel.tokenHint ?? "" })}
        </div>
      )}

      {/* The live allowance. On the free plan this is the real limit on the
          feature, and finding out by having a message fail is the worst way
          to learn it. */}
      {channel?.quota && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Icon name="wallet" size={15} color={COLORS.blue} />
          <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.text }}>
            {channel.quota.limited
              ? t("lineQuota", {
                  used: new Intl.NumberFormat("en-US").format(channel.quota.used),
                  limit: new Intl.NumberFormat("en-US").format(channel.quota.limit),
                })
              : t("lineQuotaUnlimited")}
          </span>
        </div>
      )}

      <div>
        <label htmlFor="jtrax-line-token" style={{ display: "block", marginBottom: 5, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>
          {t("lineTokenLabel")}
        </label>
        <input
          id="jtrax-line-token"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={t("linePlaceholder")}
          style={fieldStyle}
        />
      </div>

      <div>
        <label htmlFor="jtrax-line-secret" style={{ display: "block", marginBottom: 5, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>
          {t("lineSecretLabel")}
        </label>
        <input
          id="jtrax-line-secret"
          type="password"
          autoComplete="off"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={t("linePlaceholder")}
          style={fieldStyle}
        />
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 5, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>
          {t("lineWebhookLabel")}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code
            style={{
              flex: 1,
              minWidth: 0,
              padding: "9px 12px",
              borderRadius: 9,
              background: COLORS.neutralBg,
              fontSize: 12.5,
              color: COLORS.textSecondary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {channel?.webhookUrl ?? ""}
          </code>
          <button
            type="button"
            onClick={() => void copyWebhook()}
            aria-label={t("lineCopyWebhook")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 9,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Icon name={copied ? "check" : "copy"} size={15} color={copied ? COLORS.success : COLORS.textSecondary} />
          </button>
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: FONT, fontSize: 12.5, lineHeight: 1.5, color: COLORS.textSecondary }}>
          {t("lineWebhookHint")}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.success,
            opacity: saved ? 1 : 0,
            transition: "opacity 180ms ease",
          }}
          aria-live="polite"
        >
          <Icon name="check" size={15} color={COLORS.success} />
          {saved ? t("saved") : ""}
        </span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {channel?.configured && (
            <button
              type="button"
              className="jt-btn-ghost"
              style={{ ...secondaryButtonStyle, opacity: busy ? 0.6 : 1 }}
              disabled={busy}
              onClick={() => void disconnect()}
            >
              {t("lineDisconnect")}
            </button>
          )}
          <button
            type="button"
            className="jt-btn-primary"
            style={{ ...primaryButtonStyle, opacity: canSave ? 1 : 0.6, cursor: canSave ? "pointer" : "not-allowed" }}
            disabled={!canSave}
            onClick={() => void save()}
          >
            {t("lineSave")}
          </button>
        </div>
      </div>
    </Card>
  );
}
