/**
 * Why a registration form scan failed, in the console's language, with the
 * exact code the server sent. A failed scan used to show only the server's
 * English sentence, or "upload failed (413)" when the photo never reached it.
 */
import { ApiError } from "./api";

/** The reason codes the server sends for a form scan, each with a sentence
    under students.scanWhy. */
export const SCAN_REASONS = [
  "model_unavailable",
  "key_rejected",
  "quota",
  "provider_error",
  "unreachable",
  "no_answer",
  "not_configured",
  "too_large",
  "no_image",
  "not_an_image",
] as const;

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The sentence, then the code it came with: "quota 429", or "http 413" for a
 * reply that never came from the backend (nginx refusing a large photo
 * answers HTML).
 */
export function scanErrorText(err: unknown, t: Translate): string {
  if (!(err instanceof ApiError)) {
    // No answer at all: offline, or the request was cut off.
    const detail = err instanceof Error && err.message ? err.message : "network";
    return `${t("scanWhy.unsent")} (${t("scanErrorCode", { code: detail })})`;
  }
  const body = (err.body ?? {}) as { reason?: string; status?: number };
  const reason = body.reason ?? "";
  const code = reason ? [reason, body.status || ""].join(" ").trim() : `http ${err.status}`;
  return `${scanSentence(err, reason, t)} (${t("scanErrorCode", { code })})`;
}

function scanSentence(err: ApiError, reason: string, t: Translate): string {
  if ((SCAN_REASONS as readonly string[]).includes(reason)) return t(`scanWhy.${reason}`);
  // No code: nginx or the proxy answered, not the scan.
  if (err.status === 413) return t("scanWhy.too_large");
  if (err.status === 429) return t("scanWhy.busy");
  // The server's own sentence, when it sent one. api.ts fills in
  // "upload failed (…)" when it did not, and the code already says that.
  const body = err.body as { error?: string } | undefined;
  return body?.error || t("scanWhy.server");
}
