/**
 * A game opens as a page, not a side panel.
 *
 * The detail was a 460px Drawer, on the theory that staff watch a board while
 * doing something else. In practice it is the thing they came to look at, and
 * a board, two players and a move list do not fit in a column that narrow —
 * the board came out small and the moves were a scrollbar inside a scrollbar.
 * It behaves like a student's detail now: the list gives way to it, and a
 * Back link returns.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const ROOM = {
  gameRoomId: "gr_1",
  code: "4821",
  status: "Active" as const,
  label: "Lesson board",
  white: { displayName: "Anong Sri" },
  black: { displayName: "Boon Mek" },
  moveCount: 4,
  result: null,
  fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  startedAt: "2026-08-23T09:00:00Z",
  lichessRated: false,
};

/* A game that has finished. Delete is refused on a board two people are
   playing, so the two fixtures are not interchangeable. */
const FINISHED = { ...ROOM, status: "Finished" as const, result: "1-0" };

/* Which room the hooks are serving. Set per test rather than per file: the
   controls on offer differ by status, which is the point. */
const state = { room: ROOM as typeof ROOM | typeof FINISHED };

const deleteRoom = vi.fn(async () => ({ status: "deleted" }));
vi.mock("@/lib/games", async (real) => ({ ...(await real()), deleteRoom }));

vi.mock("../games/useLiveRooms", () => ({
  useLiveRooms: () => ({ rooms: [state.room], loading: false, error: "", reload: vi.fn() }),
  useLiveRoom: () => ({
    detail: { room: state.room, moves: [{ san: "e4", uci: "e2e4" }, { san: "e5", uci: "e7e5" }] },
    connection: "live",
    reload: vi.fn(),
  }),
}));

const { GamesPage } = await import("./GamesPage");

beforeEach(() => {
  state.room = ROOM;
  deleteRoom.mockClear();
});

function renderGames() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GamesPage />
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

/** Opens the one room in the list. */
async function openGame(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText(/Anong Sri/));
}

describe("opening a game", () => {
  it("gives it the page", async () => {
    const user = renderGames();
    await openGame(user);

    expect(screen.getByRole("button", { name: /Back to Games/ })).toBeDefined();
  });

  /* The list is replaced rather than covered — that is the difference between
     a page and a panel, and the reason the board gets the width. */
  it("puts the list away while it is open", async () => {
    const user = renderGames();
    expect(screen.getByLabelText("Search players, code or label")).toBeDefined();

    await openGame(user);
    expect(screen.queryByLabelText("Search players, code or label")).toBeNull();
  });

  it("shows the moves that have been played", async () => {
    const user = renderGames();
    await openGame(user);

    expect(screen.getByText("e4")).toBeDefined();
    expect(screen.getByText("e5")).toBeDefined();
  });

  it("names both players", async () => {
    const user = renderGames();
    await openGame(user);

    expect(screen.getAllByText(/Anong Sri/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Boon Mek/).length).toBeGreaterThan(0);
  });

  it("comes back to the list", async () => {
    const user = renderGames();
    await openGame(user);
    await user.click(screen.getByRole("button", { name: /Back to Games/ }));

    expect(screen.getByLabelText("Search players, code or label")).toBeDefined();
  });
});

describe("deleting a game", () => {
  it("is offered on a game that is not being played", async () => {
    state.room = FINISHED;
    const user = renderGames();
    await openGame(user);

    expect(screen.getByRole("button", { name: /Delete/ })).toBeDefined();
  });

  it("asks first, and says what goes with it", async () => {
    state.room = FINISHED;
    const user = renderGames();
    await openGame(user);
    await user.click(screen.getByRole("button", { name: /Delete/ }));

    expect(screen.getByText(/2 moves played in this game go with it/)).toBeDefined();
    expect(deleteRoom).not.toHaveBeenCalled();
  });

  it("deletes on confirming, and leaves the page it was on", async () => {
    state.room = FINISHED;
    const user = renderGames();
    await openGame(user);
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    /* Scoped to the dialog: the page's own Delete button is still behind it. */
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(deleteRoom).toHaveBeenCalledWith("gr_1");
    /* The detail cannot stay open on a room that no longer exists. */
    expect(await screen.findByLabelText("Search players, code or label")).toBeDefined();
  });
});

describe("exporting the moves", () => {
  it("is offered where there are moves to export", async () => {
    const user = renderGames();
    await openGame(user);

    expect(screen.getByRole("button", { name: /Export PGN/ })).toBeDefined();
  });
});

/* Stopping a live board is reversible; throwing it away is not, and the two
   players are mid-move. The backend refuses it too. */
describe("a game being played", () => {
  it("offers Stop rather than Delete", async () => {
    const user = renderGames();
    await openGame(user);

    expect(screen.getByRole("button", { name: /Stop this game/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Delete/ })).toBeNull();
  });
});
