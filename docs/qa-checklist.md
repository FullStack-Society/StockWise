# StockWise QA Checklist

Use this checklist for a manual smoke and regression test. Record the date,
environment, tester, and any failed item with steps to reproduce.

**Result key:** ⏳ Not tested · ✅ Pass · ❌ Fail · ➖ Not applicable

## Test setup

- [ ] For a new database, apply the consolidated migrations in numeric
      order as listed in the root [README](../README.md). For an existing
      database already on the former migration `019` schema, run
      `migrations/rebaseline_existing.sql` once, then apply
      migrations `007` through `023` in numeric order.
- [ ] Start the API and frontend using the setup instructions in the root
      [README](../README.md).
- [ ] Prepare test accounts for an owner, a manager, and a staff member in the
      same organization.
- [ ] Prepare a disposable product with a known quantity and reorder point.
- [ ] Prepare products with distinct unit costs and selling prices.
- [ ] Prepare two organizations with owner, manager, and staff accounts to
      verify usage analytics consent and tenant isolation.
- [ ] Run the automated server contract checks in the development setup before
      starting manual regression.

## Authentication and organization access

- [ ] Log in with valid credentials and log out.
- [ ] Sign in with Google using the account email and confirm Google shows as
      connected in Settings → Security & Privacy; verify Account Health reflects
      the Google and authenticator checks as 0/2, 1/2, or 2/2.
- [ ] Invalid credentials show an error; required fields are validated.
- [ ] Registration rejects passwords under 12 characters or without a capital
      letter and a special character; valid passwords can register successfully.
- [ ] Password entry is masked, with an available show/hide control.
- [ ] Request a password-reset link for a registered account; verify the email
      arrives, the link works once before expiry, and the new password can sign in.
- [ ] Enable login alert emails and sign in from a new browser/device using
      password, Google, and two-factor flows; verify an alert arrives at the
      account email on first use, but not on repeat sign-ins from that browser.
- [ ] Failed sign-ins and incomplete two-factor challenges do not send login alerts.
- [ ] Enable automatic sign-out, remain inactive for 30 minutes, and verify the
      session signs out; activity in another tab keeps the session active.
- [ ] Unknown email addresses do not reveal whether an account exists.
- [ ] A logged-out user cannot access protected pages or actions.
- [ ] Save a changed profile name and verify it appears in the settings profile,
      top bar, and organization member list.
- [ ] An invited user can accept or decline an invitation; invalid or expired
      invitations show a useful error.
- [ ] A user with multiple organizations can switch organizations and sees
      only the selected organization's data.
- [ ] Create a second organization from the top bar; verify the signed-in owner
      can switch between both and each organization retains separate inventory.
- [ ] Settings shows “Owner of [organization]” for an owner, the selected
      membership role for a member, and “No organization” when there are no
      memberships.
- [ ] An owner cannot delete their account while they own any organization,
      including one that is not currently selected.
- [ ] Transfer ownership to an active member; verify the new owner is promoted,
      the former owner becomes a manager, and account deletion becomes available
      once no owned organizations remain.
- [ ] Delete a disposable organization as its owner; verify organization data
      is removed and the account can then be deleted.

## Roles and permissions

- [ ] Owner can access organization management, reports, settings, and billing.
- [ ] Manager can manage staff and permitted organization settings, but cannot
      manage the owner, other managers, billing, or account deletion.
- [ ] Staff can manage inventory but cannot access reports or manage users.
- [ ] Restricted actions are denied by the backend, not only hidden in the UI.
- [ ] An owner cannot leave an organization before transferring ownership.
- [ ] When a manager or staff member leaves an organization, active owners and
      managers receive a notification; other members and the departing user do
      not.
- [ ] Mark a leave notification as read and verify it remains read after reload.

## Inventory and CSV

- [ ] Create a product with valid details, category, opening quantity, and
      reorder point; verify it appears in inventory.
- [ ] Required and invalid values are rejected with a clear message.
- [ ] Edit product details and verify stock is unchanged unless explicitly
      adjusted.
- [ ] Search, filter, and paginate inventory; verify results and counts.
- [ ] As an owner, manager, and staff member, add a category and verify it is available in
      product forms and filters after reload.
- [ ] Remove a category and verify products assigned to it remain in inventory
      as uncategorized; verify the removed category stays deleted after reload.
- [ ] Verify all active organization members can add or remove categories
      through the API.
- [ ] Delete a product after confirmation and verify it is removed.
- [ ] Export inventory to CSV and verify the downloaded data.
- [ ] Import a valid CSV; malformed rows and duplicate SKUs are reported without
      silently importing invalid data.
- [ ] Create and edit distinct Unit Cost and Selling Price values; confirm the
      values remain separate after reload.
- [ ] Add a variant and verify it remains attached to the product.
- [ ] Set a default low-stock threshold in Preferences and create/import a
      product without an explicit threshold; verify the default is used and
      existing products are unchanged.

## Stock operations and alerts

- [ ] Receive stock and issue stock; verify the on-hand quantity after each.
- [ ] Reject invalid or negative quantities and prevent stock from going below
      zero.
- [ ] Record a physical stock count and verify the resulting quantity and
      movement history.
- [ ] Verify movement history identifies the product, change, time, and actor.
- [ ] Verify stock status and dashboard alerts respond to the product's
      configured reorder point. Do not use the old fixed 25/50 quantity bands.
- [ ] Verify changes remain correct after refreshing and signing in again.

## Purchase orders

- [ ] Create a purchase order with one or more products and valid quantities.
- [ ] Edit an open purchase order's notes, products, and quantities; verify
      changes persist and do not alter inventory.
- [ ] Verify a purchase order can no longer be edited after receiving any items.
- [ ] Verify an order does not change on-hand stock before receipt.
- [ ] Receive part of an item quantity; verify on-hand stock increases only by
      the received amount and the remaining quantity is correct.
- [ ] Receive the remaining quantity and verify the order is complete.
- [ ] Reject zero, negative, or over-remaining receipt quantities.
- [ ] Verify order and receipt data remain correct after refreshing.

## Reports, settings, and responsive behavior

- [ ] Verify dashboard totals and reports reflect recorded inventory movements.
- [ ] Verify the Reports footer cards show current calendar-month totals,
      independently of the selected report period.
- [ ] Use the Reports chart's Daily, Weekly, Monthly, and Yearly grouping and
      zoom controls; verify the chart redraws and reset restores its initial view.
- [ ] Load 30-, 90-, and 365-day report URLs and verify the trend, top products,
      CSV export, and print output follow the selected range.
- [ ] Verify Current Selling Value uses selling prices and Stock Cost Value
      uses unit cost multiplied by on-hand quantity.
- [ ] Save and reload account preferences, including theme, date format,
      currency, and timezone.
- [ ] Save the default low-stock threshold, auto-sync, and low-stock
      prioritization preferences; verify each remains set after reload and
      affects its corresponding page behavior.
- [ ] Enable desktop stock notifications with browser permission granted and
      verify low and critical stock alerts appear; verify denied permission
      prevents enabling the toggle.
- [ ] Verify Privacy toggles for anonymous usage analytics, 30-minute idle
      sign-out, and new-device login alert emails save independently.
- [ ] Verify owner-only and manager-limited settings match the role rules.
- [ ] Check login and application pages at desktop and mobile viewport sizes.
- [ ] Confirm loading and error states are understandable and recoverable.

## API and persistence

- [ ] Verify API requests for valid data succeed and invalid or unauthorized
      requests return appropriate errors.
- [ ] Verify organization data is isolated between test organizations.
- [ ] Confirm database changes persist across page reloads and new sessions.
- [ ] Verify stock mutation routes require an active organization
      membership; staff permissions follow the current inventory role rules.
- [ ] Confirm opted-in page visits appear as anonymous daily page totals in
      Reports for that organization only; disabling consent stops new counts.
- [ ] Confirm Users shows Active while an organization member is sending
      presence heartbeats and Offline after the heartbeat expires.
- [ ] Confirm a staff or manager login notifies other owners and managers in
      the selected organization; no other organization receives it.
- [ ] Confirm owner logins never notify managers, and staff cannot access or
      mark login notifications as read.
- [ ] Apply migrations to a clean database and to a supported existing
      database; verify each applied migration version is recorded once in
      `public.schema_migrations`.
- [ ] Load a page with browser developer tools open and check that hydration
      produces no React mismatch warnings.
