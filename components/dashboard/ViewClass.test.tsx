/**
 * Adding a latecomer to a session that is already running.
 *
 * The picker offered every student in the academy, so a child could be added
 * to a session of a class they had never been enrolled in — an attendance with
 * no enrolment behind it, which nothing can charge and which the office would
 * only notice at the end of the month.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { ClassDef } from "@/lib/data";

const create = vi.fn(async () => ({}));
const remove = vi.fn(async () => undefined);

/* Anong and Boon are in the Group class; Chai is in Master only. Anong is
   already on the roster of the session being viewed. */
const state = {
  students: [
    { id: "anong", name: "Anong Sri", credit: 8, status: "Normal", className: "Group Class" },
    { id: "boon", name: "Boon Mek", credit: 2.5, status: "Low Credit", className: "Group Class" },
    { id: "chai", name: "Chai Rat", credit: 5, status: "Normal", className: "Master Class" },
  ],
  todaysClasses: [] as ClassDef[],
  raw: {
    attendance: [{ attendance_id: "att_1", student_id: "anong", session_id: "ses_1" }],
    enrollments: [
      { enrollment_id: "e1", student_id: "anong", class_id: "cls_group" },
      { enrollment_id: "e2", student_id: "boon", class_id: "cls_group" },
      { enrollment_id: "e3", student_id: "chai", class_id: "cls_master" },
    ],
  },
};

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({ ...state, create, remove, todaysClasses: state.todaysClasses }),
}));

const { SessionPanel } = await import("./SessionPanel");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

const SESSION_ID = "ses_1";

const GROUP_SESSION: ClassDef = {
  id: "ses_1",
  classId: "cls_group",
  category: "Group",
  name: "Group Class",
  time: "09:00 – 10:00",
  status: "Ongoing",
  students: ["Anong Sri"],
  more: 0,
  teacher: "—",
  room: "—",
  roster: ["Anong Sri"],
};

function renderView(def: ClassDef = GROUP_SESSION) {
  state.todaysClasses = [def];
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <SessionPanel state={{ mode: "view", def }} onClose={() => {}} />
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
}

async function openAddStudent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Add Student/i }));
}

beforeEach(() => {
  create.mockClear();
  remove.mockClear();
  state.raw.attendance = [{ attendance_id: "att_1", student_id: "anong", session_id: SESSION_ID }];
  state.todaysClasses = [];
});

describe("who can be added to a running session", () => {
  it("offers this class's own children who are not on the roster yet", async () => {
    const user = userEvent.setup();
    renderView();
    await openAddStudent(user);

    expect(screen.getByText("Boon Mek")).toBeTruthy();
  });

  /* The bug: any student in the academy could be added to any session. */
  it("does not offer a child enrolled in another class", async () => {
    const user = userEvent.setup();
    renderView();
    await openAddStudent(user);

    expect(screen.queryByText("Chai Rat")).toBeNull();
  });

  it("does not offer someone already on the roster", async () => {
    const user = userEvent.setup();
    renderView();
    /* Anong is on the roster, so her name is already on screen once. If the
       picker offered her too there would be a second. */
    expect(screen.getAllByText("Anong Sri")).toHaveLength(1);

    await openAddStudent(user);
    expect(screen.getAllByText("Anong Sri")).toHaveLength(1);
  });

  it("writes the attendance for the child chosen", async () => {
    const user = userEvent.setup();
    renderView();
    await openAddStudent(user);
    await user.click(screen.getByText("Boon Mek"));

    expect(create).toHaveBeenCalledTimes(1);
    const [path, body] = create.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(path).toBe("attendance");
    expect(body.student_id).toBe("boon");
    expect(body.session_id).toBe("ses_1");
  });

  /**
   * The panel is handed the session that was clicked, and the page holds that
   * copy in state. Adding a student wrote the row and refetched — and this
   * panel went on rendering the copy it was given, so nothing moved. The desk
   * pressed again, and only found out it had worked by closing the panel.
   */
  it("shows the new arrival without the panel being closed and reopened", async () => {
    const user = userEvent.setup();
    const { rerender } = renderView();
    await openAddStudent(user);
    await user.click(screen.getByText("Boon Mek"));

    /* What the refetch produces: the same session, one name longer. The panel
       is deliberately NOT re-mounted, and is still passed the stale snapshot
       the page captured when it was opened. */
    state.raw.attendance = [
      ...state.raw.attendance,
      { attendance_id: "att_2", student_id: "boon", session_id: SESSION_ID },
    ];
    state.todaysClasses = [
      { ...GROUP_SESSION, roster: ["Anong Sri", "Boon Mek"], students: ["Anong Sri", "Boon Mek"] },
    ];
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <ErrorToastProvider>
          <SessionPanel state={{ mode: "view", def: GROUP_SESSION }} onClose={() => {}} />
        </ErrorToastProvider>
      </NextIntlClientProvider>,
    );

    /* On the roster specifically — every roster row carries its own remove
       button, and only a roster row does. Counting the name alone proves
       nothing: with the stale copy he was still listed under "add", which is
       one occurrence too. */
    expect(screen.getByRole("button", { name: "Remove Boon Mek from roster" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Anong Sri from roster" })).toBeTruthy();
  });

  /* A Master session offers Master children, and nobody from Group. */
  it("follows whichever class the session belongs to", async () => {
    const user = userEvent.setup();
    renderView({ ...GROUP_SESSION, classId: "cls_master", name: "Master Class", roster: [], students: [] });
    await openAddStudent(user);

    expect(screen.getByText("Chai Rat")).toBeTruthy();
    expect(screen.queryByText("Boon Mek")).toBeNull();
  });
});
