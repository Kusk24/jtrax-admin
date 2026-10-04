/**
 * Create Class, rebuilt.
 *
 * Both ends of the session are chosen freely from lists — any start, any end,
 * five minutes apart — because a class has no fixed hours, which is the whole
 * reason sessions are written one at a time. Selects rather than
 * `<input type="time">`, which reports "" until every segment is filled and
 * left the desk staring at a Create button that would not press.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/* Typed with the body it is called with, so the recorded calls can be read as
   (path, body) rather than cast at every assertion. */
const create = vi.fn(
  async (path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
    void body;
    return path === "class-sessions" ? { session_id: "ses_new" } : {};
  },
);
const batch = vi.fn(async (job: () => Promise<unknown>) => job());

/* Anong and Boon are in the Group class; Chai is in Master only. */
const state = {
  students: [
    { id: "anong", name: "Anong Sri", credit: 8, status: "Normal", className: "Group Class" },
    { id: "boon", name: "Boon Mek", credit: 2.5, status: "Low Credit", className: "Group Class" },
    { id: "chai", name: "Chai Rat", credit: 5, status: "Normal", className: "Master Class" },
  ],
  raw: {
    classes: [
      { class_id: "cls_group", name: "Group Class" },
      { class_id: "cls_master", name: "Master Class" },
      { class_id: "cls_gone", name: "Retired Class", archived_at: "2026-08-21T00:00:00Z" },
    ],
    enrollments: [
      { enrollment_id: "e1", student_id: "anong", class_id: "cls_group" },
      { enrollment_id: "e2", student_id: "boon", class_id: "cls_group" },
      { enrollment_id: "e3", student_id: "chai", class_id: "cls_master" },
      /* Anong left Master last term. A withdrawn enrolment is not a class she
         is in, so it must not put her on that roster. */
      { enrollment_id: "e4", student_id: "anong", class_id: "cls_master", status: "Withdrawn" },
    ],
  },
  creditRules: { lowCredit: 3, expiringDays: 7, inactiveDays: 30, certSessions: 50, maxNegativeCredit: 0 },
};

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({ ...state, create, batch }),
}));

/**
 * The panel's create form opens on `nowClock()` — the real wall clock, by
 * design. Left unmocked, these tests were quietly time-of-day dependent: late
 * at night, the two hours the default asks for run past midnight, so mount
 * picks a *shorter* length than the default, and every test that then only
 * changes the start hour (keeping the length the desk already has, which is
 * the panel's whole point — see `chooseStart`) inherited that shorter number
 * instead of the 120 these tests assert. Pinned to the middle of the day,
 * where two hours always has room, rather than faking the system clock —
 * `vi.useFakeTimers()` across a file this full of `userEvent.click` calls
 * just hangs them, since userEvent's own click delay runs on real timers.
 */
vi.mock("@/lib/session-draft", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/session-draft")>();
  return { ...real, nowClock: () => "10:00" };
});

const { SessionPanel } = await import("./SessionPanel");
const { chooseLength, durationMinutes, durationPart, pickDuration, presetsOf } = await import("./duration-test-kit");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

function renderPanel() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <SessionPanel state={{ mode: "create" }} onClose={() => {}} />
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  return {
    klass: screen.getByLabelText(/^Course( \*)?$/) as HTMLSelectElement,
    startHour: screen.getByLabelText("Start hour") as HTMLSelectElement,
    startMinute: screen.getByLabelText("Start minute") as HTMLSelectElement,
    /* The length the Duration control holds, in minutes. */
    length: durationMinutes,
    button: screen.getAllByRole("button", { name: "Create Class" }).at(-1) as HTMLButtonElement,
  };
}

/**
 * Runs the class until this clock time.
 *
 * The panel asks for a length now, not a second clock time — but a timetable
 * is still written in end times, so the tests say when a class finishes and
 * this works out the length the desk would pick to get there.
 */
async function runUntil(
  user: ReturnType<typeof userEvent.setup>,
  f: ReturnType<typeof renderPanel>,
  clock: string,
) {
  const [sh, sm] = [Number(f.startHour.value), Number(f.startMinute.value || 0)];
  const [eh, em] = clock.split(":").map(Number);
  const total = eh * 60 + em - (sh * 60 + sm);
  void f;
  await chooseLength(user, total);
}

/** Sets one end of the session the way the desk does: hour, then minute. */
async function setTime(
  user: ReturnType<typeof userEvent.setup>,
  hour: HTMLSelectElement,
  minute: HTMLSelectElement,
  clock: string,
) {
  await user.selectOptions(hour, clock.slice(0, 2));
  await user.selectOptions(minute, clock.slice(3, 5));
}

beforeEach(() => {
  create.mockClear();
  batch.mockClear();
});

describe("choosing the times", () => {
  /* One list of every five-minute mark was 288 options — correct and unusable.
     Two short lists reach the same times. */
  it("is two short lists rather than one long one", () => {
    const f = renderPanel();
    /* Today, from now (10:00 here) to 23:00, plus the "--" placeholder. */
    expect(f.startHour.options).toHaveLength(14 + 1);
    expect(f.startMinute.options).toHaveLength(12 + 1);
  });

  /* A class that is already over is not created from the dashboard. */
  it("offers only now and later on today's form", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    const hours = Array.from(f.startHour.options).map((o) => o.value).filter(Boolean);
    expect(hours[0]).toBe("10");
    expect(hours).not.toContain("09");
    await setTime(user, f.startHour, f.startMinute, "11:00");
    expect(f.startHour.value).toBe("11");
  });

  it("still reaches the awkward times a real timetable uses", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "16:45");
    expect(f.startHour.value).toBe("16");
    expect(f.startMinute.value).toBe("45");
  });

  /**
   * Opens on now, running for the default length.
   *
   * This reverses the panel's original rule ("not anchored to now: a session
   * is written down when the desk gets to it"), at the user's request on
   * 2026-09-19: in practice a class is created as it starts, so the empty
   * form asked the desk to re-enter what the clock already knew.
   */
  /* nowClock()'s own rounding-to-the-picker's-step behaviour is unit-tested
     directly in lib/session-draft.test.ts, against the real clock. This is
     the wiring on top of it: the panel actually calls nowClock() for its
     initial state, and it is the default 120-minute length that lands on
     whatever that start turns out to be — proven here against the file's
     pinned "10:00" mock, same as every other test in it. */
  it("opens on now and the default length", () => {
    const f = renderPanel();
    expect(f.startHour.value).toBe("10");
    expect(f.startMinute.value).toBe("00");
    expect(f.length()).toBe(120);
    expect(screen.getAllByText(/Ends 12:00/).length).toBeGreaterThan(0);
  });

  /* Choosing 2pm means 14:00 without also having to say "and no minutes". */
  it("treats an hour on its own as a whole time", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await user.selectOptions(f.startMinute, "");
    await user.selectOptions(f.startHour, "14");
    /* A whole start, so the class has a length and an end to show. */
    expect(f.length()).toBe(120);
    expect(screen.getAllByText(/Ends 16:00/).length).toBeGreaterThan(0);
  });

  it("has nothing to put minutes on until an hour is chosen", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    /* The form now opens with a start already in it, so the empty state this
       rule is about has to be got back to first. */
    await user.selectOptions(f.startHour, "");
    expect(f.startMinute.disabled).toBe(true);
  });

  /* Two hours, which is what the academy timetables — and so two credits. */
  it("offers the usual length as soon as a start is chosen", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "14:00");
    expect(f.length()).toBe(120);
    expect(screen.getAllByText(/Ends 16:00/).length).toBeGreaterThan(0);
  });

  /* The whole reason for asking a length rather than an end time: moving the
     start slides the class, it does not resize it. Choosing two hours and then
     correcting 10:00 to 11:00 used to leave a one-hour class. */
  it("keeps the chosen length when the start moves", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "10:00");
    await runUntil(user, f, "12:00");
    expect(f.length()).toBe(120);

    await setTime(user, f.startHour, f.startMinute, "11:00");
    expect(f.length()).toBe(120);
    expect(screen.getAllByText(/Ends 13:00/).length).toBeGreaterThan(0);
  });

  it("has no length to offer once the start is cleared", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    /* The form now opens with a start already in it (now, rounded to the
       picker's step) — this rule is about the empty state, so it has to be
       got back to first. */
    await user.selectOptions(f.startHour, "");
    expect(durationPart("Hours").disabled).toBe(true);
  });

  /* A late start shortens the class rather than offering a length that would
     run past midnight and refusing it afterwards. */
  it("offers only the lengths that fit before midnight", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "23:00");
    const hours = await presetsOf(user, "Hours");
    expect(hours.map((h) => h.label)).toEqual(["0 hr", "1 hr"]);
    expect(f.length()).toBeLessThanOrEqual(60);
  });
});

describe("the half-hour floor", () => {
  /* It used to be an error message after the fact. Now it is the shortest
     thing on the list, so a twenty-minute class cannot be asked for at all
     and nobody has to be told off for trying. */
  it("is the shortest length on offer, not a refusal", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "10:00");
    await pickDuration(user, "Hours", 0);
    /* With no whole hours, only the minutes that make half an hour or more
       can be picked. */
    const enabled = (await presetsOf(user, "Minutes")).filter((o) => o.allowed).map((o) => o.label);
    expect(enabled).toEqual(["30 min", "45 min"]);
    expect(f.length()).toBe(30);
  });

  it("says so while there is no length yet", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    /* The panel now opens with a start already chosen and so a valid length
       — clear it to get back to the state this rule is about. */
    await user.selectOptions(f.startHour, "");
    expect(f.button.disabled).toBe(true);
    expect(screen.getAllByText("A class runs for at least half an hour.").length).toBeGreaterThan(0);
  });

  it("accepts exactly half an hour", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    const button = f.button;
    await setTime(user, f.startHour, f.startMinute, "10:00");
    await runUntil(user, f, "10:30");
    expect(button.disabled).toBe(false);
  });

  /* "The end time must be after the start" was a real message on a real form,
     because two clock times can be put in either order. A length cannot be
     negative, so the case is now unreachable from the screen — the guard
     itself is still tested, in lib/session-draft.test.ts, because the times
     it protects still reach the backend. */
  it("cannot be asked to end before it starts", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "14:00");

    expect(f.length()).toBeGreaterThan(0);
    expect(screen.queryByText("The end time must be after the start.")).toBeNull();
  });
});

describe("what it will cost", () => {
  it("shows an hour as one credit", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "12:00");
    await runUntil(user, f, "13:00");
    expect(screen.getByText(/costs each student 1 credits/)).toBeTruthy();
  });

  it("shows half an hour as half a credit", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "12:00");
    await runUntil(user, f, "12:30");
    expect(screen.getByText(/costs each student 0.5 credits/)).toBeTruthy();
  });

  it("shows ninety minutes as one and a half", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "11:00");
    await runUntil(user, f, "12:30");
    expect(screen.getByText(/costs each student 1.5 credits/)).toBeTruthy();
  });
});

describe("the students who can be added", () => {
  it("offers only those enrolled in the class chosen", () => {
    renderPanel();
    expect(screen.getByText("Anong Sri")).toBeTruthy();
    expect(screen.getByText("Boon Mek")).toBeTruthy();
    expect(screen.queryByText("Chai Rat")).toBeNull();
  });

  it("follows the class when it changes", async () => {
    const user = userEvent.setup();
    const { klass } = renderPanel();
    await user.selectOptions(klass, "cls_master");

    expect(screen.getByText("Chai Rat")).toBeTruthy();
    expect(screen.queryByText("Anong Sri")).toBeNull();
  });

  /* A tick was made against a roster that no longer applies. */
  it("drops a tick that the new class does not include", async () => {
    const user = userEvent.setup();
    /* Times first: until they are valid the footer is showing what is wrong
       with them, not the count. */
    const f = renderPanel();
    const klass = f.klass;
    await setTime(user, f.startHour, f.startMinute, "11:00");
    await runUntil(user, f, "12:00");

    await user.click(screen.getByRole("checkbox", { name: /Anong Sri/ }));
    expect(screen.getByText(/1 student added/)).toBeTruthy();

    await user.selectOptions(klass, "cls_master");
    expect(screen.getByText(/Nobody added yet/)).toBeTruthy();
  });

  it("does not offer a retired class at all", () => {
    const { klass } = renderPanel();
    const names = [...klass.options].map((o) => o.textContent);
    expect(names).not.toContain("Retired Class");
  });

  it("shows what each student has to spend", () => {
    renderPanel();
    expect(screen.getByText("2.5 credits")).toBeTruthy();
  });
});

describe("creating it", () => {
  /* The clock reads 10:00 (nowClock above). */
  it("books students on a class that starts later, charging nothing yet", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    const button = f.button;
    await setTime(user, f.startHour, f.startMinute, "11:00");
    await runUntil(user, f, "12:30");
    await user.click(screen.getByRole("checkbox", { name: /Anong Sri/ }));
    await user.click(screen.getByRole("checkbox", { name: /Boon Mek/ }));
    await user.click(button);

    expect(batch).toHaveBeenCalledTimes(1);
    const [path, session] = create.mock.calls[0];
    expect(path).toBe("class-sessions");
    expect(session.class_id).toBe("cls_group");
    expect(session.start_time).toBe("11:00");
    expect(session.end_time).toBe("12:30");
    expect(session.session_status).toBe("Scheduled");

    const bookings = create.mock.calls.slice(1);
    expect(bookings.map((c) => c[0])).toEqual(["session-bookings", "session-bookings"]);
    expect(bookings.map((c) => c[1].student_id)).toEqual(["anong", "boon"]);
    expect(bookings[0][1].session_id).toBe("ses_new");
  });

  it("checks students in on a class that starts now", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "10:00");
    await runUntil(user, f, "11:00");
    await user.click(screen.getByRole("checkbox", { name: /Anong Sri/ }));
    await user.click(f.button);

    expect(create.mock.calls[0][1].session_status).toBe("Ongoing");
    expect(create.mock.calls.slice(1).map((c) => c[0])).toEqual(["attendance"]);
  });

  /* Nobody has to be ticked: the dashboard checks a child in when they arrive,
     and it writes the same row. */
  it("creates an empty session when nobody is here yet", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    const button = f.button;
    await setTime(user, f.startHour, f.startMinute, "11:00");
    await runUntil(user, f, "12:00");
    expect(button.disabled).toBe(false);
    await user.click(button);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toBe("class-sessions");
  });
});

/* By default (maxNegativeCredit: 0) going below zero is refused outright,
   not just warned about — this is what closes
   [[a-child-can-check-in-on-expired-credit]]. Boon has 2.5 credits. */
describe("a student whose balance will not cover the session", () => {
  it("cannot be ticked, and is not written even if a stale tick reaches submit", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "11:00");
    await runUntil(user, f, "14:00"); // 3 credits, they have 2.5

    const boon = screen.getByRole("checkbox", { name: /Boon Mek/ }) as HTMLInputElement;
    expect(boon.disabled).toBe(true);
    expect(screen.getByText("Insufficient credits")).toBeTruthy();

    await user.click(f.button);
    const attendance = create.mock.calls.slice(1);
    expect(attendance.map((c) => c[1].student_id)).not.toContain("boon");
  });

  it("is not marked when the session is within their balance", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "11:00");
    await runUntil(user, f, "12:00"); // 1 credit

    const boon = screen.getByRole("checkbox", { name: /Boon Mek/ }) as HTMLInputElement;
    expect(boon.disabled).toBe(false);
    expect(screen.queryByText("Insufficient credits")).toBeNull();
  });

  /* A tick made while affordable does not survive the session being
     lengthened past the limit — there is nothing left to submit it with,
     since the checkbox itself becomes disabled. */
  it("drops its tick once lengthening the session crosses the limit", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "11:00");
    await runUntil(user, f, "12:00");
    await user.click(screen.getByRole("checkbox", { name: /Boon Mek/ }));
    expect(screen.getByText(/1 student added/)).toBeTruthy();

    await runUntil(user, f, "14:00");
    expect(screen.getByText(/Nobody added yet/)).toBeTruthy();
  });
});

/* An admin who raises Maximum Negative Credit in Settings gets the old,
   pre-this-feature behavior back: a warning, not a refusal. */
describe("a student whose balance will not cover the session, with a raised limit", () => {
  beforeEach(() => {
    state.creditRules = { ...state.creditRules, maxNegativeCredit: 5 };
  });
  afterEach(() => {
    state.creditRules = { ...state.creditRules, maxNegativeCredit: 0 };
  });

  it("can still be ticked, and is written like anyone else", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "11:00");
    await runUntil(user, f, "14:00"); // 3 credits, they have 2.5

    const boon = screen.getByRole("checkbox", { name: /Boon Mek/ }) as HTMLInputElement;
    expect(boon.disabled).toBe(false);

    await user.click(boon);
    expect(screen.getByText(/1 student added/)).toBeTruthy();

    await user.click(f.button);
    const attendance = create.mock.calls.slice(1);
    expect(attendance.map((c) => c[1].student_id)).toEqual(["boon"]);
  });

  /* Marked so the desk knows who to chase, in red beside the name — a
     warning, not a refusal, since it is within the raised limit. */
  it("is marked as heading below zero", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "11:00");
    await runUntil(user, f, "14:00");

    expect(screen.getByTitle(/takes them below zero/)).toBeTruthy();
  });

  /* A tick survives the session being lengthened: going negative is allowed
     within the limit, so there is nothing to withdraw. */
  it("keeps its tick when the session is lengthened", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "11:00");
    await runUntil(user, f, "12:00");
    await user.click(screen.getByRole("checkbox", { name: /Boon Mek/ }));

    await runUntil(user, f, "14:00");
    expect(screen.getByText(/1 student added/)).toBeTruthy();
  });
});

/* Anong is already in King Slayer from 10:00 to 12:00 today. She stays in the
   list — nobody should wonder where she went — but cannot be ticked into a
   class that overlaps it. */
const { todayISO } = await import("@/lib/live");

describe("a student already in another class at that time", () => {
  const raw = state.raw as Record<string, unknown>;
  beforeEach(() => {
    raw.classes = [...state.raw.classes, { class_id: "cls_king", name: "King Slayer" }];
    raw.classSessions = [
      { session_id: "ses_king", class_id: "cls_king", session_date: todayISO(), start_time: "10:00", end_time: "12:00" },
    ];
    raw.attendance = [{ attendance_id: "att_1", student_id: "anong", session_id: "ses_king" }];
  });
  afterEach(() => {
    raw.classes = state.raw.classes.filter((c) => c.class_id !== "cls_king");
    delete raw.classSessions;
    delete raw.attendance;
  });

  it("is listed, greyed, with the class they are in", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "11:00");
    await runUntil(user, f, "12:00");

    const anong = screen.getByRole("checkbox", { name: /Anong Sri/ }) as HTMLInputElement;
    expect(anong.disabled).toBe(true);
    expect(screen.getByText("In King Slayer")).toBeTruthy();

    await user.click(f.button);
    expect(create.mock.calls.slice(1).map((c) => c[1].student_id)).not.toContain("anong");
  });

  it("can join a class that starts when the other ends", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "12:00");
    await runUntil(user, f, "13:00");

    const anong = screen.getByRole("checkbox", { name: /Anong Sri/ }) as HTMLInputElement;
    expect(anong.disabled).toBe(false);
    expect(screen.queryByText("In King Slayer")).toBeNull();
  });
});
