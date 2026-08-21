/**
 * Creating a session from the dashboard.
 *
 * The Create button is disabled until the panel has a class and both times.
 * That is fine; saying nothing about it is not — the times start empty and are
 * cleared again whenever the class changes, so the button spends most of its
 * life dead for a reason the screen never gave.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

  /* Changing the class clears both times on purpose — a new class rarely runs
     at the old one's hours — so the reason has to come back with them. */
  it("says it again after the class is changed", async () => {
    const user = userEvent.setup();
    const { create: button, start, end, klass } = renderPanel();
    await user.type(start, "10:00");
    await user.type(end, "11:30");
    expect(button.disabled).toBe(false);

    await user.selectOptions(klass, "Master Class");
    expect(button.disabled).toBe(true);
    expect(screen.getByText("Set a start and end time to create the session.")).toBeTruthy();
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
