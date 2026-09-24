/**
 * Form scanning settings: which Gemini model reads the photographed forms, and
 * the connection test behind Settings' Test button.
 *
 * The API key never reaches the console. It lives in the server's environment,
 * and `configured` is the only thing said about it here.
 */
import { api } from "./api";

export type ScanSettings = {
  /** False when the server has no key, so scanning is off whatever the model. */
  configured: boolean;
  /** The model scans use now. */
  model: string;
  /** What the server uses when nothing is saved here. */
  defaultModel: string;
  /** Saved in Settings. Empty when the server's default is in use. */
  savedModel: string;
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
 * Free Gemini models that read images and that a key made today can use. The
 * 2.5 models are left out on purpose: Google now serves them only to accounts
 * that used them before, so a new key gets a 404. Anything else goes through
 * "Other".
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

export const getScanSettings = () => api.get<ScanSettings>("ocr");

/** An empty model removes the saved one, so the server's default applies again. */
export const saveScanModel = (model: string) => api.put<ScanSettings>("ocr", { model });

/** Tests `model` without saving it, or what scans use now when it is omitted. */
export const testScanModel = (model?: string) =>
  api.post<ScanTestResult>("ocr/test", model ? { model } : {});
