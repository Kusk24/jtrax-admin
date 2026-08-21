/**
 * Adding a class.
 *
 * A class with no credit package cannot be sold, cannot be paid for and gives
 * nobody credits — so the first one is asked for on the same card, and the
 * class and its price are written as one act. Creating a class that nothing
 * can be bought for is the workflow this closes.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const create = vi.fn(async (path: string) =>
  path === "classes" ? { class_id: "cls_new" } : { credit_package_id: "pkg_new" },
);
const update = vi.fn(async () => ({}));
const remove = vi.fn(async () => undefined);
/* The real batch runs the job and refetches once; here it just runs it. */
const batch = vi.fn(async (job: () => Promise<unknown>) => job());

const state = {
  raw: {
    classes: [{ class_id: "cls_group", name: "Group Class", class_type: "Group" }],
    creditPackages: [
      { credit_package_id: "pkg_1", class_id: "cls_group", credit_amount: 20, standard_price: 12000, validity_days: 90 },
    ],
    teachers: [],
  },
};

vi.mock("@/components/DataProvider", () => ({
  useData: () => ({ ...state, batch, create, update, remove }),
}));

const { AcademyPage } = await import("./AcademyPage");
const { ErrorToastProvider } = await import("@/components/ErrorToast");

function renderAcademy() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <AcademyPage />
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
}

async function openAddClass(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Add Course" }));
  return {
    name: screen.getByLabelText("Course Name") as HTMLInputElement,
    credits: screen.getByLabelText("Credits") as HTMLInputElement,
    price: screen.getByLabelText("Price") as HTMLInputElement,
    days: screen.getByLabelText("Validity (days)") as HTMLInputElement,
    save: screen.getByRole("button", { name: "Save" }) as HTMLButtonElement,
  };
}

beforeEach(() => {
  create.mockClear();
  update.mockClear();
  batch.mockClear();
});

describe("the Add Course card", () => {
  it("asks for the first package, prefilled with the commonest terms", async () => {
    const user = userEvent.setup();
    renderAcademy();
    const f = await openAddClass(user);

    expect(f.credits.value).toBe("20");
    expect(f.price.value).toBe("12000");
    expect(f.days.value).toBe("90");
  });

  it("writes the class and its package as one act", async () => {
    const user = userEvent.setup();
    renderAcademy();
    const f = await openAddClass(user);

    await user.type(f.name, "Saturday Beginners");
    await user.clear(f.credits);
    await user.type(f.credits, "10");
    await user.clear(f.price);
    await user.type(f.price, "6000");
    await user.click(f.save);

    expect(batch).toHaveBeenCalledTimes(1);
    const paths = create.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(["classes", "credit-packages"]);

    const [, pkg] = create.mock.calls[1] as unknown as [string, Record<string, unknown>];
    /* Priced against the class that was just written, not a name typed twice. */
    expect(pkg.class_id).toBe("cls_new");
    expect(pkg.credit_amount).toBe(10);
    expect(pkg.standard_price).toBe(6000);
    expect(pkg.validity_days).toBe(90);
  });

  it("will not save a class with no name", async () => {
    const user = userEvent.setup();
    renderAcademy();
    const f = await openAddClass(user);

    expect(f.save.disabled).toBe(true);
  });

  /* A package of zero credits is not a package, and a class that arrives
     without one is the thing this card exists to prevent. */
  it("will not save a class whose package is not a package", async () => {
    const user = userEvent.setup();
    renderAcademy();
    const f = await openAddClass(user);
    await user.type(f.name, "Saturday Beginners");
    expect(f.save.disabled).toBe(false);

    await user.clear(f.credits);
    expect(f.save.disabled).toBe(true);
    expect(screen.getByText(/Credits and validity must be more than zero/)).toBeTruthy();

    await user.type(f.credits, "10");
    await user.clear(f.days);
    await user.type(f.days, "0");
    expect(f.save.disabled).toBe(true);
  });

  /* An academy does run free trial classes. */
  it("allows a price of zero", async () => {
    const user = userEvent.setup();
    renderAcademy();
    const f = await openAddClass(user);
    await user.type(f.name, "Free Taster");
    await user.clear(f.price);
    await user.type(f.price, "0");

    expect(f.save.disabled).toBe(false);
    await user.click(f.save);
    const [, pkg] = create.mock.calls[1] as unknown as [string, Record<string, unknown>];
    expect(pkg.standard_price).toBe(0);
  });
});

describe("editing an existing class", () => {
  it("does not ask for a package, or add a second one", async () => {
    const user = userEvent.setup();
    renderAcademy();

    /* The card's own edit button; RowActions labels it "Edit <thing>". */
    await user.click(screen.getAllByRole("button", { name: /^Edit/ })[0]);
    expect(screen.queryByLabelText("Credits")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
