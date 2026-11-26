# JTrax admin console

The academy's staff console manages students and families, class attendance, payments and credits, tournaments, and communications. Admin and Receptionist accounts sign in against the JTrax API. The backend enforces each account's permissions.

## Run locally

1. Start the [Go backend](https://github.com/Kusk24/jtrax-backend#run-locally) on port 8790.
2. From this repository root, use the Node version in [.nvmrc](.nvmrc) and the pnpm version pinned in [package.json](package.json).

```sh
pnpm install
pnpm dev --port 3001
```

Open `http://localhost:3001/login`. Use the local admin account described in the backend quickstart. This port lets the family portal run alongside the console on port 3000.

| Setting | Purpose |
| --- | --- |
| `JTRAX_API_URL` | Server-side backend base URL. Leave unset to use `http://localhost:8790`. |
| `NEXT_PUBLIC_PORTAL_URL` | Public URL of the family portal, used for shareable tournament links and QR codes. For the local portal, set it to `http://localhost:3000`. |

Set overrides in `.env.local`. Production hosting and operations are described in the [Lightsail runbook](https://github.com/Kusk24/jtrax-docs/blob/main/ops/jtrax-on-lightsail.md).

## Where to make changes

- [Routes](app) contain the sign-in, password recovery, dashboard, and section pages. [Components](components) render the screens, tables, and forms.
- [Authentication](lib/auth.ts) resolves the backend identity from the console's HTTP-only session cookie. The [API proxy](app/api/%5B...path%5D/route.ts) attaches the bearer token on requests to the backend.
- [Navigation](lib/nav.ts) defines which sections each staff role sees. [Theme tokens](lib/theme.ts) and [translations](messages) are shared across the console.

Run `pnpm test` for Vitest, `pnpm lint` for ESLint, and `pnpm build` for the production build.
