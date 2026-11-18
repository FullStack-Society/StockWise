# StockWise Node.js API

This Express and TypeScript service is the StockWise backend. It uses the
existing PostgreSQL schema and preserves the `/api/...` contract used by the
client. Database migrations remain in the repository-level `migrations/`
directory and are not applied automatically by the API.

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and a random
   `INTERNAL_API_KEY` of at least 32 characters. Keep these values private.
   Set `OWNER_EMAIL` and `OWNER_PASSWORD` when the database has no owner yet.
2. Install dependencies from this directory with `npm ci`.
3. Run `npm run dev` to start the Node API on port 8001.

Use `npm test`, `npm run typecheck`, and `npm run build` for local checks.
The API uses the existing PostgreSQL schema and database routines; do not
create a parallel schema or run destructive migrations.

For production, run `npm run build` and `npm start`. The server provisions the
initial owner on startup only when the database does not already contain one.

## Source layout

```text
src/
├── config/       # Environment parsing and PostgreSQL pool
├── controllers/  # Extracted HTTP request/response handlers
├── middlewares/  # Authentication, authorization, and error handling
├── models/       # Domain entities and PostgreSQL row types
├── routes/       # Endpoint definitions, grouped by API domain
├── schemas/      # Runtime request validation and inferred DTOs
├── services/     # Authentication utilities, email, and owner setup
├── tests/        # Backend tests (separate from browser/Playwright tests)
├── types/        # Shared API DTO and Express request types
├── utils/        # Reusable request and application helpers
├── app.ts        # Express app and route registration
└── server.ts     # Startup, database initialization, and shutdown
```

Database tables and routines are managed by the repository-level SQL
migrations. `models/` and `types/` describe their TypeScript representations;
they do not define or apply a second database schema.

Apply unapplied numbered migrations in order before deploying backend changes.
The controller-query extraction adds migrations `034` through `038`; the API
does not apply them automatically.

Each API domain has a route module in `routes/` and a matching request handler
module in `controllers/`. Shared authentication and error middleware live in
`middlewares/`; startup configuration and PostgreSQL pool setup are separated
under `config/`. SQL migrations remain the source of truth for database
objects. Business queries and writes live in PostgreSQL functions and
procedures, which controllers call while handling request and response shaping.
Read functions return data; procedures perform database writes where
appropriate. Node retains transaction boundaries and HTTP-specific validation
and response handling.
