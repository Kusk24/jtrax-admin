"use client";

/**
 * The tournament's regulation document: attach it, read it, replace it.
 *
 * Organisers send the academy a PDF of the rules — schedule, categories,
 * prizes, entry fees — and parents deciding whether to enter want to read it.
 * The file lives on the tournament (see backend migration 0029), so the same
 * link the desk uses is the one the public registration page shows.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";
import { ErrorNote, errorText } from "../crud";
import { Card, SectionTitle } from "../ui";
import { secondaryButtonStyle } from "../page-kit";

export function RegulationCard({ tournamentId }: { tournamentId: string }) {
  const t = useTranslations("tournament");
  const tCommon = useTranslations("common");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* null until asked. The tournament rows the console lists carry no
     regulation column, and adding one would drag a blob join through every
     list query — one HEAD when a tournament is opened is cheaper and cannot
     go stale. */
  const [attached, setAttached] = useState<boolean | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/regulation`, { method: "HEAD" });
      setAttached(res.ok);
    } catch {
      setAttached(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    check();
  }, [check]);

  /* Served by the API, not this origin: the file is a database row, and the
     same URL is what a parent opens from the registration page. */
  const href = `/api/tournaments/${tournamentId}/regulation`;

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.upload(`tournaments/${tournamentId}/regulation`, form);
      await check();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 415
          ? t("regulationWrongType")
          : errorText(e, tCommon("saveFailed")),
      );
    } finally {
      setBusy(false);
    }
  }

  async function detach() {
    setBusy(true);
    setError(null);
    try {
      await api.del(`tournaments/${tournamentId}/regulation`);
      await check();
    } catch (e) {
      setError(errorText(e, tCommon("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <SectionTitle>{t("regulationTitle")}</SectionTitle>
      <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
        {attached ? t("regulationAttachedSub") : t("regulationEmptySub")}
      </p>
      {error && <ErrorNote>{error}</ErrorNote>}

      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        {attached && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="jt-btn-ghost"
            style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}
          >
            <Icon name="fileText" size={15} color={COLORS.textSecondary} />
            {t("regulationView")}
          </a>
        )}
        <button
          type="button"
          className="jt-btn-ghost"
          style={{ ...secondaryButtonStyle, opacity: busy ? 0.7 : 1 }}
          disabled={busy}
          onClick={() => picker.current?.click()}
        >
          {attached ? t("regulationReplace") : t("regulationAttach")}
        </button>
        {attached && (
          <button
            type="button"
            className="jt-btn-ghost"
            style={{ ...secondaryButtonStyle, color: COLORS.danger, opacity: busy ? 0.7 : 1 }}
            disabled={busy}
            onClick={detach}
          >
            {tCommon("delete")}
          </button>
        )}
        <input
          ref={picker}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            /* Cleared so choosing the same file twice still fires a change —
               a failed upload retried with the identical file is the normal
               way this button gets pressed again. */
            e.target.value = "";
            if (file) upload(file);
          }}
        />
      </div>
    </Card>
  );
}
