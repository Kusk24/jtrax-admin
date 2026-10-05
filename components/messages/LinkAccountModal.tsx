"use client";

/* Pick the parent or student a LINE chat is with. Search by name; a record
   already linked to another chat is shown but cannot be picked — the server
   refuses that too, so one click cannot take a family's chat from them. */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { COLORS, FONT } from "@/lib/theme";
import { ErrorNote, errorText } from "../crud";
import { useData } from "../DataProvider";
import { Modal, SearchInput } from "../page-kit";
import { Badge } from "../ui";

export type LinkTarget = { parentId?: string; studentId?: string };

type Option = { kind: "parent" | "student"; id: string; name: string; sub: string };

export function LinkAccountModal({
  chatName,
  taken,
  onLink,
  onClose,
}: {
  chatName: string;
  /** Parent and student ids already linked to another chat. */
  taken: Set<string>;
  onLink: (to: LinkTarget) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations("messages");
  const tCommon = useTranslations("common");
  const { parents, students } = useData();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const options = useMemo<Option[]>(() => {
    const all: Option[] = [
      ...parents.map((p) => ({ kind: "parent" as const, id: p.id, name: p.name, sub: p.loginEmail || p.phone })),
      ...students.map((s) => ({ kind: "student" as const, id: s.id, name: s.name, sub: s.parentName })),
    ];
    const needle = q.trim().toLowerCase();
    return all
      .filter((o) => !needle || o.name.toLowerCase().includes(needle) || o.sub.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 40);
  }, [parents, students, q]);

  async function pick(o: Option) {
    setBusy(o.id);
    setError("");
    try {
      await onLink(o.kind === "parent" ? { parentId: o.id } : { studentId: o.id });
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
      setBusy("");
    }
  }

  return (
    <Modal title={t("linkTitle", { name: chatName })} onClose={onClose} width={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {error && <ErrorNote>{error}</ErrorNote>}
        <SearchInput value={q} onChange={setQ} placeholder={t("linkSearch")} label={t("linkSearch")} />
        <div role="list" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
          {options.length === 0 && (
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>{t("linkNone")}</p>
          )}
          {options.map((o) => {
            const isTaken = taken.has(o.id);
            return (
              <div key={`${o.kind}:${o.id}`} role="listitem">
              <button
                type="button"
                disabled={isTaken || busy !== ""}
                onClick={() => void pick(o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.surface,
                  cursor: isTaken ? "not-allowed" : "pointer",
                  opacity: isTaken ? 0.55 : 1,
                  width: "100%",
                  textAlign: "left",
                  fontFamily: FONT,
                }}
              >
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{o.name}</span>
                  {(isTaken || o.sub) && (
                    <span style={{ fontSize: 12.5, color: COLORS.textSecondary }}>{isTaken ? t("linkTaken") : o.sub}</span>
                  )}
                </span>
                <Badge color={COLORS.blue} bg={COLORS.light}>
                  {t(o.kind === "parent" ? "roleParent" : "roleStudent")}
                </Badge>
              </button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
