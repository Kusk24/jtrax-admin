/* A family's erasure request on their guardian's page: an admin can carry it
   out or decline it, reception only sees it, and nothing shows without one. */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { openRequestFor, type DataRequest } from "@/lib/data-requests";
import { ErasureRequest } from "./ErasureRequest";

let role = "Admin";
vi.mock("../JtraxContext", () => ({ useJtrax: () => ({ role }) }));

const requests: DataRequest[] = [
  { data_request_id: "dreq_1", status: "Open", parent_id: "par_sandy", requested_by_name: "Sandy Jones", note: "Moving away", requested_at: "2026-10-15 03:00:00" },
  { data_request_id: "dreq_0", status: "Done", parent_id: "par_old", requested_by_name: "Old", note: "", requested_at: "2026-01-01 03:00:00" },
];
vi.mock("@/lib/api", () => ({ api: { get: vi.fn(async () => requests), post: vi.fn(async () => ({})) } }));

function show(parentId: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErasureRequest parentId={parentId} onErase={async () => {}} />
    </NextIntlClientProvider>,
  );
}

describe("ErasureRequest", () => {
  it("finds only an open request for this guardian", () => {
    expect(openRequestFor(requests, "par_sandy")?.data_request_id).toBe("dreq_1");
    expect(openRequestFor(requests, "par_old")).toBeUndefined();
  });

  it("lets an admin erase or decline", async () => {
    role = "Admin";
    show("par_sandy");
    expect(await screen.findByText(/asked to have their data deleted/)).toBeTruthy();
    expect(screen.getByText(/Moving away/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Erase family" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Decline request" })).toBeTruthy();
  });

  it("shows reception the request without the actions", async () => {
    role = "Receptionist";
    show("par_sandy");
    expect(await screen.findByText(/asked to have their data deleted/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Erase family" })).toBeNull();
    expect(screen.getByText("An admin carries this out.")).toBeTruthy();
  });

  it("stays out of the way when there is no open request", async () => {
    role = "Admin";
    const { container } = show("par_old");
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toBe("");
  });
});
