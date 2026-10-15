/* A family's erasure request shows on Parents in the nav, so the office sees
   it without opening every guardian — and goes when the office has acted. */
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { JtraxShell } from "../JtraxShell";
import { announceDataRequestsChanged, openErasureParents, type DataRequest } from "@/lib/data-requests";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/app/actions/auth", () => ({ signOut: vi.fn() }));
vi.mock("../JtraxContext", () => ({
  useJtrax: () => ({ person: { name: "JCA Head Office", role: "Admin" }, role: "Admin" }),
}));

const open = (id: string, parent: string | null): DataRequest => ({
  data_request_id: id, status: "Open", parent_id: parent, requested_by_name: "x", note: "", requested_at: "2026-10-15 03:00:00",
});
let rows: DataRequest[] = [];
vi.mock("@/lib/api", () => ({ api: { get: vi.fn(async (path: string) => (path === "data-requests" ? rows : [])) } }));
vi.mock("../messages/useLineUnread", () => ({ useLineUnread: () => 0 }));

function shell() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <JtraxShell>
        <div />
      </JtraxShell>
    </NextIntlClientProvider>,
  );
}

describe("open erasure requests", () => {
  it("are the waiting ones with a guardian, each family once", () => {
    const done = { ...open("d3", "par_c"), status: "Done" as const };
    expect([...openErasureParents([open("d1", "par_a"), open("d2", "par_a"), open("d4", "par_b"), done, open("d5", null)])].sort())
      .toEqual(["par_a", "par_b"]);
  });

  it("show as a count on Parents, and go once the office has acted", async () => {
    rows = [open("d1", "par_a"), open("d2", "par_b")];
    shell();
    expect(await screen.findByRole("status", { name: "2 families asked to be deleted" })).toBeTruthy();

    rows = [];
    await act(async () => {
      announceDataRequestsChanged();
    });
    expect(screen.queryByRole("status", { name: /asked to be deleted/ })).toBeNull();
  });
});
