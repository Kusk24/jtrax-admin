"use client";

import { useMemo, useState } from "react";
import { TOURNAMENTS_SEED, type Participant, type Tournament } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, initialsOf, statusChipColors } from "@/lib/theme";
import {
  Drawer,
  EmptyRow,
  fieldStyle,
  InfoGrid,
  labelStyle,
  PageHeader,
  paginate,
  Pagination,
  primaryButtonStyle,
  SearchInput,
  secondaryButtonStyle,
  Table,
  TableRow,
} from "../page-kit";
import { Avatar, Badge, Card, SectionTitle } from "../ui";

const REGISTRATION_LINK = "https://jca-demo-registration-site.vercel.app/";
const PARTICIPANT_TEMPLATE = "70px minmax(150px, 1.6fr) 90px 110px 100px 120px";

/* Ported from buildQrCells: a deterministic pseudo-QR with real finder blocks,
   so the "registration website" card looks like a scannable code without
   pulling in a QR library for what is decorative in the mockup. */
function buildQrCells(seedStr: string, size = 11): boolean[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return (seed >>> 16) % 100 < 46;
  };
  const corners = [
    [0, 0],
    [0, size - 3],
    [size - 3, 0],
  ];
  const inFinder = (r: number, c: number) =>
    corners.some(([or, oc]) => r >= or && r < or + 3 && c >= oc && c < oc + 3);

  const cells: boolean[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) cells.push(inFinder(r, c) ? true : rand());
  }
  return cells;
}

function rankBadge(rank: number): { color: string; bg: string; label: string } | null {
  if (rank === 1) return { color: "#8A6D00", bg: "#FCEFC2", label: "Champion" };
  if (rank === 2) return { color: "#5B6472", bg: "#E6E9EE", label: "Runner-up" };
  if (rank === 3) return { color: "#8A4B26", bg: "#F3DCC6", label: "2nd Runner-up" };
  return null;
}

/** Branded stand-in for the tournament photo (design assets weren't imported). */
function TournamentArt({ name, height = 120 }: { name: string; height?: number }) {
  const hue = Array.from(name).reduce((n, ch) => n + ch.charCodeAt(0), 0) % 360;
  return (
    <div
      aria-hidden
      style={{
        height,
        borderRadius: 11,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, hsl(${hue} 46% 42%), hsl(${(hue + 42) % 360} 52% 58%))`,
        flexShrink: 0,
      }}
    >
      <Icon name="trophy" size={height > 100 ? 34 : 24} color="rgba(255,255,255,0.9)" />
    </div>
  );
}

function QrCode({ seed }: { seed: string }) {
  const cells = useMemo(() => buildQrCells(seed), [seed]);
  return (
    <div
      aria-hidden
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(11, 1fr)",
        gap: 1,
        width: 104,
        height: 104,
        padding: 6,
        background: "#fff",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 9,
        flexShrink: 0,
      }}
    >
      {cells.map((on, i) => (
        <span key={i} style={{ background: on ? COLORS.text : "transparent", borderRadius: 1 }} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- wizard --- */

const WIZARD_STEPS = ["Upload", "Review", "Publish"];

function CreateWizard({ onCancel, onPublish }: { onCancel: () => void; onPublish: (t: Tournament) => void }) {
  const [step, setStep] = useState(1);
  const [extracting, setExtracting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    date: "",
    venue: "",
    format: "Swiss System",
    timeControl: "",
    chiefArbiter: "",
    maxParticipants: "100",
  });

  /* Fake extraction, matching the mockup's 1.8s simulated parse. */
  function extract(file: File) {
    setFileName(file.name);
    setExtracting(true);
    setTimeout(() => {
      setDraft({
        name: "JCA Youth Monthly Rapid Chess Tournament",
        date: "12–13 Sep 2026",
        venue: "Paradise Park",
        format: "Swiss System",
        timeControl: "25 min + 10 sec",
        chiefArbiter: "Somchai Prasert (FIDE Arbiter)",
        maxParticipants: "120",
      });
      setExtracting(false);
      setStep(2);
    }, 1800);
  }

  const fields: Array<{ key: keyof typeof draft; label: string }> = [
    { key: "name", label: "Tournament Name" },
    { key: "date", label: "Date" },
    { key: "venue", label: "Venue" },
    { key: "format", label: "Format" },
    { key: "timeControl", label: "Time Control" },
    { key: "chiefArbiter", label: "Chief Arbiter" },
    { key: "maxParticipants", label: "Max Participants" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 780 }}>
      <button
        type="button"
        onClick={onCancel}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.textSecondary,
          padding: 0,
        }}
      >
        <Icon name="chevronLeft" size={16} color={COLORS.textSecondary} /> Back to Tournaments
      </button>

      <PageHeader title="Create Tournament" sub="Upload the regulation and we'll pre-fill the details." />

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {WIZARD_STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const current = step === n;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: done || current ? COLORS.blue : COLORS.neutralBg,
                  color: done || current ? "#fff" : COLORS.textSecondary,
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {done ? <Icon name="check" size={13} color="#fff" /> : n}
              </span>
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: current ? 700 : 500,
                  color: current ? COLORS.text : COLORS.textSecondary,
                }}
              >
                {label}
              </span>
              {i < WIZARD_STEPS.length - 1 && (
                <span style={{ width: 28, height: 1, background: COLORS.border }} />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 13, padding: 34 }}>
          {extracting ? (
            <>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: `3px solid ${COLORS.border}`,
                  borderTopColor: COLORS.blue,
                  animation: "jtrax-spin 0.8s linear infinite",
                }}
              />
              <span style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
                Extracting details from {fileName}…
              </span>
            </>
          ) : (
            <>
              <Icon name="fileText" size={30} color={COLORS.blue} />
              <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text }}>
                Upload the tournament regulation
              </span>
              <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                PDF or image. We&apos;ll read the name, dates, venue and fees.
              </span>
              <label style={{ ...primaryButtonStyle, cursor: "pointer" }}>
                Choose file
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) extract(f);
                  }}
                  style={{ display: "none" }}
                />
              </label>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: FONT, fontSize: 12.5, color: COLORS.blue }}
              >
                Skip and enter manually
              </button>
            </>
          )}
        </Card>
      )}

      {step === 2 && (
        <>
          <Card style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <SectionTitle>Review extracted details</SectionTitle>
            {fields.map((f) => (
              <div key={f.key}>
                <label style={labelStyle} htmlFor={`tw-${f.key}`}>{f.label}</label>
                <input
                  id={`tw-${f.key}`}
                  value={draft[f.key]}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  style={fieldStyle}
                />
              </div>
            ))}
          </Card>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="jt-btn-ghost" style={secondaryButtonStyle} onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              className="jt-btn-primary"
              style={{
                ...primaryButtonStyle,
                opacity: draft.name ? 1 : 0.5,
                cursor: draft.name ? "pointer" : "not-allowed",
              }}
              disabled={!draft.name}
              onClick={() => setStep(3)}
            >
              Publish Tournament
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15, padding: 30, textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: COLORS.successBg,
            }}
          >
            <Icon name="check" size={25} color={COLORS.success} />
          </span>
          <SectionTitle>{draft.name} is live</SectionTitle>
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
            Share the registration link or QR code with parents.
          </p>
          <QrCode seed={draft.name} />
          <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: COLORS.blue, wordBreak: "break-all" }}>
            {REGISTRATION_LINK}
          </code>
          <button
            type="button"
            className="jt-btn-primary"
            style={primaryButtonStyle}
            onClick={() =>
              onPublish({
                id: `t-${Date.now()}`,
                name: draft.name,
                status: "Ongoing",
                date: draft.date || "TBC",
                venue: draft.venue || "TBC",
                format: draft.format,
                published: true,
                categories: [],
                organizer: "JCA Chess Academy",
                chiefArbiter: draft.chiefArbiter,
                registrationDeadline: "TBC",
                timeControl: draft.timeControl,
                entryFeeMember: "—",
                entryFeeNonMember: "—",
                address: draft.venue,
                contactPerson: "—",
                maxParticipants: Number(draft.maxParticipants) || 100,
                currentParticipants: 0,
                rounds: 0,
                revenue: "0 THB",
                participants: [],
              })
            }
          >
            View Tournament
          </button>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- detail --- */

function TournamentDetail({ tournament, onBack }: { tournament: Tournament; onBack: () => void }) {
  const [tab, setTab] = useState<"overview" | "participants">("overview");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<Participant | null>(null);
  const [copied, setCopied] = useState(false);

  const status = statusChipColors(tournament.status);
  const filled = tournament.maxParticipants
    ? Math.round((tournament.currentParticipants / tournament.maxParticipants) * 100)
    : 0;

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tournament.participants;
    return tournament.participants.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }, [tournament.participants, search]);

  const { pageRows, totalPages, page: current } = paginate(filteredParticipants, page);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.textSecondary,
          padding: 0,
        }}
      >
        <Icon name="chevronLeft" size={16} color={COLORS.textSecondary} /> Back to Tournaments
      </button>

      <Card style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 120 }}>
          <TournamentArt name={tournament.name} height={92} />
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontFamily: FONT, fontSize: 18, fontWeight: 700, color: COLORS.text }}>
              {tournament.name}
            </h2>
            <Badge color={status.color} bg={status.bg}>
              {tournament.status}
            </Badge>
          </div>
          <p style={{ margin: "5px 0 0", fontFamily: FONT, fontSize: 13, color: COLORS.textSecondary }}>
            {tournament.date} · {tournament.venue}
          </p>
        </div>
      </Card>

      {tournament.published && (
        <Card style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <QrCode seed={tournament.name + tournament.id} />
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <SectionTitle>Registration Website</SectionTitle>
            <p style={{ margin: "5px 0 10px", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary, wordBreak: "break-all" }}>
              {REGISTRATION_LINK}
            </p>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <button
                type="button"
                className="jt-btn-ghost"
                style={secondaryButtonStyle}
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(REGISTRATION_LINK)
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false));
                }}
              >
                <Icon name={copied ? "check" : "copy"} size={14} />
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={REGISTRATION_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="jt-btn-ghost"
                style={{ ...secondaryButtonStyle, textDecoration: "none" }}
              >
                <Icon name="globe" size={14} /> Open site
              </a>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 18, borderBottom: `1px solid ${COLORS.border}` }}>
        {(["overview", "participants"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "11px 3px",
              fontFamily: FONT,
              fontSize: 13.5,
              fontWeight: 600,
              color: tab === t ? COLORS.blue : COLORS.textSecondary,
              borderBottom: `2px solid ${tab === t ? COLORS.blue : "transparent"}`,
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {[
              { label: "Total Revenue", value: tournament.revenue, icon: "wallet" as const, color: COLORS.success, bg: COLORS.successBg },
              { label: "Participants", value: `${tournament.currentParticipants}`, icon: "usersPlus" as const, color: COLORS.blue, bg: COLORS.light },
              { label: "Registration Filled", value: `${filled}%`, icon: "layers" as const, color: COLORS.warning, bg: COLORS.warningBg },
            ].map((stat) => (
              <Card key={stat.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: stat.bg,
                    flexShrink: 0,
                  }}
                >
                  <Icon name={stat.icon} size={19} color={stat.color} />
                </span>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textSecondary }}>{stat.label}</div>
                  <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, color: COLORS.text }}>{stat.value}</div>
                </div>
              </Card>
            ))}
          </div>

          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionTitle>Tournament Summary</SectionTitle>
            <InfoGrid
              rows={[
                { label: "Organizer", value: tournament.organizer },
                { label: "Chief Arbiter", value: tournament.chiefArbiter },
                { label: "Format", value: tournament.format },
                { label: "Time Control", value: tournament.timeControl },
                { label: "Categories", value: tournament.categories.join(", ") || "—" },
                { label: "Registration closes", value: tournament.registrationDeadline },
                { label: "Entry fee", value: `${tournament.entryFeeMember} member / ${tournament.entryFeeNonMember} non-member` },
                { label: "Rounds", value: tournament.rounds || "—" },
                { label: "Address", value: tournament.address },
              ]}
            />
          </Card>
        </>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 14 }}>
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(0); }}
              placeholder="Search participants"
              label="Search participants"
              style={{ maxWidth: 340 }}
            />
          </div>
          <Table
            columns={["Rank", "Player", "Rating", "Category", "Score", "Payment"]}
            template={PARTICIPANT_TEMPLATE}
            minWidth={760}
          >
            {pageRows.length === 0 && <EmptyRow>No participants yet.</EmptyRow>}
            {pageRows.map((p) => {
              const badge = rankBadge(p.rank);
              const pay = statusChipColors(p.paymentStatus);
              return (
                <TableRow key={p.name} template={PARTICIPANT_TEMPLATE} onClick={() => setDrawer(p)}>
                  <span style={{ fontWeight: 700, color: COLORS.textSecondary }}>#{p.rank}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    <Avatar initials={initialsOf(p.name)} size={28} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </span>
                      {badge && (
                        <span style={{ fontFamily: FONT, fontSize: 10.5, fontWeight: 700, color: badge.color }}>
                          {badge.label}
                        </span>
                      )}
                    </span>
                  </span>
                  <span style={{ color: COLORS.textSecondary }}>{p.rating}</span>
                  <span style={{ color: COLORS.textSecondary }}>{p.category}</span>
                  <span style={{ fontWeight: 600 }}>{p.score}</span>
                  <Badge color={pay.color} bg={pay.bg} style={{ justifySelf: "start" }}>
                    {p.paymentStatus}
                  </Badge>
                </TableRow>
              );
            })}
          </Table>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </Card>
      )}

      {drawer && (
        <Drawer title={drawer.name} onClose={() => setDrawer(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar initials={initialsOf(drawer.name)} size={52} />
              <div>
                <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: COLORS.text }}>{drawer.name}</div>
                <div style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
                  {drawer.age} yrs · rating {drawer.rating} · {drawer.category}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { label: "Wins", value: drawer.wins, color: COLORS.success },
                { label: "Draws", value: drawer.draws, color: COLORS.warning },
                { label: "Losses", value: drawer.losses, color: COLORS.danger },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: "11px 12px",
                    borderRadius: 11,
                    border: `1px solid ${COLORS.border}`,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textSecondary }}>{s.label}</div>
                </div>
              ))}
            </div>

            <InfoGrid
              rows={[
                { label: "Score", value: drawer.score },
                { label: "Prize", value: drawer.prize },
                { label: "Attendance", value: drawer.attendance },
                { label: "Payment", value: drawer.paymentStatus },
                { label: "Guardian", value: drawer.guardian },
                { label: "Contact", value: drawer.contact },
              ]}
            />

            {drawer.notes && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                  fontFamily: FONT,
                  fontSize: 12.5,
                  color: COLORS.textSecondary,
                }}
              >
                {drawer.notes}
              </div>
            )}
          </div>
        </Drawer>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ page --- */

export function TournamentPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>(TOURNAMENTS_SEED);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = tournaments.find((t) => t.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter((t) => t.name.toLowerCase().includes(q) || t.venue.toLowerCase().includes(q));
  }, [tournaments, search]);

  const ongoing = filtered.filter((t) => t.status === "Ongoing");
  const past = filtered.filter((t) => t.status !== "Ongoing");

  if (wizardOpen) {
    return (
      <CreateWizard
        onCancel={() => setWizardOpen(false)}
        onPublish={(t) => {
          setTournaments([t, ...tournaments]);
          setWizardOpen(false);
          setSelectedId(t.id);
        }}
      />
    );
  }

  if (selected) {
    return <TournamentDetail tournament={selected} onBack={() => setSelectedId(null)} />;
  }

  function section(title: string, list: Tournament[]) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionTitle>{title}</SectionTitle>
        {list.length === 0 ? (
          <Card>
            <EmptyRow>No tournaments here.</EmptyRow>
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {list.map((t) => {
              const status = statusChipColors(t.status);
              return (
                <Card
                  key={t.id}
                  className="jt-course-card"
                  style={{ display: "flex", flexDirection: "column", gap: 11, cursor: "pointer" }}
                  onClick={() => setSelectedId(t.id)}
                >
                  <TournamentArt name={t.name} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 9 }}>
                    <span style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>
                      {t.name}
                    </span>
                    <Badge color={status.color} bg={status.bg}>
                      {t.status}
                    </Badge>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                    <div>{t.date}</div>
                    <div>{t.venue}</div>
                    <div>{t.currentParticipants} participants</div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader
        title="Tournament"
        sub="Upcoming and past tournaments"
        action={
          <button type="button" className="jt-btn-primary" style={primaryButtonStyle} onClick={() => setWizardOpen(true)}>
            <Icon name="plus" size={15} color="#fff" /> Create Tournament
          </button>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search tournaments"
        label="Search tournaments"
        style={{ maxWidth: 340 }}
      />

      {section("Ongoing", ongoing)}
      {section("Past Tournaments", past)}
    </div>
  );
}
