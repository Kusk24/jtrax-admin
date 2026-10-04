import { beforeEach, describe, expect, it, vi } from "vitest";

const setCookie = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: setCookie, get: () => undefined, delete: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

const { signIn } = await import("./auth");

function form(email: string, password: string): FormData {
  const f = new FormData();
  f.set("email", email);
  f.set("password", password);
  return f;
}

/* The backend: a right password for whoever is given, in the role given. */
function backendSigningIn(role: string) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    calls.push(String(url));
    if (String(url).endsWith("/auth/login")) {
      return new Response(JSON.stringify({ token: "tok_1", user: { role } }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  }));
  return calls;
}

describe("signing in to the console", () => {
  beforeEach(() => {
    setCookie.mockClear();
  });

  /* A parent's right password used to land them back on the sign-in page with
     nothing said. */
  it("refuses a parent with a reason, and revokes the session it was given", async () => {
    const calls = backendSigningIn("Parent");
    expect(await signIn({}, form("sandy@example.com", "right-password"))).toEqual({ error: "noAccess" });
    expect(setCookie).not.toHaveBeenCalled();
    expect(calls.some((u) => u.endsWith("/auth/logout"))).toBe(true);
  });

  it("refuses a student the same way", async () => {
    backendSigningIn("Student");
    expect(await signIn({}, form("mint@example.com", "right-password"))).toEqual({ error: "noAccess" });
  });

  it("lets staff in", async () => {
    for (const role of ["Admin", "Receptionist"]) {
      backendSigningIn(role);
      await expect(signIn({}, form("desk@jca.ac.th", "right-password"))).rejects.toThrow("redirect:/");
    }
    expect(setCookie).toHaveBeenCalledTimes(2);
  });
});
