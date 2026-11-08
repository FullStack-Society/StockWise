# STOCKWISE
## Retail Inventory Management System
### Project Documentation

---

## 1. Project Overview

### 1.1 Project Description

StockWise is a web-based retail inventory management system designed to help retail business owners and managers manage products and monitor stock levels efficiently. It aims to simplify inventory management by providing a centralized system for maintaining product records, tracking stock quantities, and identifying products that need restocking.

The system provides an organized platform for managing inventory information, monitoring product availability, and recording stock movements. It is intended for retail businesses that need a more efficient and accessible way to maintain their inventory records.

### 1.2 Project Purpose

StockWise aims to help retail business owners and managers organize inventory records, monitor product availability, and identify products that require restocking through a centralized web-based system.

### 1.3 Project Objectives

- Develop a web-based inventory management system for retail businesses.
- Manage product information and inventory records.
- Monitor current product stock quantities.
- Track stock additions and deductions through inventory management functions.
- Identify products that reach or fall below their minimum stock levels.
- Provide secure user authentication and role-based access.
- Store and manage inventory data using a centralized PostgreSQL database.
- Provide an organized and accessible interface for inventory management.

---

## 2. Scope and Limitations

### 2.1 Scope

StockWise will focus on the following functions:

- Product information management
- Inventory stock monitoring
- Recording stock additions and deductions
- Minimum stock level monitoring
- Low-stock alerts
- Email and password authentication
- Role-based access control
- Centralized inventory data management

### 2.2 Limitations

The system will not include the following features:

- Full Point-of-Sale (POS) checkout and receipt generation
- Online payment processing
- Accounting and payroll management
- Supplier marketplace
- Advanced AI-based demand forecasting
- Multi-branch inventory management
- Automatic supplier ordering
- Offline inventory updates and synchronization

StockWise is designed for a single retail store and requires an internet connection to access the centralized inventory system.

---

## 3. System Architecture

StockWise follows a client-server architecture consisting of three primary components:

### 3.1 Frontend

The frontend is responsible for the user interface and user interactions. It is developed using Next.js, React, and TypeScript, with Tailwind CSS for styling.

### 3.2 Backend

The backend handles application logic, authentication, API requests, data processing, and communication between the frontend and database. It is developed using Python and FastAPI.

### 3.3 Database

PostgreSQL serves as the centralized database management system, storing and maintaining the system's inventory and application records. SQLAlchemy and Psycopg 3 are used for database interaction.

### 3.4 System Communication

The frontend communicates with the backend through API endpoints. The backend processes requests, interacts with the PostgreSQL database, and returns the appropriate responses to the frontend.

---

## 4. Technologies and Development Tools

### 4.1 Frontend Development

| Technology | Version | Purpose |
|---|---|---|
| TypeScript | 5.x | Frontend programming language |
| Next.js | 16.4.2 | Frontend web framework |
| React | 19.3.0 | User interface library |
| React DOM | 19.3.0 | React rendering |
| Tailwind CSS | 4.x | CSS framework and styling |
| Lucide React | 1.60.0 | Icon library |
| JOSE | 6.2.13 | JWT and token-related functionality |
| Turbopack | Integrated tooling | Development/build tooling |
| ESLint | 9.x | Code linting |

### 4.2 Backend Development

| Technology | Version | Purpose |
|---|---|---|
| Python | To be verified | Backend programming language |
| FastAPI | 0.115 or later, below 1.0 | Backend web framework |
| Uvicorn | 0.34 or later, below 1.0 | ASGI server |
| SQLAlchemy | 2.0 or later, below 3.0 | Object-Relational Mapper (ORM) |
| Psycopg 3 | 3.2 or later, below 4.0 | PostgreSQL database adapter |
| Pydantic Settings | 2.7 or later, below 3.0 | Application configuration |
| Python-dotenv | 1.0 or later, below 2.0 | Environment variable management |
| Cryptography | 42 or later, below 47 | Encryption and security |
| Google Auth | 2.0 or later, below 3.0 | Google authentication integration |
| Email Validator | 2.2 or later, below 3.0 | Email validation |

### 4.3 Database Management

| Technology | Purpose |
|---|---|
| PostgreSQL | Relational database management system |
| pgAdmin | Database administration and management |
| SQLAlchemy | Database ORM |
| Psycopg 3 | Database connectivity |

### 4.4 UI/UX Design

| Tool | Purpose |
|---|---|
| Figma | Wireframing and interface design |

### 4.5 Quality Assurance and Testing

| Tool | Purpose |
|---|---|
| Swagger | API documentation and endpoint testing |

### 4.6 Development and Collaboration Tools

| Tool | Purpose |
|---|---|
| Visual Studio Code | Code editor and development environment |
| Git | Version control |
| GitHub | Source code hosting and team collaboration |
| Tailscale | Secure private network connectivity between team devices |

---

## 5. Development Environment and Access

### 5.1 Development Environment

The project uses Visual Studio Code as its primary development environment. The frontend and backend are maintained in separate project directories within the StockWise repository.

### 5.2 Development Access

The team uses Tailscale for secure network connectivity between authorized devices, supporting collaboration and access to development resources.

### 5.3 Frontend Development Preview

The current frontend development preview is accessible through the following Microsoft Dev Tunnels address:

https://rtcw5zsh-3000.asse.devtunnels.ms/login

This address provides external access to the development server through port 3000.

Note: This is a development access link, not a confirmed production deployment address. Access may depend on tunnel availability and security settings.

---

## 6. Hardware Requirements

The following are the proposed minimum hardware and connectivity requirements:

- Laptop or desktop computer
- At least 8 GB RAM
- Stable internet connection
- Smartphone for mobile browser testing, when needed

---

## 7. Project Structure

The StockWise repository is organized into the following primary directories:

| Directory | Description |
|---|---|
| client | Frontend application |
| server | Backend application |
| database | Database-related files |
| docs | Project documentation |
| test | Testing-related files |

### 7.1 Backend Structure

The backend application follows a modular organization:

| Directory/File | Responsibility |
|---|---|
| api | API endpoints and routes |
| core | Application configuration and security |
| db | Database sessions, models, and repositories |
| schemas | Data validation and request/response schemas |
| services | Application and business logic |
| main.py | Main backend application entry point |

---

## 8. Project Status

**Current Status: Development and Testing**

StockWise is currently undergoing system development and preparation for testing. The frontend and backend technologies have been identified through the project's configuration and dependency files.

The team is utilizing Figma for interface design, PostgreSQL and pgAdmin for database management, Swagger for API testing, and Tailscale for secure team connectivity.

Further system testing, feature verification, and documentation updates will be conducted as development progresses.

---

## 9. Future Improvements

The following features may be considered for future development, depending on project requirements and available resources:

- Advanced inventory analytics and reporting
- AI-assisted inventory demand forecasting
- Multi-branch inventory support
- Offline inventory management and synchronization
- Supplier management and automated ordering
- Integration with Point-of-Sale systems

These are potential enhancements and are not part of the currently defined system scope.

---

## 10. Project Summary

StockWise is a web-based Retail Inventory Management System that aims to provide retail businesses with an organized and centralized approach to inventory management.

By integrating a modern frontend framework, a Python-based backend, and a PostgreSQL database, the system seeks to simplify product management, monitor stock levels, and support efficient inventory operations.

Through its development, StockWise aims to provide a practical inventory management solution that improves the organization, accessibility, and monitoring of retail inventory records.
