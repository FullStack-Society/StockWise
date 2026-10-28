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
