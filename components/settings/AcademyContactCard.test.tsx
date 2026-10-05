import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const setConfig = vi.fn(async () => {});
vi.mock("../DataProvider", () => ({
  useData: () => ({
    raw: {
      systemConfig: [
        { config_key: "academy_phone", config_value: "02-853-9836 / 099-0156-156" },
        { config_key: "academy_address", config_value: "Paradise Park Mall, Bangkok" },
      ],
    },
    setConfig,
  }),
}));

const { AcademyContactCard } = await import("./AcademyContactCard");

describe("Academy Contact", () => {
  it("shows what is saved, and saves only what changed — a new number and a second address", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AcademyContactCard />
      </NextIntlClientProvider>,
    );
    const phone = screen.getByLabelText(/^Phone/) as HTMLInputElement;
    expect(phone.value).toBe("02-853-9836 / 099-0156-156");
    expect((screen.getByLabelText("Address 1") as HTMLTextAreaElement).value).toBe("Paradise Park Mall, Bangkok");

    await user.clear(phone);
    await user.type(phone, "02-111-2222");
    await user.click(screen.getByRole("button", { name: /Add address/ }));
    await user.type(screen.getByLabelText("Address 2"), "Second Branch, Bangkok");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(setConfig).toHaveBeenCalledWith("academy_phone", "02-111-2222");
    expect(setConfig).toHaveBeenCalledWith("academy_address", "Paradise Park Mall, Bangkok\nSecond Branch, Bangkok");
    expect(setConfig).toHaveBeenCalledTimes(2);
  });
});
