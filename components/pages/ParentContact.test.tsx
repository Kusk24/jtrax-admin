/**
 * The Parents table: the phone column is the number, and Contact in the
 * action column lists the guardian's phone, email and LINE — LINE opening
 * their chat in Messages, as on the Students table.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { SignedInAs } from "./signed-in-as";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/parents",
}));
vi.mock("@/lib/line", async (real) => ({
  ...(await real<typeof import("@/lib/line")>()),
  listConversations: async () => [{ lineUserId: "U_malee", displayName: "Malee LINE", parentId: "par_malee" }],
}));
vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    parents: [
      { id: "par_malee", name: "Malee", loginEmail: "malee@example.com", phone: "081 234 5678", email: "", lineId: "", children: [] },
    ],
    students: [],
    raw: { students: [], studentParents: [], parents: [], parentContacts: [] },
    loading: false,
    error: null,
    batch: async (job: () => Promise<unknown>) => job(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    removePerson: vi.fn(),
  }),
}));

const { ParentsPage } = await import("./ParentsPage");
const { ErrorToastProvider } = await import("../ErrorToast");

describe("the Parents table's contact", () => {
  it("shows the number, and Contact lists phone, email and their LINE chat", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ErrorToastProvider>
          <SignedInAs>
            <ParentsPage />
          </SignedInAs>
        </ErrorToastProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("081 234 5678")).toBeDefined();
    expect(screen.queryByRole("link", { name: /Call/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Contact/ }));
    const items = screen.getAllByRole("menuitem").map((i) => i.textContent);
    expect(items).toEqual(["081 234 5678", "malee@example.com", "Malee LINE"]);

    await user.click(screen.getByRole("menuitem", { name: /LINE/ }));
    expect(push).toHaveBeenCalledWith("/chat?id=U_malee");
  });
});
