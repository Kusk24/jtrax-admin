/**
 * Families' requests to have their data erased (PDPA s.33; backend
 * `data_request`), kept apart from the components that show them.
 */

export type DataRequest = {
  data_request_id: string;
  status: "Open" | "Done" | "Declined";
  parent_id: string | null;
  requested_by_name: string;
  note: string;
  requested_at: string;
};

/** The open request for this guardian, if any. */
export function openRequestFor(requests: DataRequest[], parentId: string): DataRequest | undefined {
  return requests.find((r) => r.parent_id === parentId && r.status === "Open");
}
