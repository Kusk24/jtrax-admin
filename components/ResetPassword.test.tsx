/**
 * The new-password modal says whether "Copy both" worked.
 *
 * The button gave no sign either way, so the office could not tell whether the
 * password was on the clipboard — and the modal is the only place it is shown.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { SignedInAs } from "./pages/signed-in-as";
import { ResetPasswordButton } from "./ResetPassword";

async function issuePassword() {
  const user = userEvent.setup();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SignedInAs>
        <ResetPasswordButton
          accountId="usr_penny"
          identifier="stu_penny"
          name="Penny"
          update={vi.fn(async () => ({}))}
          onError={vi.fn()}
        />
      </SignedInAs>
    </NextIntlClientProvider>,
  );
  await user.click(screen.getByRole("button", { name: /Reset password/ }));
  await user.click(screen.getByRole("button", { name: "Reset it" }));
  return user;
}

describe("copying the new password", () => {
  it("copies the sign-in ID and password, and says so", async () => {
    const user = await issuePassword();
    await user.click(screen.getByRole("button", { name: /Copy both/ }));

    expect(await navigator.clipboard.readText()).toMatch(/^stu_penny \/ \S+$/);
    expect(screen.getByRole("button", { name: /Copied/ })).toBeDefined();
    /* A tick, not the word: the name is there for a screen reader only. */
    expect(screen.queryByText("Copied")).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/Sign-in ID and password copied/);
  });

  it("says when the copy did not work", async () => {
    const user = await issuePassword();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("denied"));
    await user.click(screen.getByRole("button", { name: /Copy both/ }));

    expect(screen.getByRole("status").textContent).toMatch(/Couldn't copy/);
    expect(screen.getByRole("button", { name: /Copy both/ })).toBeDefined();
  });
});
