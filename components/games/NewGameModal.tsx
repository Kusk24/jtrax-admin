"use client";

/* Starting a game from the console.

   The office picks who plays White and who plays Black, and the game appears
   on both students' Play screens — a class activity or a mini-tournament round
   no longer starts with reading a code aloud to six tables. Sharing a code is
   still here, for the lesson where whoever is free sits down.

   The time control is optional. Only a rated game keeps a clock (Lichess keeps
   it), so rated needs one; on an unrated game it is a label the coach times by. */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { COLORS, FONT } from "@/lib/theme";
import { RATED_CLOCKS, openRoom, type GameRoom } from "@/lib/games";
import { useData } from "../DataProvider";
import { ActionButton, errorText } from "../crud";
import { labelStyle, Modal, primaryButtonStyle, secondaryButtonStyle, selectStyle, fieldStyle } from "../page-kit";

type Mode = "players" | "code";

export function NewGameModal({
  rooms,
  onClose,
  onCreated,
}: {
  /** Every room the page knows, so a student already at a board can be shown
      as busy rather than seated twice. */
  rooms: GameRoom[];
  onClose: () => void;
  onCreated: (room: GameRoom, mode: Mode) => void;
}) {
  const t = useTranslations("games");
  const tc = useTranslations("games.create");
  const { students } = useData();
  const [mode, setMode] = useState<Mode>("players");
  const [white, setWhite] = useState("");
  const [black, setBlack] = useState("");
  /* -1 is "no time control"; otherwise an index into RATED_CLOCKS. */
  const [clock, setClock] = useState(-1);
  const [rated, setRated] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  /* Students sitting at a board that is still waiting or in play. They stay in
     the list — the office should see where they are — but cannot be chosen:
     one child cannot play two games at once. */
  const busy = useMemo(() => {
    const ids = new Set<string>();
    for (const r of rooms) {
      if (r.status !== "Open" && r.status !== "Active") continue;
      for (const seat of [r.white, r.black]) if (seat?.studentId) ids.add(seat.studentId);
    }
    return ids;
  }, [rooms]);

  const options = useMemo(
    () =>
      [...students]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ id: s.id, name: s.name, className: s.className, canSit: Boolean(s.accountId) })),
    [students],
  );
  const nameOf = (id: string) => options.find((o) => o.id === id)?.name ?? "";

  const problem =
    mode === "players" && white && black && white === black
      ? tc("samePlayer")
      : mode === "players" && [white, black].some((id) => id && !options.find((o) => o.id === id)?.canSit)
        ? tc("noLogin", { name: nameOf([white, black].find((id) => id && !options.find((o) => o.id === id)?.canSit) ?? "") })
        : "";
  const ready = !problem && (mode === "code" || (white !== "" && black !== ""));

  async function start() {
    setError("");
    const tcChoice = clock >= 0 ? RATED_CLOCKS[clock] : null;
    try {
      const room = await openRoom(label, {
        lichessRated: rated,
        timed: tcChoice !== null,
        ...(tcChoice ? { clockLimit: tcChoice.limit, clockIncrement: tcChoice.increment } : {}),
        ...(mode === "players" ? { whiteStudentId: white, blackStudentId: black } : {}),
      });
      onCreated(room, mode);
    } catch (e) {
      setError(errorText(e, t("failed")));
    }
  }

  const player = (side: "white" | "black", value: string, set: (v: string) => void) => (
    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
      <label style={labelStyle} htmlFor={`new-game-${side}`}>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            marginRight: 6,
            borderRadius: "50%",
            verticalAlign: "-1px",
            background: side === "white" ? COLORS.surface : COLORS.navy,
            border: `1.5px solid ${side === "white" ? COLORS.border : COLORS.navy}`,
          }}
        />
        {tc(side)}
      </label>
      <select id={`new-game-${side}`} value={value} onChange={(e) => set(e.target.value)} style={selectStyle}>
        <option value="">{tc("choose")}</option>
        {options.map((o) => (
          <option
            key={o.id}
            value={o.id}
            disabled={busy.has(o.id) || o.id === (side === "white" ? black : white)}
          >
            {o.className && o.className !== "—" ? `${o.name} · ${o.className}` : o.name}
            {busy.has(o.id) ? ` — ${tc("inAnotherGame")}` : ""}
          </option>
        ))}
      </select>
    </div>
  );

  const choice = (value: Mode, title: string, hint: string) => (
    <label
      style={{
        flex: "1 1 200px",
        display: "flex",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 12,
        border: `1.5px solid ${mode === value ? COLORS.blue : COLORS.border}`,
        background: mode === value ? COLORS.light : COLORS.surface,
        cursor: "pointer",
      }}
    >
      <input type="radio" name="new-game-mode" checked={mode === value} onChange={() => setMode(value)} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2, fontFamily: FONT }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{title}</span>
        <span style={{ fontSize: 12.5, color: COLORS.textSecondary }}>{hint}</span>
      </span>
    </label>
  );

  return (
    <Modal
      title={tc("title")}
      width={560}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={onClose}>
            {tc("cancel")}
          </button>
          <ActionButton className="jt-btn-primary" style={primaryButtonStyle} disabled={!ready} onClick={start}>
            {mode === "players" ? tc("start") : tc("openCode")}
          </ActionButton>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }} role="radiogroup" aria-label={tc("players")}>
          {choice("players", tc("seatNow"), tc("seatNowHint"))}
          {choice("code", tc("byCode"), tc("byCodeHint"))}
        </div>

        {mode === "players" && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {player("white", white, setWhite)}
            {player("black", black, setBlack)}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle} htmlFor="new-game-clock">{tc("timeControl")}</label>
            <select
              id="new-game-clock"
              value={clock}
              onChange={(e) => {
                const next = Number(e.target.value);
                setClock(next);
                if (next < 0) setRated(false);
              }}
              style={selectStyle}
            >
              <option value={-1}>{tc("noClock")}</option>
              {RATED_CLOCKS.map((c, i) => (
                <option key={c.label} value={i}>{c.label}</option>
              ))}
            </select>
          </div>
          <label
            style={{ flex: "1 1 200px", display: "flex", alignItems: "center", gap: 8, minHeight: 42,
                     fontFamily: FONT, fontSize: 14, color: COLORS.text, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={rated}
              onChange={(e) => {
                setRated(e.target.checked);
                /* A rated game needs a clock; 15+10 is the school-friendly default. */
                if (e.target.checked && clock < 0) setClock(2);
              }}
            />
            {t("ratedLabel")}
          </label>
        </div>
        <p style={{ margin: "-8px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
          {tc("clockNote")}
        </p>

        <div>
          <label style={labelStyle} htmlFor="new-game-label">{tc("label")}</label>
          <input
            id="new-game-label"
            value={label}
            maxLength={80}
            placeholder={tc("labelPlaceholder")}
            onChange={(e) => setLabel(e.target.value)}
            style={fieldStyle}
          />
        </div>

        {(problem || error) && (
          <p role="alert" style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.danger }}>
            {problem || error}
          </p>
        )}
      </div>
    </Modal>
  );
}
