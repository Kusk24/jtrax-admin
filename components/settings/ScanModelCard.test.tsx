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
import type { ScanModelList, ScanSettings, ScanTestResult } from "@/lib/ocr";
import { starred } from "@/lib/starred-label";

const state: ScanSettings = { configured: true, model: "gemini-2.5-flash", defaultModel: "gemini-2.5-flash", savedModel: "" };
const getScanSettings = vi.fn(async (): Promise<ScanSettings> => state);
const saveScanModel = vi.fn(async (model: string): Promise<ScanSettings> => ({ ...state, model: model || state.defaultModel, savedModel: model }));
const testScanModel = vi.fn(async (model?: string): Promise<ScanTestResult> =>
  model === "gemini-2.5-flash" || model === undefined
    ? { ok: false, model: model ?? "gemini-3.8-flash", reason: "model_unavailable", status: 404 }
    : { ok: true, model: model, millis: 840 },
);

/* Google's list for the key, as the server passes it on. */
const googleList: ScanModelList = {
  models: [
    { name: "gemini-3.8-flash", displayName: "Gemini 3.8 Flash",
      price: { inputPerMillion: 0.75, outputPerMillion: 3.75 },
      nextPrice: { from: "2027-01-01", inputPerMillion: 1.5, outputPerMillion: 7.5 } },
    { name: "gemini-3.7-flash", displayName: "Gemini 3.7 Flash" },
    { name: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash", price: { inputPerMillion: 0.3, outputPerMillion: 2.5 } },
  ],
  pricesAsOf: "2026-10-13",
  pricesSource: "https://ai.google.dev/gemini-api/docs/pricing",
};
const listScanModels = vi.fn(async (): Promise<ScanModelList> => googleList);

vi.mock("@/lib/ocr", async (actual) => ({
  ...(await actual<typeof import("@/lib/ocr")>()),
  getScanSettings: () => getScanSettings(),
  listScanModels: () => listScanModels(),
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

const picker = () => screen.getByLabelText(starred(en.settings.scanModelLabel)) as HTMLSelectElement;

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
    await waitFor(() => expect(picker().options.length).toBeGreaterThan(2));
    fireEvent.change(picker(), { target: { value: "gemini-3.8-flash" } });
    // Saved without pressing Test first.
    fireEvent.click(screen.getByRole("button", { name: en.settings.scanSave }));
    await waitFor(() => expect(saveScanModel).toHaveBeenCalledWith("gemini-3.8-flash"));
    // No model named: the check is of what scans now use.
    await waitFor(() => expect(testScanModel).toHaveBeenCalledWith(undefined));
    const status = await screen.findByRole("status");
    await waitFor(() => expect(status.textContent).toContain(en.settings.scanModelUnavailable.split("{")[0]));
  });

  it("refuses a model name that is not one", async () => {
    renderCard();
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "__other__" } });
    fireEvent.change(screen.getByLabelText(starred(en.settings.scanOtherLabel)), { target: { value: "../files" } });
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

  it("offers Google's own list, each with its price", async () => {
    renderCard();
    await waitFor(() => expect(picker().disabled).toBe(false));
    await waitFor(() => expect(picker().options.length).toBe(1 + googleList.models.length + 1));
    const labels = Array.from(picker().options).map((o) => o.textContent);
    expect(labels).toContain("gemini-3.8-flash · $0.75 / $3.75 per 1M tokens");
    // No price from Google: no number made up.
    expect(labels).toContain("gemini-3.7-flash");

    fireEvent.change(picker(), { target: { value: "gemini-3.8-flash" } });
    expect(await screen.findByText(/Price: \$0\.75 per million input tokens/)).toBeDefined();
    // The rise Google announced, with its date.
    expect(screen.getByText(/From Jan 1, 2027: \$1\.50 \/ \$7\.50/)).toBeDefined();
    expect(screen.getByText(/Prices from Google's pricing page, Oct 13, 2026/)).toBeDefined();

    fireEvent.change(picker(), { target: { value: "gemini-3.7-flash" } });
    expect(await screen.findByText("Google doesn't publish a price for gemini-3.7-flash.")).toBeDefined();
  });

  it("keeps the built-in list, and says why, when Google refuses", async () => {
    listScanModels.mockResolvedValueOnce({ ...googleList, models: [], reason: "key_rejected", status: 403 });
    renderCard();
    expect(await screen.findByText(`${en.settings.scanListFailed} (key_rejected 403)`)).toBeDefined();
    const labels = Array.from(picker().options).map((o) => o.value);
    expect(labels).toContain("gemini-3.8-flash");
  });

  it("says what scanning has cost this month, and what a thousand scans cost on each model", async () => {
    getScanSettings.mockResolvedValueOnce({
      ...state,
      usage: {
        since: "2026-10-01", scans: 42, tests: 2, inputTokens: 56_574, outputTokens: 25_074, costUSD: 0.1364,
        unpricedCalls: 0, avgScanInputTokens: 1347, avgScanOutputTokens: 597,
      },
    });
    renderCard();
    expect(await screen.findByText("Since Oct 1, 2026: 42 scans and 2 tests, about $0.1364.")).toBeDefined();
    expect(screen.getByText(en.settings.scanCostEstimate)).toBeDefined();
    // (1347 × $0.75 + 597 × $3.75) per million tokens, times a thousand.
    await waitFor(() =>
      expect(Array.from(picker().options).map((o) => o.textContent)).toContain("gemini-3.8-flash · ≈ $3.25 per 1,000 scans"),
    );
    fireEvent.change(picker(), { target: { value: "gemini-3.8-flash" } });
    expect(await screen.findByText(/About \$3\.25 per 1,000 scans, at this academy's average scan of 1,347 input/)).toBeDefined();
  });
});

