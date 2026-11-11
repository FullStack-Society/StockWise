# StockWise

StockWise is a web-based retail inventory management system. It helps retail
teams organize products, monitor stock, manage purchase orders, and review
inventory activity across an organization.

> **Project status:** Active development. Features and interfaces may change.

## Contents

- [Features](#features)
- [Technology](#technology)
- [System overview](#system-overview)
- [Repository structure](#repository-structure)
- [Main application routes](#main-application-routes)
- [Important files](#important-files)
- [Local development](#local-development)
- [Roles and organization behavior](#roles-and-organization-behavior)
- [Current limitations](#current-limitations)

## Features

### Accounts and organizations

- Register manually with a Gmail address verified by an emailed code, then sign
  in with a StockWise-specific password. Google sign-in uses Google OAuth and
  does not use the StockWise password.
- Sign in or register with Google, and reset a password through a time-limited email link.
- Optionally require an authenticator-app code at sign-in, with one-use recovery codes.
- Registration requires a password with at least 8 characters, including an
  uppercase letter and a special character.
- Create an organization or join one by invitation.
- Switch between organizations the signed-in user belongs to.
- Manage organization members and their roles. Current organization membership
  is used to determine access and permissions.
- See whether organization members are Active or Offline and receive in-app
  sign-in alerts for managers and staff. Sign-in alerts stay within the active
  organization, and owner sign-ins do not alert managers.
- Show organization setup on organization-backed pages when the user has not
  selected or joined an organization; Settings is excluded from that setup
  panel.
- Notify active owners and managers when a non-owner leaves an organization.
- Configure account preferences, including display, currency, timezone, and
  notification options.

### Inventory

- Create, edit, and soft-delete products.
- Manage product categories; deleting a category leaves its products available
  without a category.
- Import products from CSV and export inventory data.
- Track on-hand quantities, reorder points, stock status, and inventory value.
- Optionally record product variants.
- Record opening stock, stock issues, stock adjustments, physical counts, and
  stock movement history.
- Confirm product deletion in a centered in-app dialog. Deleted products are
  hidden from active inventory.
- Use the same confirmation flow for deleting one product or a selection of
  products.

### Purchase orders

- Create purchase orders from products in the inventory.
- Receive orders, including partial deliveries, and update inventory as stock
  is received.
- Edit orders while they are still open. Orders with received quantities cannot
  be edited.
- Filter orders by a date range.
- Show order statistics below the order list in normal page flow.

### Dashboard and reports

- View dashboard inventory summaries and recent inventory activity.
- Review inventory reports and export report data.
- Review report footer totals for the current calendar month.
- Review current inventory selling value and stock movement in reports.
- Record sales from an inventory-backed checkout and review recorded sales
  revenue in reports. Payment confirmation is handled outside StockWise.
- Review stock received and issued by day, week, month, or year; chart value is
  an estimate based on current selling prices, not historical sales.
- Optionally collect anonymous daily page-view totals from opted-in members;
  owners and managers can review the organization totals in Reports.

The login and registration pages share a larger, more readable form and
branding style.

## Technology

| Area            | Technology                       |
| --------------- | -------------------------------- |
| Web application | Next.js 16, React 19, TypeScript |
| Styling         | CSS Modules                      |
| API             | Node.js, Express, TypeScript     |
| Database access | node-postgres (`pg`)             |
| Database        | PostgreSQL                       |

## System overview

```text
Browser
  |
  v
Next.js client (client/)
  |  Server Components, Server Actions, server-side API client
  |  Auth/session handling and input validation
  v
Express/TypeScript API (server/)
  |  Authentication, organization and role checks
  |  Routes -> controllers -> PostgreSQL functions and procedures
  v
PostgreSQL
```

The client communicates with the backend from server-side modules. Backend API
credentials and the client session secret must stay on the server and must not
be exposed through `NEXT_PUBLIC_` variables.

## Repository structure

```text
StockWise/
├── client/                         # Next.js frontend
│   ├── app/                        # Routes, layouts, API callbacks, global styles
│   ├── components/
│   │   ├── features/               # Dashboard, inventory, sales, orders, reports, settings, users
│   │   ├── layout/                 # App shell, navigation, runtime components
│   │   ├── providers/              # User preference context
│   │   └── ui/                     # Shared UI components
│   ├── lib/
│   │   ├── api/                    # Typed server-side API clients
│   │   ├── auth/                   # Authentication actions and sessions
│   │   ├── inventory/              # Inventory actions, types, and utilities
│   │   ├── orders/                 # Purchase order actions and utilities
│   │   ├── sales/                  # Sales actions
│   │   ├── dashboard/              # Dashboard data and types
│   │   ├── organization/           # Active organization context and actions
│   │   ├── settings/, users/       # Settings and user helpers
│   │   ├── utils/                  # Shared helpers
│   │   └── routes.ts               # Application route definitions
│   └── styles/                     # Feature and layout CSS Modules
├── server/
│   ├── src/
│   │   ├── config/                 # Environment and database pool
│   │   ├── controllers/            # API-domain request handlers
│   │   ├── middlewares/            # Authentication, authorization, and errors
│   │   ├── models/                 # Domain and database-row types
│   │   ├── routes/                 # API endpoint definitions
│   │   ├── schemas/                # Request validation and DTOs
│   │   ├── services/               # Reusable business and integration logic
│   │   ├── types/                  # Shared API and Express types
│   │   └── utils/                  # Shared helpers
│   ├── .env.example                # Backend environment template
│   └── package.json                # Node.js backend dependencies and scripts
├── docs/                           # User-management implementation guide
└── README.md
```

## Main application routes

| Route              | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `/login`           | Sign in                                             |
| `/register`        | Create an account                                   |
| `/forgot-password` | Request an email password-reset link                |
| `/reset-password`  | Set a new password from a valid reset link          |
| `/pages/dashboard` | Dashboard                                           |
| `/pages/inventory` | Products, categories, stock operations, and history |
| `/pages/orders`    | Purchase orders and receiving                       |
| `/pages/sales`     | Inventory-backed sales checkout                     |
| `/pages/reports`   | Inventory reports and exports                       |
| `/pages/users`     | Organization setup and member management            |
| `/pages/settings`  | Account and organization settings                   |

The API is mounted under `/api`. Its main route groups are `/api/auth`,
`/api/health`, `/api/inventory`, `/api/orders`, `/api/organizations`,
`/api/sales`, `/api/settings`, and `/api/reports`.

## Important files

### Frontend

| Path                                                                             | Responsibility                                        |
| -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `client/app/`                                                                    | Next.js route entry points                            |
| `client/components/features/sales/`                                              | Sales checkout, barcode scanning, and payment prompts |
| `client/components/features/inventory/`                                          | Inventory browser, table, filters, and dialogs        |
| `client/components/features/inventory/modals/DeleteProductConfirmationModal.tsx` | Centered product-delete confirmation                  |
| `client/components/features/orders/`                                             | Order list, filters, and create/edit/receive dialogs  |
| `client/components/features/reports/`                                            | Report tables and summary UI                          |
| `client/components/features/login/`                                              | Login, registration, and brand panels                 |
| `client/lib/api/`                                                                | Backend API clients used by the app                   |
| `client/lib/sales/`                                                              | Sales server actions                                  |
| `client/lib/inventory/actions.ts`                                                | Inventory server actions                              |
| `client/lib/inventory/validation.ts`                                             | Product form validation                               |
| `client/lib/organization/page-context.ts`                                        | Active organization and membership context            |
| `client/styles/`                                                                 | Feature-specific CSS Modules                          |

### Backend

| Path                      | Responsibility                                                 |
| ------------------------- | -------------------------------------------------------------- |
| `server/src/server.ts`    | API startup, initial-owner provisioning, and graceful shutdown |
| `server/src/app.ts`       | Express middleware and route registration                      |
| `server/src/routes/`      | API endpoint definitions grouped by domain                     |
| `server/src/controllers/` | HTTP handlers grouped by domain                                |
| `server/src/schemas/`     | Runtime request validation and inferred DTOs                   |
| `server/src/models/`      | Domain entities and PostgreSQL row types                       |
| `server/src/config/`      | Environment configuration and PostgreSQL pool                  |

### Documentation

| Path                                           | Responsibility                       |
| ---------------------------------------------- | ------------------------------------ |
| `docs/user-management-implementation-guide.md` | User-management implementation notes |

## Local development

### Requirements

- Node.js 20.9 or later
- PostgreSQL

### 1. Configure the backend

In PowerShell from the repository root:

```powershell
Set-Location server
Copy-Item .env.example .env
npm ci
```

Edit `server/.env` and configure at least:

- `DATABASE_URL` — PostgreSQL connection URL.
- `INTERNAL_API_KEY` — private key shared with the Next.js server.
- `CLIENT_URL` — frontend origin, usually `http://localhost:3000`.

Before starting the application, provision a PostgreSQL database configured for
StockWise. Keep database credentials and private database setup details out of
public documentation.

If the database has no owner yet, set `OWNER_EMAIL` and `OWNER_PASSWORD` to
create the initial owner. The owner password must be at least 12 characters.
Do not commit `.env` files.

For authenticator-based two-factor authentication, `TOTP_ENCRYPTION_KEYS` can
be set to a comma-separated Fernet key ring. Generate a URL-safe key with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url').padEnd(44, '='))"
```

Keep prior keys in the key ring when rotating keys so existing authenticator
secrets remain decryptable. Keep all keys private.

Start the API:

```powershell
npm run dev
```

Keep the backend process running.

### 2. Configure the frontend

Open another PowerShell terminal from the repository root:

```powershell
Set-Location client
Copy-Item .env.local.example .env.local
```

Set these values in `client/.env.local`:

```env
BACKEND_API_URL=http://127.0.0.1:8001
BACKEND_API_KEY=the-same-private-value-as-server-INTERNAL_API_KEY
SESSION_SECRET=your-unique-random-secret-at-least-32-characters
```

Google sign-in is optional. To enable it, configure `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in the frontend environment,
and `GOOGLE_CLIENT_ID` in `server/.env`. The redirect URI must match the one
registered with Google. Manual registration email verification, password-reset
email, and new-device alerts require SMTP settings in `server/.env`.

Install the locked frontend dependencies and start Next.js:

```powershell
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API health check is
at [http://127.0.0.1:8001/api/health/](http://127.0.0.1:8001/api/health/).

### Useful frontend checks

Run these commands from `client/`:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Roles and organization behavior

Data and actions are scoped to the user's active organization. Access checks
must use the user's current membership and role in that organization rather
than relying only on a possibly stale role captured at login.

Organization membership and available actions are enforced by backend
endpoints as well as reflected in the client UI. Owners and managers receive
notifications when a non-owner leaves an organization. All active organization
members can manage inventory categories.

The organization roles used by the app are **owner**, **manager**, and
**staff**. The owner manages the organization; manager and staff capabilities
are controlled by the app's role and permission checks.

## Current limitations

- Password reset and new-device login alerts depend on a correctly configured
  SMTP sender. Google sign-in depends on OAuth credentials and an authorized
  redirect URI.
- Sales checkout records the selected payment method and updates inventory.
  Payment processing, payment verification, and receipt generation are not
  included. Sales reports cover recorded sales only.
- Supplier management and automatic supplier ordering are not implemented.
- Advanced demand forecasting is not implemented.
- Inventory requires an internet connection and a live backend/database.
- Purchase orders track products and quantities; they are not synchronized
  with an external supplier system.
  The stock movement chart estimates received value using current selling
  prices; it does not report COGS or historical prices.

## Project documentation

- [User-management implementation guide](./docs/user-management-implementation-guide.md)
- [Frontend-specific setup notes](./client/README.md)
