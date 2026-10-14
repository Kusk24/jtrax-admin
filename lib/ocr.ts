/**
 * Form scanning settings: which Gemini model reads the photographed forms, and
 * the connection test behind Settings' Test button.
 *
 * The API key never reaches the console. It lives in the server's environment,
 * and `configured` is the only thing said about it here.
 */
import { api } from "./api";

/** What scanning has cost this month (academy time), from the tokens Google
    reported for each call, priced on the day. An estimate of the bill. */
export type ScanUsage = {
  since: string;
  scans: number;
  tests: number;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  /** Calls on a model with no published price, left out of costUSD. */
  unpricedCalls: number;
  /** The average scan over the last 90 days; 0 before the first. */
  avgScanInputTokens: number;
  avgScanOutputTokens: number;
};

export type ScanSettings = {
  /** False when the server has no key, so scanning is off whatever the model. */
  configured: boolean;
  /** The model scans use now. */
  model: string;
  /** What the server uses when nothing is saved here. */
  defaultModel: string;
  /** Saved in Settings. Empty when the server's default is in use. */
  savedModel: string;
  /** Who last chose the model here, and when (RFC 3339). Empty before anyone has. */
  savedBy?: string;
  savedAt?: string;
  usage?: ScanUsage;
};

export type ScanTestReason =
  | "model_unavailable"
  | "key_rejected"
  | "quota"
  | "provider_error"
  | "unreachable"
  | "not_configured"
  | "not_testable";

export type ScanTestResult = {
  ok: boolean;
  model: string;
  /** How long the model took to answer. Only on success. */
  millis?: number;
  reason?: ScanTestReason;
  /** The status Google answered with, when it answered at all. */
  status?: number;
};

/**
 * The picker's list when Google's own cannot be loaded. Free Gemini models
 * that read images and that a key made today can use; the 2.5 models are left
 * out because Google serves them only to accounts that used them before.
 */
export const SCAN_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
] as const;

/** The same rule the server applies, so a bad name is caught before a round trip. */
export function isValidModelName(name: string): boolean {
  return /^[a-z0-9][a-z0-9.-]{0,63}$/.test(name);
}

/** A model's Standard-tier price in US dollars per million tokens. `from` is
    the day an announced price starts. */
export type ScanPrice = { from?: string; inputPerMillion: number; outputPerMillion: number };

/** One model the server's key can call, with its price when Google publishes one. */
export type ScanModel = { name: string; displayName: string; price?: ScanPrice; nextPrice?: ScanPrice };

export type ScanModelList = {
  /** Newest first. Empty when Google could not be asked. */
  models: ScanModel[];
  /** When the prices were copied from Google's pricing page, and where from. */
  pricesAsOf: string;
  pricesSource: string;
  /** Why the list is empty, as a failed scan says it. */
  reason?: ScanTestReason;
  status?: number;
};

/** US dollars, as Google bills. Through Intl with the ISO code; a fraction of
    a cent keeps its digits, since a single scan costs that. */
export function formatUSD(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: amount > 0 && amount < 1 ? 4 : 2,
  }).format(amount);
}

/** What a thousand scans would cost on a model, at this academy's average
    scan size. null before there is an average, or without a price. */
export function perThousandScans(price: ScanPrice | undefined, usage: ScanUsage | undefined): number | null {
  if (!price || !usage || usage.avgScanInputTokens + usage.avgScanOutputTokens === 0) return null;
  return ((usage.avgScanInputTokens * price.inputPerMillion + usage.avgScanOutputTokens * price.outputPerMillion) / 1e6) * 1000;
}

export const getScanSettings = () => api.get<ScanSettings>("ocr");

/** Google's current list for the server's key, with prices. */
export const listScanModels = () => api.get<ScanModelList>("ocr/models");

/** An empty model removes the saved one, so the server's default applies again. */
export const saveScanModel = (model: string) => api.put<ScanSettings>("ocr", { model });

/** Tests `model` without saving it, or what scans use now when it is omitted. */
export const testScanModel = (model?: string) =>
  api.post<ScanTestResult>("ocr/test", model ? { model } : {});
