/**
 * Result tabs are the Chess-Results categories, not the registration ones.
 *
 * Once a tournament is connected with one link, chess-results.com is the
 * source of truth for results: the tabs are the sections the arbiter
 * published, even when there are more of them than the office registered.
 * The registration categories are shown beside them, named as such, and
 * neither list is copied into the other.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Participant } from "@/lib/data";
import en from "@/messages/en.json";
import type { LinkedResults, ResultSections } from "@/lib/chess-results";
import { starred } from "@/lib/starred-label";

vi.mock("@/components/DataProvider", () => ({ useData: () => ({ students: [] }) }));

/* The arbiter ran five sections; the office registered four. */
const CONNECTED: ResultSections = {
  connected: true,
  eventName: "WCIB CHESS CHAMPIONSHIP 2025",
  rounds: 7,
  sections: ["U8", "U10", "U12", "U14 + G14", "U16"].map((name, i) => ({
    chessResultsId: 1193901 + i,
    name,
    position: i,
    url: `https://chess-results.com/tnr${1193901 + i}.aspx?lan=1`,
    players: 4,
    academyPlayers: 0,
    tracked: true,
  })),
};

/* One section holding two groups, sharing a pairing pool. */
const U14: LinkedResults = {
  source: "chess-results",
  url: "https://chess-results.com/tnr1193904.aspx?lan=1",
  chessResultsId: 1193904,
  stage: "Rank after Round 2",
  standings: [
    { rank: 1, name: "Uapongkitikul, Pavatt", points: 2, type: "U14", club: "EIS", studentId: "stu_p", studentName: "Pavatt" },
    { rank: 2, name: "Udomjitpithaya, Kritthad", points: 1, type: "U14", club: "Wellington" },
    { rank: 3, name: "Manasompong, Napak", points: 1, type: "G14", club: "St. Andrews, 71" },
    { rank: 4, name: "Seng, Rosslyn", points: 0, type: "G14", club: "Wellington" },
  ],
  rounds: [
    {
      round: 1,
      played: true,
      pairings: [
        { board: 1, white: "Seng, Rosslyn", black: "Uapongkitikul, Pavatt", result: "0 - 1", blackStudentId: "stu_p" },
        { board: 2, white: "Udomjitpithaya, Kritthad", black: "Manasompong, Napak", result: "1 - 0" },
      ],
    },
  ],
};

const getSections = vi.fn(async (_t: string): Promise<ResultSections> => CONNECTED);
const getSection = vi.fn(async (_t: string, _id: number): Promise<LinkedResults | null> => U14);
const connect = vi.fn(async (_t: string, _url: string): Promise<ResultSections> => CONNECTED);

vi.mock("@/lib/chess-results", async (actual) => ({
  ...(await actual<typeof import("@/lib/chess-results")>()),
  getResultSections: (t: string) => getSections(t),
  getResultSection: (t: string, id: number) => getSection(t, id),
  connectResults: (t: string, url: string) => connect(t, url),
}));

const { ResultsTab } = await import("./ResultsTab");

const REGISTRATION = [
  { id: "c1", name: "U8" },
  { id: "c2", name: "U10" },
  { id: "c3", name: "U12" },
  { id: "c4", name: "U14" },
];

/* Pavatt is entered as a JCA student; Kritthad entered from outside JCA. */
const PARTICIPANTS = [
  { id: "treg_p", name: "Pavatt Uapongkitikul", studentId: "stu_p" },
  { id: "treg_k", name: "Kritthad Udomjitpithaya" },
] as unknown as Participant[];

function renderTab(participants: Participant[] = PARTICIPANTS) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ResultsTab
        tournamentId="t1"
        tournamentName="WCIB Chess Championship 2025"
        categories={REGISTRATION}
        totalRounds={5}
        resultsPublic
        onPublishChange={async () => undefined}
        participants={participants}
      />
    </NextIntlClientProvider>,
  );
}

const tabs = () => screen.getByRole("tablist");
const ranked = () => within(screen.getByRole("region", { name: en.common.tableRegion }));
const standingsHeader = () => screen.findByRole("button", { name: new RegExp(en.resultsLink.standingsTitle) });
/** The standings start folded; open them to read the rows. */
async function openStandings() {
  fireEvent.click(await standingsHeader());
}

beforeEach(() => {
  getSections.mockReset().mockImplementation(async () => CONNECTED);
  getSection.mockReset().mockImplementation(async () => U14);
  connect.mockReset().mockImplementation(async () => CONNECTED);
});

describe("results tabs", () => {
  it("are the Chess-Results categories, all five of them, not the four registered", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByRole("tablist")).toBeTruthy());
    expect(within(tabs()).getAllByRole("tab").map((b) => b.textContent)).toEqual(["U8", "U10", "U12", "U14 + G14", "U16"]);
  });

  it("do not copy the registration categories into the tabs", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByRole("tablist")).toBeTruthy());
    // No tab for a registration-only name, and no tab twice.
    const names = within(tabs()).getAllByRole("tab").map((b) => b.textContent);
    expect(names).not.toContain("U14");
    expect(new Set(names).size).toBe(names.length);
  });

  /* The two lists side by side are a check for the moment a link is pasted,
     not something to read every time the tab opens. */
  it("do not show the category check once connected", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByRole("tablist")).toBeTruthy());
    expect(screen.queryByText(en.resultsLink.checkTitle)).toBeNull();
    expect(screen.queryByText(en.resultsLink.registrationCategories)).toBeNull();
  });

  it("read each category's own results", async () => {
    renderTab();
    await waitFor(() => expect(getSection).toHaveBeenCalledWith("t1", 1193901));
    fireEvent.click(within(tabs()).getByRole("tab", { name: "U16" }));
    await waitFor(() => expect(getSection).toHaveBeenCalledWith("t1", 1193905));
  });

  it("offer a chip per group when a category holds two, and filter by it", async () => {
    renderTab();
    await openStandings();
    await waitFor(() => expect(ranked().getByText("Manasompong, Napak")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "U14" }));
    await waitFor(() => expect(ranked().queryByText("Manasompong, Napak")).toBeNull());
    expect(ranked().getByText("Uapongkitikul, Pavatt")).toBeTruthy();
  });

  /* JCA is the participant's link, not the server matching a name: with
     nobody entered as a JCA student, the server's own guess counts for
     nothing. */
  it("count only players linked to a JCA participant as JCA", async () => {
    /* Each player in one category only, as in a real event: a name found in
       two categories is never linked to a participant. */
    getSection.mockImplementation(async (_t: string, id: number) => (id === 1193901 ? U14 : null));
    renderTab([]);
    await openStandings();
    await waitFor(() => expect(ranked().getByText("Uapongkitikul, Pavatt")).toBeTruthy());
    fireEvent.click(screen.getByLabelText(starred(en.resultsLink.jcaOnly)));
    await waitFor(() => expect(ranked().queryByText("Uapongkitikul, Pavatt")).toBeNull());
  });

  it("narrow to JCA students on request", async () => {
    /* Each player in one category only, as in a real event: a name found in
       two categories is never linked to a participant. */
    getSection.mockImplementation(async (_t: string, id: number) => (id === 1193901 ? U14 : null));
    renderTab();
    await openStandings();
    await waitFor(() => expect(ranked().getByText("Seng, Rosslyn")).toBeTruthy());
    fireEvent.click(screen.getByLabelText(starred(en.resultsLink.jcaOnly)));
    await waitFor(() => expect(ranked().queryByText("Seng, Rosslyn")).toBeNull());
    /* Entered as a JCA student, so in; entered from outside JCA, so out. */
    await waitFor(() => expect(ranked().getByText("Uapongkitikul, Pavatt")).toBeTruthy());
    expect(ranked().queryByText("Udomjitpithaya, Kritthad")).toBeNull();
  });

  it("start with the standings folded, and open and close them like a round", async () => {
    renderTab();
    const header = await standingsHeader();
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("region", { name: en.common.tableRegion })).toBeNull();
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(ranked().getByText("Seng, Rosslyn")).toBeTruthy();
    fireEvent.click(header);
    expect(screen.queryByRole("region", { name: en.common.tableRegion })).toBeNull();
  });

  it("no longer show the 'what the public sees' preview", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByRole("tablist")).toBeTruthy());
    expect(screen.queryByText(en.external.previewTitle)).toBeNull();
  });
});

describe("connecting", () => {
  it("asks for one link when not connected, and shows the arbiter's categories after", async () => {
    getSections.mockImplementation(async () => ({ connected: false, sections: [] }));
    renderTab();
    const input = await screen.findByLabelText(starred(en.resultsLink.urlLabel));
    expect(screen.queryByRole("tablist")).toBeNull();
    fireEvent.change(input, { target: { value: "https://s2.chess-results.com/tnr1193905.aspx?lan=1&art=2&rd=7" } });
    fireEvent.click(screen.getByRole("button", { name: en.resultsLink.connect }));
    await waitFor(() => expect(connect).toHaveBeenCalledWith("t1", "https://s2.chess-results.com/tnr1193905.aspx?lan=1&art=2&rd=7"));
    await waitFor(() => expect(within(tabs()).getAllByRole("tab")).toHaveLength(5));
    // Just connected: both lists, apart and named, until the admin confirms.
    expect(screen.getByText(en.resultsLink.checkTitle)).toBeTruthy();
    expect(screen.getByText(en.resultsLink.registrationCategories)).toBeTruthy();
    expect(screen.getByText(en.resultsLink.resultsCategories, { selector: "p" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(en.resultsLink.checkConfirm) }));
    expect(screen.queryByText(en.resultsLink.checkTitle)).toBeNull();
    expect(screen.queryByText(en.resultsLink.registrationCategories)).toBeNull();
  });
});

describe("the public results link", () => {
  it("is always there to copy and open, under the Chess-Results link, with Publish beside it", async () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.example/";
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ResultsTab tournamentId="t1" tournamentName="E" categories={REGISTRATION} totalRounds={5} resultsPublic={false} onPublishChange={async () => undefined} />
      </NextIntlClientProvider>,
    );
    const link = (await screen.findByRole("textbox", { name: en.results.publicLinkTitle })) as HTMLInputElement;
    expect(link.value).toBe("https://portal.example/t/t1");
    // The arbiter's link sits above ours, each with its own Copy and Open.
    const source = screen.getByRole("textbox", { name: en.results.sourceLinkTitle }) as HTMLInputElement;
    expect(source.value).toBe(CONNECTED.sections[0].url);
    expect(screen.getAllByRole("button", { name: en.results.copyShort })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: en.results.openPage }).map((a) => a.getAttribute("href"))).toEqual([
      CONNECTED.sections[0].url,
      "https://portal.example/t/t1",
    ]);
    expect(screen.getByRole("button", { name: en.results.publish })).toBeTruthy();
    expect(screen.getByText(en.results.notPublishedNote)).toBeTruthy();
    delete process.env.NEXT_PUBLIC_PORTAL_URL;
  });
});
