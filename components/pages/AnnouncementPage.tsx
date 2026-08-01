"use client";

import { useState } from "react";
import { ANNOUNCEMENTS_SEED, type Announcement } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, TODAY_REF } from "@/lib/theme";
import { EmptyRow, fieldStyle, labelStyle, PageHeader, primaryButtonStyle } from "../page-kit";
import { Card } from "../ui";

const AUDIENCES = ["Students", "Parents", "Teachers"] as const;

export function AnnouncementPage() {
  const [rows, setRows] = useState<Announcement[]>(ANNOUNCEMENTS_SEED);
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
    setRows([
      {
        title: title.trim(),
        audience: selected.join(" & "),
        date: TODAY_REF.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
        body: body.trim(),
      },
      ...rows,
    ]);
    setTitle("");
    setBody("");
    setComposeOpen(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Announcement"
        sub="Broadcasts to students and parents"
        action={
          <button
            type="button"
            className="jt-btn-primary"
            style={primaryButtonStyle}
            onClick={() => setComposeOpen((v) => !v)}
          >
            {composeOpen ? "Cancel" : "New Announcement"}
          </button>
        }
      />

      {composeOpen && (
        <Card className="jtrax-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle} htmlFor="jtrax-ann-title">
              Title
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
              Message
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
            <span style={labelStyle}>Audience</span>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {AUDIENCES.map((a) => (
                <label
                  key={a}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    fontFamily: FONT,
                    fontSize: 13,
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
                  {a}
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
              Send Announcement
            </button>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.length === 0 && (
          <Card>
            <EmptyRow>No announcements yet.</EmptyRow>
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
                  <div style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>
                    {a.title}
                  </div>
                  <div style={{ marginTop: 2, fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>
                    {a.audience} · {a.date}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Delete ${a.title}`}
                onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
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
                fontSize: 13,
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
