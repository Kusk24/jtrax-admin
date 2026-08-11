"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useData } from "@/components/DataProvider";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, TODAY_REF } from "@/lib/theme";
import { EmptyRow, ExportButton, fieldStyle, labelStyle, PageHeader, primaryButtonStyle } from "../page-kit";
import { Card } from "../ui";

const AUDIENCES = ["Students", "Parents", "Teachers"] as const;

export function AnnouncementPage() {
  const t = useTranslations("announcement");
  const tCommon = useTranslations("common");
  const { announcements: rows, meAccountId, create, remove } = useData();
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Record<string, boolean>>({
    Students: true,
    Parents: true,
    Teachers: false,
  });

  const selected = AUDIENCES.filter((a) => audience[a]);
  const canSend = title.trim() !== "" && body.trim() !== "" && selected.length > 0;

  function send() {
    if (!canSend) return;
    create("announcements", {
      title: title.trim(),
      body: body.trim(),
      author_user_account_id: meAccountId,
      posted_at: new Date().toISOString(),
    }).catch((e) => window.alert(e instanceof Error ? e.message : "post failed"));
    setTitle("");
    setBody("");
    setComposeOpen(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title={t("title")}
        sub={t("sub")}
        action={
          <>
            <ExportButton
              filename="announcements"
              columns={[t("titleField"), t("audience"), tCommon("date"), t("message")]}
              rows={() => rows.map((r) => [r.title, r.audience, r.date, r.body])}
            />
            <button
              type="button"
              className="jt-btn-primary"
              style={primaryButtonStyle}
              onClick={() => setComposeOpen((v) => !v)}
            >
              {composeOpen ? tCommon("cancel") : t("new")}
            </button>
          </>
        }
      />

      {composeOpen && (
        <Card className="jtrax-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle} htmlFor="jtrax-ann-title">
              {t("titleField")}
            </label>
            <input
              id="jtrax-ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="jtrax-ann-body">
              {t("message")}
            </label>
            <textarea
              id="jtrax-ann-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("audience")}</span>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {AUDIENCES.map((a) => (
                <label
                  key={a}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    fontFamily: FONT,
                    fontSize: 14,
                    color: COLORS.text,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={audience[a]}
                    onChange={() => setAudience({ ...audience, [a]: !audience[a] })}
                    style={{ accentColor: COLORS.blue, width: 15, height: 15 }}
                  />
                  {t(`audience${a}`)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <button
              type="button"
              className="jt-btn-primary"
              style={{ ...primaryButtonStyle, opacity: canSend ? 1 : 0.5, cursor: canSend ? "pointer" : "not-allowed" }}
              disabled={!canSend}
              onClick={send}
            >
              <Icon name="send" size={15} color="#fff" />
              {t("send")}
            </button>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.length === 0 && (
          <Card>
            <EmptyRow>{t("empty")}</EmptyRow>
          </Card>
        )}
        {rows.map((a, i) => (
          <Card key={`${a.title}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 11, minWidth: 0 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: COLORS.light,
                    flexShrink: 0,
                  }}
                >
                  <Icon name="announcement" size={17} color={COLORS.blue} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: 15.5, fontWeight: 700, color: COLORS.text }}>
                    {a.title}
                  </div>
                  <div style={{ marginTop: 2, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
                    {a.audience} · {a.date}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label={t("deleteItem", { title: a.title })}
                onClick={() => a.id && remove("announcements", a.id).catch((e) => window.alert(e instanceof Error ? e.message : "delete failed"))}
                style={{
                  display: "inline-flex",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: 6,
                  background: COLORS.surface,
                  cursor: "pointer",
                  color: COLORS.textSecondary,
                  flexShrink: 0,
                }}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: FONT,
                fontSize: 14,
                lineHeight: 1.55,
                color: COLORS.textSecondary,
              }}
            >
              {a.body}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
