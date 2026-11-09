# StockWise client

The client is a Next.js application. It calls the FastAPI backend from
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
BACKEND_API_URL=http://127.0.0.1:8000
BACKEND_API_KEY=the-same-private-value-as-server-INTERNAL_API_KEY
SESSION_SECRET=your-unique-random-secret-at-least-32-characters
```

Google sign-in is optional. To enable it, configure the Google client ID,
client secret, and redirect URI shown in `client/.env.local.example`; the
client ID must also be configured in `server/.env`. The redirect URI must match
the one registered with Google.

The client runs at [http://localhost:3000](http://localhost:3000). The API
documentation is at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Frontend checks

Run these from `client/`:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

The app includes authentication, organization membership, inventory and CSV
import, purchase orders, dashboard summaries, reports, role management, and
account and organization settings. Manual registration verifies the Gmail
address before creating a StockWise account; its password is separate from the
Gmail password. Email verification, password reset, and new-device login alerts
require SMTP configuration in `server/.env`.
