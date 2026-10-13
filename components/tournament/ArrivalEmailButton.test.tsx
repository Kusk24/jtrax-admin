/**
 * The participant row's arrival email button: a tooltip says what it does,
 * a first click sends and says "Email sent", and once sent a click asks
 * before sending again.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ArrivalEmailButton } from "./ArrivalEmailButton";

function show(remindedAt?: string) {
  const onSend = vi.fn(async () => true);
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ArrivalEmailButton name="Moe" remindedAt={remindedAt} onSend={onSend} />
    </NextIntlClientProvider>,
  );
  return { onSend, user: userEvent.setup() };
}

describe("the arrival email button", () => {
  it("says what it does on hover", async () => {
    const { user } = show();
    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip").textContent).toBe("Send attendance email to Moe");
  });

  it("sends at once when nothing was sent, and says so", async () => {
    const { user, onSend } = show();
    await user.click(screen.getByRole("button"));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Email sent")).toBeTruthy();
  });

  it("asks before sending again once sent", async () => {
    const { user, onSend } = show("2026-10-13T02:00:00Z");
    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip").textContent).toBe("Already sent 13 Oct 2026");

    await user.click(screen.getByRole("button"));
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByText("Already sent on 13 Oct 2026.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSend).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Already sent/ }));
    await user.click(screen.getByRole("button", { name: "Send again" }));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Email sent")).toBeTruthy();
  });
});
