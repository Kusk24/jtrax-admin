import { describe, expect, it, vi } from "vitest";
import {
  createStudentAccount,
  isTakenIdError,
  MAX_LOGIN_ID_ATTEMPTS,
  studentLoginIdFor,
} from "./student-login-id";

/* A fixed tail, so a test about names is not also a test about randomness. */
const tail = () => "a1b2c3";

describe("the ID a child signs in with", () => {
  it("is built from their name, not an invented address", () => {
    expect(studentLoginIdFor("Penny Ward")).toBe("stu_penny_ward");
    // The thing it replaced, for the record: penny.ward@student.jca.ac.th.
    expect(studentLoginIdFor("Penny Ward")).not.toContain("@");
  });

  it.each([
    ["already lower case", "penny ward", "stu_penny_ward"],
    ["shouted", "PENNY WARD", "stu_penny_ward"],
    ["padded", "  Penny Ward  ", "stu_penny_ward"],
    ["three names", "Penny Jane Ward", "stu_penny_jane_ward"],
    ["hyphenated", "Penny Ward-Smith", "stu_penny_ward_smith"],
    ["an apostrophe", "Sean O'Brien", "stu_sean_o_brien"],
    ["punctuation at the end", "Penny Ward.", "stu_penny_ward"],
    ["digits kept", "Penny Ward 2", "stu_penny_ward_2"],
  ])("%s", (_case, name, want) => {
    expect(studentLoginIdFor(name, 1, tail)).toBe(want);
  });

  /* Every character has to survive being read down a phone, typed on a school
     laptop, and put in a URL. */
  it("contains nothing that needs escaping or explaining", () => {
    for (const name of ["Penny Ward", "Sean O'Brien", "José Núñez", "Penny  Ward"]) {
      expect(studentLoginIdFor(name, 1, tail)).toMatch(/^[a-z0-9_]+$/);
    }
  });

  /* The backend allows 64 characters. Being refused at the moment of
     registration, for a name, is not an acceptable outcome. */
  it("stays inside the length the server accepts, suffix and all", () => {
    const long = "Krungthep Mahanakhon Amonrattanakosin Mahintharayutthaya Mahadilok".repeat(2);
    for (let attempt = 1; attempt <= MAX_LOGIN_ID_ATTEMPTS; attempt++) {
      const id = studentLoginIdFor(long, attempt, tail);
      expect(id.length).toBeLessThanOrEqual(64);
      expect(id).not.toMatch(/_$/);
    }
  });

  /* A Thai roster is the normal case here, not an edge one, and "student" as a
     fallback would give every one of them the same base name. */
  it("does not file every Thai name under the same ID", () => {
    const somchai = studentLoginIdFor("สมชาย ใจดี", 1, tail);
    expect(somchai).toBe("stu_a1b2c3");
    expect(somchai).not.toContain("student");

    // With the real tail, two Thai names do not land on one ID.
    const ids = new Set(
      ["สมชาย ใจดี", "สมหญิง ศรีสุข", "อารีย์ พงษ์ไทย"].map((n) => studentLoginIdFor(n)),
    );
    expect(ids.size).toBe(3);
  });
});

describe("two children with the same name", () => {
  it("get different IDs, and the first keeps the readable one", () => {
    expect(studentLoginIdFor("John Smith", 1)).toBe("stu_john_smith");
    expect(studentLoginIdFor("John Smith", 2)).toBe("stu_john_smith_2");
    expect(studentLoginIdFor("John Smith", 3)).toBe("stu_john_smith_3");
  });

  /* The report this guards against: the second John Smith is a different child,
     and must not end up signing in to the first one's account. */
  it("is settled by the server refusing, not by reading the list first", async () => {
    const taken = new Set(["stu_john_smith"]);
    const create = vi.fn(async (_path: string, body: Record<string, unknown>) => {
      const id = String(body.email);
      if (taken.has(id)) throw new Error("could not create account (that sign-in ID or email is already taken)");
      taken.add(id);
      return { user_account_id: "usr_" + id };
    });

    const got = await createStudentAccount(create, "John Smith", "chess1234");
    expect(got.loginId).toBe("stu_john_smith_2");
    expect(got.accountId).toBe("usr_stu_john_smith_2");
    // It asked for the plain one first: the second child gets the suffix, not
    // the first, whose card is already printed.
    expect(create.mock.calls.map(([, body]) => body.email)).toEqual([
      "stu_john_smith",
      "stu_john_smith_2",
    ]);
  });

  it("keeps stepping when several are already taken", async () => {
    const taken = new Set(["stu_john_smith", "stu_john_smith_2", "stu_john_smith_3"]);
    const create = vi.fn(async (_path: string, body: Record<string, unknown>) => {
      if (taken.has(String(body.email))) throw new Error("already taken");
      return { user_account_id: "usr_new" };
    });
    const got = await createStudentAccount(create, "John Smith", "chess1234");
    expect(got.loginId).toBe("stu_john_smith_4");
  });

  /* The ID that was actually taken has to come back, because the desk prints
     it on the card the family walks out with. Rebuilding it from the name
     would hand the second John Smith the first one's ID. */
  it("reports the ID that was taken, not the one that was asked for", async () => {
    const create = vi.fn(async (_path: string, body: Record<string, unknown>) => {
      if (body.email === "stu_john_smith") throw new Error("already taken");
      return { user_account_id: "usr_new" };
    });
    const { loginId } = await createStudentAccount(create, "John Smith", "chess1234");
    expect(loginId).toBe("stu_john_smith_2");
    expect(loginId).not.toBe(studentLoginIdFor("John Smith"));
  });
});

describe("a failure that is not a name clash", () => {
  /* Retrying a weak password ten times gives the desk the tenth copy of the
     same error, several seconds later, with the ID silently changed underneath
     them. It has to come straight back. */
  it("is reported at once instead of being retried", async () => {
    const create = vi.fn(async () => {
      throw new Error("password must be at least 8 characters");
    });
    await expect(createStudentAccount(create, "Penny Ward", "short")).rejects.toThrow(
      "password must be at least 8 characters",
    );
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("is told apart from a clash by what the server said", () => {
    expect(isTakenIdError(new Error("that sign-in ID or email is already taken"))).toBe(true);
    expect(isTakenIdError(new Error("UNIQUE constraint failed"))).toBe(true);
    expect(isTakenIdError(new Error("password must be at least 8 characters"))).toBe(false);
    expect(isTakenIdError(new Error("not allowed"))).toBe(false);
  });

  /* A server that refuses every ID as taken would otherwise loop for ever. */
  it("gives up rather than trying names all afternoon", async () => {
    const create = vi.fn(async () => {
      throw new Error("already taken");
    });
    await expect(createStudentAccount(create, "Penny Ward", "chess1234")).rejects.toThrow("already taken");
    expect(create).toHaveBeenCalledTimes(MAX_LOGIN_ID_ATTEMPTS);
  });
});
