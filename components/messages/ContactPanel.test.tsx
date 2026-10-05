import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { LineConversation } from "@/lib/line";
import { ContactPanel } from "./ContactPanel";
import { LineChatLink } from "./LineChatLink";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../DataProvider", () => ({
  useData: () => ({
    parents: [{ id: "par_sandy", name: "Sandy Jones", loginEmail: "sandy@x.th", phone: "" }],
    students: [{ id: "stu_penny", name: "Penny", parentName: "Sandy Jones" }],
  }),
}));
const put = vi.fn();
vi.mock("@/lib/api", () => ({ api: { get: vi.fn(), post: vi.fn(), del: vi.fn(), put: (...a: unknown[]) => put(...a) } }));

const sam: LineConversation = {
  lineUserId: "U55025611fe221e97efd11e451a0015dd",
  displayName: "Sam Yati",
  followed: true,
  lastMessageAt: "2026-10-05T14:09:00Z",
  unread: 0,
  preview: "Yea",
};

function show(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  put.mockReset();
});

describe("the LINE contact panel", () => {
  it("shows the LINE user ID under the name", () => {
    show(<ContactPanel contact={sam} conversations={[sam]} onRelinked={() => {}} />);
    expect(screen.getByText("LINE user ID")).toBeDefined();
    expect(screen.getByText(sam.lineUserId)).toBeDefined();
  });

  it("links the chat to a parent picked by name", async () => {
    const user = userEvent.setup();
    const onRelinked = vi.fn();
    put.mockResolvedValue({ ...sam, parentId: "par_sandy", linkedName: "Sandy Jones" });
    show(<ContactPanel contact={sam} conversations={[sam]} onRelinked={onRelinked} />);

    await user.click(screen.getByRole("button", { name: /Link JTrax account/ }));
    await user.type(screen.getByPlaceholderText("Search parents and students"), "sandy");
    await user.click(screen.getByRole("button", { name: /^Sandy Jones/ }));

    expect(put).toHaveBeenCalledWith(`line/conversations/${sam.lineUserId}/link`, { parentId: "par_sandy" });
    await waitFor(() => expect(onRelinked).toHaveBeenCalledWith(expect.objectContaining({ parentId: "par_sandy" })));
  });

  it("does not offer a record another chat already holds", async () => {
    const user = userEvent.setup();
    const other = { ...sam, lineUserId: "U2", studentId: "stu_penny" };
    show(<ContactPanel contact={sam} conversations={[sam, other]} onRelinked={() => {}} />);
    await user.click(screen.getByRole("button", { name: /Link JTrax account/ }));
    const penny = screen.getByRole("button", { name: /Penny/ }) as HTMLButtonElement;
    expect(penny.disabled).toBe(true);
    expect(screen.getByText("Linked to another chat")).toBeDefined();
  });

  it("opens the linked record's page, and can unlink", async () => {
    const user = userEvent.setup();
    const linked = { ...sam, studentId: "stu_penny", linkedName: "Penny" };
    put.mockResolvedValue(sam);
    const onRelinked = vi.fn();
    show(<ContactPanel contact={linked} conversations={[linked]} onRelinked={onRelinked} />);

    await user.click(screen.getByRole("button", { name: "Open Penny" }));
    expect(push).toHaveBeenCalledWith("/students?id=stu_penny");

    await user.click(screen.getByRole("button", { name: "Unlink" }));
    expect(put).toHaveBeenCalledWith(`line/conversations/${sam.lineUserId}/link`, {});
    await waitFor(() => expect(onRelinked).toHaveBeenCalled());
  });
});

describe("a record's LINE chat row", () => {
  it("opens the chat in Messages", async () => {
    const user = userEvent.setup();
    show(<LineChatLink chat={{ ...sam, parentId: "par_sandy" }} />);
    await user.click(screen.getByRole("button", { name: "Open chat" }));
    expect(push).toHaveBeenCalledWith(`/chat?id=${sam.lineUserId}`);
  });

  it("says Not linked when there is none", () => {
    show(<LineChatLink chat={null} />);
    expect(screen.getByText("Not linked")).toBeDefined();
  });
});
