/**
 * One participant profile, from either tab: the entry and its chess-results
 * row, joined in one place.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { LinkedResults, ResultSections } from "@/lib/chess-results";
import type { Participant } from "@/lib/data";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    students: [{ id: "s1", name: "Nikolaus Stancec", parentName: "Elena Stancec", parentPhone: "+66 81 234 5678" }],
    update: vi.fn(),
    refresh: vi.fn(),
  }),
}));
vi.mock("@/lib/api", () => ({ api: { get: vi.fn(async () => ({})), post: vi.fn(), del: vi.fn() } }));

const SECTIONS: ResultSections = {
  connected: true,
  rounds: 4,
  sections: [{ chessResultsId: 12, name: "U14 + G14", position: 0, url: "", players: 3, academyPlayers: 1, tracked: true }],
};
const U14: LinkedResults = {
  source: "chess-results",
  url: "",
  chessResultsId: 12,
  standings: [
    { rank: 3, name: "Stancec, Nikolaus", rating: 2460, points: 1.5, club: "Wellington", studentId: "s1" },
    { rank: 5, name: "Ernst, Roman", rating: 2210, points: 0.5, club: "Harrow Bangkok" },
    { rank: 6, name: "Srisuk, Kittipong", points: 0 },
  ],
  rounds: [
    { round: 1, played: true, pairings: [{ board: 1, white: "Stancec, Nikolaus", black: "Karasevych, Andrii", result: "1 - 0" }, { board: 2, white: "Ernst, Roman", black: "Srisuk, Kittipong", result: "1 - 0" }] },
    { round: 2, played: true, pairings: [{ board: 1, white: "Leisch, Lukas", black: "Stancec, Nikolaus", result: "½ - ½" }] },
    { round: 3, played: false, pairings: [{ board: 1, white: "Stancec, Nikolaus", black: "Ernst, Roman" }] },
  ],
};

vi.mock("@/lib/chess-results", async (actual) => ({
  ...(await actual<typeof import("@/lib/chess-results")>()),
  getResultSections: async () => SECTIONS,
  getResultSection: async () => U14,
}));

const { ParticipantProfile } = await import("./ParticipantProfile");

const entry = (p: Partial<Participant>) =>
  ({ category: "U14", rating: 0, age: 12, paymentStatus: "Pending", feeCharged: 500, contact: "—", ...p }) as Participant;

const PEOPLE: Participant[] = [
  entry({ id: "r1", name: "Nikolaus Stancec", studentId: "s1" }),
  entry({ id: "r2", name: "Kitipong Srisuk", contactPhone: "089 111 2222", contactEmail: "srisuk@example.com" }),
];

function open(target: { participantId: string } | { sectionId: number; name: string }, onLink = vi.fn(async () => undefined)) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ParticipantProfile tournamentId="t1" participants={PEOPLE} target={target} onLink={onLink} onClose={() => undefined} />
    </NextIntlClientProvider>,
  );
  return onLink;
}

beforeEach(() => push.mockReset());

describe("the same participant from either tab", () => {
  it("shows their results from the Participants tab", async () => {
    open({ participantId: "r1" });
    await waitFor(() => expect(screen.getByText("1½")).toBeDefined());
    expect(screen.getByText("1–1–0")).toBeDefined();
    expect(screen.getByText("#3")).toBeDefined();
    expect(screen.getByText("Board 1 · Black")).toBeDefined();
  });

  it("shows their entry from the Results tab", async () => {
    open({ sectionId: 12, name: "Stancec, Nikolaus" });
    await waitFor(() => expect(screen.getByText("1½")).toBeDefined());
    expect(screen.getByText(en.participantProfile.registrationTitle)).toBeDefined();
    expect(screen.getByRole("dialog", { name: "Nikolaus Stancec" })).toBeDefined();
  });

  it("goes to a JCA student's own page, and shows who to ring", async () => {
    open({ participantId: "r1" });
    expect(await screen.findByText(en.participantProfile.jcaStudent)).toBeDefined();
    expect(screen.getByText("Elena Stancec")).toBeDefined();
    expect(screen.getByText("+66 81 234 5678")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(en.participantProfile.openStudent) }));
    expect(push).toHaveBeenCalledWith("/students?id=s1");
  });

  /* A player from another school: their results, and no label saying what
     they are not. */
  it("shows only results for a player who is nobody's entry", async () => {
    open({ sectionId: 12, name: "Ernst, Roman" });
    await waitFor(() => expect(screen.getByText("#5")).toBeDefined());
    expect(screen.queryByText(en.participantProfile.jcaStudent)).toBeNull();
    expect(screen.queryByText(en.participantProfile.registrationTitle)).toBeNull();
    expect(screen.queryByText(en.participantProfile.contactTitle)).toBeNull();
  });
});

describe("a name spelled differently on chess-results", () => {
  it("keeps the contact and entry, and lets staff pick the player", async () => {
    const onLink = open({ participantId: "r2" });
    expect(await screen.findByText(en.participantProfile.notFound)).toBeDefined();
    expect(screen.getByText("089 111 2222")).toBeDefined();
    expect(screen.getByText("srisuk@example.com")).toBeDefined();
    // Typed, not scrolled for: part of a name is enough, in either order.
    const search = screen.getByRole("textbox", { name: en.participantProfile.pickHint });
    fireEvent.change(search, { target: { value: "stancec" } });
    // Nikolaus is already somebody's; he is not offered.
    expect(screen.getByText(/No player on Chess-Results matches/)).toBeDefined();
    fireEvent.change(search, { target: { value: "kitti srisuk" } });
    fireEvent.click(screen.getByRole("option", { name: /Srisuk, Kittipong/ }));
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${en.participantProfile.link}$`) }));
    await waitFor(() => expect(onLink).toHaveBeenCalledWith("r2", { sectionId: 12, name: "Srisuk, Kittipong" }));
  });
});
