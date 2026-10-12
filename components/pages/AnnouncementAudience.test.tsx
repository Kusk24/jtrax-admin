/**
 * Who an announcement goes to: every parent by default, or the parents of
 * some classes, or particular parents found by name.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

type Row = Record<string, unknown>;
const create = vi.fn<(path: string, body: Row) => Promise<Row>>(async () => ({}));

const raw = {
  classes: [
    { class_id: "cls_master", name: "Master" },
    { class_id: "cls_slayer", name: "King Slayer" },
  ],
  parents: [
    { parent_id: "par_joe", name: "Joe Tan" },
    { parent_id: "par_sarah", name: "Sarah Lim" },
    { parent_id: "par_sarah2", name: "Sarah Wong" },
  ],
  studentParents: [
    { student_id: "stu_mini", parent_id: "par_sarah" },
    { student_id: "stu_mo", parent_id: "par_sarah2" },
  ],
  students: [
    { student_id: "stu_mini", name: "Mini" },
    { student_id: "stu_mo", name: "Mo" },
  ],
};

const announcements = vi.hoisted(() => ({ rows: [] as Row[] }));

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    raw,
    announcements: announcements.rows,
    meAccountId: "usr_admin",
    create,
    update: vi.fn(),
    remove: vi.fn(),
  }),
}));

const { AnnouncementPage } = await import("./AnnouncementPage");

function compose() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AnnouncementPage startNew />
    </NextIntlClientProvider>,
  );
  const user = userEvent.setup();
  return user;
}

async function write(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Title/), "Songkran");
  await user.type(screen.getByLabelText(/Message/), "No classes.");
}

beforeEach(() => {
  create.mockClear();
  announcements.rows = [];
});

describe("the audience of a new announcement", () => {
  it("goes to all parents unless changed", async () => {
    const user = compose();
    expect((screen.getByLabelText("Audience") as HTMLSelectElement).value).toBe("all");
    await write(user);
    await user.click(screen.getByRole("button", { name: "Send Announcement" }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][1]).toMatchObject({ audience: "all", audience_ids: "[]" });
  });

  it("finds parents by name, shows them as chips, and sends only to them", async () => {
    const user = compose();
    await write(user);
    await user.selectOptions(screen.getByLabelText("Audience"), "parents");

    const search = screen.getByRole("combobox", { name: "Search parent" });
    await user.type(search, "sarah");
    /* Both Sarahs, each with their child beside the name. */
    expect(screen.getByRole("option", { name: /Sarah Lim.*Parent of Mini/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Sarah Wong.*Parent of Mo/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Joe/ })).toBeNull();
    await user.click(screen.getByRole("option", { name: /Sarah Lim/ }));

    await user.type(search, "joe{Enter}");
    expect(screen.getByRole("button", { name: "Remove Joe Tan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Sarah Lim" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Send Announcement" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][1]).toMatchObject({
      audience: "parents",
      audience_ids: JSON.stringify(["par_sarah", "par_joe"]),
    });
  });

  it("drops a parent when their chip is removed", async () => {
    const user = compose();
    await user.selectOptions(screen.getByLabelText("Audience"), "parents");
    const search = screen.getByRole("combobox", { name: "Search parent" });
    await user.type(search, "joe{Enter}");
    await user.click(screen.getByRole("button", { name: "Remove Joe Tan" }));
    expect(screen.queryByRole("button", { name: "Remove Joe Tan" })).toBeNull();
  });

  it("sends to the classes chosen", async () => {
    const user = compose();
    await write(user);
    await user.selectOptions(screen.getByLabelText("Audience"), "classes");
    await user.type(screen.getByRole("combobox", { name: "Search class" }), "king{Enter}");

    await user.click(screen.getByRole("button", { name: "Send Announcement" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][1]).toMatchObject({ audience: "classes", audience_ids: '["cls_slayer"]' });
  });

  it("will not send a class or parent announcement to nobody", async () => {
    const user = compose();
    await write(user);
    await user.selectOptions(screen.getByLabelText("Audience"), "parents");
    await user.click(screen.getByRole("button", { name: "Send Announcement" }));

    expect(await screen.findByText("Choose at least one parent.")).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("the announcement list", () => {
  it("says who each one went to", () => {
    announcements.rows = [
      { id: "a1", title: "Everyone", audienceKind: "all", audienceIds: [], date: "1 Sep 2026", body: "" },
      { id: "a2", title: "Some", audienceKind: "classes", audienceIds: ["cls_master", "cls_slayer"], date: "2 Sep 2026", body: "" },
    ];
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AnnouncementPage />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/To: All parents/)).toBeTruthy();
    /* Each course with how it is taught. */
    expect(screen.getByText(/To: Master · Group, King Slayer · Group/)).toBeTruthy();
  });
});

describe("when parents see it", () => {
  it("can be scheduled for later, and the button says so", async () => {
    const user = compose();
    await write(user);
    fireEvent.change(screen.getByLabelText(en.announcement.showFrom), { target: { value: "2099-01-01T09:00" } });
    fireEvent.change(screen.getByLabelText(en.announcement.showUntil), { target: { value: "2099-01-08T18:00" } });
    await user.click(screen.getByRole("button", { name: en.announcement.schedule }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][1]).toMatchObject({ show_from: "2099-01-01T09:00", show_until: "2099-01-08T18:00" });
  });

  it("refuses an end before the start", async () => {
    const user = compose();
    await write(user);
    fireEvent.change(screen.getByLabelText(en.announcement.showFrom), { target: { value: "2099-01-08T09:00" } });
    fireEvent.change(screen.getByLabelText(en.announcement.showUntil), { target: { value: "2099-01-01T09:00" } });
    await user.click(screen.getByRole("button", { name: en.announcement.schedule }));
    expect(await screen.findByText(en.announcement.endBeforeStart)).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it("shows whether each is scheduled, showing or ended", () => {
    announcements.rows = [
      { id: "a1", title: "Later", audienceKind: "all", audienceIds: [], date: "1 Sep 2026", body: "", showFrom: "2099-01-01T09:00", showUntil: "" },
      { id: "a2", title: "Over", audienceKind: "all", audienceIds: [], date: "2 Sep 2026", body: "", showFrom: "", showUntil: "2000-01-01T09:00" },
      { id: "a3", title: "Now", audienceKind: "all", audienceIds: [], date: "3 Sep 2026", body: "", showFrom: "2000-01-01T09:00", showUntil: "2099-01-01T09:00" },
    ];
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AnnouncementPage />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(en.announcement.window_scheduled)).toBeTruthy();
    expect(screen.getByText(en.announcement.window_ended)).toBeTruthy();
    expect(screen.getByText(en.announcement.window_showing)).toBeTruthy();
    expect(screen.getByText("From 1 Jan 2099, 09:00")).toBeTruthy();
  });
});
