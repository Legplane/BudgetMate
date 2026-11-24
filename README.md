# BudgetMate

A personal budgeting app: **React + Vite + Tailwind** front end, **Node.js + Express + Postgres (Neon)** back end.

## Database: Neon Postgres

BudgetMate uses Postgres. The easiest host is [Neon](https://neon.tech) (free tier).

1. Create a Neon project and copy the **pooled** connection string (the host contains `-pooler`).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `JWT_SECRET`
   (`openssl rand -hex 32` makes a good secret).
3. Tables are created automatically on the first request. Nothing to migrate.

## Run it locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. `npm run dev` starts the API (port 3001) and Vite (port 5173, proxies `/api`).

In development a **demo account** with six months of sample data is created on an empty database:

- email: `alex.santos@gmail.com`
- password: `password123`

Or click *Create one free* to sign up. Set `SEED_DEMO=false` to skip the demo account.
You can also run `npm run seed` once against any database (`SEED_DEMO` is off by default in production).

## Deploy to Vercel

1. Push this folder to GitHub and import the repo in Vercel (framework preset: **Vite**).
2. Add environment variables: `DATABASE_URL` (Neon pooled string) and `JWT_SECRET`.
   Optional: `APP_TZ` (default `Asia/Manila`, used for "today").
   If you add Neon through Vercel's Storage/Marketplace tab, `DATABASE_URL` is set for you.
3. Deploy. `vercel.json` routes `/api/*` to `api/index.js` (the Express app) and everything else to the React app.

## Production on your own server

```bash
npm run build
npm start        # serves the API and the built app on http://localhost:3001
```

## Tests

```bash
npm test   # runs against an in-memory Postgres (PGlite), no database needed
```

## Consultation changes

- **Passwords**: at least 8 characters, one capital letter, one number and one symbol. Checked live in the form (sign up, reset, change password) and again on the server. Every password field has an eye icon to preview it.
- **Names**: stored as separate `first_name`, `middle_name` (optional), `last_name` and `suffix` (optional) columns. Existing databases are migrated on the first request: the old `name` column is split (last word becomes the last name) and then dropped, so check names in Settings afterwards.
- **Transactions**: *Title of the transaction* is required and separate from the optional *Note*. New optional *Room number* column and field (searchable, shown in History, included in the CSV export).
- **Yes/No confirmation** before anything is saved (account, transaction, profile, password, payment method, goal, funds, budgets) and before deletes.
- **Toasts** for success, errors, sign in and sign out. Login and sign-up errors now appear as toasts.
- **Landing page** at `/` for signed-out visitors.

The demo account's password (`password123`) predates the new rule. It still signs in, but a new password must meet the rules.

## What works

- **Accounts**: sign up, sign in (remember me), sign out, forgot/reset password, change password, delete account. Passwords are bcrypt-hashed; sessions use JWTs.
- **Transactions**: add, edit, delete income and expenses; receipt upload (PNG/JPG/PDF, 4 MB, stored in the database); search and filter by month, type and payment method; CSV export.
- **Home**: live balance, income, expenses, savings, budget left, 7-day chart, category breakdown, recent transactions, next goal.
- **Goals**: create, edit, delete; add or remove contributions (they're deducted from your balance); milestones, status, projection, monthly pace needed.
- **Insights**: month selector, 6-month trend, budget vs actual, category comparison with last month, generated tips. Budgets are editable per category.
- **Settings**: profile, notification preferences, linked payment methods, budgets.

## Layout

```
api/      Vercel serverless entry
server/   Express API (app.js), Postgres schema + queries (db.js), demo data (seed.js), tests
src/      React app: api.js (fetch + auth), ui.jsx (shared components), pages/
```

All data, including receipts, lives in Postgres.

## Notes

- Password reset: no email service is configured, so the reset code is printed in the server logs (and shown on screen in development). Plug in an email provider in `/api/auth/forgot` to send it.
- Notification toggles are saved to the account, but no emails or push notifications are sent.
- Receipts are capped at 4 MB because Vercel limits request bodies to about 4.5 MB.
- The login rate limiter is in memory, so on Vercel it is per-instance (best effort).
