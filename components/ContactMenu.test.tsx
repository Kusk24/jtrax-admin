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
  it("lists phone, email and LINE when the parent gave all three", async () => {
    const { items } = await open(student({ parentPhone: "081 234 5678", parentEmail: "polly@mail.com" }), chat);
    expect(items).toEqual(["Phone: 081 234 5678", "Email: polly@mail.com", "LINE: Polly"]);
  });

  it("leaves out what was not given", async () => {
    const { items } = await open(student({ parentEmail: "polly@mail.com" }));
    expect(items).toEqual(["Email: polly@mail.com"]);
  });

  it("shows the LINE ID when no chat is linked", async () => {
    const { items } = await open(student({ parentLineId: "polly.line" }));
    expect(items).toEqual(["LINE: polly.line"]);
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
