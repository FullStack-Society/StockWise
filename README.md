# StockWise

StockWise is a multi-organization inventory management application. Organization members can manage products and stock levels, review stock movement and reports, and manage organization access according to their role.

## Stack

- **Frontend:** Next.js 16, React, TypeScript, CSS Modules
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL

## Local setup

1. Start PostgreSQL and configure `DATABASE_URL`, `OWNER_EMAIL`, and `OWNER_PASSWORD` in `server/.env`.
2. From `server`, install backend dependencies and start the API:

   ```powershell
   pip install -r requirements.txt
   python -m uvicorn app.main:app --reload --port 8000
   ```

3. Copy `client/.env.local.example` to `client/.env.local`. Set `API_URL` (normally `http://127.0.0.1:8000`) and a unique `SESSION_SECRET` of at least 32 characters.
4. From `client`, install and start the frontend:

   ```powershell
   npm ci
   npm run dev
   ```

The frontend runs at `http://localhost:3000`; the FastAPI docs run at `http://localhost:8000/docs`.

## Notes

- `server/requirements.txt` is the backend dependency list.
- Database SQL files under `migrations/` are intentionally excluded from Git in this repository. Manage and share database setup separately.
- The application does not currently provide POS checkout, payments, accounting, or offline synchronization.
