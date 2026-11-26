# BALASUBRAMANI POULTRY

A MERN-stack farm management application for Balasubramani Poultry, Namakkal, Tamil Nadu. It manages poultry sets, birds, daily egg production and stock, egg prices, feed inventory and usage, expenses, labour, customers, local and wholesale egg sales, customer payments, dashboards, reports, audit logs, and settings behind admin authentication.

## Stack

- **Frontend:** React 18, Vite 6, Tailwind CSS 3, Axios, Recharts, React Router
- **Backend:** Node.js, Express 4, Mongoose 8, JWT, bcryptjs
- **Database:** MongoDB
- **Tooling:** npm workspaces via root scripts, concurrently, Node's built-in test runner

No Python, Firebase, SQL database, Next.js, or external trading dependency is used.

## Repository structure

```text
poultry/
├─ backend/                 Express REST API and Mongoose models
│  ├─ config/               MongoDB connection
│  ├─ controllers/          Route handlers and shared dashboard logic
│  ├─ middleware/           Auth, error handling, audit helpers
│  ├─ models/               Mongoose schemas
│  ├─ routes/               API route definitions
│  ├─ services/             Egg-stock and feed-stock calculations
│  ├─ utils/                Shared validation/date/egg helpers
│  ├─ server.js             Express app and server startup
│  └─ seed.js               Optional demo-data seeder
├─ frontend/                React single-page application
│  ├─ src/api/              Axios client and endpoint wrappers
│  ├─ src/components/       Reusable UI components
│  ├─ src/context/          Auth, settings, appearance providers
│  ├─ src/hooks/            Fetch and UI hooks
│  ├─ src/i18n/             English, Tamil, Hindi translations
│  ├─ src/pages/            Screen-level components
│  └─ vite.config.js        Dev proxy and environment directory
├─ tests/                   Isolated API workflow tests
├─ .env.example             Environment template
├─ .gitignore
└─ package.json             Root install/dev/build/test/start commands
```

## Requirements

- Node.js 18 or newer (verified on Node 24)
- npm 9 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

## Quick start

From the project root:

```bash
npm install
cp .env.example .env
# Edit .env: set MONGODB_URI and a long random JWT_SECRET
npm run dev
```

Open <http://localhost:5173> and log in.

`npm install` automatically installs both `backend/` and `frontend/` through the root `postinstall` script. `npm run dev` starts the API and React dev server together; `concurrently -k` stops both when either process exits.

### Optional demo seed

```bash
npm run seed
```

The seeder **only runs when the target database is empty**. It will not delete existing farm data. Admin credentials come from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env`.

## Environment variables

The backend reads the root `.env` first, then `backend/.env` if present. Values already set in the process environment are never overwritten. The frontend reads only `VITE_*` variables from the root `.env`; secrets are not exposed to the browser.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port, default `5000` |
| `NODE_ENV` | No | `development`, `test`, or `production` |
| `MONGODB_URI` | Yes | MongoDB connection string; no localhost fallback |
| `JWT_SECRET` | Yes | At least 16 characters |
| `JWT_EXPIRES_IN` | No | Token lifetime, default `7d` |
| `CLIENT_URL`, `CORS_ORIGIN` | Recommended | Extra comma-separated CORS origins; defaults include the Vercel domain and localhost |
| `VITE_API_URL` | No | Override the dev proxy; leave blank for `/api` |
| `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL` | Seed only | Initial admin account |
| `EGG_PRICE_API_URL`, `EGG_PRICE_API_KEY`, `EGG_PRICE_API_KEY_HEADER`, `EGG_PRICE_API_PRICE_PATH` | No | Optional market-price lookup; manual entry always works |

## Root commands

| Command | What it does |
| --- | --- |
| `npm install` | Installs root, backend, and frontend dependencies |
| `npm run dev` | Runs Express and Vite together; stops both on exit |
| `npm run server` | Runs only the backend with nodemon |
| `npm run client` | Runs only the Vite dev server |
| `npm run build` | Builds the React app into `frontend/dist` |
| `npm start` | Starts the API; also serves `frontend/dist` in production |
| `npm run seed` | Seeds demo data into an empty database |
| `npm test` | Runs isolated API workflow tests against `poultry_test` |

## Production build

```bash
npm install
npm run build
NODE_ENV=production MONGODB_URI=<your-atlas-uri> CLIENT_URL=https://your-domain.example npm start
```

On Windows PowerShell:

```powershell
$env:NODE_ENV='production'
$env:MONGODB_URI='<your-atlas-uri>'
$env:CLIENT_URL='https://your-domain.example'
npm start
```

The Express process serves the built React app and falls back to `index.html` for client-side routes. API 404s remain JSON responses. A reverse proxy with HTTPS is recommended.

## API overview

All endpoints are under `/api`. Most require `Authorization: Bearer <token>`.

- `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/logout-all`, `GET /api/auth/me`
- `/api/poultry-sets`, `/api/birds`, `/api/eggs`, `/api/egg-stock`, `/api/egg-prices`
- `/api/feed`, `/api/feed-usage`, `/api/expenses`, `/api/labours`, `/api/labour-expenses`
- `/api/customers`, `/api/local-sales`, `/api/wholesale-sales`, `/api/customer-payments`
- `/api/dead-hens`, `/api/dashboard`, `/api/reports`, `/api/audit-logs`, `/api/settings`
- `GET /api/health` and `GET /api/settings/public` are public; the latter exposes only login-screen branding fields.

## Calculations

- **Egg record:** physical `totalEggs = single + double + broken + rejected`; sellable whole eggs `= single + double`.
- **Daily egg stock:** `closing = opening + sellable production + adjustments - local sales - wholesale Good-egg sales`. Broken and rejected eggs do not count as sellable whole eggs.
- **Broken-egg availability:** broken eggs produced minus broken eggs sold wholesale.
- **Local sale total:** `singleQty × singlePrice + doubleQty × doublePrice`; legacy records use `eggQuantity × pricePerEgg`.
- **Payment state:** `pending = total - paid`, clamped at zero. Payments cannot exceed the sale's pending balance.
- **Feed cost:** feed used converted to kilograms, then multiplied by price per kg. `GRAMS` and `BAGS` are supported; `BAGS` requires a bag weight in kg.
- **Dashboard revenue:** local plus wholesale sales revenue; received and pending amounts include both.
- **Dashboard expenses:** direct expenses plus feed-usage cost plus labour-ledger cost. If a direct expense is also categorised as `Labour`, the same cost can be counted twice; use either the labour ledger or the expense category for a given cost, not both.
- **Profit:** `netProfit = totalRevenue - totalExpenses`; margins and per-egg figures are derived from these totals.
- **CSV reports:** values are escaped, and `type=payments` remains compatible with `type=customerPayments`.

## Tests

```bash
npm test
```

Tests force `NODE_ENV=test`, an ephemeral API port, and `mongodb://127.0.0.1:27017/poultry_test`. The suite refuses to run if the database name is not `poultry_test`, drops only that test database before and after the run, and never touches the real `poultry` database.

Covered workflows: health check, login success/failure, protected routes, egg production and duplicate-date guard, oversell rejection, sale totals and payment status, payment clearing and overpayment rejection, dashboard/report totals, settings update, and logout token invalidation.

## Security notes

- Passwords are hashed with bcrypt; protected endpoints verify JWTs.
- Login and general API rate limits are enabled.
- CORS accepts the deployed Vercel domain and localhost by default, plus any comma-separated origins in `CLIENT_URL` / `CORS_ORIGIN` (and same-origin/no-origin requests). Credentials and preflight OPTIONS are supported.
- Request validation and strict date/number parsing are centralised in `backend/utils/helpers.js`.
- Audit logs record creates, updates, deletes, logins, and settings changes.
- CSV exports escape quotes, commas, and newlines.
- The JWT is stored in browser `localStorage`, which is convenient for this SPA but remains exposed to XSS. Production deployments should add a Content Security Policy and keep dependencies patched.

## Known limitations

- The production bundle emits a Vite chunk-size warning; route-level code splitting could reduce it.
- Automated tests cover API workflows, not the browser UI.
- Market egg-price lookup is optional and falls back to the last known/manual price; it never invents a price.
- Demo seeding is intentionally non-destructive and cannot be forced by a flag.
