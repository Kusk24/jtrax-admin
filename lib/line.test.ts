import { describe, expect, it } from "vitest";
import { chatFor, type LineConversation } from "./line";

const chat = (id: string, link: Partial<LineConversation>): LineConversation => ({
  lineUserId: id, displayName: id, followed: true, lastMessageAt: "", unread: 0, preview: "", ...link,
});

describe("a record's LINE chat", () => {
  const list = [chat("Umum", { parentId: "par_sandy" }), chat("Upenny", { studentId: "stu_penny" })];

  it("is the student's own chat first", () => {
    expect(chatFor(list, { studentId: "stu_penny", parentId: "par_sandy" })?.lineUserId).toBe("Upenny");
  });

  it("falls back to their parent's", () => {
    expect(chatFor(list, { studentId: "stu_uri", parentId: "par_sandy" })?.lineUserId).toBe("Umum");
  });

  it("is none when neither is linked", () => {
    expect(chatFor(list, { studentId: "stu_x", parentId: "par_x" })).toBeNull();
    expect(chatFor(list, {})).toBeNull();
  });
});
