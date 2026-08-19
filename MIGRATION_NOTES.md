# Craly — Migration Notes

## Overview

This document records what was changed during the Vite → Next.js migration and
backend scaffolding. Follow the manual steps below before running the project
for the first time.

---

## Repository Structure (after migration)

```
craly_dev/
├── frontend/              ← Next.js 15 app (App Router, TypeScript)
│   ├── app/
│   │   ├── layout.tsx     ← Root layout (replaces index.html + main.jsx)
│   │   ├── page.tsx       ← Home route `/`
│   │   └── globals.css    ← Global CSS (replaces src/index.css)
│   ├── components/        ← Migrated React components (TypeScript)
│   ├── lib/
│   │   └── api.ts         ← Typed fetch wrapper for backend calls
│   ├── public/
│   │   └── assets/        ← All images (previously src/assets/)
│   ├── .env.local         ← Frontend env vars (NEXT_PUBLIC_API_URL)
│   ├── next.config.mjs
│   └── tsconfig.json
│
└── backend/               ← Express + postgres.js API (TypeScript)
    ├── src/
    │   ├── server.ts      ← Entry point
    │   ├── config/        ← Env var config
    │   ├── db/            ← postgres.js pool
    │   ├── routes/        ← Route definitions
    │   ├── controllers/   ← Request handlers
    │   └── middlewares/   ← errorHandler
    ├── .env.example       ← Copy to .env and fill in values
    └── tsconfig.json
```

---

## Manual Steps Required Before First Run

### 1. Frontend environment
The file `frontend/.env.local` is already created with:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```
Update this if your backend runs on a different port.

### 2. Backend environment
```bash
cd backend
copy .env.example .env   # Windows
# — or —
cp .env.example .env     # Mac/Linux
```
Then edit `backend/.env` and fill in:
- `DATABASE_URL` — your PostgreSQL connection string
- `ALLOWED_ORIGINS` — if your frontend runs on a different port

### 3. PostgreSQL setup
The database is **not yet seeded**. You must:
1. Create the `craly` database:
   ```sql
   CREATE DATABASE craly;
   ```
2. Design and create the `contractors` table (schema TBD — business logic is
   stubbed in `backend/src/controllers/contractorController.ts`).

### 4. Running both servers concurrently

**Terminal 1 — Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:3000
```

**Terminal 2 — Backend:**
```bash
cd backend
npm run dev
# → http://localhost:4000
```

---

## What Changed

### Frontend (Vite → Next.js)

| Old (Vite) | New (Next.js) |
|---|---|
| `src/main.jsx` | Removed — replaced by `app/layout.tsx` |
| `src/App.jsx` | Removed — replaced by `app/page.tsx` |
| `src/App.css` | Removed — was leftover Vite scaffold CSS, not used |
| `src/index.css` | Migrated to `app/globals.css` |
| `src/pages/landing.jsx` | Removed — was a 551-line duplicate of all components |
| `src/components/*.jsx` | Migrated to `components/*.tsx` (TypeScript, `"use client"` added where needed) |
| `src/assets/` | Moved to `public/assets/` — referenced as `/assets/foo.png` strings |
| `vite.config.js` | Removed — replaced by `next.config.mjs` |
| `index.html` | Removed — HTML shell is now `app/layout.tsx` |
| Google Fonts via `<link>` in index.html | Preserved in `app/layout.tsx` `<head>` |

### Components that require `"use client"`

| Component | Reason |
|---|---|
| `Hero.tsx` | `useState`, `useEffect` |
| `ImageCarousel.tsx` | `useState`, `useMemo` |
| `HowItWorks.tsx` | `useEffect`, `useRef`, `useState`, `window.addEventListener` |
| `BuiltFor.tsx` | `useState` |
| `FAQ.tsx` | `useState` |

### Backend (new)

- Scaffolded fresh — no existing code existed to migrate.
- All contractor routes (`/api/contractors`) are **stubs** returning `{ message: "TODO" }`.
- `/api/health` is **fully implemented** and pings the DB.
- Business logic must be added once the PostgreSQL schema is finalised.

---

## Known Issues / TODOs

- [ ] `backend/src/controllers/contractorController.ts` — All routes are stubs. Implement after DB schema is defined.
- [ ] PostgreSQL schema needs to be designed and migrated (no ORM, raw SQL via postgres.js).
- [ ] Add authentication middleware when auth is ready.
- [ ] The old `frontend/src/` directory still exists alongside the new `app/` and `components/` directories. It should be deleted once Next.js is confirmed working:
  ```bash
  # From frontend/ directory:
  Remove-Item -Recurse -Force src   # PowerShell
  # or: rm -rf src                  # bash
  ```
- [ ] `eslint-plugin-react-refresh` warned about peer dependency — remove it from `package.json` if it causes issues (it was a Vite-specific plugin, no longer needed).

---

## Verifying the Integration

Once both servers are running:

```bash
# Check backend health
curl http://localhost:4000/api/health

# Expected response:
# { "status": "ok", "timestamp": "...", "db": { "status": "ok" } }
# (db.status will be "error" if DATABASE_URL is not configured)
```

In the browser, open `http://localhost:3000` — the landing page should look
identical to the old Vite version.
