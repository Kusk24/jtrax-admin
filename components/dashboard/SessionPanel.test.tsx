/**
 * Creating a session from the dashboard.
 *
 * The Create button is disabled until the panel has a class and both times.
 * That is fine; saying nothing about it is not — the times start empty and are
 * cleared again whenever the class changes, so the button spends most of its
 * life dead for a reason the screen never gave.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const create = vi.fn(async () => ({ session_id: "ses_new" }));

const state = {
  students: [{ id: "anong", name: "Anong Sri", credit: 8, status: "Normal", parentPhone: "0811111111" }],
  raw: {
    classes: [
      { class_id: "cls_group", name: "Group Class" },
      { class_id: "cls_master", name: "Master Class" },
    ],
  },
};

vi.mock("@/components/DataProvider", () => ({ useData: () => ({ ...state, create }) }));

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
    create: screen.getAllByRole("button", { name: "Create Session" }).at(-1) as HTMLButtonElement,
    start: screen.getByLabelText("Start Time") as HTMLInputElement,
    end: screen.getByLabelText("End Time") as HTMLInputElement,
    klass: screen.getByLabelText("Class Name") as HTMLSelectElement,
  };
}

describe("the Create button while the form is incomplete", () => {
  it("says what it is waiting for instead of just going grey", () => {
    const { create: button } = renderPanel();
    expect(button.disabled).toBe(true);
    expect(screen.getByText("Set a start and end time to create the session.")).toBeTruthy();
  });

  it("stops saying it once both times are set", async () => {
    const user = userEvent.setup();
    const { create: button, start, end } = renderPanel();
    await user.type(start, "10:00");
    await user.type(end, "11:30");

    expect(button.disabled).toBe(false);
    expect(screen.queryByText("Set a start and end time to create the session.")).toBeNull();
  });

  /* A class has no fixed hours — that is the whole reason sessions are made by
     hand — so changing which class this is says nothing about when it runs.
     Wiping the times made the desk type them twice. */
  it("keeps the times when the class is changed", async () => {
    const user = userEvent.setup();
    const { create: button, start, end, klass } = renderPanel();
    await user.type(start, "10:00");
    await user.type(end, "11:30");

    await user.selectOptions(klass, "Master Class");

    expect(start.value).toBe("10:00");
    expect(end.value).toBe("11:30");
    expect(button.disabled).toBe(false);
  });
});

/* The panel can open before the class list lands — a cold backend, a hard
   reload. The chosen class used to be frozen at mount from a list that was
   still empty, so it stayed "" for good; the select, having no option matching
   "", displayed its first one anyway. The class looked chosen and the button
   stayed dead with both times filled in. */
describe("classes that arrive after the panel is already open", () => {
  it("creates with the class the dropdown is showing", async () => {
    const saved = state.raw.classes;
    state.raw.classes = [];
    try {
      const user = userEvent.setup();
      const { rerender } = render(
        <NextIntlClientProvider locale="en" messages={en}>
          <ErrorToastProvider>
            <SessionPanel state={{ mode: "create" }} onClose={() => {}} />
          </ErrorToastProvider>
        </NextIntlClientProvider>,
      );

      state.raw.classes = saved;
      rerender(
        <NextIntlClientProvider locale="en" messages={en}>
          <ErrorToastProvider>
            <SessionPanel state={{ mode: "create" }} onClose={() => {}} />
          </ErrorToastProvider>
        </NextIntlClientProvider>,
      );

      const select = screen.getByLabelText("Class Name") as HTMLSelectElement;
      const button = screen.getAllByRole("button", { name: "Create Session" }).at(-1) as HTMLButtonElement;
      await user.type(screen.getByLabelText("Start Time"), "10:00");
      await user.type(screen.getByLabelText("End Time"), "11:30");

      /* What the dropdown shows and what the panel will write are the same
         thing — the whole bug was that they were not. */
      expect(select.value).toBe("Group Class");
      expect(button.disabled).toBe(false);

      await user.click(button);
      const [, body] = create.mock.calls.at(-1) as unknown as [string, Record<string, unknown>];
      expect(body.class_id).toBe("cls_group");
    } finally {
      state.raw.classes = saved;
    }
  });
});

describe("no classes at all", () => {
  it("says that, rather than blaming the times", () => {
    const saved = state.raw.classes;
    state.raw.classes = [];
    try {
      const { create: button } = renderPanel();
      expect(button.disabled).toBe(true);
      expect(screen.getByText(/No class exists yet/)).toBeTruthy();
      expect(screen.queryByText("Set a start and end time to create the session.")).toBeNull();
    } finally {
      state.raw.classes = saved;
    }
  });
});

/* A time field reading "03:30" can still be empty to the code: `<input
   type="time">` reports "" until every segment is filled, and a 12-hour
   browser has an AM/PM segment as well. "Set a start and end time" in front of
   two fields that both look filled is no help at all. */
describe("a time that is only half entered", () => {
  it("says so, instead of claiming the times are unset", async () => {
    const user = userEvent.setup();
    const { start, end } = renderPanel();
    await user.type(start, "10:00");
    await user.type(end, "11:30");
    expect(screen.queryByText(/create the session/)).toBeNull();

    /* Now the desk edits the start and leaves a segment blank. This is exactly
       what the browser then reports: digits still on screen, value "", and
       badInput admitting why. */
    Object.defineProperty(start, "validity", { configurable: true, value: { badInput: true } });
    fireEvent.change(start, { target: { value: "" } });

    expect(screen.getByText(/only half entered/)).toBeTruthy();
    expect(screen.queryByText("Set a start and end time to create the session.")).toBeNull();
  });

  it("names the one field that is missing", async () => {
    const user = userEvent.setup();
    const { end } = renderPanel();
    await user.type(end, "11:30");

    expect(screen.getByText("Set a start time to create the session.")).toBeTruthy();
  });

  it("names the end when that is the one left", async () => {
    const user = userEvent.setup();
    const { start } = renderPanel();
    await user.type(start, "10:00");

    expect(screen.getByText("Set an end time to create the session.")).toBeTruthy();
  });
});

describe("creating", () => {
  it("writes the session with the class and times chosen", async () => {
    const user = userEvent.setup();
    const { create: button, start, end } = renderPanel();
    await user.type(start, "10:00");
    await user.type(end, "11:30");
    await user.click(button);

    expect(create).toHaveBeenCalled();
    const [path, body] = create.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(path).toBe("class-sessions");
    expect(body.class_id).toBe("cls_group");
    expect(body.start_time).toBe("10:00");
    expect(body.end_time).toBe("11:30");
    expect(body.session_status).toBe("Ongoing");
  });
});
