/**
 * Adding a latecomer to a session that is already running.
 *
 * The picker offered every student in the academy, so a child could be added
 * to a session of a class they had never been enrolled in — an attendance with
 * no enrolment behind it, which nothing can charge and which the office would
 * only notice at the end of the month.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { ClassDef } from "@/lib/data";

const create = vi.fn<(path: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>>(
  async () => ({}),
);
const remove = vi.fn<(path: string, id: string) => Promise<undefined>>(async () => undefined);
const update = vi.fn<(path: string, id: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>>(
  async () => ({}),
);
/* The real one wraps a group of writes in a single refresh; here it only has
   to run the job. */
const batch = vi.fn(async (job: () => Promise<unknown>) => job());
const refresh = vi.fn(async () => undefined);
/* Cancelling is one request to the backend, which refunds, deletes and tells
   the families. */
const post = vi.hoisted(() => vi.fn(async () => ({ cancelled: true })));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: { post: (...args: unknown[]) => post(...(args as [])) },
}));

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
    /* The panel re-lengths a running class from the clock times on the row,
       not from `ClassDef.time`, which is a display string. */
    classSessions: [
      { session_id: "ses_1", class_id: "cls_group", start_time: "09:00", end_time: "10:00" },
    ],
  },
  creditRules: { lowCredit: 3, expiringDays: 7, inactiveDays: 30, certSessions: 50, maxNegativeCredit: 0 },
};

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({ ...state, create, remove, update, batch, refresh, todaysClasses: state.todaysClasses }),
}));

/**
 * The panel reads "now" from `useMinuteClock`, which reads the real wall
 * clock — mocked here rather than faked via `vi.useFakeTimers()` so this
 * stays independent of whatever time the suite happens to run at, and so it
 * does not fight `userEvent`'s own real-timer click delay.
 */
const clock = vi.hoisted(() => ({ now: new Date(2026, 8, 19, 9, 30) }));

vi.mock("@/lib/class-progress", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/class-progress")>();
  return { ...real, useMinuteClock: () => clock.now };
});

const { SessionPanel } = await import("./SessionPanel");
const { durationPart, pickDuration, queryDurationPart } = await import("./duration-test-kit");
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

function renderView(def: ClassDef = GROUP_SESSION, onClose: () => void = () => {}) {
  state.todaysClasses = [def];
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <SessionPanel state={{ mode: "view", def }} onClose={onClose} />
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
  update.mockClear();
  batch.mockClear();
  state.raw.attendance = [{ attendance_id: "att_1", student_id: "anong", session_id: SESSION_ID }];
  state.raw.classSessions = [
    { session_id: "ses_1", class_id: "cls_group", start_time: "09:00", end_time: "10:00" },
  ];
  state.todaysClasses = [];
  clock.now = new Date(2026, 8, 19, 9, 30);
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

describe("re-timing a running class", () => {
  it("writes only the new end time, worked out from the clock times", async () => {
    const user = userEvent.setup();
    renderView();

    /* 09:00–10:00 is 1 hr; picking 30 more minutes should land the end at
       10:30 rather than the panel parsing "09:00 – 10:00" as English. */
    await pickDuration(user, "Minutes", 30);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("class-sessions", "ses_1", { end_time: "10:30" });
  });

  /* The presets are quarter hours, but any value can be typed into either
     half — a double-click turns it into a text box. */
  it("takes a typed minute value on Enter", async () => {
    const user = userEvent.setup();
    renderView();

    await user.dblClick(durationPart("Minutes"));
    const field = screen.getByLabelText("Type Minutes");
    await user.clear(field);
    await user.type(field, "5{Enter}");

    expect(update).toHaveBeenCalledWith("class-sessions", "ses_1", { end_time: "10:05" });
  });

  it("takes a typed hour value on Enter", async () => {
    const user = userEvent.setup();
    renderView();

    await user.dblClick(durationPart("Hours"));
    const field = screen.getByLabelText("Type Hours");
    await user.clear(field);
    await user.type(field, "2{Enter}");

    expect(update).toHaveBeenCalledWith("class-sessions", "ses_1", { end_time: "11:00" });
  });

  /* Typing a digit on a focused half starts editing with it — no mouse
     needed. */
  it("starts typing from the keyboard", async () => {
    const user = userEvent.setup();
    renderView();

    durationPart("Minutes").focus();
    await user.keyboard("20{Enter}");

    expect(update).toHaveBeenCalledWith("class-sessions", "ses_1", { end_time: "10:20" });
  });

  it("throws a typed value away on Esc", async () => {
    const user = userEvent.setup();
    renderView();

    await user.dblClick(durationPart("Hours"));
    const field = screen.getByLabelText("Type Hours");
    await user.clear(field);
    await user.type(field, "3{Escape}");

    expect(update).not.toHaveBeenCalled();
    expect(durationPart("Hours").getAttribute("aria-label")).toBe("Hours: 1 hr");
  });

  it("refuses minutes past 59, and keeps the field open", async () => {
    const user = userEvent.setup();
    renderView();

    await user.dblClick(durationPart("Minutes"));
    const field = screen.getByLabelText("Type Minutes");
    await user.clear(field);
    await user.type(field, "75{Enter}");

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Minutes go from 0 to 59.");
    expect(screen.getByLabelText("Type Minutes")).toBeTruthy();
  });

  it("keeps an off-ladder length as it is", async () => {
    /* An odd 09:00–09:50 session — 50 minutes is not one of the quarter
       hours offered, so it must be shown rather than silently replaced by
       the nearest option the moment the panel opens. */
    state.raw.classSessions = [
      { session_id: "ses_1", class_id: "cls_group", start_time: "09:00", end_time: "09:50" },
    ];
    renderView();

    expect(durationPart("Hours").getAttribute("aria-label")).toBe("Hours: 0 hr");
    expect(durationPart("Minutes").getAttribute("aria-label")).toBe("Minutes: 50 min");
  });

  it("has no length control once the class is finished", () => {
    renderView({ ...GROUP_SESSION, status: "Finished" });
    expect(queryDurationPart("Hours")).toBeNull();
  });
});

describe("cancelling a running class", () => {
  it("asks for confirmation naming who is checked in before doing anything", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: "Cancel class" }));

    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Yes, cancel class" })).toBeTruthy();
  });

  /* One request: the backend refunds every check-in, removes the attendance
     and the session together, and tells the families. The console no longer
     deletes rows itself, which refunded the credits but told nobody. */
  it("cancels through the backend, which refunds and tells the families", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderView(GROUP_SESSION, onClose);

    await user.click(screen.getByRole("button", { name: "Cancel class" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel class" }));

    await waitFor(() => expect(post).toHaveBeenCalledWith("class-sessions/ses_1/cancel", {}));
    expect(remove).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  /* The server this was first tried against predated the cancel route: a
     bare 404 from its router. The desk is told what is wrong, not "failed". */
  it("says the server is out of date when it has no cancel route", async () => {
    const { ApiError } = await import("@/lib/api");
    post.mockRejectedValueOnce(new ApiError(404, "request failed (404)", {}));
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderView(GROUP_SESSION, onClose);

    await user.click(screen.getByRole("button", { name: "Cancel class" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel class" }));

    expect(await screen.findByText(/running an older version/)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    /* Back to the plain Cancel class button, so it can simply be tried again. */
    expect(screen.getByRole("button", { name: "Cancel class" })).toBeTruthy();
  });

  /* Someone else cancelled it first: the class is off, which is the point. */
  it("treats a class that is already gone as cancelled", async () => {
    const { ApiError } = await import("@/lib/api");
    post.mockRejectedValueOnce(new ApiError(404, "no such class", { error: "no such class" }));
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderView(GROUP_SESSION, onClose);

    await user.click(screen.getByRole("button", { name: "Cancel class" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel class" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  /* Length rules are for creating a class, not for calling one off: a
     session with no readable times still offers Cancel class. */
  it("can be cancelled whatever its length", async () => {
    state.raw.classSessions = [{ session_id: "ses_1", class_id: "cls_group", start_time: "", end_time: "" }];
    renderView();

    expect(queryDurationPart("Hours")).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel class" })).toBeTruthy();
  });

  it("backs out of the confirmation without cancelling anything", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: "Cancel class" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("button", { name: "Yes, cancel class" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel class" })).toBeTruthy();
    expect(remove).not.toHaveBeenCalled();
  });
});

/**
 * `session_status` stays "Ongoing" until someone sets it otherwise — nothing
 * does that on its own — so a class whose slot the clock says is over is
 * still "Ongoing" by the row's own account. Every edit the panel offers has
 * to stop anyway, or the desk can add a latecomer, extend the length, or
 * cancel a class that finished an hour ago.
 */
describe("once the slot has run out", () => {
  const OVERRUN_SESSION: ClassDef = { ...GROUP_SESSION, time: "9:00 AM – 10:00 AM" };

  beforeEach(() => {
    clock.now = new Date(2026, 8, 19, 10, 5); // five minutes past the 10:00 end
  });

  it("offers none of add student, change length or cancel", () => {
    renderView(OVERRUN_SESSION);

    expect(screen.queryByRole("button", { name: "Add Student" })).toBeNull();
    expect(queryDurationPart("Hours")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel class" })).toBeNull();
  });

  it("reads as Finished, with the read-only note and a Close rather than a Save", () => {
    renderView(OVERRUN_SESSION);

    expect(screen.getByText("Finished")).toBeTruthy();
    expect(screen.queryByText("Ongoing")).toBeNull();
    expect(screen.getByText("This class has finished — the roster is read-only.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save Changes" })).toBeNull();
  });

  it("stays editable right up to the end of the slot", () => {
    clock.now = new Date(2026, 8, 19, 9, 59);
    renderView(OVERRUN_SESSION);

    expect(screen.getByRole("button", { name: "Add Student" })).toBeTruthy();
    expect(durationPart("Hours")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel class" })).toBeTruthy();
  });
});
