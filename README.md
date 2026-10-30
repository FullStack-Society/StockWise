# StockWise: Retail Inventory Management System

## Project Description

StockWise is a web-based retail inventory management system designed to help retail business owners and managers organize product records, monitor stock levels, and review inventory reports. It provides a centralized application for managing products, identifying low-stock items, and coordinating access for organization members.

The system is intended for retail businesses that need a more organized way to maintain inventory records and monitor product availability.

## Objectives

- Develop a web-based inventory management system for retail businesses.
- Manage product information and inventory records.
- Monitor current product stock quantities and identify items that need attention.
- Provide dashboard and report views for inventory value, stock levels, and recorded stock movements.
- Support secure user authentication and role-based organization access.
- Store and manage inventory data using a centralized PostgreSQL database.

## Scope and Limitations

### Scope

StockWise currently includes:

- Product information management, categories, and CSV import/export
- Inventory stock monitoring and fixed low-stock/critical status indicators
- Dashboard summaries and inventory reports
- Organization accounts, invitations, and role-based access
- Account preferences such as currency, appearance, timezone, and display density
- Printing and CSV export for inventory reports

The reporting system summarizes stock additions and deductions recorded in the inventory transaction data. Creating a product or changing its details does not itself record a stock movement.

### Limitations

StockWise does not currently include:

- Full Point-of-Sale (POS) checkout or receipt generation
- Online payment processing
- Accounting and payroll management
- Supplier marketplace or automatic supplier ordering
- Advanced AI-based demand forecasting
- Offline inventory updates and synchronization

StockWise requires an internet connection to access its centralized inventory system. Organizations provide separate workspaces; multi-branch inventory synchronization is not currently included.

## Technologies and Tools

### Frontend

- Next.js and React
- TypeScript
- CSS Modules

### Backend

- Python and FastAPI
- SQLAlchemy
- REST API

### Database

- PostgreSQL
- pgAdmin can be used to inspect and manage the database

### Development Tools

- Visual Studio Code
- Postman
- Git and GitHub

## Hardware Requirements

- Laptop or desktop computer
- At least 8 GB RAM recommended
- Internet connection
- Smartphone for responsive-layout testing, when needed

## Project Status

**Status: Development**

StockWise has a working web application with inventory, organization access, dashboard, and reporting features. Development and testing are ongoing.

## Project Purpose

StockWise aims to help retail business owners and managers organize inventory records, monitor product availability, and identify products that may need attention through a centralized web-based system.

## Demo Account

Working demo login details are in [`LOGIN_DATA_EXAMPLES.txt`](./LOGIN_DATA_EXAMPLES.txt). Keep this file private if it contains active credentials, and change the demo password if it has been shared publicly.

## Local Setup

### Requirements

- Python 3.10 or later
- Node.js 20.9 or later
- PostgreSQL

### 1. Configure and start the backend

In PowerShell, from the repository root:

```powershell
Set-Location server
Copy-Item .env.example .env
```

Edit `server/.env` and set `DATABASE_URL` to your PostgreSQL connection string. Set `INTERNAL_API_KEY` to a unique secret of at least 32 characters. If the database does not already contain an owner, also set `OWNER_EMAIL` and `OWNER_PASSWORD` (at least 12 characters).

Install the backend dependencies and start the API:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Keep the backend terminal open while using the app.

### 2. Configure and start the frontend

Open a second PowerShell terminal from the repository root:

```powershell
Set-Location client
Copy-Item .env.local.example .env.local
```

Edit `client/.env.local` and set:

- `BACKEND_API_URL` to `http://127.0.0.1:8000`
- `BACKEND_API_KEY` to the same value as `INTERNAL_API_KEY` in `server/.env`
- `SESSION_SECRET` to a unique secret of at least 32 characters

Install the locked frontend dependencies and start Next.js:

```powershell
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).
