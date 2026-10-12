/**
 * The student table's Contact menu lists only the ways in the parent gave.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { Student } from "@/lib/data";
import type { LineConversation } from "@/lib/line";
import { ContactMenu } from "./ContactMenu";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const student = (p: Partial<Student>) =>
  ({ id: "stu_polly", parentId: "par_polly", parentPhone: "", parentEmail: "", parentLineId: "", ...p }) as Student;

const chat = { lineUserId: "U_polly", displayName: "Polly" } as LineConversation;

async function open(s: Student, c: LineConversation | null = null) {
  const user = userEvent.setup();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ContactMenu student={s} chat={c} />
    </NextIntlClientProvider>,
  );
  await user.click(screen.getByRole("button", { name: /Contact/ }));
  return { user, items: screen.getAllByRole("menuitem").map((i) => i.textContent) };
}

describe("the Contact menu", () => {
  it("lists phone, email and LINE as an icon and the value", async () => {
    const { items } = await open(student({ parentPhone: "081 234 5678", parentEmail: "polly@mail.com" }), chat);
    expect(items).toEqual(["081 234 5678", "polly@mail.com", "Polly"]);
    /* The button is a word, not a phone: it is not only for calling. */
    expect(screen.getByRole("button", { name: /Contact/ }).querySelectorAll("svg")).toHaveLength(1);
  });

  it("leaves out what was not given", async () => {
    const { items } = await open(student({ parentEmail: "polly@mail.com" }));
    expect(items).toEqual(["polly@mail.com"]);
  });

  it("has no LINE item until a chat is linked, since LINE opens the chat", async () => {
    const { items } = await open(student({ parentPhone: "0812345678", parentLineId: "polly.line" }));
    expect(items).toEqual(["0812345678"]);
  });

  it("calls the phone", async () => {
    const location = { href: "" };
    Object.defineProperty(window, "location", { value: location, configurable: true });
    const { user } = await open(student({ parentPhone: "081 234-5678" }));
    await user.click(screen.getByRole("menuitem", { name: /Phone/ }));
    expect(location.href).toBe("tel:0812345678");
  });

  it("opens a Gmail draft to the email in a new tab", async () => {
    const opened = vi.spyOn(window, "open").mockReturnValue(null);
    const { user } = await open(student({ parentEmail: "polly+jca@mail.com" }));
    await user.click(screen.getByRole("menuitem", { name: /Email/ }));
    expect(opened).toHaveBeenCalledWith(
      "https://mail.google.com/mail/?view=cm&fs=1&to=polly%2Bjca%40mail.com", "_blank", "noopener",
    );
    opened.mockRestore();
  });

  it("opens the parent's chat in Messages", async () => {
    const { user } = await open(student({}), chat);
    await user.click(screen.getByRole("menuitem", { name: /LINE/ }));
    expect(push).toHaveBeenCalledWith("/chat?id=U_polly");
  });

  it("is not there at all when the parent gave nothing", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ContactMenu student={student({})} chat={null} />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole("button", { name: /Contact/ })).toBeNull();
  });
});
