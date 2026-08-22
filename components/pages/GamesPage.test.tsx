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
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

vi.mock("../games/useLiveRooms", () => ({
  useLiveRooms: () => ({ rooms: [ROOM], loading: false, error: "", reload: vi.fn() }),
  useLiveRoom: () => ({
    detail: { room: ROOM, moves: [{ san: "e4", uci: "e2e4" }, { san: "e5", uci: "e7e5" }] },
    connection: "live",
    reload: vi.fn(),
  }),
}));

const { GamesPage } = await import("./GamesPage");

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
