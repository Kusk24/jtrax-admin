import { ApiError } from "./api";

/**
 * Why cancelling a class failed, in the terms the desk can act on.
 *
 * - `gone`: the session no longer exists — someone else already cancelled
 *   it. The class is off, which is what the desk wanted, so this is handled
 *   as success rather than shown as an error.
 * - `outdated`: the server has no cancel route at all. A 404 with no JSON
 *   reason is the router's own "page not found", not the handler's "no such
 *   class": the console is newer than the backend it is talking to.
 * - `forbidden`: the signed-in role may not cancel classes.
 * - `offline`: the request never reached the server.
 * - `other`: anything else, shown with the server's own reason when it gave
 *   one.
 */
export type CancelFailure = "gone" | "outdated" | "forbidden" | "offline" | "other";

export function cancelFailure(e: unknown): CancelFailure {
  if (e instanceof ApiError) {
    const reason = (e.body as { error?: unknown } | undefined)?.error;
    if (e.status === 404) return typeof reason === "string" ? "gone" : "outdated";
    if (e.status === 405) return "outdated";
    if (e.status === 403) return "forbidden";
    return "other";
  }
  /* fetch rejects with a TypeError when the network or the server is down. */
  if (e instanceof TypeError) return "offline";
  return "other";
}
