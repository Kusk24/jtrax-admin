/**
 * A parent's Children card leads to each child's own profile — the other half
 * of the Parent link a student's page already has.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
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

const unlink = vi.fn(async () => undefined);
vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    parents: [
      {
        id: "par_malee",
        name: "Malee",
        loginEmail: "malee@example.com",
        phone: "",
        email: "malee@example.com",
        lineId: "",
        children: [{ id: "stu_anong", name: "Anong", relation: "Mother", className: "Beginner", credit: 8 }],
      },
    ],
    students: [],
    raw: { students: [], studentParents: [{ student_id: "stu_anong", parent_id: "par_malee" }], parents: [], parentContacts: [] },
    loading: false,
    error: null,
    batch: async (job: () => Promise<unknown>) => job(),
    create: vi.fn(),
    update: vi.fn(),
    remove: unlink,
    removePerson: vi.fn(),
  }),
}));

const { ParentsPage } = await import("./ParentsPage");

beforeEach(() => {
  push.mockClear();
  unlink.mockClear();
});

function renderParent() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SignedInAs>
        <ParentsPage detailId="par_malee" />
      </SignedInAs>
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

describe("a parent's children", () => {
  it("open the child's profile when the card is clicked", async () => {
    const user = renderParent();
    await user.click(screen.getByText("Beginner", { exact: false }));
    expect(push).toHaveBeenCalledWith("/students?id=stu_anong");
  });

  it("open it from the keyboard through the child's name", async () => {
    const user = renderParent();
    screen.getByRole("button", { name: "Open Anong's profile" }).focus();
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/students?id=stu_anong");
  });

  it("do not open when the child is being unlinked", async () => {
    const user = renderParent();
    await user.click(screen.getByRole("button", { name: "Unlink Anong" }));
    expect(push).not.toHaveBeenCalled();
  });
});

describe("a parent's contact information", () => {
  it("has one email — the one they sign in with", () => {
    renderParent();
    expect(screen.getAllByText("malee@example.com")).toHaveLength(1);
    expect(screen.queryByText("Login email")).toBeNull();
  });
});
