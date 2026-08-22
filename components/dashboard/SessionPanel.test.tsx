/**
 * Create Session, rebuilt.
 *
 * Both ends of the session are chosen freely from lists — any start, any end,
 * five minutes apart — because a class has no fixed hours, which is the whole
 * reason sessions are written one at a time. Selects rather than
 * `<input type="time">`, which reports "" until every segment is filled and
 * left the desk staring at a Create button that would not press.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    ],
  },
};

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({ ...state, create, batch }),
}));

const { SessionPanel } = await import("./SessionPanel");
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
    klass: screen.getByLabelText("Class Name") as HTMLSelectElement,
    startHour: screen.getByLabelText("Start hour") as HTMLSelectElement,
    startMinute: screen.getByLabelText("Start minute") as HTMLSelectElement,
    endHour: screen.getByLabelText("End hour") as HTMLSelectElement,
    endMinute: screen.getByLabelText("End minute") as HTMLSelectElement,
    button: screen.getAllByRole("button", { name: "Create Session" }).at(-1) as HTMLButtonElement,
  };
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
    expect(f.startHour.options).toHaveLength(24 + 1); // + the "--" placeholder
    expect(f.startMinute.options).toHaveLength(12 + 1);
  });

  it("still reaches the awkward times a real timetable uses", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "16:45");
    expect(f.startHour.value).toBe("16");
    expect(f.startMinute.value).toBe("45");
  });

  /* Not anchored to now: a session is written down when the desk gets to it. */
  it("does not start from the current time", () => {
    const f = renderPanel();
    expect(f.startHour.value).toBe("");
    expect(f.startHour.options[1].value).toBe("00");
  });

  /* Choosing 2pm means 14:00 without also having to say "and no minutes". */
  it("treats an hour on its own as a whole time", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await user.selectOptions(f.startHour, "14");
    expect(f.endHour.value).toBe("14");
    expect(f.endMinute.value).toBe("30");
  });

  it("has nothing to put minutes on until an hour is chosen", () => {
    const f = renderPanel();
    expect(f.startMinute.disabled).toBe(true);
  });

  it("moves the end along when a start is chosen", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "14:00");
    expect(f.endHour.value).toBe("14");
    expect(f.endMinute.value).toBe("30");
  });

  it("leaves an end that already works alone", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "10:00");
    await setTime(user, f.endHour, f.endMinute, "12:00");
    await setTime(user, f.startHour, f.startMinute, "09:00");
    expect(f.endHour.value).toBe("12");
    expect(f.endMinute.value).toBe("00");
  });
});

describe("the half-hour floor", () => {
  it("refuses a shorter session and says so", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    const button = f.button;
    await setTime(user, f.startHour, f.startMinute, "10:00");
    await setTime(user, f.endHour, f.endMinute, "10:20");

    expect(button.disabled).toBe(true);
    expect(screen.getAllByText("A session runs for at least half an hour.").length).toBeGreaterThan(0);
  });

  it("accepts exactly half an hour", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    const button = f.button;
    await setTime(user, f.startHour, f.startMinute, "10:00");
    await setTime(user, f.endHour, f.endMinute, "10:30");
    expect(button.disabled).toBe(false);
  });

  it("refuses an end before the start, and names that rather than the length", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    const button = f.button;
    await setTime(user, f.startHour, f.startMinute, "14:00");
    await setTime(user, f.endHour, f.endMinute, "09:00");

    expect(button.disabled).toBe(true);
    expect(screen.getByText("The end time must be after the start.")).toBeTruthy();
  });
});

describe("what it will cost", () => {
  it("shows an hour as one credit", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "10:00");
    await setTime(user, f.endHour, f.endMinute, "11:00");
    expect(screen.getByText(/costs each student 1 credits/)).toBeTruthy();
  });

  it("shows half an hour as half a credit", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "10:00");
    await setTime(user, f.endHour, f.endMinute, "10:30");
    expect(screen.getByText(/costs each student 0.5 credits/)).toBeTruthy();
  });

  it("shows ninety minutes as one and a half", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "09:00");
    await setTime(user, f.endHour, f.endMinute, "10:30");
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
    await setTime(user, f.startHour, f.startMinute, "09:00");
    await setTime(user, f.endHour, f.endMinute, "10:00");

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
  it("writes the session and everyone already in the room, in one batch", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    const button = f.button;
    await setTime(user, f.startHour, f.startMinute, "09:00");
    await setTime(user, f.endHour, f.endMinute, "10:30");
    await user.click(screen.getByRole("checkbox", { name: /Anong Sri/ }));
    await user.click(screen.getByRole("checkbox", { name: /Boon Mek/ }));
    await user.click(button);

    expect(batch).toHaveBeenCalledTimes(1);
    const [path, session] = create.mock.calls[0];
    expect(path).toBe("class-sessions");
    expect(session.class_id).toBe("cls_group");
    expect(session.start_time).toBe("09:00");
    expect(session.end_time).toBe("10:30");

    const attendance = create.mock.calls.slice(1);
    expect(attendance.map((c) => c[0])).toEqual(["attendance", "attendance"]);
    expect(attendance.map((c) => c[1].student_id)).toEqual(["anong", "boon"]);
    expect(attendance[0][1].session_id).toBe("ses_new");
  });

  /* Nobody has to be ticked: the dashboard checks a child in when they arrive,
     and it writes the same row. */
  it("creates an empty session when nobody is here yet", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    const button = f.button;
    await setTime(user, f.startHour, f.startMinute, "09:00");
    await setTime(user, f.endHour, f.endMinute, "10:00");
    expect(button.disabled).toBe(false);
    await user.click(button);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toBe("class-sessions");
  });
});

/* A child may attend on credit and go below zero — the academy allows it. The
   desk is warned, not stopped. Boon has 2.5 credits. */
describe("a student whose balance will not cover the session", () => {
  it("can still be ticked, and is written like anyone else", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "09:00");
    await setTime(user, f.endHour, f.endMinute, "12:00"); // 3 credits, they have 2.5

    const boon = screen.getByRole("checkbox", { name: /Boon Mek/ }) as HTMLInputElement;
    expect(boon.disabled).toBe(false);

    await user.click(boon);
    expect(screen.getByText(/1 student added/)).toBeTruthy();

    await user.click(f.button);
    const attendance = create.mock.calls.slice(1);
    expect(attendance.map((c) => c[1].student_id)).toEqual(["boon"]);
  });

  /* Marked so the desk knows who to chase, in red beside the name. */
  it("is marked as heading below zero", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "09:00");
    await setTime(user, f.endHour, f.endMinute, "12:00");

    expect(screen.getByTitle(/takes them below zero/)).toBeTruthy();
  });

  it("is not marked when the session is within their balance", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "09:00");
    await setTime(user, f.endHour, f.endMinute, "10:00"); // 1 credit

    expect(screen.queryByTitle(/takes them below zero/)).toBeNull();
  });

  /* A tick survives the session being lengthened: going negative is allowed,
     so there is nothing to withdraw. */
  it("keeps its tick when the session is lengthened", async () => {
    const user = userEvent.setup();
    const f = renderPanel();
    await setTime(user, f.startHour, f.startMinute, "09:00");
    await setTime(user, f.endHour, f.endMinute, "10:00");
    await user.click(screen.getByRole("checkbox", { name: /Boon Mek/ }));

    await setTime(user, f.endHour, f.endMinute, "12:00");
    expect(screen.getByText(/1 student added/)).toBeTruthy();
  });
});
