import pg from "pg";

/*
 * Postgres layer. In production this talks to Neon (or any Postgres) through DATABASE_URL.
 * Under `npm test` with no DATABASE_URL it falls back to an in-process Postgres (PGlite),
 * so the tests need no database server.
 */
const URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const IN_MEMORY = process.env.NODE_ENV === "test" && !URL;

// Return bigint / numeric columns as JS numbers (they are only ever counts and money here).
pg.types.setTypeParser(20, Number);
pg.types.setTypeParser(1700, Number);

// Turn `?` placeholders into $1, $2, ... so queries stay readable.
const num = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };

let driver;
if (IN_MEMORY) {
  const { PGlite } = await import("@electric-sql/pglite");
  const lite = new PGlite();
  const wrap = (c) => ({
    query: async (sql, params) => { const r = await c.query(sql, params); return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }; },
    exec: (sql) => c.exec(sql),
  });
  driver = { ...wrap(lite), tx: (fn) => lite.transaction((t) => fn(wrap(t))) };
} else {
  if (!URL) {
    throw new Error("DATABASE_URL is not set. Add your Neon connection string to the environment (see README).");
  }
  const pool = new pg.Pool({
    connectionString: URL,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on("error", (e) => console.error("Postgres pool error:", e.message));
  const wrap = (c) => ({ query: (sql, params) => c.query(sql, params), exec: (sql) => c.query(sql) });
  driver = {
    ...wrap(pool),
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const r = await fn(wrap(client));
        await client.query("COMMIT");
        return r;
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally { client.release(); }
    },
  };
}

// get -> one row or undefined, all -> rows, run -> { changes }, insert -> new row id
const api = (d) => ({
  get: async (sql, ...p) => (await d.query(num(sql), p)).rows[0],
  all: async (sql, ...p) => (await d.query(num(sql), p)).rows,
  run: async (sql, ...p) => ({ changes: (await d.query(num(sql), p)).rowCount }),
  insert: async (sql, ...p) => (await d.query(num(sql) + " RETURNING id", p)).rows[0].id,
});

const db = {
  ...api(driver),
  // db.transaction(async (tx) => { await tx.run(...) })  -- tx has the same get/all/run/insert
  transaction: (fn) => driver.tx((t) => fn(api(t))),
};
export default db;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  occupation TEXT DEFAULT '',
  prefs TEXT NOT NULL DEFAULT '{"budget":true,"goal":true,"week":true}',
  reset_token TEXT,
  reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON users (lower(email));
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  detail TEXT DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'bank'
);
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  note TEXT DEFAULT '',
  category TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,   -- negative = expense, positive = income
  payment_method TEXT DEFAULT '',
  date TEXT NOT NULL,                 -- YYYY-MM-DD
  receipt_data BYTEA,                 -- receipts live in the database (Vercel has no persistent disk)
  receipt_mime TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tx_user_date ON transactions(user_id, date);
CREATE TABLE IF NOT EXISTS budgets (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  limit_amount DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (user_id, category)
);
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target DOUBLE PRECISION NOT NULL,
  target_date TEXT NOT NULL,
  note TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT 'emerald',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS contributions (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  source TEXT DEFAULT '',
  date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS contrib_goal ON contributions(goal_id);
`;

// Creates the tables if they don't exist. Memoised, so it runs once per server instance.
let ready;
export const initDb = () => {
  ready ??= driver.exec(SCHEMA).catch((e) => { ready = undefined; throw e; });
  return ready;
};
