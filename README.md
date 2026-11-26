# BALASUBRAMANI POULTRY — Farm Management System

A complete, production-ready **MERN stack** application for managing a poultry farm in Namakkal, Tamil Nadu. It tracks poultry sets, bird counts, daily egg production, egg stock, market/local egg prices, feed stock & usage, expenses, local customers & sales, payments, profit, reports, audit logs, and settings — all behind admin authentication with a mobile-first UI.

Demo data is included so every screen works immediately.

---

## Tech Stack

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Frontend | React 18, Vite 5, Tailwind CSS 3, Recharts, Axios       |
| Backend  | Node.js 24, Express 4, Mongoose 8, JWT, bcrypt           |
| Database | MongoDB (Mongoose ODM)                                   |
| Auth     | JWT (httpOnly-less, stored in localStorage for this SPA) |

> Explicitly **not** used: Python/Django/Laravel/Java/Flutter, Firebase,
> MySQL/PostgreSQL, Next.js, Supabase. No external trading dependency.

---

## Features

- **Authentication** — Admin login with JWT, protected routes, profile & password change.
- **Poultry Sets** — Multiple sheds/flocks (SET 1, SET 2, …) with bird count and status.
- **Bird Management** — Per-set bird records (culled, purchased, mortality, notes).
- **Daily Egg Production** — Date + set entry: birds, total, broken, rejected, auto-computed sellable. Per-day duplicate guard.
- **Egg Stock** — Automatic daily stock materialization: opening → production → sold → broken → rejected → adjustments → closing. Real-time `availableToday` used for sale validation.
- **Egg Prices** — Namakkal market price via optional API, `LAST_KNOWN` fallback, or manual entry. Local selling price setting.
- **Feed Management** — Feed inventory (name, opening, adding batch/purchases, supplier, unit cost).
- **Feed Usage** — Per-set daily usage (start kg / added kg / used kg / end kg), feed cost auto-tracked, adjustments.
- **Expenses** — Categories, description, optional set reference, supplier, notes.
- **Customers** — Local customers with type (Household/Shop/Hotel/Restaurant/Bakery/…), default price, area, mobile.
- **Local Sales** — Mobile-first quick entry: pick/create customer inline, eggs, price, paid amount → total + payment status auto-derived. **Stock-validated** (rejects overselling with a clear message).
- **Wholesale Sales (Feeders)** — Bulk egg sales to feeders with Good / Broken egg classes. Baby/broken eggs sold separately: daily broken sold record, broken availability (produced − sold), stock-validated (good eggs deduct egg stock, broken eggs validate against broken produced that day).
- **Payments (Customer Ledger)** — Collect money against pending sales; per-customer ledger shows purchases & payments with totals and pending balance.
- **Reports** — Summary (20+ KPI cards), Production, Sales, Feed Usage, Expenses, Revenue & Profit, Stock, Market Prices, Customer Payments. CSV export for production / sales / expenses / feed usage / stock / customers.
- **Dashboard** — Stat cards + Recharts charts (production, sales, expenses, feed usage), low-stock alerts, current price bar with source.
- **Audit Logs** — Every create/update/delete/login recorded with admin, IP, old & new values.
- **Settings** — Farm details, default selling price, low-stock alert thresholds, notes.
- **Mobile-first UI** — Slim grid layouts, bottom-sheet modals, collapsible sidebar, INR (en-IN) formatting.

---

## Prerequisites

- Node.js ≥ 18 (tested on Node 24)
- npm ≥ 9
- MongoDB running locally on `mongodb://127.0.0.1:27017` (or edit `MONGO_URI`)

---

## Quick Start

```bash
# 1. Install everything (server + client) from the repo root
npm run install:all

# 2. Configure the server environment
cd server
copy .env.example .env        # then edit values (JWT_SECRET, MONGO_URI, ...)

# 3. (Optional) Seed demo data + admin account
npm run seed

# 4. Run both server and client together from the root
npm run seed
```

Then open http://localhost:5173 and log in.

**Default demo admin credentials**

```
username: bala
password: Bala@1234c
```

> Change these immediately in a real deployment — they come from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in the server `.env` and are seeded only by `npm run seed`.

### Run separately

```bash
npm run server     # Express API on http://localhost:5000
npm run dev   # Vite dev server on http://localhost:5173 (proxies /api to 5000)
npm run build      # production build of the client -> client/dist
npm run start      # start the backend only (server/index.js -> npm start in server/)
```

---

## Environment Variables (server/.env)

| Variable                    | Default                     | Purpose                                             |
| --------------------------- | --------------------------- | --------------------------------------------------- |
| `PORT`                      | `5000`                      | API port                                            |
| `NODE_ENV`                  | `development`               | Runtime mode                                        |
| `MONGO_URI`                 | `mongodb://127.0.0.1:27017/poultry` | MongoDB connection string                  |
| `JWT_SECRET`                | *(required)*                | Signing secret — **set a long random value**        |
| `JWT_EXPIRES_IN`            | `7d`                        | Token lifetime                                      |
| `CLIENT_URL`                | `http://localhost:5173`     | Allowed CORS origin(s), comma-separated             |
| `ADMIN_NAME/USERNAME/PASSWORD/EMAIL` | demo values      | Used by the seed script                             |
| `EGG_PRICE_API_URL`         | *(empty)*                   | Optional Namakkal egg-price API endpoint            |
| `EGG_PRICE_API_KEY`         | *(empty)*                   | Optional API key                                    |
| `EGG_PRICE_API_KEY_HEADER`  | `x-api-key`                 | Header name used to send the key                    |
| `EGG_PRICE_API_PRICE_PATH`  | `price`                     | Dot-notation JSON path to the per-egg price in INR  |

---

## Egg Price Service

The app ships with a **configurable** market-price integration — no fabricated prices.

1. Set `EGG_PRICE_API_URL` (and optionally `EGG_PRICE_API_KEY` / headers / price path).
2. On the Egg Prices page, **Refresh from market** fetches, validates, and stores the price with source `API`.
3. If the API is down or unconfigured, the app falls back to the **last known** price (`LAST_KNOWN`) and lets you enter the price manually (`MANUAL`).
4. Every stored price is displayed with its source on the dashboard and report pages.

---

## API Overview

Base URL `http://localhos t:5000/api`. All routes except `/auth/login`, `/health` require `Authorization: Bearer <token>`.

| Area                 |  Routes                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Auth                 | `POST /auth/login`, `GET /auth/me`, `PUT /auth/me`                     |
| Dashboard            | `GET /dashboard`                                                        |
| Poultry sets         | `GET/POST /poultry-sets`, `PUT/DELETE /poultry-sets/:id`                |
| Birds                | `GET/POST /birds`, `PUT/DELETE /birds/:id`                              |
| Daily eggs           | `GET/POST /eggs`, `GET /eggs/today-summary`, `PUT/DELETE /eggs/:id`     |
| Egg stock            | `GET /egg-stock`, `GET /egg-stock/latest`, `POST /egg-stock/adjust`     |
| Egg prices           | `GET /egg-prices/current`, `GET /egg-prices/refresh`, `GET/POST /egg-prices`, `PUT /egg-prices/:id` |
| Feed                 | `GET /feed`, `GET /feed/stock`, `POST /feed`, `PUT/DELETE /feed/:id`    |
| Feed usage           | `GET/POST /feed-usage`, `GET /feed-usage/summary`, `PUT/DELETE /feed-usage/:id` |
| Expenses             | `GET/POST /expenses`, `PUT/DELETE /expenses/:id`                        |
| Customers            | `GET/POST /customers`, `GET /customers/:id`, `GET /customers/:id/ledger`, `PUT/DELETE /customers/:id` |
| Local sales          | `GET/POST /local-sales`, `PUT/DELETE /local-sales/:id`                  |
| Wholesale sales      | `GET/POST /wholesale-sales`, `GET /wholesale-sales/today`, `GET /wholesale-sales/broken-available`, `PUT/DELETE /wholesale-sales/:id` |
| Customer payments    | `GET/POST /customer-payments`, `PUT /customer-payments/:id`             |
| Reports              | `GET /reports/summary`, `GET /reports/data?type=…`, `GET /reports/export?type=…` |
| Audit logs           | `GET /audit-logs`                                                       |
| Settings             | `GET /settings`, `PUT /settings`                                        |

**Date filters** on list/report routes: `?range=today|yesterday|7|30|month|year|custom&from=YYYY-MM-DD&to=YYYY-MM-DD` (Namakkal local time, UTC+5:30).

**Stock safety:** creating a local sale checks `availableToday` and rejects the request with
`INSUFFICIENT EGG STOCK. Available: <n>. Requested: <m>.` Deleting/editing a sale restores/recalculates stock.

---

## Project Structure

```
E:\poultry
├── package.json            # root convenience scripts
├── .env.example
├── server/
│   ├── server.js           # Express entry, route mounting, CORS, rate limit
│   ├── seed.js             # optional demo-data seeder
│   ├── .env                # (local, git-ignored)
│   ├── models/             # 14 Mongoose models
│   ├── controllers/        # route handlers
│   ├── routes/
│   ├── middleware/         # auth (protect), error handler
│   ├── services/           # eggPriceService, eggStockService, feedStockService
│   └── utils/              # timezone-safe date helpers, audit logging
└── client/
    ├── vite.config.js      # port 5173, /api proxy to 5000
    ├── tailwind.config.js  # brand / egg color palettes
    └── src/
        ├── api/            # axios instance + typed API wrappers
        ├── context/        # AuthContext, SettingsContext
        ├── hooks/          # useFetch
        ├── components/     # DataTable, StatCard, Modal, Badge, Toast, ...
        ├── layouts/        # MainLayout (sidebar + mobile overlay)
        ├── pages/          # Login + 17 feature pages
        └── utils/          # INR / date / badge formatting
```

---

## Deployment Notes

- Build the client: `npm run build` → static files in `client/dist`.
- Serve `client/dist` behind a static host (nginx, IIS, or Express via `express.static`) and proxy `/api` to Node on port 5000, or point the client at the API via env/CORS config.
- Set `NODE_ENV=production`, a strong `JWT_SECRET`, and use the Mongo Atlas URI to scale out.
- Change the admin password after first login; keep `.env` out of version control.

## License

Private project — BALASUBRAMANI POULTRY, Namakkal.#   p o u l t r y - m a n a g e m e n t - s y s t e m  
 