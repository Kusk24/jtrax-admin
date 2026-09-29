"use client";

/* What the office can do to a game, wherever the game is shown — its card on
   the grid, its row in the list.

   A game in play can be paused (the bell has gone; the two finish it next
   lesson) or ended (it stops for good with no winner, and stays in the
   record). A paused game can be resumed or ended. Anything not in play can be
   removed, which throws the record away; a game in play cannot be. */
import { useTranslations } from "next-intl";
import { COLORS, FONT } from "@/lib/theme";
import { playersOf, stageOf, type GameRoom } from "@/lib/games";
import { MoreMenu } from "../MoreMenu";
import { ActionButton } from "../crud";
import { Modal, primaryButtonStyle, secondaryButtonStyle } from "../page-kit";

export type GameAct = "stop" | "end";

export function GameActions({
  room,
  onAct,
  onResume,
  onRemove,
}: {
  room: GameRoom;
  /** Pause or end — both are asked first. */
  onAct: (room: GameRoom, act: GameAct) => void;
  onResume: (room: GameRoom) => void;
  onRemove: (room: GameRoom) => void;
}) {
  const t = useTranslations("games");
  const players = playersOf(room, t("waiting"));
  const stage = stageOf(room);
  const pause = { label: t("actions.stop"), icon: "clockSmall" as const, onSelect: () => onAct(room, "stop") };
  const resume = { label: t("actions.resume"), icon: "flame" as const, onSelect: () => onResume(room) };
  const end = { label: t("actions.end"), icon: "x" as const, onSelect: () => onAct(room, "end") };
  const remove = { label: t("actions.remove"), icon: "trash" as const, danger: true, onSelect: () => onRemove(room) };
  return (
    <MoreMenu
      label={t("actions.menu", { players })}
      items={
        stage === "Active"
          ? [pause, end]
          : stage === "Stopped"
            ? [resume, end, remove]
            : [remove]
      }
    />
  );
}

/**
 * Asked before pausing or ending a game. Pausing keeps it to finish another
 * day; ending finishes it now with no winner, keeping its record. Both are
 * louder on a rated game, which Lichess cannot pause and ends on its side.
 */
export function GameConfirmModal({
  room,
  act,
  onClose,
  onConfirm,
}: {
  room: GameRoom;
  act: GameAct;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("games");
  const white = room.white?.displayName ?? t("waiting");
  const black = room.black?.displayName ?? t("waiting");
  return (
    <Modal
      title={t(`${act}.title`)}
      width={460}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={onClose}>
            {t(`${act}.keep`)}
          </button>
          <ActionButton
            className="jt-btn-primary"
            style={{ ...primaryButtonStyle, background: room.lichessRated || act === "end" ? COLORS.danger : undefined }}
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
          >
            {act === "stop" && room.lichessRated ? t("stop.confirmUnrated") : t(`${act}.confirm`)}
          </ActionButton>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>
        <p style={{ margin: 0 }}>{t(`${act}.body`, { white, black })}</p>
        {room.lichessRated && (
          <p
            role="alert"
            style={{ margin: 0, padding: "10px 12px", borderRadius: 10, background: COLORS.warningBg, color: COLORS.warning,
                     fontSize: 13.5, fontWeight: 600 }}
          >
            {t(`${act}.ratedWarning`)}
          </p>
        )}
      </div>
    </Modal>
  );
}
