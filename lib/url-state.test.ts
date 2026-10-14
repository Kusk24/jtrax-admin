import { describe, expect, it } from "vitest";
import { liveSearch, pageFrom, pageParam, rememberWrite } from "./url-state";

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

describe("pages", () => {
  it("are 1-based in the address and 0-based on screen", () => {
    expect(pageFrom("3")).toBe(2);
    expect(pageParam(2)).toBe("3");
    expect(pageParam(0)).toBe("");
  });
  it("read junk as the first page", () => {
    for (const raw of ["", "1", "0", "-2", "x", "2.5"]) expect(pageFrom(raw)).toBe(0);
  });
});
