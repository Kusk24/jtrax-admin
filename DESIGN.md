# JTrax Admin — Design System

The admin console (for Admins and Receptionists at JCA Chess School) uses the
**same clean-blue design as the Parent Portal**, so the whole product feels like
one app.

- **Tokens live in:** `app/globals.css` (the `--jt-*` CSS variables, light + dark)
- **Used from code through:** `lib/theme.ts` (`COLORS`, `ACCENTS`, `ACCENT_TINTS`, `FONT`, `FONT_DISPLAY`)
- **Styling approach:** components use **inline styles** built from `lib/theme.ts`.
  `globals.css` holds only what inline styles can't do: hover, focus, keyframes and
  responsive breakpoints.

> Rule: never hard-code a hex colour in a component. Use `COLORS.*` / `ACCENTS.*`,
> so light and dark mode both work.

---

## 1. Colours

Every colour is defined once with `light-dark(light, dark)`, so the theme switch
(System / Light / Dark, per account) works everywhere automatically.

### Core

| Token (`COLORS.`) | CSS variable | Light | Dark | Use |
|---|---|---|---|---|
| `blue` | `--jt-blue` | `#2E5CB8` | `#7FA7EF` | Primary buttons, links, active nav, focus ring |
| `blueHover` | `--jt-blueHover` | `#234A9F` | `#9DBCF5` | Primary button hover |
| `navy` | `--jt-navy` | `#1E3A70` | `#2E5CB8` | Strong filled shapes |
| `bg` | `--jt-bg` | `#F0F4FC` | `#0F1729` | Page background (tinted, so cards stand out) |
| `surface` | `--jt-surface` | `#FFFFFF` | `#182238` | Cards, modals, drawers, inputs |
| `light` | `--jt-light` | `#E8EEFA` | `#20304F` | Hover fill, table header, soft chips |
| `border` | `--jt-border` | `#E7EBF3` | `#2A3A5C` | Card and field borders, dividers |
| `text` | `--jt-text` | `#1A2B4A` | `#E8EEFB` | Main text |
| `textSecondary` | `--jt-textSecondary` | `#5C6880` | `#A6B3CE` | Labels, hints, sub-titles |
| `disabled` | `--jt-disabled` | `#7D8CA6` | `#6C7A94` | Disabled controls (use this instead of `opacity`) |
| `scrim` | `--jt-scrim` | navy 38% | black 60% | Dim behind modals and drawers |

### Status

Each status has 3 steps: **ink** (text), **Bg** (the tint behind it), **Fill** (dots and charts).

| Status | Text | Background | Fill |
|---|---|---|---|
| Success | `#2A7150` | `#E6F4EC` | `#4CAF7D` |
| Warning | `#9C5A1B` | `#FBEEDF` | `#C97A2E` |
| Danger | `#B54040` | `#FBEAEA` | `#E0645F` |
| Neutral | `textSecondary` | `#EEF1F7` | — |

`statusChipColors(status)` in `lib/theme.ts` picks these for you:

- **Green:** Paid, Ongoing, Active, Present
- **Amber:** Pending, Upcoming
- **Red:** Refunded, Absent
- **Grey:** anything else

### Student status (dashboard donut, roster Status column, credit figures)

| Status | Fill (chart) | Ink (text) |
|---|---|---|
| Normal | `#6CC49A` | `#1F8A5B` |
| Low Credit | `#EE8A8A` | `#C43D3D` |
| Expiring | `#F2CF5B` | `#9A7400` |
| Expired | `#F5A462` | `#B85A14` |
| Inactive | `#C3CAD6` | `#5B6678` |

Use `STUDENT_STATUS_COLOR`, so a status has the same colour everywhere.

### Category accents

For chips, KPI figures and icon wells, always use `ACCENTS.x` text on `ACCENT_TINTS.x` background.

| Accent | Ink | Tint | Used for |
|---|---|---|---|
| navy | `#1E3A70` | `#E3E9F6` | Master class |
| blue | `#2E5CB8` | `#E8EEFA` | Admin role |
| green | `#2A7150` | `#E6F4EC` | Beginner class |
| amber | `#9C5A1B` | `#FBEEDF` | Intermediate class, Receptionist role |
| red | `#B54040` | `#FBEAEA` | Alerts |
| plum | `#5C4A8A` | `#EAE6F5` | Weekend class |

Every accent-on-tint pair passes 4.5:1 contrast in both themes.

### Fixed colours (no dark version)

- **LINE green** `#06C755`: LINE's brand colour; don't restyle it.
- **Chess board:** light `#EEF3FA`, dark `#A3B6D2`, last-move highlight `#F2D98C`,
  pieces `#FDFEFE` / `#1B3260`. These match the student and parent boards, so a game
  looks the same to everyone.

---

## 2. Typography

| Role | Font | Token |
|---|---|---|
| Body, labels, tables, buttons | **DM Sans** | `FONT` |
| Headings, big numbers | **Poppins** (400–700) | `FONT_DISPLAY` |
| Thai (fallback for both) | **Mitr** | automatic |

For Thai (`html[lang="th"]`), line height goes up to **1.65** with no letter-spacing, so
tone marks don't collide.

### Type scale

| Element | Size | Weight | Font |
|---|---|---|---|
| Page title (`PageHeader`, h1) | 23px | 700 | Poppins, `-0.01em` |
| Sub-page title (h2) | 19px | 700 | Poppins |
| Card / section title (`SectionTitle`) | 16px | 600 | Poppins |
| Body / table cell | 14px | 400–600 | DM Sans |
| Input text | 14.5px | 400 | DM Sans |
| Field label | 13.5px | 600 | DM Sans, `textSecondary` |
| Table header | 12.5px | 600 | UPPERCASE, `0.04em` |
| Badge / chip | 12.5px | 600 | DM Sans |

---

## 3. Shape and spacing

| Thing | Value |
|---|---|
| Card radius | **16px** |
| Card border | **1.5px** `border` |
| Card padding | **18px** |
| Input radius | 9px |
| Input height | 40px (padding `9px 12px`) |
| Buttons, badges, pills | fully rounded (`999px`) |
| Gap between cards | 16px |
| Card hover shadow | `0 8px 24px rgb(36 59 99 / .14)` + lift `-2px` |
| Modal shadow | `0 24px 60px rgb(20 33 58 / .28)` |

Cards are flat by default: no shadow until hover, and only on clickable cards.

---

## 4. Components

Shared pieces live in `components/ui.tsx`, `components/page-kit.tsx`,
`components/crud.tsx` and `components/detail.tsx`. Reuse these; don't restyle
one-off copies.

### Buttons (`page-kit.tsx`)

| Style | Look | When |
|---|---|---|
| `primaryButtonStyle` | Blue fill, white text, pill | The main action on a screen (Save, Create) |
| `secondaryButtonStyle` | White, 1px border, dark text | Cancel, Export, other actions |
| `dangerButtonStyle` | Red tint, red border and text | Delete (before confirming) |
| `dangerSolidButtonStyle` | Red fill, white text | The button that actually deletes |

All buttons: padding `9px 16px`, 14px / 600, 7px gap between icon and text.
Delete always looks red, even before it's clicked.

### Other building blocks

- **`Card`**: the standard white panel.
- **`PageHeader`**: the only title on a page, with the actions on the right.
- **`SectionTitle`**: the heading inside a card.
- **`Badge`**: pill-shaped status or category chip (use with `statusChipColors`).
- **`Avatar`**: round initials, blue on light blue.
- **`Table` / `TableRow` / `EmptyRow` / `Pagination`**: 12 rows per page, light-blue header, row hover `bg`.
- **`FilterBar`, `SearchInput`, `SelectFilter`**: the row above a table.
- **`Modal`**: centred, 560px wide (max 92vw), 16px radius. Centre it with auto margins, **not** `translateX` (the fade-in animation breaks that).
- **`Drawer`**: slides in from the right, 460px wide (max 94vw).
- **`CrudFormModal`, `ConfirmModal`, `ConfirmDeleteModal`, `RowActions`**: create, edit and delete flows.
- **`BackLink`, `DetailHeader`, `EditButton`, `DeleteButton`, `DangerPanel`**: detail pages.
- **`InfoGrid`, `ContactActions`**: label/value lists; Call, LINE and Email buttons.
- **Charts** (`components/charts`): `BarChart`, `Donut`, `ProgressRing`, `RankedBars`, `Sparkline`.

### Icons

`lib/icons.ts` is the console's own set of 24px stroke icons, with chess pieces and a
LINE bubble. Use `<Icon name="…" />`; don't mix in other icon libraries.

### Tournament banner

- 3:1 ratio, max height **223px**.
- It is the page header on the tournament detail page: status tag at the top-right,
  Edit and Delete underneath, tabs directly below.

---

## 5. Layout and responsive

- **Breakpoints to check:** 390 (phone), 768 (tablet), 1280 (desktop).
- **Desktop (≥1024px):** fixed sidebar on the left.
  - Collapsed, it is **76px** (icons only, labels shown as tooltips).
  - Expanded, it is **232px**.
  - Content padding is `20px 24px`.
- **Below 1024px:** the sidebar turns into a top strip that scrolls sideways.
  - Nav items are at least **44px** tall (touch size).
  - Content padding is `16px 14px`.
- Two-column rows (`.jt-split`, `.jt-duo`, …) stack into one column on narrow screens.
- No page may scroll sideways at 390px.

### Navigation order

Home → Academy (Admin only) → Class History → Games → Students → Parents → Payment →
Tournament → Announcement → Chat → Settings

---

## 6. Interaction and accessibility

- **Focus:** a 2px `blue` outline, 2px offset, on every focusable element.
- **Hover:** cards lift 2px and turn light blue; rows fill with `bg`; ghost buttons get a blue border.
- **Motion:** 160–200ms ease. Everything is turned off under `prefers-reduced-motion`.
- **Contrast:** all text passes **4.5:1**. That's why status colours have a darker
  "ink" step for text and a softer "fill" step for charts.
- **Disabled:** use `COLORS.disabled` with `cursor: not-allowed`. Don't also fade it
  with `opacity`, because the two together make the text unreadable.
- **Language:** every visible string goes in `messages/en.json` **and** `messages/th.json`.

---

## 7. Quick checklist for a new screen

1. Page starts with `PageHeader` (one h1).
2. Content sits in `Card`s on the `bg` page colour.
3. Colours come from `COLORS` / `ACCENTS` only; check it in dark mode.
4. Buttons use the four button styles; there's one primary action per area.
5. Tables use `Table` + `Pagination`; filters go in `FilterBar`.
6. Check it at 390 / 768 / 1280 with no sideways scroll.
7. Add English and Thai text for every label.
