import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(here, "data"));
export const UPLOAD_DIR = path.join(DATA_DIR, "receipts");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const raw = new DatabaseSync(process.env.DB_FILE || path.join(DATA_DIR, "budgetmate.db"));
raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

// Small wrapper so the rest of the code can use db.prepare / db.exec / db.transaction.
const db = {
  exec: (sql) => raw.exec(sql),
  prepare: (sql) => raw.prepare(sql),
  transaction: (fn) => (...args) => {
    raw.exec("BEGIN");
    try { const r = fn(...args); raw.exec("COMMIT"); return r; }
    catch (e) { raw.exec("ROLLBACK"); throw e; }
  },
};

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  occupation TEXT DEFAULT '',
  prefs TEXT NOT NULL DEFAULT '{"budget":true,"goal":true,"week":true}',
  reset_token TEXT,
  reset_expires INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  password_changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  detail TEXT DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'bank'
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  note TEXT DEFAULT '',
  category TEXT NOT NULL,
  amount REAL NOT NULL,            -- negative = expense, positive = income
  payment_method TEXT DEFAULT '',
  date TEXT NOT NULL,              -- YYYY-MM-DD
  receipt TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS tx_user_date ON transactions(user_id, date);
CREATE TABLE IF NOT EXISTS budgets (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  limit_amount REAL NOT NULL,
  PRIMARY KEY (user_id, category)
);
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target REAL NOT NULL,
  target_date TEXT NOT NULL,
  note TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT 'emerald',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  source TEXT DEFAULT '',
  date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS contrib_goal ON contributions(goal_id);
`);

export default db;
