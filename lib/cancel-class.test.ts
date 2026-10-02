import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { cancelFailure } from "./cancel-class";

describe("cancelFailure", () => {
  it("reads the handler's own 404 as already cancelled", () => {
    expect(cancelFailure(new ApiError(404, "no such class", { error: "no such class" }))).toBe("gone");
  });
  it("reads a bare 404 or 405 as a server without the route", () => {
    expect(cancelFailure(new ApiError(404, "request failed (404)", {}))).toBe("outdated");
    expect(cancelFailure(new ApiError(405, "request failed (405)", {}))).toBe("outdated");
  });
  it("reads 403 as not allowed", () => {
    expect(cancelFailure(new ApiError(403, "only admin or reception may cancel a class", {}))).toBe("forbidden");
  });
  it("reads a failed fetch as offline", () => {
    expect(cancelFailure(new TypeError("Failed to fetch"))).toBe("offline");
  });
  it("leaves anything else as other", () => {
    expect(cancelFailure(new ApiError(500, "could not cancel the class", {}))).toBe("other");
    expect(cancelFailure("?")).toBe("other");
  });
});
