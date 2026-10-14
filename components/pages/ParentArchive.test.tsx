/**
 * Guardians who leave are archived, not deleted: Archive in the row, a box per
 * child to archive them too, archived guardians out of the list unless asked
 * for, and Restore to bring them back.
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

const update = vi.fn(async () => ({}));
const child = (id: string, name: string) => ({ id, name, relation: "Mother", className: "Beginner", credit: 8 });
const parents = [
  { id: "par_malee", name: "Malee", loginEmail: "malee@example.com", phone: "", email: "", lineId: "",
    children: [child("stu_anong", "Anong"), child("stu_boon", "Boon")] },
  { id: "par_sandy", name: "Sandy", loginEmail: "sandy@example.com", phone: "", email: "", lineId: "",
    archivedAt: "2026-10-14", children: [] },
  { id: "par_new", name: "Nobody Yet", loginEmail: "new@example.com", phone: "", email: "", lineId: "", children: [] },
];
vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    parents,
    students: [{ id: "stu_anong", name: "Anong" }, { id: "stu_boon", name: "Boon" }],
    raw: { students: [], studentParents: [], parents: [], parentContacts: [] },
    loading: false,
    error: null,
    batch: async (job: () => Promise<unknown>) => job(),
    create: vi.fn(),
    update,
    remove: vi.fn(),
    removePerson: vi.fn(),
  }),
}));

const { ParentsPage } = await import("./ParentsPage");
const { ErrorToastProvider } = await import("../ErrorToast");

beforeEach(() => update.mockClear());

function show(detailId?: string) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <SignedInAs>
          <ParentsPage detailId={detailId} />
        </SignedInAs>
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

describe("archiving a guardian", () => {
  it("is offered in place of Delete, and archived guardians are out of the list", () => {
    show();
    expect(screen.getByRole("button", { name: "Archive Malee" })).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Delete Malee/ })).toBeNull();
    expect(screen.queryByText("Sandy")).toBeNull();
  });

  it("asks about each child, and archives only the ones ticked", async () => {
    const user = show();
    await user.click(screen.getByRole("button", { name: "Archive Malee" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("checkbox", { name: "Also archive Boon" })).toBeDefined();
    await user.click(within(dialog).getByRole("checkbox", { name: "Also archive Anong" }));
    await user.click(within(dialog).getByRole("button", { name: "Archive" }));

    expect(update).toHaveBeenCalledWith("parents", "par_malee", { archived_at: expect.any(String) });
    expect(update).toHaveBeenCalledWith("students", "stu_anong", { archived_at: expect.any(String), archived_reason: null });
    expect(update.mock.calls.some((c) => (c as unknown[])[1] === "stu_boon")).toBe(false);
  });

  it("shows archived guardians under Archived, with Restore", async () => {
    const user = show();
    await user.selectOptions(screen.getByRole("combobox", { name: en.parents.colChildren }), "archived");
    expect(screen.getByText("Sandy")).toBeDefined();
    expect(screen.queryByText("Malee")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Restore Sandy" }));
    expect(update).toHaveBeenCalledWith("parents", "par_sandy", { archived_at: null });
  });

  it("keeps Delete on a guardian's page only when they have no children", () => {
    show("par_malee");
    expect(screen.getByRole("button", { name: en.parents.archive })).toBeDefined();
    expect(screen.queryByRole("button", { name: en.common.delete })).toBeNull();
  });
});
