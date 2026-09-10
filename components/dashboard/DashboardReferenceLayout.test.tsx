/**
 * The dashboard interactions taken directly from the approved reference:
 * status legends filter the roster, and class scrolling starts after row two.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { ClassDef, Student } from "@/lib/data";

const data = vi.hoisted(() => ({
  students: [] as Student[],
  todaysClasses: [] as ClassDef[],
}));

vi.mock("../DataProvider", () => ({
  useData: () => data,
}));

const { StudentStatus } = await import("./StudentStatus");
const { TodaysClasses } = await import("./TodaysClasses");

const student = (status: Student["status"], index: number): Student => ({
  id: `stu_${index}`,
  name: `Student ${index}`,
  branch: "JCA",
  className: "Beginner",
  credit: 8,
  expires: "2026-12-01",
  status,
  age: 8,
  dateOfBirth: "2018-01-01",
  level: "Beginner",
  school: "School",
  fideId: "",
  parentId: "",
  parentName: "Parent",
  parentRelation: "Guardian",
  parentPhone: "",
  parentEmail: "",
  parentLineId: "",
  joinedDate: "2026-01-01",
});

const classDef = (index: number): ClassDef => ({
  id: `ses_${index}`,
  classId: `cls_${index}`,
  category: "Beginner",
  name: `Class ${index}`,
  time: "10:00 AM – 11:00 AM",
  status: "Ongoing",
  students: [],
  more: 0,
  teacher: "Teacher",
  room: "Room 1",
  roster: [],
});

function messages(children: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  cleanup();
  data.students = [];
  data.todaysClasses = [];
});

describe("student status shortcuts", () => {
  it("links every ring legend to the matching filtered roster", () => {
    data.students = ["Normal", "Low Credit", "Expiring", "Expired", "Inactive"].map(
      (status, index) => student(status as Student["status"], index),
    );
    render(messages(<StudentStatus />));

    expect(screen.getByRole("link", { name: "Show students with status In good standing" }).getAttribute("href"))
      .toBe("/students?status=Normal");
    expect(screen.getByRole("link", { name: "Show students with status Low credit" }).getAttribute("href"))
      .toBe("/students?status=Low%20Credit");
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });
});

describe("today's compact class list", () => {
  it("does not scroll a normal two-class day", () => {
    data.todaysClasses = [classDef(1), classDef(2)];
    const { container } = render(messages(<TodaysClasses onCreateSession={vi.fn()} onViewClass={vi.fn()} />));

    const list = container.querySelector(".jt-class-list")!;
    expect(list.classList.contains("is-scrollable")).toBe(false);
    expect(list.getAttribute("tabindex")).toBeNull();
  });

  it("makes only the class list scroll when a third class is added", () => {
    data.todaysClasses = [classDef(1), classDef(2), classDef(3)];
    const { container } = render(messages(<TodaysClasses onCreateSession={vi.fn()} onViewClass={vi.fn()} />));

    const list = container.querySelector(".jt-class-list")!;
    expect(list.classList.contains("is-scrollable")).toBe(true);
    expect(list.getAttribute("tabindex")).toBe("0");
  });

  it("shows an explicit empty state when there are no classes", () => {
    render(messages(<TodaysClasses onCreateSession={vi.fn()} onViewClass={vi.fn()} />));

    expect(screen.getByText("No classes today")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create Class" })).toBeTruthy();
  });
});
