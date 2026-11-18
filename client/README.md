# StockWise client

The client is a Next.js application. It calls the Express/TypeScript API from
server-side modules. Keep backend credentials and the session secret on the
server; never expose them with a `NEXT_PUBLIC_` prefix.

## Requirements

- Node.js 20.9 or later
- A running StockWise API and PostgreSQL database

See the [repository README](../README.md#local-development) for the full local
setup, including backend configuration and database prerequisites. Database
changes are managed separately and are not applied by the client.

## Run the client

From the repository root, copy the example environment file and install the
locked dependencies:

```powershell
Copy-Item client/.env.local.example client/.env.local
Set-Location client
npm ci
npm run dev
```

Configure `client/.env.local` with values for:

```env
BACKEND_API_URL=http://127.0.0.1:8001
BACKEND_API_KEY=the-same-private-value-as-server-INTERNAL_API_KEY
SESSION_SECRET=your-unique-random-secret-at-least-32-characters
```

Configure the API in `server/.env` using `server/.env.example`.

Google sign-in is optional. To enable it, configure the Google client ID,
client secret, and redirect URI shown in `client/.env.local.example`; the
client ID must also be configured in `server/.env`. The redirect URI must
match the one registered with Google.

The client runs at [http://localhost:3000](http://localhost:3000). The API
health check is at [http://127.0.0.1:8001/api/health/](http://127.0.0.1:8001/api/health/).

## Frontend checks

Run these from `client/`:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Browser tests

Playwright tests live in the repository-level `tests/` directory. From the
repository root, install the Chromium browser once and run the smoke suite:

```powershell
npx playwright install chromium
npx playwright test --project=chromium
```

The Playwright configuration starts the client dev server automatically. The
current smoke tests cover public authentication pages and verify that
organization pages redirect signed-out visitors to sign in. To run against all
configured browsers, install them with `npx playwright install` and run
`npx playwright test`.

Testing authenticated inventory, orders, sales, reports, and settings workflows
requires a dedicated test account and a running test API/database.

The app includes authentication, organization membership, inventory and CSV
import, purchase orders, dashboard summaries, reports, role management, and
account and organization settings. Manual registration verifies the Gmail
address before creating a StockWise account; its password is separate from the
Gmail password. Email verification, password reset, and new-device login alerts
require SMTP configuration in `server/.env`.
