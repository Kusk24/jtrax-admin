/**
 * Families' requests to have their data erased (PDPA s.33; backend
 * `data_request`). Kept apart from the components that show them so the rules
 * can be tested, and so the nav badge, the Parents list and the guardian's
 * banner agree on what counts as waiting.
 */

export type DataRequest = {
  data_request_id: string;
  status: "Open" | "Done" | "Declined";
  parent_id: string | null;
  requested_by_name: string;
  note: string;
  requested_at: string;
};

/** The guardians with an erasure request still waiting for the office. */
export function openErasureParents(requests: DataRequest[]): Set<string> {
  return new Set(
    requests.filter((r) => r.status === "Open" && r.parent_id).map((r) => r.parent_id as string),
  );
}

/** The open request for one guardian, if any. */
export function openRequestFor(requests: DataRequest[], parentId: string): DataRequest | undefined {
  return requests.find((r) => r.parent_id === parentId && r.status === "Open");
}

/* Fired after the office erases or declines, so every indicator on screen —
   the nav badge, the list — drops the request at once instead of on its
   next poll. */
export const DATA_REQUESTS_CHANGED = "jtrax:data-requests-changed";

export function announceDataRequestsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DATA_REQUESTS_CHANGED));
}
