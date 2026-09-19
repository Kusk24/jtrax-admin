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
    /* Stored with the rook and a badge nobody would derive: the old code drew
       a queen for any Group class and showed "Group" in the badge field, so a
       fixture that agreed with the guess would pass either way. */
    classes: [
      { class_id: "cls_group", name: "Group Class", class_type: "Group", icon: "rook", badge: "Weekend" },
    ],
    creditPackages: [
      { credit_package_id: "pkg_1", class_id: "cls_group", credit_amount: 20, standard_price: 12000, validity_days: 90 },
      /* No validity_days at all — what the API sends back for a package the
         office deliberately left blank, not the same fixture shape as a
         package nobody has touched yet. */
      { credit_package_id: "pkg_forever", class_id: "cls_group", credit_amount: 10, standard_price: 5000 },
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
  it("asks for the first package, prefilled with the commonest terms — validity left blank, never expires", async () => {
    const user = userEvent.setup();
    renderAcademy();
    const f = await openAddClass(user);

    expect(f.credits.value).toBe("20");
    expect(f.price.value).toBe("12000");
    expect(f.days.value).toBe("");
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
    await user.type(f.days, "60");
    await user.click(f.save);

    expect(batch).toHaveBeenCalledTimes(1);
    const paths = create.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(["classes", "credit-packages"]);

    const [, pkg] = create.mock.calls[1] as unknown as [string, Record<string, unknown>];
    /* Priced against the class that was just written, not a name typed twice. */
    expect(pkg.class_id).toBe("cls_new");
    expect(pkg.credit_amount).toBe(10);
    expect(pkg.standard_price).toBe(6000);
    expect(pkg.validity_days).toBe(60);
  });

  /* The default since the office asked for it: a course's first package
     starts as never-expiring rather than the old fixed 90 days, and stays
     that way if nobody types over the blank field. */
  it("leaves validity out of the request when it is left blank", async () => {
    const user = userEvent.setup();
    renderAcademy();
    const f = await openAddClass(user);

    await user.type(f.name, "Saturday Beginners");
    await user.click(f.save);

    const [, pkg] = create.mock.calls[1] as unknown as [string, Record<string, unknown>];
    expect(pkg.validity_days).toBeUndefined();
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
    expect(screen.getByText(/Credits must be more than zero/)).toBeTruthy();

    await user.type(f.credits, "10");
    expect(f.save.disabled).toBe(false);
  });

  /* 0 is not the same failure zero credits is: it is the same answer as
     leaving the field blank, so it must not block the save the way it used
     to when validity was required. */
  it("still saves with validity typed as exactly 0", async () => {
    const user = userEvent.setup();
    renderAcademy();
    const f = await openAddClass(user);
    await user.type(f.name, "Saturday Beginners");
    await user.clear(f.days);
    await user.type(f.days, "0");

    expect(f.save.disabled).toBe(false);
    await user.click(f.save);
    const [, pkg] = create.mock.calls[1] as unknown as [string, Record<string, unknown>];
    expect(pkg.validity_days).toBe(0);
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

/**
 * The icon and the badge actually reaching the backend.
 *
 * Reported: changing either one in Academy does nothing — the card goes on
 * showing what it showed. Two separate faults, and the fix needs both halves.
 * `lib/class-face.test.ts` covers the reading rule; this covers the writing,
 * which is where the report came from: the form has always collected both and
 * the save has never sent either.
 */
describe("saving a class", () => {
  /* The picker set state that the next render threw away, and Save posted a
     body with neither field in it. */
  it("sends the icon that was picked", async () => {
    const user = userEvent.setup();
    renderAcademy();

    await user.click(screen.getAllByRole("button", { name: /^Edit/ })[0]);
    await user.click(screen.getByRole("button", { name: "rook" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [path, id, patch] = update.mock.calls[0] as unknown as [string, string, Record<string, unknown>];
    expect([path, id]).toEqual(["classes", "cls_group"]);
    expect(patch.icon).toBe("rook");
  });

  it("sends the badge that was typed", async () => {
    const user = userEvent.setup();
    renderAcademy();

    await user.click(screen.getAllByRole("button", { name: /^Edit/ })[0]);
    const badge = screen.getByLabelText("Badge") as HTMLInputElement;
    /* Opens on the stored badge. It used to be class_type wearing a different
       label, so the field read "Group" back however it had been filled in. */
    expect(badge.value).toBe("Weekend");

    await user.clear(badge);
    await user.type(badge, "Juniors");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [, , patch] = update.mock.calls[0] as unknown as [string, string, Record<string, unknown>];
    expect(patch.badge).toBe("Juniors");
  });

  it("sends both on a new class too", async () => {
    const user = userEvent.setup();
    renderAcademy();
    const f = await openAddClass(user);

    await user.type(f.name, "Endgame Lab");
    await user.type(screen.getByLabelText("Badge"), "Exam prep");
    await user.click(screen.getByRole("button", { name: "bishop" }));
    await user.click(f.save);

    const [, cls] = create.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(cls.icon).toBe("bishop");
    expect(cls.badge).toBe("Exam prep");
  });

  /* Renaming must not reset the face to whatever the type would guess. */
  it("keeps the stored icon when only the name changes", async () => {
    const user = userEvent.setup();
    renderAcademy();

    await user.click(screen.getAllByRole("button", { name: /^Edit/ })[0]);
    const name = screen.getByLabelText("Course Name") as HTMLInputElement;
    await user.clear(name);
    await user.type(name, "Group Class II");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [, , patch] = update.mock.calls[0] as unknown as [string, string, Record<string, unknown>];
    expect(patch.icon).toBe("rook");
    expect(patch.badge).toBe("Weekend");
  });
});

/**
 * The class type — the field the screen called "Category".
 *
 * `class.class_type` has been NOT NULL with a three-value CHECK since the
 * first migration, and this form never asked for it. Its draft seeded the
 * field with "Beginner", a *level* rather than one of the three, so the guard
 * on save fell through to "Group" every time — and the edit path never sent
 * the column at all. Every class the academy has is a Group class, and there
 * was no screen anywhere that could say otherwise.
 */
describe("the class type", () => {
  it("can be chosen when a class is created", async () => {
    const user = userEvent.setup();
    renderAcademy();
    const f = await openAddClass(user);

    await user.type(f.name, "One to one");
    await user.selectOptions(screen.getByLabelText("Course Type"), "Private");
    await user.click(f.save);

    const [, cls] = create.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(cls.class_type).toBe("Private");
  });

  it("can be changed afterwards", async () => {
    const user = userEvent.setup();
    renderAcademy();

    await user.click(screen.getAllByRole("button", { name: /^Edit/ })[0]);
    await user.selectOptions(screen.getByLabelText("Course Type"), "Master");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [, , patch] = update.mock.calls[0] as unknown as [string, string, Record<string, unknown>];
    expect(patch.class_type).toBe("Master");
  });

  it("opens on the class's own type, not a default", async () => {
    const user = userEvent.setup();
    renderAcademy();

    await user.click(screen.getAllByRole("button", { name: /^Edit/ })[0]);
    expect((screen.getByLabelText("Course Type") as HTMLSelectElement).value).toBe("Group");
  });

  /* "Beginner" was the old draft's starting value. It is a level, and offering
     it here is how a class ends up typed as something the column cannot hold. */
  it("offers only the three the column allows", async () => {
    const user = userEvent.setup();
    renderAcademy();
    await openAddClass(user);

    const options = Array.from((screen.getByLabelText("Course Type") as HTMLSelectElement).options);
    expect(options.map((o) => o.value)).toEqual(["Private", "Group", "Master"]);
  });
});

/**
 * A package's validity is optional — a founding rate, a free trial, anything
 * the office never wants to expire has nothing truthful to put in the field.
 */
describe("a package's validity", () => {
  it("reads a package with none as never expiring, not as zero days", () => {
    renderAcademy();
    expect(screen.getByText("Never expires")).toBeTruthy();
  });

  it("can be saved blank", async () => {
    const user = userEvent.setup();
    renderAcademy();

    await user.click(screen.getByRole("button", { name: "Add Package" }));
    /* Required fields carry a trailing "*" in their accessible name here —
       this form is the one place in the screen built from CrudFormModal's
       generic field renderer, so it is the one place that shows. */
    await user.selectOptions(screen.getByLabelText(/^Course/), "cls_group");
    await user.type(screen.getByLabelText(/^Credits/), "5");
    await user.type(screen.getByLabelText(/^Price/), "3000");
    /* Validity is left untouched — the point of the test. */
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(create).toHaveBeenCalledTimes(1);
    const [path, body] = create.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(path).toBe("credit-packages");
    /* Not sent at all, the same as every other optional field left blank —
       sending "" would make the server reject a number field, and sending 0
       would claim the office typed an answer it did not. */
    expect(body.validity_days).toBeUndefined();
  });

  /* Reopening a package that has no validity must show the field blank
     again, not "0" — otherwise the office's blank choice does not survive a
     round trip through Edit, and Save-without-changing would quietly turn
     "never answered" into "answered 0". */
  it("reopens blank rather than showing 0", async () => {
    const user = userEvent.setup();
    renderAcademy();

    await user.click(screen.getByRole("button", { name: "Edit the 10-credit package for Group Class" }));
    expect((screen.getByLabelText("Validity (days)") as HTMLInputElement).value).toBe("");
  });

  it("still shows the days on a package that has them", () => {
    renderAcademy();
    expect(screen.getByText("90 days")).toBeTruthy();
  });

  /**
   * The reported bug: editing a package with a real validity, clearing the
   * field to blank and saving used to keep the old 90 — the key was simply
   * left off the PATCH, and "left off" means "unchanged" to a PATCH, not
   * "clear this". This is the fix, exercised through the real form rather
   * than through `toPayload` directly.
   */
  it("clears a package's validity when the field is blanked and saved", async () => {
    const user = userEvent.setup();
    renderAcademy();

    /* pkg_1: 20 credits, 90 days — the fixture with something to clear. */
    await user.click(screen.getByRole("button", { name: "Edit the 20-credit package for Group Class" }));
    const field = screen.getByLabelText("Validity (days)") as HTMLInputElement;
    expect(field.value).toBe("90");

    await user.clear(field);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(update).toHaveBeenCalledTimes(1);
    const [path, id, body] = update.mock.calls[0] as unknown as [string, string, Record<string, unknown>];
    expect(path).toBe("credit-packages");
    expect(id).toBe("pkg_1");
    /* Sent explicitly, not left out — an absent key would reach the
       backend's generic PATCH handler as "do not touch this column" and the
       old 90 would survive exactly as the user reported. */
    expect(body.validity_days).toBeNull();
  });
});
