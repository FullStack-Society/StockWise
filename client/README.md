# StockWise client

The Next.js frontend uses server-side API modules to communicate with the FastAPI backend. Keep API credentials and the session secret on the server; do not expose them with a `NEXT_PUBLIC_` prefix.

## Run locally

1. Start PostgreSQL and configure `DATABASE_URL`, `OWNER_EMAIL`, and a unique `OWNER_PASSWORD` of at least 12 characters in `server/.env`.
2. From `server`, install backend dependencies and start FastAPI:

   ```powershell
   pip install -r requirements.txt
   python -m uvicorn app.main:app --reload --port 8000
   ```

3. Copy `client/.env.local.example` to `client/.env.local` and set:

   ```env
   API_URL=http://127.0.0.1:8000
   SESSION_SECRET=your-unique-random-secret-at-least-32-characters
   ```

4. From `client`, install the locked frontend dependencies and start Next.js:

   ```powershell
   npm ci
   npm run dev
   ```

The frontend runs at `http://localhost:3000`; API documentation is at `http://localhost:8000/docs`.

The app includes authentication and organization membership, inventory management and CSV import, dashboard summaries, reports, user/role management, and account/organization settings. Available actions depend on the signed-in user's role and organization permissions.
