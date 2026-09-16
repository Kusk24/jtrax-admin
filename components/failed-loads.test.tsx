/**
 * A failed load does not get to claim there is nothing there.
 *
 * These three cards each fetched their own list, swallowed the failure, and
 * rendered their empty state — so "the API is down" and "nobody has registered"
 * looked identical, and only one of them was a fact. The console said the
 * second one for nineteen days about the QR code before anybody noticed,
 * because a failure that looks like an empty state never gets reported.
 *
 * Each test rejects the load and asserts two things: the card says it could not
 * load, and it does *not* also say the thing it no longer knows.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const listRegistrations = vi.fn();
const listExternal = vi.fn();
const listLichessLinks = vi.fn();

vi.mock("@/lib/registration", () => ({
  listRegistrations: (...a: unknown[]) => listRegistrations(...a),
  approveRegistration: vi.fn(),
  rejectRegistration: vi.fn(),
}));
vi.mock("@/lib/chess-results", () => ({
  listExternal: (...a: unknown[]) => listExternal(...a),
  getExternal: vi.fn(),
  refreshExternal: vi.fn(),
  trackExternal: vi.fn(),
  untrackExternal: vi.fn(),
}));
vi.mock("@/lib/lichess", () => ({
  listLichessLinks: (...a: unknown[]) => listLichessLinks(...a),
  syncLichess: vi.fn(),
  unlinkStudentLichess: vi.fn(),
  ratingOf: () => null,
  PERF_ORDER: ["bullet", "blitz", "rapid", "classical", "puzzle"],
}));

import { RegistrationQueue } from "./tournament/RegistrationQueue";
import { ExternalTournaments } from "./tournament/ExternalTournaments";
import { LichessPanel } from "./lichess/LichessPanel";

function draw(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

/* A network failure, as the browser reports it. `errorText` shows an Error's
   own message when it has one, so these assert on the alert rather than on a
   particular sentence — what matters is that the card admits it failed, not
   which words it uses. */
const DOWN = () => Promise.reject(new Error("Failed to fetch"));
/* A rejection with nothing readable on it, which is what falls back to the
   console's own wording. */
const DOWN_SILENT = () => Promise.reject({});
const FAILED = en.common.loadFailed;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the public sign-ups card", () => {
  it("says it could not load, rather than that nobody has registered", async () => {
    listRegistrations.mockImplementation(DOWN);
    draw(<RegistrationQueue tournamentId="trn_x" />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    // The whole point: it must not also claim nobody has signed up.
    expect(screen.queryByText(en.registration.signupCount.replace("{count}", "0"))).toBeNull();
  });

  it("does not disappear when the load fails", async () => {
    /* `rows` is empty on failure and `[].every()` is true, so the card used to
       return null — the office saw no list at all, which is worse than an
       empty one. */
    listRegistrations.mockImplementation(DOWN);
    const { container } = draw(<RegistrationQueue tournamentId="trn_x" />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(container.textContent).toContain(en.registration.signupsTitle);
  });

  it("lists a public entry that arrived already accepted", async () => {
    /* Under the old rule this row would have been filtered out of the card
       entirely — it only ever listed the Pending ones, and nothing is Pending
       any more. A card that still filtered that way would be permanently
       empty. */
    listRegistrations.mockResolvedValue([
      {
        id: "r1", status: "Approved", source: "Public", participantName: "Mali",
        contactEmail: "mali@example.com", feeQuoted: 300,
      },
    ]);
    draw(<RegistrationQueue tournamentId="trn_x" />);
    await waitFor(() => expect(screen.getByText("Mali")).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("offers nothing to approve or reject", async () => {
    listRegistrations.mockResolvedValue([
      {
        id: "r1", status: "Approved", source: "Public", participantName: "Mali",
        contactEmail: "mali@example.com", feeQuoted: 300,
      },
    ]);
    draw(<RegistrationQueue tournamentId="trn_x" />);
    await waitFor(() => expect(screen.getByText("Mali")).toBeTruthy());
    // The card is a record now; a button here would be a decision to make.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("the external tournaments card", () => {
  it("says it could not load, rather than that there are none", async () => {
    listExternal.mockImplementation(DOWN);
    draw(<ExternalTournaments />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText(en.external.empty)).toBeNull();
  });
});

describe("the lichess panel", () => {
  it("says it could not load, rather than that nobody has linked an account", async () => {
    listLichessLinks.mockImplementation(DOWN);
    draw(<LichessPanel />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText(en.lichessAdmin.emptyTitle)).toBeNull();
  });

  it("falls back to the console's own wording when the failure says nothing", async () => {
    // Proves the fallback string is actually wired, not just that some alert
    // appears — a rejection with no message is what reaches it.
    listLichessLinks.mockImplementation(DOWN_SILENT);
    draw(<LichessPanel />);
    await waitFor(() => expect(screen.getByText(FAILED)).toBeTruthy());
  });
});
