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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  turn: "Black" as const,
  /* Today: the page opens on today's games. */
  startedAt: new Date().toISOString(),
  lichessRated: false,
};

/* A game that has finished. Delete is refused on a board two people are
   playing, so the two fixtures are not interchangeable. */
const FINISHED = { ...ROOM, status: "Finished" as const, result: "1-0" };

/* Which rooms the hooks are serving. Set per test rather than per file: the
   controls on offer differ by status, which is the point. `rooms` is the
   Games table, in its order; unset, it is just `room`. */
type Room = typeof ROOM | typeof FINISHED;
const state = { room: ROOM as Room, rooms: null as Room[] | null };
const listed = () => state.rooms ?? [state.room];

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/games",
}));

/* Every stream the detail opens, and whether it has been closed. */
const streams: { id: string; closed: boolean }[] = [];

const deleteRoom = vi.fn(async () => ({ status: "deleted" }));
const openRoom = vi.fn(async (_label: string, opts: Record<string, unknown>) => ({
  ...ROOM,
  gameRoomId: "gr_new",
  code: "K7P2QX",
  white: { displayName: "Anong Sri" },
  black: { displayName: "Chai Dee" },
  opts,
}));
const stopRoom = vi.fn(async () => ({ status: "stopped" }));
const resumeRoom = vi.fn(async () => ({ status: "resumed" }));
const cancelRoom = vi.fn(async () => ({ status: "cancelled" }));
vi.mock("@/lib/games", async (real) => ({ ...(await real()), deleteRoom, openRoom, stopRoom, resumeRoom, cancelRoom }));

vi.mock("../games/useLiveRooms", async () => {
  const { useEffect } = await import("react");
  return {
    BOARDS_POLL_MS: 2000,
    useLiveRooms: () => ({ rooms: listed(), loading: false, error: "", reload: vi.fn() }),
    useLiveRoom: (id: string) => {
      useEffect(() => {
        const stream = { id, closed: false };
        streams.push(stream);
        return () => {
          stream.closed = true;
        };
      }, [id]);
      const room = listed().find((r) => r.gameRoomId === id) ?? state.room;
      return {
        detail: { room, moves: [{ san: "e4", uci: "e2e4" }, { san: "e5", uci: "e7e5" }] },
        connection: "live",
        reload: vi.fn(),
      };
    },
  };
});

/* The student and class filters read the roster. Anong and Boon are in
   Beginner; Chai is in Intermediate. */
vi.mock("@/components/DataProvider", () => ({
  useData: () => ({
    students: [
      { id: "stu_anong", name: "Anong Sri", accountId: "usr_anong", className: "Beginner" },
      { id: "stu_boon", name: "Boon Mek", accountId: "usr_boon", className: "Beginner" },
      { id: "stu_chai", name: "Chai Dee", accountId: "usr_chai", className: "Intermediate" },
    ],
    raw: {
      classes: [
        { class_id: "beg", name: "Beginner" },
        { class_id: "int", name: "Intermediate" },
      ],
      enrollments: [
        { student_id: "stu_anong", class_id: "beg", status: "Active" },
        { student_id: "stu_boon", class_id: "beg", status: "Active" },
        { student_id: "stu_chai", class_id: "int", status: "Active" },
      ],
    },
  }),
}));

const { GamesPage } = await import("./GamesPage");
const { ErrorToastProvider } = await import("../ErrorToast");

beforeEach(() => {
  state.room = ROOM;
  state.rooms = null;
  streams.length = 0;
  deleteRoom.mockClear();
  openRoom.mockClear();
  stopRoom.mockClear();
  resumeRoom.mockClear();
  cancelRoom.mockClear();
  router.push.mockClear();
  router.replace.mockClear();
});

function renderGames(detailId?: string) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ErrorToastProvider>
        <GamesPage detailId={detailId} />
      </ErrorToastProvider>
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

/** Opens the one room — its board, in the grid the page opens on. */
async function openGame(user: ReturnType<typeof userEvent.setup>) {
  /* From the list: the grid is for watching, and does not open a game. */
  await user.click(screen.getByRole("button", { name: "List view" }));
  await user.click(within(screen.getByRole("region", { name: /Table/ })).getByText("Anong Sri"));
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

    expect(screen.getByRole("button", { name: "Pause game" })).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Delete/ })).toBeNull();
  });
});

/* Three boards, in the table's order: a live one, one waiting, one done. */
const LIVE = { ...ROOM, gameRoomId: "gr_a", white: { displayName: "Anong Sri" }, black: { displayName: "Boon Mek" }, moveCount: 12 };
const OPEN = { ...ROOM, gameRoomId: "gr_b", status: "Open" as const, white: { displayName: "Chai Dee" }, black: null as never, moveCount: 0 };
const DONE = { ...FINISHED, gameRoomId: "gr_c", white: { displayName: "Dao Kaew" }, black: { displayName: "Ek Porn" }, moveCount: 31 };

describe("moving between games", () => {
  beforeEach(() => {
    state.rooms = [LIVE, OPEN, DONE] as Room[];
  });

  const nav = () => screen.getByRole("navigation", { name: "Switch game" });

  it("says which game this is, out of how many", () => {
    renderGames("gr_b");
    expect(within(nav()).getByText("Game 2 of 3")).toBeDefined();
  });

  it("cannot go before the first game or past the last", () => {
    renderGames("gr_a");
    expect((within(nav()).getByRole("button", { name: "Previous game" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(nav()).getByRole("button", { name: "Next game" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("steps to the next game in the table's order, and puts it in the address", async () => {
    const user = renderGames("gr_a");
    await user.click(within(nav()).getByRole("button", { name: "Next game" }));

    expect(within(nav()).getByText("Game 2 of 3")).toBeDefined();
    expect(screen.getAllByText(/Chai Dee/).length).toBeGreaterThan(0);
    /* Replaced, not pushed: Back returns to the list, not to each board. */
    expect(router.replace).toHaveBeenCalledWith("/games?id=gr_b", { scroll: false });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("opens a game from the list with a push, so Back returns to the list", async () => {
    const user = renderGames();
    await user.click(screen.getByRole("button", { name: "List view" }));
    await user.click(within(screen.getByRole("region", { name: /Table/ })).getByText("Dao Kaew"));
    expect(router.push).toHaveBeenCalledWith("/games?id=gr_c", { scroll: false });
    expect(within(nav()).getByText("Game 3 of 3")).toBeDefined();
  });

  it("follows the arrow keys, but not while typing", async () => {
    const user = renderGames("gr_b");
    await user.keyboard("{ArrowRight}");
    expect(within(nav()).getByText("Game 3 of 3")).toBeDefined();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(within(nav()).getByText("Game 1 of 3")).toBeDefined();

    /* An arrow inside a field moves the caret, not the game. */
    const field = document.createElement("input");
    document.body.appendChild(field);
    field.focus();
    await user.keyboard("{ArrowRight}");
    expect(within(nav()).getByText("Game 1 of 3")).toBeDefined();
    field.remove();
  });

  it("lists every game with its players, status and moves, marking this one", async () => {
    const user = renderGames("gr_a");
    await user.click(within(nav()).getByRole("button", { name: /Game 1 of 3/ }));

    const options = within(screen.getByRole("listbox", { name: "All games" })).getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    expect(within(options[0]).getByText("Anong Sri vs Boon Mek")).toBeDefined();
    expect(within(options[0]).getByText("In play")).toBeDefined();
    expect(within(options[0]).getByText("12 moves")).toBeDefined();
    expect(within(options[1]).getByText("Chai Dee vs Waiting")).toBeDefined();
    expect(within(options[1]).getByText("Waiting")).toBeDefined();
    expect(within(options[2]).getByText("31 moves")).toBeDefined();

    await user.click(options[2]);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(within(nav()).getByText("Game 3 of 3")).toBeDefined();
  });

  it("closes one game's live stream before opening the next", async () => {
    const user = renderGames("gr_a");
    await user.click(within(nav()).getByRole("button", { name: "Next game" }));

    const open = streams.filter((s) => !s.closed);
    expect(open.map((s) => s.id)).toEqual(["gr_b"]);
  });
});

/**
 * Every game at once.
 *
 * The coach walking a room of tables wants the boards side by side, not one
 * after another. The Boards view draws each game from the room list the page
 * already polls, so it opens no live stream of its own — a stream per board
 * would run a browser out of connections to the server.
 */
describe("the Boards view", () => {
  beforeEach(() => {
    state.rooms = [LIVE, OPEN, DONE] as Room[];
  });
  /* The view is remembered per screen; forget it so other tests open on the list. */
  afterEach(() => {
    window.localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: "jtrax.view.games" }));
  });

  async function showBoards() {
    const user = renderGames();
    await user.click(screen.getByRole("button", { name: "Boards view" }));
    return user;
  }

  it("opens on the grid, every visit", () => {
    renderGames();
    expect(screen.getByRole("button", { name: "Boards view" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows a board for every game, named by its players", async () => {
    await showBoards();
    expect(screen.getByRole("group", { name: "Anong Sri vs Boon Mek" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Chai Dee vs Waiting" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Dao Kaew vs Ek Porn" })).toBeDefined();
  });

  it("says what each board needs: the code to read out, whose move, who won", async () => {
    await showBoards();
    const card = (name: string) => within(screen.getByRole("group", { name }));
    expect(card("Chai Dee vs Waiting").getByText("4821")).toBeDefined();
    expect(card("Anong Sri vs Boon Mek").getByText("12 moves")).toBeDefined();
    expect(card("Anong Sri vs Boon Mek").getByText("Your move (Black)")).toBeDefined();
    /* Who won, by name — never a bare score to decode. */
    expect(card("Dao Kaew vs Ek Porn").getByText("Dao Kaew won")).toBeDefined();
  });

  it("says who a game the office set up is still waiting for", async () => {
    state.rooms = [{ ...OPEN, white: { displayName: "Chai Dee" }, black: { displayName: "Ek Porn" },
                     whiteEntered: true, blackEntered: false }] as unknown as Room[];
    await showBoards();
    expect(within(screen.getByRole("group", { name: "Chai Dee vs Ek Porn" })).getByText("Waiting for Ek Porn to enter"))
      .toBeDefined();
  });

  it("opens no live stream", async () => {
    await showBoards();
    expect(streams).toHaveLength(0);
  });

  it("opens a game from its board", async () => {
    const user = await showBoards();
    await user.click(screen.getByRole("button", { name: "Open Dao Kaew vs Ek Porn" }));
    expect(router.push).toHaveBeenCalledWith("/games?id=gr_c", { scroll: false });
    expect(screen.getByRole("button", { name: /Back to Games/ })).toBeDefined();
  });

  it("names each game and where it stands in the card's top bar", async () => {
    state.rooms = [{ ...LIVE, label: "Friday club, round 2" }] as Room[];
    await showBoards();
    const card = within(screen.getByRole("group", { name: "Anong Sri vs Boon Mek" }));
    expect(card.getByText("Friday club, round 2")).toBeDefined();
    expect(card.getAllByText("In play").length).toBeGreaterThan(0);
  });

  it("pauses a game from its card's menu without opening it", async () => {
    const user = await showBoards();
    await user.click(screen.getByRole("button", { name: "Actions for Anong Sri — Boon Mek" }));
    await user.click(screen.getByRole("menuitem", { name: "Pause game" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(/can't move until you resume it/)).toBeDefined();
    await user.click(dialog.getByRole("button", { name: "Pause game" }));

    expect(stopRoom).toHaveBeenCalledWith("gr_a");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("warns that a rated game stops being rated", async () => {
    state.rooms = [{ ...LIVE, lichessRated: true }] as Room[];
    const user = await showBoards();
    await user.click(screen.getByRole("button", { name: "Actions for Anong Sri — Boon Mek" }));
    await user.click(screen.getByRole("menuitem", { name: "Pause game" }));
    expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toMatch(/Lichess can't pause games/);
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Pause and make unrated" })).toBeDefined();
  });

  it("offers Remove, not Pause, on a game that is not in play", async () => {
    const user = await showBoards();
    await user.click(screen.getByRole("button", { name: "Actions for Chai Dee — Waiting" }));
    expect(screen.getByRole("menuitem", { name: "Remove" })).toBeDefined();
    expect(screen.queryByRole("menuitem", { name: "Pause game" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Resume game" })).toBeNull();
  });

  const ON_HOLD = { ...OPEN, gameRoomId: "gr_h", white: { displayName: "Chai Dee" }, black: { displayName: "Ek Porn" },
                    stopped: true, whiteEntered: true, blackEntered: true };

  it("shows a paused game as Paused", async () => {
    state.rooms = [ON_HOLD] as unknown as Room[];
    await showBoards();
    const card = within(screen.getByRole("group", { name: "Chai Dee vs Ek Porn" }));
    expect(card.getAllByText("Paused").length).toBeGreaterThan(0);
    expect(card.getByText(/resume it when they're ready/)).toBeDefined();
  });

  it("ends a game in play — kept, not removed — after asking", async () => {
    const user = await showBoards();
    await user.click(screen.getByRole("button", { name: "Actions for Anong Sri — Boon Mek" }));
    await user.click(screen.getByRole("menuitem", { name: "End game" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(/stay in the history/)).toBeDefined();
    await user.click(dialog.getByRole("button", { name: "End game" }));

    expect(cancelRoom).toHaveBeenCalledWith("gr_a");
    expect(deleteRoom).not.toHaveBeenCalled();
  });

  it("offers Resume, End and Remove on a paused game", async () => {
    state.rooms = [ON_HOLD] as unknown as Room[];
    const user = await showBoards();
    await user.click(screen.getByRole("button", { name: "Actions for Chai Dee — Ek Porn" }));
    const items = screen.getAllByRole("menuitem").map((i) => i.textContent);
    expect(items).toEqual(["Resume game", "End game", "Remove"]);
  });

  it("resumes a paused game from its menu, and can remove it", async () => {
    state.rooms = [ON_HOLD] as unknown as Room[];
    const user = await showBoards();
    await user.click(screen.getByRole("button", { name: "Actions for Chai Dee — Ek Porn" }));
    expect(screen.getByRole("menuitem", { name: "Remove" })).toBeDefined();
    await user.click(screen.getByRole("menuitem", { name: "Resume game" }));
    expect(resumeRoom).toHaveBeenCalledWith("gr_h");
  });

  it("shows a code, with a copy button, only for a room with an open seat", async () => {
    state.rooms = [OPEN, { ...OPEN, gameRoomId: "gr_s", code: "ZZZ999", white: { displayName: "Chai Dee" },
                           black: { displayName: "Ek Porn" } }] as unknown as Room[];
    await showBoards();
    expect(within(screen.getByRole("group", { name: "Chai Dee vs Waiting" })).getByRole("button", { name: "Copy code" }))
      .toBeDefined();
    expect(screen.queryByText("ZZZ999")).toBeNull();
  });
});

/**
 * Reviewing who played whom: the list, and the filters over it.
 */
describe("the game history", () => {
  const DRAWN = { ...DONE, gameRoomId: "gr_d", result: "1/2-1/2", resultReason: "Agreement",
                  white: { displayName: "Chai Dee", studentId: "stu_chai" }, black: { displayName: "Anong Sri", studentId: "stu_anong" } };
  const WON = { ...DONE, gameRoomId: "gr_w", resultReason: "Checkmate",
                white: { displayName: "Anong Sri", studentId: "stu_anong" }, black: { displayName: "Boon Mek", studentId: "stu_boon" } };
  /* A game from another day, shown by default and still reachable by date. */
  const EARLIER = { ...WON, gameRoomId: "gr_e", startedAt: "2026-09-20 03:00:00",
                    white: { displayName: "Boon Mek", studentId: "stu_boon" }, black: { displayName: "Chai Dee", studentId: "stu_chai" } };

  beforeEach(() => {
    state.rooms = [WON, DRAWN, EARLIER] as Room[];
  });
  afterEach(() => {
    window.localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: "jtrax.view.games" }));
  });

  async function showList() {
    const user = renderGames();
    await user.click(screen.getByRole("button", { name: "List view" }));
    return user;
  }
  /* The table alone: names and results also appear in the filters' options. */
  const table = () => within(screen.getByRole("region", { name: /Table/ }));

  it("says who won by name, and leaves how it ended to the board", async () => {
    await showList();
    expect(table().getByText("Anong Sri won")).toBeDefined();
    expect(table().getByText("Draw")).toBeDefined();
    expect(table().queryByText("Checkmate")).toBeNull();
  });

  it("shows a dash for a game with no time control", async () => {
    await showList();
    expect(table().getAllByText("—").length).toBeGreaterThan(0);
    expect(table().queryByText("No time control")).toBeNull();
  });

  it("opens on every game, and narrows to one day when asked", async () => {
    const user = await showList();
    expect(table().getByText("Boon Mek won")).toBeDefined();
    expect(table().getByText("Anong Sri won")).toBeDefined();

    const date = screen.getByLabelText(/^Date( \*)?$/);
    await user.type(date, "2026-09-20");
    expect(table().getByText("Boon Mek won")).toBeDefined();
    expect(table().queryByText("Anong Sri won")).toBeNull();

    await user.clear(date);
    expect(table().getByText("Boon Mek won")).toBeDefined();
    expect(table().getByText("Anong Sri won")).toBeDefined();
  });

  it("narrows to a class, by either player being in it", async () => {
    const user = await showList();
    await user.selectOptions(screen.getByRole("combobox", { name: "Class" }), "int");
    expect(table().queryByText("Anong Sri won")).toBeNull();
    expect(table().getByText("Draw")).toBeDefined();
  });

  it("narrows to a result", async () => {
    const user = await showList();
    await user.selectOptions(screen.getByRole("combobox", { name: "Result" }), "draw");
    expect(table().queryByText("Anong Sri won")).toBeNull();
    expect(table().getByText("Draw")).toBeDefined();
  });

  it("has no student filter", async () => {
    await showList();
    expect(screen.queryByRole("combobox", { name: "Student" })).toBeNull();
  });

  it("filters by status: waiting, in play, finished", async () => {
    state.rooms = [LIVE, OPEN, WON] as Room[];
    const user = await showList();
    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "Active");
    expect(table().getByText("Boon Mek")).toBeDefined();
    expect(table().queryByText("Anong Sri won")).toBeNull();
    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "Open");
    expect(table().getByText("Chai Dee")).toBeDefined();
    expect(table().queryByText("Boon Mek")).toBeNull();
    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "Finished");
    expect(table().getByText("Anong Sri won")).toBeDefined();
  });
});

/**
 * Starting a game: the office seats both players and it appears in their apps.
 */
describe("starting a game", () => {
  async function openNewGame() {
    const user = renderGames();
    await user.click(screen.getByRole("button", { name: /New game/ }));
    return user;
  }
  const dialog = () => within(screen.getByRole("dialog"));

  it("seats the two students chosen, with the time control", async () => {
    const user = await openNewGame();
    await user.selectOptions(dialog().getByRole("combobox", { name: /White/ }), "stu_anong");
    await user.selectOptions(dialog().getByRole("combobox", { name: /Black/ }), "stu_chai");
    await user.selectOptions(dialog().getByRole("combobox", { name: "Time control" }), "1");
    await user.click(dialog().getByRole("button", { name: "Start game" }));

    expect(openRoom).toHaveBeenCalledWith("", {
      lichessRated: false,
      timed: true,
      clockLimit: 600,
      clockIncrement: 5,
      whiteStudentId: "stu_anong",
      blackStudentId: "stu_chai",
    });
    const created = within(await screen.findByRole("dialog", { name: "Game created" }));
    expect(created.getByText("White player")).toBeDefined();
    expect(created.getByText("Anong Sri")).toBeDefined();
    expect(created.getByText("Black player")).toBeDefined();
    expect(created.getByText("Chai Dee")).toBeDefined();
    expect(created.queryByText(/home screens/)).toBeNull();
  });

  it("keeps a student already at a board in the list, but not choosable", async () => {
    state.rooms = [{ ...ROOM, white: { displayName: "Anong Sri", studentId: "stu_anong" },
                     black: { displayName: "Boon Mek", studentId: "stu_boon" } }] as unknown as Room[];
    await openNewGame();
    const white = dialog().getByRole("combobox", { name: /White/ });
    const anong = within(white).getByRole("option", { name: /Anong Sri/ }) as HTMLOptionElement;
    expect(anong.textContent).toMatch(/in another game/);
    expect(anong.disabled).toBe(true);
    const chai = within(white).getByRole("option", { name: /Chai Dee/ }) as HTMLOptionElement;
    expect(chai.disabled).toBe(false);
  });

  it("will not start until both players are chosen", async () => {
    const user = await openNewGame();
    await user.selectOptions(dialog().getByRole("combobox", { name: /White/ }), "stu_anong");
    expect((dialog().getByRole("button", { name: "Start game" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("gives a rated game a clock", async () => {
    const user = await openNewGame();
    await user.click(dialog().getByRole("checkbox", { name: "Rated on Lichess" }));
    expect((dialog().getByRole("combobox", { name: "Time control" }) as HTMLSelectElement).value).toBe("2");
  });

  it("can still open a room with a code to read out", async () => {
    const user = await openNewGame();
    await user.click(dialog().getByRole("radio", { name: /Share a code/ }));
    await user.click(dialog().getByRole("button", { name: "Open room" }));

    expect(openRoom).toHaveBeenCalledWith("", { lichessRated: false, timed: false });
    expect(await screen.findByText("K7P2QX")).toBeDefined();
  });
});
