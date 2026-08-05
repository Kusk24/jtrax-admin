# JTRAX Admin — JCA Chess School

Admin dashboard for JCA Chess School, built from the `JTRAX Dashboard` design mockup.

Live: https://jtrax-admin.vercel.app

## Stack

Next.js 16 (App Router) · React 19 · TypeScript. No CSS framework — components style
themselves inline from the tokens in `lib/theme.ts`, with `app/globals.css` carrying the
base reset, hover/focus states, keyframes and responsive breakpoints.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
```

## Screens

`/` is the dashboard; every other nav item is `/<section>`, served by `app/[section]/page.tsx`.

| Route | Screen |
|---|---|
| `/login` | Sign in — the only screen outside the app shell |
| `/` | Dashboard — role-dependent (see below) |
| `/admins` | Admin accounts, detail drawer, create-admin flow *(Super Admin only)* |
| `/academy` | Courses and teachers |
| `/classhistory` | Past sessions with attendee lists |
| `/students` | Student list, profile tabs, registration wizard |
| `/payment` | Payment records and the record-payment form |
| `/tournament` | Tournament list, detail, participants, create wizard |
| `/announcement` | Broadcasts to students and parents |
| `/chat` | LINE-style messaging with parents |
| `/settings` | Credit warning rules *(Super Admin only)* |

## Sign in

`/login` is the way in; everything else lives in the `app/(app)` route group, whose layout
redirects there when the `jtrax_session` cookie is missing. Signing in sets that cookie to
the admin's id, so the app opens as whoever signed in, and the sidebar's Logout clears it.

Authentication is **mocked to match the mock data**: the four seed admins in `lib/data.ts`
are the whole account list and they share one demo password (`jca2026`), printed on the
screen along with quick-fill chips for each account. When the backend lands, only
`verifyCredentials` in `lib/auth.ts` has to change — the cookie session and the route guard
above it stay as they are.

## Roles

Three roles — **Super Admin**, **Admin**, **Receptionist** — switched from the chip in the
top bar. The role changes both the nav (Admins and Settings are Super Admin only; Academy
is additionally hidden from Receptionists) and the dashboard itself: Receptionists get the
front-desk view (Find a Student, check in, assign class, add credits), everyone else gets
the management view (quick actions, Needs Follow-up, revenue trend, KPIs).

Switching to a role that can't see the current page redirects home; deep-linking to a
blocked page shows a no-access notice.

## Layout

```
app/            routes + global stylesheet
components/     JtraxShell (sidebar/topbar/role switcher), page-kit (table,
                modal, drawer, pagination), dashboard/*, pages/*
lib/            theme tokens, icon set, seed data, nav config, view-model helpers
```

## Data

Everything is mock data in `lib/data.ts`, seeded from the design. There is no backend yet,
so edits live in React state and reset on reload. `lib/theme.ts` pins `TODAY_REF` to
23 Jul 2026 so relative dates stay deterministic.

Some helpers in `lib/derive.ts` are marked `RECONSTRUCTED` — the design export was
truncated, so those were rebuilt from the seed data rather than ported verbatim.

## Not yet done

- **Real auth.** Sign-in checks the seed list against one shared demo password — no
  backend, no per-account passwords, no reset flow (Forgot password just tells you to ask
  a Super Admin). The role switcher still lets you become any admin after signing in.
- **Tournament photos** use generated gradient art rather than real images.
