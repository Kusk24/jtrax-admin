import { describe, expect, it } from "vitest";
import { liveSearch, rememberWrite } from "./url-state";

describe("liveSearch", () => {
  it("builds on a write the address has not caught up with", () => {
    rememberWrite("/students", "?status=active");
    expect(liveSearch("/students", "")).toBe("?status=active");
  });
  it("trusts the address once it matches", () => {
    rememberWrite("/students", "?status=active");
    expect(liveSearch("/students", "?status=active")).toBe("?status=active");
    expect(liveSearch("/students", "?status=archived")).toBe("?status=archived");
  });
  it("ignores a write made on another section", () => {
    rememberWrite("/parents", "?page=2");
    expect(liveSearch("/students", "?status=active")).toBe("?status=active");
  });
});
