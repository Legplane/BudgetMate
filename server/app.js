import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import crypto from "node:crypto";
import db, { initDb } from "./db.js";
import {
  EXPENSE_CATS, INCOME_CAT, DEFAULT_BUDGETS, today, currentMonth, validMonth, validDate,
  shiftMonth, round2, addDays, HttpError,
} from "./lib.js";

const PROD = process.env.NODE_ENV === "production";

/* ---------- JWT secret: required in production, dev fallback otherwise ---------- */
const SECRET = process.env.JWT_SECRET || (PROD ? null : "budgetmate-dev-secret-not-for-production");
if (!SECRET) throw new Error("JWT_SECRET is not set. Add a long random string to your environment (see README).");

const app = express();
app.set("trust proxy", 1); // behind Vercel's proxy, so req.ip is the real client
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Create the tables on first request (once per server instance).
app.use("/api", async (_req, _res, next) => {
  try { await initDb(); next(); } catch (e) { next(e); }
});

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ---------- tiny in-memory rate limit for auth endpoints (best effort on serverless) ---------- */
const hits = new Map();
const limiter = (max, windowMs) => (req, _res, next) => {
  const key = req.ip + req.path;
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return next(new HttpError(429, "Too many attempts. Please wait a few minutes."));
  arr.push(now); hits.set(key, arr); next();
};
const authLimit = process.env.NODE_ENV === "test" ? (_q, _r, n) => n() : limiter(20, 10 * 60 * 1000);

/* ---------- helpers ---------- */
const userOut = (u) => ({
  id: u.id, name: u.name, email: u.email, phone: u.phone, city: u.city, occupation: u.occupation,
  prefs: JSON.parse(u.prefs), createdAt: new Date(u.created_at).toISOString(), passwordChangedAt: new Date(u.password_changed_at).toISOString(),
});
const sign = (u, remember) => jwt.sign({ uid: u.id }, SECRET, { expiresIn: remember ? "30d" : "1d" });
const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const pid = (v) => (/^\d{1,9}$/.test(String(v)) ? Number(v) : 0); // route ids -> safe int (0 matches nothing)
const money = (v, field = "Amount") => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, `${field} must be greater than zero.`);
  if (n > 1e9) throw new HttpError(400, `${field} is too large.`);
  return round2(n);
};

async function auth(req, _res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return next(new HttpError(401, "Please sign in."));
  try {
    const { uid } = jwt.verify(token, SECRET);
    const u = await db.get("SELECT * FROM users WHERE id = ?", pid(uid));
    if (!u) throw new Error("no user");
    req.user = u;
    next();
  } catch { next(new HttpError(401, "Your session has expired. Please sign in again.")); }
}

async function initUser(tx, uid) {
  for (const [c, l] of Object.entries(DEFAULT_BUDGETS))
    await tx.run("INSERT INTO budgets (user_id, category, limit_amount) VALUES (?,?,?)", uid, c, l);
  await tx.run("INSERT INTO payment_methods (user_id, name, detail, kind) VALUES (?,?,?,?)", uid, "Cash", "On hand", "cash");
}

/* ======================= AUTH ======================= */
app.post("/api/auth/register", authLimit, wrap(async (req, res) => {
  const name = str(req.body.name, 80), email = str(req.body.email, 120).toLowerCase();
  const password = String(req.body.password || "");
  if (!name) throw new HttpError(400, "Please enter your full name.");
  if (!emailOk(email)) throw new HttpError(400, "Please enter a valid email address.");
  if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
  if (await db.get("SELECT 1 AS x FROM users WHERE lower(email) = ?", email)) throw new HttpError(409, "An account with that email already exists.");
  const hash = await bcrypt.hash(password, 10);
  let id;
  try {
    id = await db.transaction(async (tx) => {
      const uid = await tx.insert("INSERT INTO users (name, email, password_hash) VALUES (?,?,?)", name, email, hash);
      await initUser(tx, uid);
      return uid;
    });
  } catch (e) {
    if (e.code === "23505") throw new HttpError(409, "An account with that email already exists.");
    throw e;
  }
  const u = await db.get("SELECT * FROM users WHERE id = ?", id);
  res.status(201).json({ token: sign(u, true), user: userOut(u) });
}));

app.post("/api/auth/login", authLimit, wrap(async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase();
  const u = await db.get("SELECT * FROM users WHERE lower(email) = ?", email);
  const ok = u && (await bcrypt.compare(String(req.body.password || ""), u.password_hash));
  if (!ok) throw new HttpError(401, "Incorrect email or password.");
  res.json({ token: sign(u, !!req.body.remember), user: userOut(u) });
}));

// No email service is configured, so the reset code is printed to the server logs
// (and returned in the response outside production) instead of being emailed.
app.post("/api/auth/forgot", authLimit, wrap(async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase();
  const u = await db.get("SELECT * FROM users WHERE lower(email) = ?", email);
  const out = { message: "If that email is registered, a reset code has been generated." };
  if (u) {
    const code = crypto.randomBytes(4).toString("hex");
    await db.run("UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?",
      crypto.createHash("sha256").update(code).digest("hex"), new Date(Date.now() + 15 * 60 * 1000), u.id);
    console.log(`[BudgetMate] Password reset code for ${email}: ${code} (valid 15 minutes)`);
    if (!PROD) out.devCode = code;
  }
  res.json(out);
}));

app.post("/api/auth/reset", authLimit, wrap(async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase();
  const code = str(req.body.code, 40);
  const password = String(req.body.password || "");
  if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
  const u = await db.get("SELECT * FROM users WHERE lower(email) = ?", email);
  const h = crypto.createHash("sha256").update(code).digest("hex");
  if (!u || !u.reset_token || u.reset_token !== h || !u.reset_expires || new Date(u.reset_expires) < new Date())
    throw new HttpError(400, "That reset code is invalid or has expired.");
  await db.run("UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, password_changed_at = now() WHERE id = ?",
    await bcrypt.hash(password, 10), u.id);
  res.json({ message: "Password updated. You can sign in now." });
}));

/* ======================= PROFILE ======================= */
app.get("/api/me", auth, (req, res) => res.json({ user: userOut(req.user) }));

app.put("/api/me", auth, wrap(async (req, res) => {
  const b = req.body, u = req.user;
  const name = b.name !== undefined ? str(b.name, 80) : u.name;
  const email = b.email !== undefined ? str(b.email, 120).toLowerCase() : u.email;
  if (!name) throw new HttpError(400, "Name can't be empty.");
  if (!emailOk(email)) throw new HttpError(400, "Please enter a valid email address.");
  const taken = await db.get("SELECT id FROM users WHERE lower(email) = ? AND id != ?", email, u.id);
  if (taken) throw new HttpError(409, "That email is already used by another account.");
  const prefs = b.prefs && typeof b.prefs === "object"
    ? JSON.stringify({ ...JSON.parse(u.prefs), ...Object.fromEntries(Object.entries(b.prefs).map(([k, v]) => [k, !!v])) })
    : u.prefs;
  try {
    await db.run("UPDATE users SET name=?, email=?, phone=?, city=?, occupation=?, prefs=? WHERE id=?",
      name, email,
      b.phone !== undefined ? str(b.phone, 30) : u.phone,
      b.city !== undefined ? str(b.city, 60) : u.city,
      b.occupation !== undefined ? str(b.occupation, 60) : u.occupation,
      prefs, u.id);
  } catch (e) {
    if (e.code === "23505") throw new HttpError(409, "That email is already used by another account.");
    throw e;
  }
  res.json({ user: userOut(await db.get("SELECT * FROM users WHERE id = ?", u.id)) });
}));

app.put("/api/me/password", auth, wrap(async (req, res) => {
  const { current, next } = req.body;
  if (!(await bcrypt.compare(String(current || ""), req.user.password_hash))) throw new HttpError(400, "Your current password is incorrect.");
  if (String(next || "").length < 8) throw new HttpError(400, "New password must be at least 8 characters.");
  await db.run("UPDATE users SET password_hash = ?, password_changed_at = now() WHERE id = ?",
    await bcrypt.hash(String(next), 10), req.user.id);
  res.json({ message: "Password changed." });
}));

app.delete("/api/me", auth, wrap(async (req, res) => {
  if (!(await bcrypt.compare(String(req.body.password || ""), req.user.password_hash))) throw new HttpError(400, "Password is incorrect.");
  await db.run("DELETE FROM users WHERE id = ?", req.user.id); // cascades to everything, receipts included
  res.json({ ok: true });
}));

/* ======================= PAYMENT METHODS ======================= */
app.get("/api/payment-methods", auth, wrap(async (req, res) =>
  res.json({ items: await db.all("SELECT id, name, detail, kind FROM payment_methods WHERE user_id = ? ORDER BY id", req.user.id) })));

app.post("/api/payment-methods", auth, wrap(async (req, res) => {
  const name = str(req.body.name, 40), detail = str(req.body.detail, 60);
  const kind = ["bank", "ewallet", "cash", "card"].includes(req.body.kind) ? req.body.kind : "bank";
  if (!name) throw new HttpError(400, "Please enter a name for this payment method.");
  if (await db.get("SELECT 1 AS x FROM payment_methods WHERE user_id = ? AND lower(name) = lower(?)", req.user.id, name))
    throw new HttpError(409, "You already have a payment method with that name.");
  const id = await db.insert("INSERT INTO payment_methods (user_id, name, detail, kind) VALUES (?,?,?,?)", req.user.id, name, detail, kind);
  res.status(201).json({ item: { id, name, detail, kind } });
}));

app.delete("/api/payment-methods/:id", auth, wrap(async (req, res) => {
  const r = await db.run("DELETE FROM payment_methods WHERE id = ? AND user_id = ?", pid(req.params.id), req.user.id);
  if (!r.changes) throw new HttpError(404, "Payment method not found.");
  res.json({ ok: true });
}));

/* ======================= BUDGETS ======================= */
const getBudgets = async (uid) =>
  Object.fromEntries((await db.all("SELECT category, limit_amount FROM budgets WHERE user_id = ?", uid)).map((r) => [r.category, r.limit_amount]));

app.get("/api/budgets", auth, wrap(async (req, res) => res.json({ budgets: await getBudgets(req.user.id) })));

app.put("/api/budgets", auth, wrap(async (req, res) => {
  const entries = Object.entries(req.body.budgets || {});
  for (const [c, v] of entries) {
    if (!EXPENSE_CATS.includes(c)) throw new HttpError(400, `Unknown category: ${c}`);
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 1e9) throw new HttpError(400, `Invalid budget for ${c}.`);
  }
  await db.transaction(async (tx) => {
    for (const [c, v] of entries)
      await tx.run("INSERT INTO budgets (user_id, category, limit_amount) VALUES (?,?,?) ON CONFLICT (user_id, category) DO UPDATE SET limit_amount = EXCLUDED.limit_amount", req.user.id, c, round2(v));
  });
  res.json({ budgets: await getBudgets(req.user.id) });
}));

/* ======================= TRANSACTIONS ======================= */
// Receipts are stored in the database (Vercel functions have no persistent disk).
// Vercel caps request bodies at ~4.5 MB, so uploads are limited to 4 MB.
const MAX_RECEIPT = 4 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RECEIPT },
  fileFilter: (_r, f, cb) =>
    /\.(png|jpe?g|pdf)$/i.test(f.originalname) && /^(image\/(png|jpeg)|application\/pdf)$/.test(f.mimetype)
      ? cb(null, true) : cb(new HttpError(400, "Receipt must be a PNG, JPG, or PDF.")),
});
// Never SELECT the receipt bytes in list queries.
const TX_COLS = "id, title, note, category, amount, payment_method, date, (receipt_mime IS NOT NULL) AS has_receipt";
const txOut = (t) => ({
  id: t.id, title: t.title, note: t.note, category: t.category, amount: t.amount,
  paymentMethod: t.payment_method, date: t.date, hasReceipt: !!t.has_receipt,
});

function parseTx(b) {
  const type = b.type === "income" ? "income" : "expense";
  const amount = money(b.amount);
  const date = b.date || today();
  if (!validDate(date)) throw new HttpError(400, "Please enter a valid date.");
  const category = type === "income" ? INCOME_CAT : str(b.category, 30);
  if (type === "expense" && !EXPENSE_CATS.includes(category)) throw new HttpError(400, "Please choose a category.");
  const note = str(b.note, 200);
  const title = str(b.title, 100) || note || category;
  return { title, note, category, amount: type === "income" ? amount : -amount, date, pm: str(b.paymentMethod, 40) };
}

app.get("/api/transactions", auth, wrap(async (req, res) => {
  const { month, type, method, q } = req.query;
  const where = ["user_id = ?"], args = [req.user.id];
  if (month && month !== "all") {
    if (!validMonth(month)) throw new HttpError(400, "Invalid month.");
    where.push("substr(date,1,7) = ?"); args.push(month);
  }
  if (type === "income") where.push("amount > 0");
  if (type === "expense") where.push("amount < 0");
  if (method && method !== "all") { where.push("payment_method = ?"); args.push(String(method)); }
  if (q) { where.push("(title ILIKE ? OR note ILIKE ? OR category ILIKE ?)"); const l = `%${String(q).replace(/[%_\\]/g, "")}%`; args.push(l, l, l); }
  const rows = await db.all(`SELECT ${TX_COLS} FROM transactions WHERE ${where.join(" AND ")} ORDER BY date DESC, id DESC`, ...args);
  const sum = (f) => round2(rows.filter(f).reduce((a, t) => a + Math.abs(t.amount), 0));
  const inn = sum((t) => t.amount > 0), out = sum((t) => t.amount < 0);
  let saved = 0;
  if (month && month !== "all") saved = (await db.get("SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE user_id = ? AND substr(date,1,7) = ?", req.user.id, month)).s;
  const mix = {};
  rows.filter((t) => t.amount < 0).forEach((t) => { const k = t.payment_method || "Other"; mix[k] = (mix[k] || 0) + -t.amount; });
  const paymentMix = Object.entries(mix).map(([name, amount]) => ({ name, amount: round2(amount), pct: out ? Math.round((amount / out) * 100) : 0 })).sort((a, b) => b.amount - a.amount);
  res.json({
    items: rows.map(txOut),
    totals: { in: inn, out, inCount: rows.filter((t) => t.amount > 0).length, outCount: rows.filter((t) => t.amount < 0).length, net: round2(inn - out), saved: round2(saved) },
    paymentMix,
  });
}));

app.get("/api/transactions/export", auth, wrap(async (req, res) => {
  const rows = await db.all("SELECT date, title, note, category, payment_method, amount FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC", req.user.id);
  const esc = (v) => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const csv = ["Date,Title,Note,Category,Payment method,Amount"]
    .concat(rows.map((t) => [t.date, esc(t.title), esc(t.note), t.category, esc(t.payment_method), t.amount].join(","))).join("\n");
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="budgetmate-transactions.csv"' }).send(csv);
}));

const ownTx = async (id, uid) => {
  const t = await db.get(`SELECT ${TX_COLS} FROM transactions WHERE id = ? AND user_id = ?`, pid(id), uid);
  if (!t) throw new HttpError(404, "Transaction not found.");
  return t;
};

app.get("/api/transactions/:id", auth, wrap(async (req, res) => res.json({ item: txOut(await ownTx(req.params.id, req.user.id)) })));

app.post("/api/transactions", auth, upload.single("receipt"), wrap(async (req, res) => {
  const t = parseTx(req.body);
  const id = await db.insert(
    "INSERT INTO transactions (user_id, title, note, category, amount, payment_method, date, receipt_data, receipt_mime) VALUES (?,?,?,?,?,?,?,?,?)",
    req.user.id, t.title, t.note, t.category, t.amount, t.pm, t.date, req.file?.buffer ?? null, req.file?.mimetype ?? null);
  res.status(201).json({ item: txOut(await ownTx(id, req.user.id)) });
}));

app.put("/api/transactions/:id", auth, upload.single("receipt"), wrap(async (req, res) => {
  const old = await ownTx(req.params.id, req.user.id);
  const t = parseTx(req.body);
  // A new file replaces the old receipt; no file keeps whatever is already attached.
  await db.run(
    "UPDATE transactions SET title=?, note=?, category=?, amount=?, payment_method=?, date=?, receipt_data = COALESCE(?, receipt_data), receipt_mime = COALESCE(?, receipt_mime) WHERE id=?",
    t.title, t.note, t.category, t.amount, t.pm, t.date, req.file?.buffer ?? null, req.file?.mimetype ?? null, old.id);
  res.json({ item: txOut(await ownTx(old.id, req.user.id)) });
}));

app.delete("/api/transactions/:id", auth, wrap(async (req, res) => {
  const old = await ownTx(req.params.id, req.user.id);
  await db.run("DELETE FROM transactions WHERE id = ?", old.id);
  res.json({ ok: true });
}));

app.get("/api/transactions/:id/receipt", auth, wrap(async (req, res) => {
  const t = await db.get("SELECT receipt_data, receipt_mime FROM transactions WHERE id = ? AND user_id = ?", pid(req.params.id), req.user.id);
  if (!t?.receipt_data) throw new HttpError(404, "No receipt attached.");
  res.set({
    "Content-Type": t.receipt_mime,
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=3600",
  }).send(Buffer.from(t.receipt_data));
}));

/* ======================= GOALS ======================= */
const monthsBetween = (a, b) => Math.max(1, Math.ceil((new Date(b) - new Date(a)) / (30.44 * 864e5)));

async function goalOut(g, withHistory) {
  const cs = await db.all("SELECT id, amount, source, date FROM contributions WHERE goal_id = ? ORDER BY date DESC, id DESC", g.id);
  const saved = round2(cs.reduce((a, c) => a + c.amount, 0));
  const remaining = Math.max(0, round2(g.target - saved));
  const t = today();
  const pct = Math.min(100, Math.round((saved / g.target) * 100));
  const monthly = remaining ? Math.ceil(remaining / monthsBetween(t, g.target_date > t ? g.target_date : t)) : 0;
  const since = addDays(t, -90);
  const recent = cs.filter((c) => c.date >= since).reduce((a, c) => a + c.amount, 0) / 3;
  const projected = remaining && recent > 0 ? addDays(t, Math.ceil((remaining / recent) * 30.44)) : null;
  let status = "On track";
  if (saved >= g.target) status = "Completed";
  else if (g.target_date < t) status = "Overdue";
  else if (projected && projected > g.target_date) status = "Behind";
  else if (!projected && saved === 0) status = "Not started";
  const out = {
    id: g.id, name: g.name, target: g.target, targetDate: g.target_date, note: g.note, color: g.color,
    saved, remaining, pct, monthlyNeeded: monthly, projectedDate: projected, status,
  };
  if (withHistory) {
    out.contributions = cs;
    out.milestones = [25, 50, 75, 100].map((p) => {
      const need = (g.target * p) / 100;
      let run = 0, reached = null;
      for (const c of [...cs].reverse()) { run += c.amount; if (run >= need) { reached = c.date; break; } }
      return { pct: p, amount: round2(need), reached };
    });
  }
  return out;
}
const COLORS = ["emerald", "blue", "amber", "purple", "red"];
function parseGoal(b) {
  const name = str(b.name, 60);
  if (!name) throw new HttpError(400, "Please name your goal.");
  const target = money(b.target, "Target amount");
  if (!validDate(b.targetDate)) throw new HttpError(400, "Please choose a target date.");
  return { name, target, targetDate: b.targetDate, note: str(b.note, 300), color: COLORS.includes(b.color) ? b.color : "emerald" };
}
const ownGoal = async (id, uid) => {
  const g = await db.get("SELECT * FROM goals WHERE id = ? AND user_id = ?", pid(id), uid);
  if (!g) throw new HttpError(404, "Goal not found.");
  return g;
};

app.get("/api/goals", auth, wrap(async (req, res) => {
  const rows = await db.all("SELECT * FROM goals WHERE user_id = ? ORDER BY target_date, id", req.user.id);
  const items = await Promise.all(rows.map((g) => goalOut(g)));
  const saved = round2(items.reduce((a, g) => a + g.saved, 0)), target = round2(items.reduce((a, g) => a + g.target, 0));
  const thisMonth = (await db.get("SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE user_id = ? AND substr(date,1,7) = ?", req.user.id, currentMonth())).s;
  res.json({
    items,
    totals: { saved, target, pct: target ? Math.round((saved / target) * 100) : 0, active: items.filter((g) => g.status !== "Completed").length, contributedThisMonth: round2(thisMonth), monthlyNeeded: items.reduce((a, g) => a + g.monthlyNeeded, 0) },
  });
}));
app.post("/api/goals", auth, wrap(async (req, res) => {
  const g = parseGoal(req.body);
  const id = await db.insert("INSERT INTO goals (user_id, name, target, target_date, note, color) VALUES (?,?,?,?,?,?)", req.user.id, g.name, g.target, g.targetDate, g.note, g.color);
  res.status(201).json({ item: await goalOut(await ownGoal(id, req.user.id), true) });
}));
app.get("/api/goals/:id", auth, wrap(async (req, res) => res.json({ item: await goalOut(await ownGoal(req.params.id, req.user.id), true) })));
app.put("/api/goals/:id", auth, wrap(async (req, res) => {
  const old = await ownGoal(req.params.id, req.user.id);
  const g = parseGoal({ ...{ name: old.name, target: old.target, targetDate: old.target_date, note: old.note, color: old.color }, ...req.body });
  await db.run("UPDATE goals SET name=?, target=?, target_date=?, note=?, color=? WHERE id=?", g.name, g.target, g.targetDate, g.note, g.color, old.id);
  res.json({ item: await goalOut(await ownGoal(old.id, req.user.id), true) });
}));
app.delete("/api/goals/:id", auth, wrap(async (req, res) => {
  const g = await ownGoal(req.params.id, req.user.id);
  await db.run("DELETE FROM goals WHERE id = ?", g.id);
  res.json({ ok: true });
}));
app.post("/api/goals/:id/contributions", auth, wrap(async (req, res) => {
  const g = await ownGoal(req.params.id, req.user.id);
  const amount = money(req.body.amount);
  const date = req.body.date || today();
  if (!validDate(date)) throw new HttpError(400, "Please enter a valid date.");
  await db.run("INSERT INTO contributions (goal_id, user_id, amount, source, date) VALUES (?,?,?,?,?)", g.id, req.user.id, amount, str(req.body.source, 60) || "Manual contribution", date);
  res.status(201).json({ item: await goalOut(g, true) });
}));
app.delete("/api/goals/:id/contributions/:cid", auth, wrap(async (req, res) => {
  const g = await ownGoal(req.params.id, req.user.id);
  const r = await db.run("DELETE FROM contributions WHERE id = ? AND goal_id = ?", pid(req.params.cid), g.id);
  if (!r.changes) throw new HttpError(404, "Contribution not found.");
  res.json({ item: await goalOut(g, true) });
}));

/* ======================= SUMMARY (Home) ======================= */
const spentByCat = async (uid, month) =>
  Object.fromEntries((await db.all("SELECT category, -SUM(amount) AS s FROM transactions WHERE user_id = ? AND amount < 0 AND substr(date,1,7) = ? GROUP BY category", uid, month)).map((r) => [r.category, round2(r.s)]));
const monthTotals = async (uid, month) => {
  const [r, s] = await Promise.all([
    db.get("SELECT COALESCE(SUM(CASE WHEN amount>0 THEN amount END),0) AS i, COALESCE(-SUM(CASE WHEN amount<0 THEN amount END),0) AS e FROM transactions WHERE user_id = ? AND substr(date,1,7) = ?", uid, month),
    db.get("SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE user_id = ? AND substr(date,1,7) = ?", uid, month),
  ]);
  return { income: round2(r.i), expenses: round2(r.e), saved: round2(s.s) };
};

app.get("/api/summary", auth, wrap(async (req, res) => {
  const uid = req.user.id;
  const month = validMonth(req.query.month) ? req.query.month : currentMonth();
  const end = today(), start = addDays(end, -6);
  const [t, budgets, spent, allTx, allSaved, weekRows, recentRows, goalRows] = await Promise.all([
    monthTotals(uid, month),
    getBudgets(uid),
    spentByCat(uid, month),
    db.get("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE user_id = ?", uid),
    db.get("SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE user_id = ?", uid),
    db.all("SELECT date, -SUM(amount) AS s FROM transactions WHERE user_id = ? AND amount < 0 AND date >= ? AND date <= ? GROUP BY date", uid, start, end),
    db.all(`SELECT ${TX_COLS} FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 5`, uid),
    db.all("SELECT * FROM goals WHERE user_id = ? ORDER BY target_date LIMIT 20", uid),
  ]);
  const budgetTotal = Object.values(budgets).reduce((a, b) => a + b, 0);
  const budgetSpent = EXPENSE_CATS.reduce((a, c) => a + (spent[c] || 0), 0);

  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDay = Object.fromEntries(weekRows.map((r) => [r.date, r.s]));
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(end, -i);
    week.push({ date: d, label: names[new Date(d + "T00:00:00").getDay()], amount: round2(byDay[d] || 0), today: i === 0 });
  }
  const categories = Object.entries(spent).map(([category, amount]) => ({ category, amount, pct: t.expenses ? Math.round((amount / t.expenses) * 100) : 0 })).sort((a, b) => b.amount - a.amount);
  const recent = recentRows.map(txOut);
  const goal = (await Promise.all(goalRows.map((g) => goalOut(g)))).find((g) => g.status !== "Completed") || null;

  // sidebar "smart tip": closest-to-limit category
  let tip = null;
  const ranked = EXPENSE_CATS.filter((c) => budgets[c] > 0).map((c) => ({ c, left: budgets[c] - (spent[c] || 0) })).sort((a, b) => a.left - b.left);
  if (ranked.length && budgetSpent > 0) {
    const w = ranked[0];
    tip = w.left < 0 ? `You're ₱${Math.round(-w.left).toLocaleString("en-PH")} over your ${w.c} budget this month.`
      : `Your ${w.c} budget has ₱${Math.round(w.left).toLocaleString("en-PH")} left this month.`;
  }
  res.json({
    month, balance: round2(allTx.s - allSaved.s), ...t,
    savingsRate: t.income ? Math.round((t.saved / t.income) * 100) : 0,
    expensePct: t.income ? Math.round((t.expenses / t.income) * 100) : 0,
    budgetLeft: round2(budgetTotal - budgetSpent), budgetTotal: round2(budgetTotal),
    week, weekTotal: round2(week.reduce((a, d) => a + d.amount, 0)),
    categories, recent, goal, tip,
  });
}));

/* ======================= INSIGHTS ======================= */
app.get("/api/insights", auth, wrap(async (req, res) => {
  const uid = req.user.id;
  const month = validMonth(req.query.month) ? req.query.month : currentMonth();
  const prev = shiftMonth(month, -1);
  const months = [5, 4, 3, 2, 1, 0].map((i) => shiftMonth(month, -i));
  const [budgets, spent, prevSpent, totals] = await Promise.all([
    getBudgets(uid), spentByCat(uid, month), spentByCat(uid, prev),
    Promise.all(months.map((m) => monthTotals(uid, m))),
  ]);
  const total = totals[5].expenses, prevTotal = totals[4].expenses;
  const trend = months.map((m, i) => ({ month: m, label: new Date(m + "-01T00:00:00").toLocaleString("en", { month: "short" }), amount: totals[i].expenses }));
  const bva = EXPENSE_CATS.map((c) => ({ category: c, spent: spent[c] || 0, budget: budgets[c] || 0 })).filter((r) => r.spent > 0 || r.budget > 0);
  const compare = EXPENSE_CATS.filter((c) => spent[c] || prevSpent[c]).map((c) => ({
    category: c, amount: spent[c] || 0, prev: prevSpent[c] || 0,
    change: prevSpent[c] ? Math.round((((spent[c] || 0) - prevSpent[c]) / prevSpent[c]) * 100) : null,
  })).sort((a, b) => b.amount - a.amount);
  const withinPlan = bva.filter((r) => r.budget > 0 && r.spent <= r.budget).length;
  const peso = (n) => "₱" + Math.round(n).toLocaleString("en-PH");

  const tips = [];
  const drops = compare.filter((c) => c.change !== null && c.change < 0).sort((a, b) => (b.prev - b.amount) - (a.prev - a.amount));
  if (drops[0]) tips.push({ tone: "good", title: `Nice work on ${drops[0].category.toLowerCase()} spending`, body: `You spent ${peso(drops[0].prev - drops[0].amount)} less on ${drops[0].category.toLowerCase()} than last month.` });
  const over = bva.filter((r) => r.budget > 0 && r.spent > r.budget).sort((a, b) => (b.spent - b.budget) - (a.spent - a.budget));
  if (over[0]) tips.push({ tone: "warn", title: `${over[0].category} needs a quick check`, body: `${over[0].category} is ${peso(over[0].spent - over[0].budget)} over plan this month.` });
  const near = bva.find((r) => r.budget > 0 && r.spent <= r.budget && r.spent / r.budget >= 0.8);
  if (near) tips.push({ tone: "warn", title: `${near.category} is close to its limit`, body: `You've used ${Math.round((near.spent / near.budget) * 100)}% of your ${near.category.toLowerCase()} budget.` });
  const ups = compare.filter((c) => c.change !== null && c.change > 15).sort((a, b) => b.change - a.change);
  if (ups[0]) tips.push({ tone: "info", title: `${ups[0].category} is trending up`, body: `Up ${ups[0].change}% from last month (${peso(ups[0].prev)} → ${peso(ups[0].amount)}).` });
  if (prevTotal && total && total < prevTotal) tips.push({ tone: "good", title: "Spending is down overall", body: `${peso(prevTotal - total)} less than last month.` });
  if (!tips.length) tips.push({ tone: "info", title: "Keep logging expenses", body: "Add a few more transactions and personalised tips will show up here." });

  const top = compare[0];
  res.json({
    month, total, prevTotal,
    totalChange: prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : null,
    largest: top ? { category: top.category, pct: total ? Math.round((top.amount / total) * 100) : 0, amount: top.amount } : null,
    health: { within: withinPlan, of: bva.filter((r) => r.budget > 0).length },
    trend, bva, compare, tips: tips.slice(0, 3), budgets,
  });
}));

/* ======================= ERRORS ======================= */
app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found.")));
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) err = new HttpError(400, err.code === "LIMIT_FILE_SIZE" ? "Receipt must be under 4 MB." : err.message);
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? "Something went wrong on our side." : err.message });
});

export default app;
