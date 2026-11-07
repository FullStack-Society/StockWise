# StockWise client

The Next.js frontend uses server-side API modules to communicate with the FastAPI backend. Keep API credentials and the session secret on the server; do not expose them with a `NEXT_PUBLIC_` prefix.

## Run locally

1. Start PostgreSQL and configure `DATABASE_URL` and `INTERNAL_API_KEY` in `server/.env`. Set `OWNER_EMAIL` and a unique `OWNER_PASSWORD` of at least 12 characters only if the database does not already have an owner.
2. Prepare the database as described in the root [README](../README.md): run migrations `001` through `023` in order on a new database. For an existing database on the former `019` schema, run `migrations/rebaseline_existing.sql` once, then migrations `007` through `023`. Do not run the archived scripts.
3. From `server`, install backend dependencies and start FastAPI:

   ```powershell
   pip install -r requirements.txt
   python -m uvicorn app.main:app --reload --port 8000
   ```

4. Copy `client/.env.local.example` to `client/.env.local` and set:

   ```env
   BACKEND_API_URL=http://127.0.0.1:8000
   BACKEND_API_KEY=the-same-value-as-server-INTERNAL_API_KEY
   SESSION_SECRET=your-unique-random-secret-at-least-32-characters
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   ```

   Set `BACKEND_API_KEY` to the same unique value as `INTERNAL_API_KEY` in `server/.env`.
   Also set `GOOGLE_CLIENT_ID` in `server/.env`. To enable password-reset messages and new-device login alerts, set `SMTP_USERNAME` and `SMTP_APP_PASSWORD` in `server/.env` for a dedicated Gmail sender. Keep all credential values local and private.

5. From `client`, install the locked frontend dependencies and start Next.js:

   ```powershell
   npm ci
   npm run dev
   ```

   Run `npm run lint` and `npx tsc --noEmit` to check the frontend with ESLint and TypeScript.

The frontend runs at `http://localhost:3000`; API documentation is at `http://localhost:8000/docs`.

The app includes password and Google authentication, optional authenticator-based two-factor authentication, organization membership, inventory management and CSV import, purchase orders, dashboard summaries, reports, user/role management, and account/organization settings. Email-based password reset and new-device alerts require SMTP configuration. Available actions depend on the signed-in user's role and active organization.
