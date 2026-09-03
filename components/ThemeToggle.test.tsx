/**
 * The pill has to say what the account is actually set to.
 *
 * It said Auto over a dark screen, permanently. The theme itself was saved and
 * applied — `<html data-theme="dark">`, the console genuinely dark — and only
 * the control lied about it.
 *
 * The cause is worth keeping in a test rather than a comment. The initial state
 * was read from `document.documentElement.dataset.theme`, on the reasoning that
 * the attribute is there before React runs. It is, in the browser. But a client
 * component is **server**-rendered first, where there is no `document`, so the
 * server always emitted Auto — and React does not repair attribute mismatches
 * when it hydrates:
 *
 *   "some attributes of the server rendered HTML didn't match the client
 *    properties. This won't be patched up."
 *
 * `renderToString` is the check that matters, then: it is the markup the
 * browser is stuck with. A test that only mounted the component in jsdom would
 * pass against the broken version, because there `document` exists.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { AdminPerson } from "@/lib/data";
import type { Theme } from "@/lib/theme";
import { JtraxProvider } from "./JtraxContext";
import { ThemeToggle } from "./ThemeToggle";

const person = { id: "p1", name: "Test", role: "Admin", email: "t@jca.ac.th", initials: "T" } as AdminPerson;

function tree(theme: Theme) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <JtraxProvider person={person} theme={theme}>
        <ThemeToggle />
      </JtraxProvider>
    </NextIntlClientProvider>
  );
}

/** Which label the server-rendered markup marks as pressed. */
function pressedOnTheServer(theme: Theme): string | null {
  const html = renderToString(tree(theme));
  const match = /<button[^>]*aria-pressed="true"[^>]*>([^<]*)</.exec(html);
  return match ? match[1] : null;
}

describe("the markup the server sends", () => {
  /* The bug, from the only angle that shows it. Against the old version this
     returns "Auto" for all three. */
  it.each([
    ["System", en.nav.themeSystem],
    ["Light", en.nav.themeLight],
    ["Dark", en.nav.themeDark],
  ] as const)("presses %s when that is what the account holds", (theme, label) => {
    expect(pressedOnTheServer(theme)).toBe(label);
  });

  /* Exactly one, or the pill is showing two answers at once. */
  it.each(["System", "Light", "Dark"] as const)("presses only one button for %s", (theme) => {
    const html = renderToString(tree(theme));
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });
});

describe("the pill in the browser", () => {
  it("shows the saved theme without being touched", () => {
    render(tree("Dark"));
    expect(screen.getByRole("button", { name: en.nav.themeDark }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: en.nav.themeSystem }).getAttribute("aria-pressed")).toBe("false");
  });

  it("moves when another is chosen, and saves it to the account", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(tree("System"));

    await user.click(screen.getByRole("button", { name: en.nav.themeLight }));
    expect(screen.getByRole("button", { name: en.nav.themeLight }).getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.dataset.theme).toBe("light");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ themePreference: "Light" });
    vi.unstubAllGlobals();
  });

  /* System means "follow the machine", which is the absence of the attribute
     rather than a value of its own. Writing `data-theme="system"` would pin
     the console to a stylesheet rule that does not exist. */
  it("clears the attribute for Auto rather than naming it", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(tree("Dark"));

    await user.click(screen.getByRole("button", { name: en.nav.themeSystem }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
