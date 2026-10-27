# StockWise user and organization management

This document describes the current user-management implementation. The frontend is in `client/`; the FastAPI backend is in `server/app/`.

## Current behavior

- Authentication uses database-backed accounts and signed session cookies.
- Users can belong to organizations with role-based access.
- The Users page provides organization membership and invitation controls.
- Organization settings allow the owner to edit the organization name; other roles cannot use that action.
- Backend routes and services perform the corresponding checks. UI visibility alone is not an authorization boundary.

## Main code locations

- `client/app/pages/users/page.tsx` — Users route.
- `client/components/features/users/` — membership, invitation, and role UI.
- `client/lib/auth/` — session and role helpers.
- `client/lib/api/organizations.ts` — server-side organization API calls.
- `server/app/api/organizations.py` — organization endpoints.
- `server/app/services/` — organization and user business rules.
- `server/app/db/` — database access.

Update this overview when routes, role rules, or ownership behavior change. Do not use this document as a substitute for reviewing the backend authorization checks.
