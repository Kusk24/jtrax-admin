/**
 * A new parent is emailed a link to choose their own password — the office
 * never sees one.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { SignedInAs } from "./signed-in-as";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/parents",
}));

const post = vi.fn();
vi.mock("@/lib/api", async (real) => {
  const actual = await real<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, post: (path: string, body: unknown) => post(path, body) } };
});

type Row = Record<string, unknown>;
const create = vi.fn(async (path: string, body: Row): Promise<Row> =>
  path === "user-accounts" ? { user_account_id: "usr_new", ...body } : path === "parents" ? { parent_id: "par_new" } : {},
);

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    parents: [
      { id: "par_malee", name: "Malee", loginEmail: "malee@example.com", accountId: "usr_malee", phone: "", email: "", lineId: "", children: [] },
    ],
    students: [],
    raw: { students: [], studentParents: [], parents: [], parentContacts: [] },
    loading: false,
    error: null,
    batch: async (job: () => Promise<unknown>) => job(),
    create,
    update: vi.fn(),
    remove: vi.fn(),
    removePerson: vi.fn(),
  }),
}));

const { ParentsPage } = await import("./ParentsPage");

beforeEach(() => {
  post.mockReset();
  create.mockClear();
});

function renderPage(detailId?: string) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SignedInAs>
        <ParentsPage detailId={detailId} />
      </SignedInAs>
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

describe("creating a parent", () => {
  it("emails them an invite and shows no password", async () => {
    post.mockResolvedValue({ email: "sandy@example.com", delivered: true });
    const user = renderPage();
    await user.click(screen.getByRole("button", { name: /Add Parent/i }));
    const form = screen.getByRole("dialog");
    await user.type(within(form).getByLabelText(/^Name/), "Sandy");
    await user.type(within(form).getByLabelText(/^Email/), "sandy@example.com");
    await user.click(within(form).getByRole("button", { name: /Save|Create|Add/ }));

    expect(post).toHaveBeenCalledWith("user-accounts/usr_new/invite", {});
    expect(await screen.findByText(/Invite sent to sandy@example.com/)).toBeDefined();
    expect(screen.queryByText(/Temporary password/i)).toBeNull();
  });

  it("says so when the server has no email set up", async () => {
    post.mockResolvedValue({ email: "sandy@example.com", delivered: false });
    const user = renderPage();
    await user.click(screen.getByRole("button", { name: /Add Parent/i }));
    const form = screen.getByRole("dialog");
    await user.type(within(form).getByLabelText(/^Name/), "Sandy");
    await user.type(within(form).getByLabelText(/^Email/), "sandy@example.com");
    await user.click(within(form).getByRole("button", { name: /Save|Create|Add/ }));

    expect(await screen.findByText(/nothing was sent to sandy@example.com/)).toBeDefined();
  });
});

describe("a parent who lost their password", () => {
  it("is sent a link from their page, never given a password by the office", async () => {
    post.mockResolvedValue({ email: "malee@example.com", delivered: true });
    const user = renderPage("par_malee");
    expect(screen.queryByRole("button", { name: /Reset password/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Send password link" }));
    expect(post).toHaveBeenCalledWith("user-accounts/usr_malee/invite", {});
    expect(await screen.findByText(/Password link sent to malee@example.com/)).toBeDefined();
  });
});
