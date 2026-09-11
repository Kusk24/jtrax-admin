/**
 * The header search's wiring: typing opens grouped results, choosing one
 * navigates to it, Escape closes, and outside the data provider the box
 * simply isn't there (the auth pages share the shell's chrome).
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { DataContext } from "./DataProvider";
import { GlobalSearch } from "./GlobalSearch";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: (href: string) => push(href) }) }));

const DATA = {
  students: [{ id: "stu_penny", name: "Penny", className: "Beginner" }],
  parents: [{ id: "par_sandy", name: "Sandy Jones", phone: "081" }],
  tournaments: [{ id: "t_open", name: "Penny Cup", date: "2026-10-04" }],
  raw: { classes: [] },
} as never;

function show(withData = true) {
  push.mockClear();
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DataContext.Provider value={withData ? DATA : null}>
        <GlobalSearch />
      </DataContext.Provider>
    </NextIntlClientProvider>,
  );
}

describe("the header search", () => {
  it("is absent without the data provider", () => {
    show(false);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("types a name, shows grouped hits, and opens the chosen record", async () => {
    const user = userEvent.setup();
    show();
    await user.type(screen.getByRole("combobox"), "penny");

    // Two kinds match, each under its own group header.
    expect(screen.getByText("Students")).toBeDefined();
    expect(screen.getByText("Tournament")).toBeDefined();

    await user.click(screen.getByRole("option", { name: /pennybeginner/i }));
    expect(push).toHaveBeenCalledWith("/students?id=stu_penny");
    // Chosen means done: the box clears for the next question.
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("");
  });

  it("walks the list with the keyboard and opens on Enter", async () => {
    const user = userEvent.setup();
    show();
    await user.type(screen.getByRole("combobox"), "penny");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(push).toHaveBeenCalledWith("/tournament?id=t_open");
  });

  it("says when nothing matches, and Escape closes the list", async () => {
    const user = userEvent.setup();
    show();
    await user.type(screen.getByRole("combobox"), "zzz");
    expect(screen.getByText(/nothing matches/i)).toBeDefined();
    await user.keyboard("{Escape}");
    expect(screen.queryByText(/nothing matches/i)).toBeNull();
  });
});
