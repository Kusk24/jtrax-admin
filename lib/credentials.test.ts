/** The passwords the console hands out, and the one it never shows. */
import { describe, expect, it } from "vitest";
import { generateHiddenPassword, generateReadablePassword } from "./credentials";

/* The backend's rule (internal/auth/policy.go): 8–200 characters, a letter
   and a digit, no surrounding spaces. */
const acceptable = (p: string) => p.length >= 8 && p.length <= 200 && /\p{L}/u.test(p) && /\d/.test(p) && p.trim() === p;

describe("a readable password", () => {
  it("is two different words and a two-digit number", () => {
    for (let i = 0; i < 200; i++) {
      const p = generateReadablePassword();
      expect(p).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
      const [a, b] = p.split("-");
      expect(a).not.toBe(b);
      expect(acceptable(p)).toBe(true);
    }
  });

  it("is not the same every time", () => {
    expect(new Set(Array.from({ length: 50 }, generateReadablePassword)).size).toBeGreaterThan(40);
  });
});

describe("a hidden password", () => {
  it("is long, random, and passes the backend's rule", () => {
    const p = generateHiddenPassword();
    expect(p.length).toBeGreaterThanOrEqual(30);
    expect(acceptable(p)).toBe(true);
    expect(generateHiddenPassword()).not.toBe(p);
  });
});
