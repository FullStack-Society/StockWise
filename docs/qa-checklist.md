feature/StockWise_Inventory_System
# StockWise QA Checklist

Use this checklist for a manual smoke and regression test. Record the date,
environment, tester, and any failed item with steps to reproduce.

**Result key:** ⏳ Not tested · ✅ Pass · ❌ Fail · ➖ Not applicable

## Test setup

- [ ] Apply database migrations in order, including
      `migrations/011_purchase_orders.sql` when testing purchase orders.
- [ ] Start the API and frontend using the setup instructions in the root
      [README](../README.md).
- [ ] Prepare test accounts for an owner, a manager, and a staff member in the
      same organization.
- [ ] Prepare a disposable product with a known quantity and reorder point.

## Authentication and organization access

- [ ] Log in with valid credentials and log out.
- [ ] Invalid credentials show an error; required fields are validated.
- [ ] Password entry is masked, with an available show/hide control.
- [ ] A logged-out user cannot access protected pages or actions.
- [ ] An invited user can accept or decline an invitation; invalid or expired
      invitations show a useful error.
- [ ] A user with multiple organizations can switch organizations and sees
      only the selected organization's data.

## Roles and permissions

- [ ] Owner can access organization management, reports, settings, and billing.
- [ ] Manager can manage staff and permitted organization settings, but cannot
      manage the owner, other managers, billing, or account deletion.
- [ ] Staff can manage inventory but cannot access reports or manage users.
- [ ] Restricted actions are denied by the backend, not only hidden in the UI.
- [ ] An owner cannot leave an organization before transferring ownership.

## Inventory and CSV

- [ ] Create a product with valid details, category, opening quantity, and
      reorder point; verify it appears in inventory.
- [ ] Required and invalid values are rejected with a clear message.
- [ ] Edit product details and verify stock is unchanged unless explicitly
      adjusted.
- [ ] Search, filter, and paginate inventory; verify results and counts.
- [ ] Delete a product after confirmation and verify it is removed.
- [ ] Export inventory to CSV and verify the downloaded data.
- [ ] Import a valid CSV; malformed rows and duplicate SKUs are reported without
      silently importing invalid data.

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
- [ ] Verify an order does not change on-hand stock before receipt.
- [ ] Receive part of an item quantity; verify on-hand stock increases only by
      the received amount and the remaining quantity is correct.
- [ ] Receive the remaining quantity and verify the order is complete.
- [ ] Reject zero, negative, or over-remaining receipt quantities.
- [ ] Verify order and receipt data remain correct after refreshing.

## Reports, settings, and responsive behavior

- [ ] Verify dashboard totals and reports reflect recorded inventory movements.
- [ ] Change the report period and verify CSV export and print output.
- [ ] Save and reload account preferences, including theme, date format,
      currency, and timezone.
- [ ] Verify owner-only and manager-limited settings match the role rules.
- [ ] Check login and application pages at desktop and mobile viewport sizes.
- [ ] Confirm loading and error states are understandable and recoverable.

## API and persistence

- [ ] Verify API requests for valid data succeed and invalid or unauthorized
      requests return appropriate errors.
- [ ] Verify organization data is isolated between test organizations.
- [ ] Confirm database changes persist across page reloads and new sessions.

# StockWise: Initial QA Testing Checklist

Status key: ✅ Pass, ❌ Fail, ⏳ Not tested

## 1. Authentication
- [ ] User can log in with a valid email and password
- [ ] Wrong password shows an error
- [ ] Empty fields show a message
- [ ] Passwords are not shown in plain text
- [ ] User can log out

## 2. Role-Based Access
- [ ] Admin can access all pages
- [ ] Manager can manage products and stock
- [ ] Staff cannot open pages they are not allowed to
- [ ] Logged-out users are sent to the login page

## 3. Product Management
- [ ] Add a product with valid details
- [ ] Required fields cannot be left blank
- [ ] Edit a product and see the update
- [ ] Delete a product (with confirmation)
- [ ] View the product list
- [ ] Search for a product works
- [ ] Duplicate products are handled

## 4. Stock Monitoring
- [ ] Current quantity shows correctly
- [ ] Quantity updates after stock in or out

## 5. Stock In and Stock Out
- [ ] Stock in adds to the quantity
- [ ] Stock out subtracts from the quantity
- [ ] Stock cannot go below zero
- [ ] Negative or non-number values are rejected
- [ ] Each change is recorded

## 6. Minimum Stock and Low-Stock Alerts
- [ ] Minimum stock level can be set
- [ ] Alert shows when stock equals the minimum
- [ ] Alert shows when stock is below the minimum
- [ ] No alert when stock is above the minimum
- [ ] Alert clears after restocking

## 7. Inventory History
- [ ] History page shows all stock in and stock out
- [ ] Each record shows the product, quantity, date, and user
- [ ] History stays correct after refreshing the page

## 8. Dashboard
- [ ] Dashboard opens after login
- [ ] Total products is correct
- [ ] Low-stock items are shown
- [ ] Numbers match the database
- [ ] Page is clear and easy to use

## 9. Database and API
- [ ] Data is saved in PostgreSQL
- [ ] Data stays after refreshing the page
- [ ] API returns the right status codes (tested in Postman)

## 10. General
- [ ] Pages work on laptop and smartphone
- [ ] Pages load in a reasonable time
- [ ] Error messages are clear
