import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useLineUnread } from "./useLineUnread";

const list = vi.fn();
vi.mock("@/lib/line", () => ({ listConversations: () => list() }));

/* A stand-in for the browser's EventSource that the test can push frames into. */
class FakeSource {
  static last: FakeSource | null = null;
  listeners: Record<string, (ev: { data: string }) => void> = {};
  closed = false;
  constructor() {
    FakeSource.last = this;
  }
  addEventListener(type: string, fn: (ev: { data: string }) => void) {
    this.listeners[type] = fn;
  }
  close() {
    this.closed = true;
  }
  push(conversations: Array<{ unread: number }>) {
    this.listeners.inbox?.({ data: JSON.stringify({ conversations }) });
  }
}
vi.stubGlobal("EventSource", FakeSource);

afterEach(() => list.mockReset());

describe("the sidebar's unread count", () => {
  it("adds up every chat, rises with new messages and falls once read", async () => {
    list.mockResolvedValue([{ unread: 2 }, { unread: 0 }, { unread: 1 }]);
    const { result, unmount } = renderHook(() => useLineUnread(true));
    await waitFor(() => expect(result.current).toBe(3));

    act(() => FakeSource.last!.push([{ unread: 3 }, { unread: 0 }, { unread: 1 }]));
    expect(result.current).toBe(4);

    act(() => FakeSource.last!.push([{ unread: 0 }, { unread: 0 }, { unread: 1 }]));
    expect(result.current).toBe(1);

    unmount();
    expect(FakeSource.last!.closed).toBe(true);
  });

  it("is 0 and opens nothing for a role without Messages", () => {
    FakeSource.last = null;
    const { result } = renderHook(() => useLineUnread(false));
    expect(result.current).toBe(0);
    expect(list).not.toHaveBeenCalled();
    expect(FakeSource.last).toBeNull();
  });

  it("is 0 when LINE is not set up", async () => {
    list.mockRejectedValue(new Error("503"));
    const { result } = renderHook(() => useLineUnread(true));
    await act(async () => {});
    expect(result.current).toBe(0);
  });
});
