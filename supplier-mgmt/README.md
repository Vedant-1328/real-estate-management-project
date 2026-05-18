# SHREE SAI EARTH MOVERS

Full-stack operations platform for **SHREE SAI EARTH MOVERS** (fleet, sites, billing, and payroll).

## Stack

| Layer    | Technologies |
|----------|--------------|
| Backend  | Node.js, Express, MySQL, Sequelize, JWT, Multer, Puppeteer, express-validator |
| Frontend | React (Vite), Tailwind CSS, React Router, Axios, React Hook Form, Zod |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MySQL](https://www.mysql.com/) 8+

## Project structure

```
supplier-mgmt/
├── backend/     # Express API
└── frontend/    # React SPA
```

## Local setup

### Run backend + frontend together (recommended)

From the `supplier-mgmt` folder:

```bash
npm install
npm run install:all
npm run dev
```

This starts the API on **http://localhost:3000** and the app on **http://localhost:5173**.  
If you only run the frontend, Vite will show proxy errors (`ECONNREFUSED`) until the backend is up.

### 1. Database

```sql
CREATE DATABASE supplier_mgmt;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with MySQL credentials and JWT secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).

```bash
npm install
npm run db:sync    # tables, Super Admin, role permissions, demo users
npm run dev
```

API: **http://localhost:3000**  
Health: **GET** `/api/health`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: **http://localhost:5173**  
Set `VITE_API_BASE_URL=http://localhost:3000/api` (or use the Vite dev proxy).

## Demo accounts

Password for all accounts below: **Admin@123**

| Email | Role |
|-------|------|
| admin@supplier.com | Super Admin |
| manager@supplier.com | Admin / Manager |
| accountant@supplier.com | Accountant |
| supervisor@supplier.com | Supervisor |
| dataentry@supplier.com | Data Entry |

## Scripts

| Location   | Command           | Description |
|------------|-------------------|-------------|
| `backend`  | `npm start`       | Production API |
| `backend`  | `npm run dev`     | Dev API with watch |
| `backend`  | `npm run db:sync` | Sync schema + seed |
| `frontend` | `npm run dev`     | Vite dev server |
| `frontend` | `npm run build`   | Production build |

## Production deployment

1. **Environment** — Copy `backend/.env.production.example` to `backend/.env` and set:
   - `NODE_ENV=production`
   - MySQL connection vars
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (strong random values)
   - `FRONTEND_URL` (origin allowed by CORS, e.g. `https://app.example.com`)

2. **Database** — Run `npm run db:sync` once on the production database.

3. **Build frontend** — In `frontend/`, set `VITE_API_BASE_URL` to your public API URL, then `npm run build`.

4. **Serve** — Either:
   - Run the backend only: it serves `frontend/dist` when `NODE_ENV=production`, or
   - Use `backend/Dockerfile` and mount env + uploads volume.

5. **Uploads** — Files under `/uploads` require authentication; ensure the SPA sends the JWT (Axios does this automatically).

## Security features

- JWT access + httpOnly refresh cookies
- Login rate limiting (10 attempts / 15 min per IP)
- RBAC on routes and UI (`checkPermission` / `usePermission`)
- Audit log for create/update/delete on core modules
- Helmet, CORS, input sanitization, centralized error handling (422 validation, masked 500s in production)

## Authentication

- `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- Access token: `Authorization: Bearer <token>` (~15 min)
- Refresh token: httpOnly cookie (~7 days)
