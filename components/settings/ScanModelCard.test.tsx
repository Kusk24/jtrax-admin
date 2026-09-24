/**
 * The scanning card: trying a model before saving it, and the check that runs
 * by itself after every save.
 *
 * The reason this card exists is a model that stopped working for new keys
 * (Google's 404 for gemini-2.5-flash), so the failure text is what matters
 * most: it has to say which model and what to do, not "request failed".
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { ScanSettings, ScanTestResult } from "@/lib/ocr";

const state: ScanSettings = { configured: true, model: "gemini-2.5-flash", defaultModel: "gemini-2.5-flash", savedModel: "" };
const getScanSettings = vi.fn(async (): Promise<ScanSettings> => state);
const saveScanModel = vi.fn(async (model: string): Promise<ScanSettings> => ({ ...state, model: model || state.defaultModel, savedModel: model }));
const testScanModel = vi.fn(async (model?: string): Promise<ScanTestResult> =>
  model === "gemini-2.5-flash" || model === undefined
    ? { ok: false, model: model ?? "gemini-3.8-flash", reason: "model_unavailable", status: 404 }
    : { ok: true, model: model, millis: 840 },
);

vi.mock("@/lib/ocr", async (actual) => ({
  ...(await actual<typeof import("@/lib/ocr")>()),
  getScanSettings: () => getScanSettings(),
  saveScanModel: (m: string) => saveScanModel(m),
  testScanModel: (m?: string) => testScanModel(m),
}));

const { ScanModelCard } = await import("./ScanModelCard");

function renderCard() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ScanModelCard />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const picker = () => screen.getByLabelText(en.settings.scanModelLabel) as HTMLSelectElement;

describe("the scanning card", () => {
  it("says which model is failing, and why", async () => {
    renderCard();
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: en.settings.scanTest }));
    const status = await screen.findByRole("status");
    await waitFor(() => expect(status.textContent).toContain("Google has no model called gemini-2.5-flash"));
    // Testing the server default names it, rather than testing whatever is saved.
    expect(testScanModel).toHaveBeenCalledWith("gemini-2.5-flash");
  });

  it("tests a model before it is saved, without saving it", async () => {
    renderCard();
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "gemini-3.8-flash" } });
    fireEvent.click(screen.getByRole("button", { name: en.settings.scanTest }));
    const status = await screen.findByRole("status");
    await waitFor(() => expect(status.textContent).toContain("Works. gemini-3.8-flash answered in 0.8 s"));
    expect(saveScanModel).not.toHaveBeenCalled();
  });

  it("tests the model again by itself after saving", async () => {
    renderCard();
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "gemini-3.5-flash-lite" } });
    // Saved without pressing Test first.
    fireEvent.click(screen.getByRole("button", { name: en.settings.scanSave }));
    await waitFor(() => expect(saveScanModel).toHaveBeenCalledWith("gemini-3.5-flash-lite"));
    // No model named: the check is of what scans now use.
    await waitFor(() => expect(testScanModel).toHaveBeenCalledWith(undefined));
    const status = await screen.findByRole("status");
    await waitFor(() => expect(status.textContent).toContain(en.settings.scanModelUnavailable.split("{")[0]));
  });

  it("refuses a model name that is not one", async () => {
    renderCard();
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "__other__" } });
    fireEvent.change(screen.getByLabelText(en.settings.scanOtherLabel), { target: { value: "../files" } });
    expect(screen.getByText(en.settings.scanBadName)).toBeDefined();
    expect((screen.getByRole("button", { name: en.settings.scanSave }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: en.settings.scanTest }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("says scanning is off when the server has no key", async () => {
    getScanSettings.mockResolvedValueOnce({ ...state, configured: false, model: "", defaultModel: "" });
    renderCard();
    expect(await screen.findByText(en.settings.scanNoKeyHelp)).toBeDefined();
    expect((screen.getByRole("button", { name: en.settings.scanTest }) as HTMLButtonElement).disabled).toBe(true);
  });
});
