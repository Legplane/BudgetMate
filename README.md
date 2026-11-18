# BudgetMate

A personal budgeting app: **React + Vite + Tailwind** front end, **Node.js + Express + SQLite** back end.

## Run it

Requires Node.js 22.13 or newer (uses the built-in SQLite, so nothing needs compiling).

```bash
npm install
npm run dev
```

Open http://localhost:5173. `npm run dev` starts the API (port 3001) and Vite (port 5173, proxies `/api`).

On the first start a **demo account** is created with six months of sample data:

- email: `alex.santos@gmail.com`
- password: `password123`

Or click *Create one free* to sign up with an empty account. (Set `SEED_DEMO=false` to skip the demo account.)

## Production

```bash
npm run build
npm start        # serves the API and the built app on http://localhost:3001
```

Set `JWT_SECRET` (and optionally `PORT`, `DATA_DIR`) in the environment. If `JWT_SECRET` is unset, a random secret is generated and saved in `server/data/`.

## Tests

```bash
npm test
```

## What works

- **Accounts**: sign up, sign in (remember me), sign out, forgot/reset password, change password, delete account. Passwords are bcrypt-hashed; sessions use JWTs.
- **Transactions**: add, edit, delete income and expenses; receipt upload (PNG/JPG/PDF, 10 MB); search and filter by month, type and payment method; CSV export.
- **Home**: live balance, income, expenses, savings, budget left, 7-day chart, category breakdown, recent transactions, next goal.
- **Goals**: create, edit, delete; add or remove contributions (they're deducted from your balance); milestones, status, projection, monthly pace needed.
- **Insights**: month selector, 6-month trend, budget vs actual, category comparison with last month, generated tips. Budgets are editable per category.
- **Settings**: profile, notification preferences, linked payment methods, budgets.

## Layout

```
server/   Express API (index.js), SQLite schema (db.js), demo data (seed.js), tests
src/      React app: api.js (fetch + auth), ui.jsx (shared components), pages/
```

Data is stored in `server/data/budgetmate.db` (SQLite) and `server/data/receipts/`. Delete that folder to reset.

## Notes

- Password reset: no email service is configured, so the reset code is printed in the server console (and shown on screen in development). Plug in an email provider in `/api/auth/forgot` to send it.
- Notification toggles are saved to the account, but no emails or push notifications are sent.
