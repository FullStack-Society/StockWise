# StockWise user and organization management

This document describes the current user-management implementation. The frontend is in `client/`; the FastAPI backend is in `server/app/`.

## Current behavior

- Authentication uses database-backed accounts and signed session cookies.
- Users can register and sign in with a password or Google. Password reset is
  email-based and requires Resend configuration. Authenticator-app two-factor
  authentication is optional.
- Users can belong to organizations with role-based access.
- Owners can create and own multiple organizations, then switch the active
  organization. Inventory and organization actions use that active membership.
- The Users page provides organization membership and invitation controls.
- Members appear Active while their browser sends presence heartbeats and
  Offline when the heartbeat expires.
- A successful staff or manager sign-in can notify owners and managers in that
  organization. Owner sign-ins do not notify managers, and notifications do
  not cross organization boundaries.
- Organization settings allow the owner to edit the organization name; other roles cannot use that action.
- Owners and managers receive an in-app notification when a non-owner leaves
  an organization. The departing user and other members do not.
- Backend routes and services perform the corresponding checks. UI visibility
  alone is not an authorization boundary.

## Main code locations

- `client/app/pages/users/page.tsx` — Users route.
- `client/components/features/users/` — membership, invitation, and role UI.
- `client/lib/auth/` — session and role helpers.
- `client/lib/api/organizations.ts` — server-side organization API calls.
- `client/components/layout/PresenceHeartbeat.tsx` — member presence updates.
- `client/components/layout/TopBar.tsx` — organization switching and top-level controls.
- `server/app/api/organizations.py` — organization endpoints.
- `server/app/services/` — organization and user business rules.
- `server/app/db/` — database access.

Update this overview when routes, role rules, or ownership behavior change. Do not use this document as a substitute for reviewing the backend authorization checks.
