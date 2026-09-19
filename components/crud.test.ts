/**
 * `toPayload`'s blank-field rule, in isolation from any one form.
 *
 * The bug this guards: clearing a package's Validity to blank and saving
 * used to keep the old number, because a blank optional field was left out
 * of the PATCH entirely — and "left out" means "unchanged" to the backend's
 * generic update handler, not "clear this". The office had no way to make a
 * package never expire again short of deleting it and starting over.
 */
import { describe, expect, it } from "vitest";
import { toPayload, type CrudField } from "./crud";

const FIELDS: CrudField[] = [
  { name: "class_id", label: "Course", required: true },
  { name: "validity_days", label: "Validity", kind: "number" },
  { name: "active", label: "Active", kind: "checkbox" },
];

describe("a blank optional field", () => {
  it("is left out entirely when creating — nothing to clear yet", () => {
    const body = toPayload(FIELDS, { class_id: "cls_1", validity_days: "", active: false }, false);
    expect("validity_days" in body).toBe(false);
  });

  it("is sent as null when editing — the value that actually clears a column", () => {
    const body = toPayload(FIELDS, { class_id: "cls_1", validity_days: "", active: false }, true);
    expect(body.validity_days).toBeNull();
  });

  /* The reported bug, stated directly: a package that had 90 days, edited
     down to blank, must not still send 90 — or send nothing at all. */
  it("overwrites a value the row already had, rather than leaving it alone", () => {
    const body = toPayload(FIELDS, { class_id: "cls_1", validity_days: "", active: false }, true);
    expect(body.validity_days).not.toBe(90);
    expect("validity_days" in body).toBe(true);
  });
});

describe("a required blank field", () => {
  it("sends an empty string regardless of create or edit — a defensive fallback, not the primary gate", () => {
    expect(toPayload(FIELDS, { class_id: "", validity_days: "5", active: false }, false).class_id).toBe("");
    expect(toPayload(FIELDS, { class_id: "", validity_days: "5", active: false }, true).class_id).toBe("");
  });
});

describe("a filled field", () => {
  it("sends the parsed value the same way whether creating or editing", () => {
    const values = { class_id: "cls_1", validity_days: "60", active: true };
    expect(toPayload(FIELDS, values, false).validity_days).toBe(60);
    expect(toPayload(FIELDS, values, true).validity_days).toBe(60);
  });

  it("sends a checkbox as a real boolean, never omitted, blank or not", () => {
    expect(toPayload(FIELDS, { class_id: "cls_1", validity_days: "", active: false }, true).active).toBe(false);
    expect(toPayload(FIELDS, { class_id: "cls_1", validity_days: "", active: true }, false).active).toBe(true);
  });
});
