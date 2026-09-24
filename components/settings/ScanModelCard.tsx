"use client";

/* Which Gemini model reads the photographed registration forms and ID cards.
 *
 * Google withdraws models and limits new keys often enough that the model has
 * to be changeable here, not only in the server's environment. The Test button
 * checks a model against the server's key before it is saved, and every save is
 * tested again straight after, so a model saved untested still shows whether
 * it works.
 *
 * The key itself never reaches this screen. It stays on the server.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import {
  getScanSettings,
  isValidModelName,
  saveScanModel,
  SCAN_MODELS,
  testScanModel,
  type ScanSettings,
  type ScanTestResult,
} from "@/lib/ocr";
import { COLORS, FONT } from "@/lib/theme";
import { ErrorNote, errorText } from "../crud";
import { fieldStyle, labelStyle, primaryButtonStyle, secondaryButtonStyle, selectStyle } from "../page-kit";
import { Badge, Card } from "../ui";

/* The select's value for "use the server's default", and for "type a name". */
const DEFAULT = "";
const OTHER = "__other__";

function choiceFor(saved: string): string {
  if (saved === "") return DEFAULT;
  return (SCAN_MODELS as readonly string[]).includes(saved) ? saved : OTHER;
}

export function ScanModelCard() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");

  const [settings, setSettings] = useState<ScanSettings | null>(null);
  /* null until the admin touches the picker, so the saved model shows through
     without copying it into state in an effect. */
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const [busy, setBusy] = useState<"test" | "save" | null>(null);
  const [result, setResult] = useState<ScanTestResult | null>(null);
  /* Whether the result shown is the check that ran after a save, which is
     worded differently from a test of an unsaved choice. */
  const [afterSave, setAfterSave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getScanSettings();
        if (!cancelled) setSettings(next);
      } catch (e) {
        if (!cancelled) setError(errorText(e, tCommon("loadFailed")));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tCommon]);

  const saved = settings?.savedModel ?? "";
  const choice = picked ?? choiceFor(saved);
  const other = typed ?? (choiceFor(saved) === OTHER ? saved : "");
  /* The model name the choice stands for. Empty means the server's default. */
  const model = choice === OTHER ? other.trim() : choice;
  const nameOk = choice !== OTHER || isValidModelName(model);
  const changed = model !== saved;

  async function runTest(name: string, fromSave: boolean) {
    setResult(null);
    setAfterSave(fromSave);
    try {
      setResult(await testScanModel(name || undefined));
    } catch (e) {
      setError(errorText(e, t("scanTestFailed")));
    }
  }

  async function test() {
    setBusy("test");
    setError(null);
    // "Server default" means the model the server started with, not whatever
    // is saved now, so it is named rather than left blank.
    await runTest(model || settings?.defaultModel || "", false);
    setBusy(null);
  }

  async function save() {
    setBusy("save");
    setError(null);
    try {
      const next = await saveScanModel(model);
      setSettings(next);
      setPicked(null);
      setTyped(null);
      // Tested again whether or not it was tested before saving: this is the
      // model every scan now uses.
      await runTest("", true);
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(null);
    }
  }

  /* At least 0.1: a model that answers in 40 ms did not answer in "0 s". */
  const seconds = (millis: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(Math.max(millis, 100) / 1000);

  function resultText(r: ScanTestResult): string {
    if (r.ok) {
      return t(afterSave ? "scanSavedWorks" : "scanWorks", { model: r.model, seconds: seconds(r.millis ?? 0) });
    }
    switch (r.reason) {
      case "model_unavailable":
        return t("scanModelUnavailable", { model: r.model });
      case "key_rejected":
        return t("scanKeyRejected", { status: r.status ?? 0 });
      case "quota":
        return t("scanQuota");
      case "unreachable":
        return t("scanUnreachable");
      case "not_configured":
        return t("scanNoKey");
      case "not_testable":
        return t("scanNotTestable");
      default:
        return r.status ? t("scanProviderErrorStatus", { status: r.status }) : t("scanProviderError");
    }
  }

  const canTest = !!settings?.configured && nameOk && busy === null;
  const canSave = !!settings && nameOk && changed && busy === null;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <p style={{ flex: "1 1 300px", margin: 0, fontFamily: FONT, fontSize: 13.5, lineHeight: 1.55, color: COLORS.textSecondary }}>
          {t("scanDesc")}
        </p>
        {settings && (
          <Badge
            color={settings.configured ? COLORS.success : COLORS.textSecondary}
            bg={settings.configured ? COLORS.successBg : COLORS.neutralBg}
          >
            {t(settings.configured ? "scanKeySet" : "scanKeyMissing")}
          </Badge>
        )}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* Said before the picker rather than after a failed test: with no key,
          no model choice here will make scanning work. */}
      {settings && !settings.configured && (
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
          <span>{t("scanNoKeyHelp")}</span>
        </div>
      )}

      {settings?.model && (
        <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
          {t("scanInUse")}{" "}
          <code style={{ fontSize: 12.5, color: COLORS.text }}>{settings.model}</code>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <label htmlFor="jtrax-scan-model" style={labelStyle}>
            {t("scanModelLabel")}
          </label>
          <select
            id="jtrax-scan-model"
            value={choice}
            disabled={!settings}
            onChange={(e) => {
              setPicked(e.target.value);
              setResult(null);
            }}
            style={selectStyle}
          >
            <option value={DEFAULT}>
              {t("scanServerDefault", { model: settings?.defaultModel ?? "" })}
            </option>
            {SCAN_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            <option value={OTHER}>{t("scanOther")}</option>
          </select>
        </div>
        {choice === OTHER && (
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <label htmlFor="jtrax-scan-model-name" style={labelStyle}>
              {t("scanOtherLabel")}
            </label>
            <input
              id="jtrax-scan-model-name"
              value={other}
              autoComplete="off"
              spellCheck={false}
              placeholder="gemini-…"
              onChange={(e) => {
                setTyped(e.target.value);
                setResult(null);
              }}
              aria-invalid={!nameOk}
              style={{ ...fieldStyle, borderColor: nameOk ? COLORS.border : COLORS.danger }}
            />
            {!nameOk && model !== "" && (
              <p style={{ margin: "6px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.danger }}>
                {t("scanBadName")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* The outcome of the last test, right under what was tested. */}
      {(busy !== null || result) && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 9,
            padding: "11px 13px",
            borderRadius: 10,
            background: busy !== null ? COLORS.neutralBg : result?.ok ? COLORS.successBg : COLORS.dangerBg,
            color: busy !== null ? COLORS.textSecondary : result?.ok ? COLORS.success : COLORS.danger,
            fontFamily: FONT,
            fontSize: 13.5,
            lineHeight: 1.5,
          }}
        >
          {busy === null && result && (
            <Icon name={result.ok ? "check" : "alertTriangle"} size={16} color={result.ok ? COLORS.success : COLORS.danger} />
          )}
          <span>
            {busy === "test" ? t("scanTesting") : busy === "save" ? t("scanSavingTesting") : result ? resultText(result) : ""}
          </span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="jt-btn-ghost"
          style={{ ...secondaryButtonStyle, opacity: canTest ? 1 : 0.6, cursor: canTest ? "pointer" : "not-allowed" }}
          disabled={!canTest}
          onClick={() => void test()}
        >
          {t("scanTest")}
        </button>
        <button
          type="button"
          className="jt-btn-primary"
          style={{ ...primaryButtonStyle, opacity: canSave ? 1 : 0.6, cursor: canSave ? "pointer" : "not-allowed" }}
          disabled={!canSave}
          onClick={() => void save()}
        >
          {t("scanSave")}
        </button>
      </div>
    </Card>
  );
}
