import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useInbox } from "./useInbox";

const list = vi.fn();
const thread = vi.fn();
vi.mock("@/lib/line", () => ({
  listConversations: () => list(),
  getThread: (id: string) => thread(id),
  markRead: () => Promise.resolve(),
  sendMessage: vi.fn(),
  sortConversations: (c: unknown[]) => c,
}));

class FakeSource {
  addEventListener() {}
  close() {}
  set onopen(_: unknown) {}
  set onerror(_: unknown) {}
}
vi.stubGlobal("EventSource", FakeSource);

const chat = (id: string, name: string) => ({
  lineUserId: id, displayName: name, followed: true, lastMessageAt: "2026-10-12T10:00:00Z", unread: 0, preview: "",
});

afterEach(() => {
  list.mockReset();
  thread.mockReset();
});

describe("opening the inbox", () => {
  it("opens the chat a record's link asked for, not the top of the list", async () => {
    list.mockResolvedValue([chat("U_sandy", "Sandy"), chat("U_polly", "Polly")]);
    thread.mockImplementation((id: string) => Promise.resolve({ conversation: chat(id, id), messages: [] }));
    const { result } = renderHook(() => useInbox("U_polly"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.selectedId).toBe("U_polly");
    expect(thread).toHaveBeenCalledWith("U_polly");
    expect(thread).not.toHaveBeenCalledWith("U_sandy");
  });

  it("opens the top of the list without one, or when that chat is gone", async () => {
    list.mockResolvedValue([chat("U_sandy", "Sandy"), chat("U_polly", "Polly")]);
    thread.mockResolvedValue({ conversation: chat("U_sandy", "Sandy"), messages: [] });
    const plain = renderHook(() => useInbox());
    await waitFor(() => expect(plain.result.current.selectedId).toBe("U_sandy"));
    const gone = renderHook(() => useInbox("U_unknown"));
    await waitFor(() => expect(gone.result.current.selectedId).toBe("U_sandy"));
  });
});
