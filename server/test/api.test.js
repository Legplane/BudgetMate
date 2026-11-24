import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import { today } from "../lib.js";

let server, base;
before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://localhost:${server.address().port}/api`; r(); }); }));
after(() => server.close());

const call = async (method, path, body, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(base + path, { method, headers, body: payload });
  const ct = res.headers.get("content-type") || "";
  return { status: res.status, body: ct.includes("json") ? await res.json() : await res.text() };
};
const PW = "Secret123!";
const reg = async (email) => (await call("POST", "/auth/register", { firstName: "Test", lastName: "User", email, password: PW })).body.token;
const month = () => today().slice(0, 7);

test("auth: register, duplicate, login, bad password, protected routes", async () => {
  const base = { firstName: "Ann", lastName: "Reyes", email: "ann@x.com", password: PW };
  let r = await call("POST", "/auth/register", { ...base, password: "short" });
  assert.equal(r.status, 400);
  r = await call("POST", "/auth/register", { ...base, firstName: "" });
  assert.equal(r.status, 400); assert.match(r.body.error, /first name/);
  assert.equal((await call("POST", "/auth/register", { ...base, lastName: "R3yes" })).status, 400);
  r = await call("POST", "/auth/register", base);
  assert.equal(r.status, 201); assert.ok(r.body.token);
  assert.equal((await call("POST", "/auth/register", { ...base, email: "ANN@x.com" })).status, 409);
  assert.equal((await call("POST", "/auth/login", { email: "ann@x.com", password: "nope" })).status, 401);
  r = await call("POST", "/auth/login", { email: "ann@x.com", password: PW });
  assert.equal(r.status, 200);
  assert.equal((await call("GET", "/me")).status, 401);
  assert.equal((await call("GET", "/me", null, r.body.token)).body.user.email, "ann@x.com");
  assert.equal((await call("GET", "/me", null, "garbage")).status, 401);
});

test("passwords: 8+ chars, capital, number and symbol are all required", async () => {
  const base = { firstName: "Pw", lastName: "Test" };
  for (const bad of ["Short1!", "alllowercase1!", "NoNumber!!", "NoSymbol123", "has space 1A"].slice(0, 4)) {
    const r = await call("POST", "/auth/register", { ...base, email: `pw-${bad.length}@x.com`, password: bad });
    assert.equal(r.status, 400, bad); assert.match(r.body.error, /Password needs/);
  }
  assert.equal((await call("POST", "/auth/register", { ...base, email: "pw-ok@x.com", password: "Good1234#" })).status, 201);
});

test("users: name is stored as separate columns, middle name and suffix optional", async () => {
  const r = await call("POST", "/auth/register", { firstName: "Juan", middleName: "Santos", lastName: "Dela Cruz", suffix: "Jr.", email: "name@x.com", password: PW });
  assert.equal(r.status, 201);
  const u = r.body.user;
  assert.deepEqual([u.firstName, u.middleName, u.lastName, u.suffix], ["Juan", "Santos", "Dela Cruz", "Jr."]);
  assert.equal(u.name, "Juan Santos Dela Cruz Jr.");
  const plain = (await call("POST", "/auth/register", { firstName: "Mia", lastName: "Lim", email: "name2@x.com", password: PW })).body.user;
  assert.equal(plain.middleName, ""); assert.equal(plain.suffix, ""); assert.equal(plain.name, "Mia Lim");
  const up = await call("PUT", "/me", { middleName: "", suffix: "III" }, r.body.token);
  assert.equal(up.body.user.middleName, ""); assert.equal(up.body.user.suffix, "III");
  assert.equal((await call("PUT", "/me", { firstName: "" }, r.body.token)).status, 400);
});

test("transactions: CRUD, validation, summary math, filters", async () => {
  const t = await reg("tx@x.com");
  assert.equal((await call("POST", "/transactions", { type: "expense", amount: 0, category: "Food", title: "X" }, t)).status, 400);
  assert.equal((await call("POST", "/transactions", { type: "expense", amount: 10, category: "Nope", title: "X" }, t)).status, 400);
  const noTitle = await call("POST", "/transactions", { type: "expense", amount: 10, category: "Food", note: "only a note" }, t);
  assert.equal(noTitle.status, 400); assert.match(noTitle.body.error, /title/);
  await call("POST", "/transactions", { type: "income", amount: 20000, title: "Salary", paymentMethod: "Cash" }, t);
  const e = await call("POST", "/transactions", { type: "expense", amount: 500.5, category: "Food", title: "Lunch", paymentMethod: "Cash", date: today() }, t);
  assert.equal(e.status, 201); assert.equal(e.body.item.amount, -500.5);
  await call("POST", "/transactions", { type: "expense", amount: 1000, category: "Bills", title: "Meralco" }, t);

  let s = (await call("GET", "/summary", null, t)).body;
  assert.equal(s.income, 20000); assert.equal(s.expenses, 1500.5); assert.equal(s.balance, 18499.5);
  assert.equal(s.recent.length, 3);

  let l = (await call("GET", `/transactions?month=${month()}&type=expense&q=lunch`, null, t)).body;
  assert.equal(l.items.length, 1); assert.equal(l.totals.out, 500.5);

  const up = await call("PUT", `/transactions/${e.body.item.id}`, { type: "expense", amount: 600, category: "Food", title: "Lunch", date: today() }, t);
  assert.equal(up.body.item.amount, -600);
  assert.equal((await call("DELETE", `/transactions/${e.body.item.id}`, null, t)).status, 200);
  assert.equal((await call("GET", `/transactions/${e.body.item.id}`, null, t)).status, 404);
  assert.equal((await call("GET", "/summary", null, t)).body.expenses, 1000);

  const rm = await call("POST", "/transactions", { type: "expense", amount: 4500, category: "Bills", title: "Boarding house rent", note: "November", roomNumber: "204-B" }, t);
  assert.equal(rm.status, 201); assert.equal(rm.body.item.roomNumber, "204-B"); assert.equal(rm.body.item.note, "November");
  assert.equal((await call("POST", "/transactions", { type: "expense", amount: 5, category: "Food", title: "x", roomNumber: "<b>" }, t)).status, 400);
  assert.equal((await call("GET", "/transactions?q=204", null, t)).body.items.length, 1);

  const csv = await call("GET", "/transactions/export", null, t);
  assert.match(csv.body, /Date,Title,Note,Room number/); assert.match(csv.body, /Meralco/); assert.match(csv.body, /204-B/);
});

test("users cannot see or modify each other's data", async () => {
  const a = await reg("iso-a@x.com"), b = await reg("iso-b@x.com");
  const tx = (await call("POST", "/transactions", { type: "expense", amount: 50, category: "Food", title: "Snack" }, a)).body.item;
  const goal = (await call("POST", "/goals", { name: "G", target: 1000, targetDate: "2099-01-01" }, a)).body.item;
  assert.equal((await call("GET", `/transactions/${tx.id}`, null, b)).status, 404);
  assert.equal((await call("DELETE", `/transactions/${tx.id}`, null, b)).status, 404);
  assert.equal((await call("PUT", `/transactions/${tx.id}`, { amount: 1, category: "Food", title: "x" }, b)).status, 404);
  assert.equal((await call("GET", `/goals/${goal.id}`, null, b)).status, 404);
  assert.equal((await call("POST", `/goals/${goal.id}/contributions`, { amount: 5 }, b)).status, 404);
  assert.equal((await call("GET", "/transactions", null, b)).body.items.length, 0);
});

test("goals: create, contribute, balance impact, milestones, delete", async () => {
  const t = await reg("goal@x.com");
  await call("POST", "/transactions", { type: "income", amount: 10000, title: "Pay" }, t);
  assert.equal((await call("POST", "/goals", { name: "", target: 100, targetDate: "2099-01-01" }, t)).status, 400);
  assert.equal((await call("POST", "/goals", { name: "X", target: -5, targetDate: "2099-01-01" }, t)).status, 400);
  const g = (await call("POST", "/goals", { name: "Laptop", target: 4000, targetDate: "2099-01-01" }, t)).body.item;
  assert.equal(g.saved, 0);
  let r = await call("POST", `/goals/${g.id}/contributions`, { amount: 1000, source: "GCash" }, t);
  assert.equal(r.status, 201); assert.equal(r.body.item.saved, 1000); assert.equal(r.body.item.pct, 25);
  assert.equal(r.body.item.milestones[0].reached !== null, true);
  const s = (await call("GET", "/summary", null, t)).body;
  assert.equal(s.balance, 9000); assert.equal(s.saved, 1000);
  assert.equal(s.goal.name, "Laptop");
  r = await call("DELETE", `/goals/${g.id}/contributions/${r.body.item.contributions[0].id}`, null, t);
  assert.equal(r.body.item.saved, 0);
  await call("POST", `/goals/${g.id}/contributions`, { amount: 4000 }, t);
  assert.equal((await call("GET", `/goals/${g.id}`, null, t)).body.item.status, "Completed");
  const up = await call("PUT", `/goals/${g.id}`, { name: "Gaming laptop" }, t);
  assert.equal(up.body.item.name, "Gaming laptop");
  await call("DELETE", `/goals/${g.id}`, null, t);
  assert.equal((await call("GET", "/goals", null, t)).body.items.length, 0);
  assert.equal((await call("GET", "/summary", null, t)).body.balance, 10000);
});

test("budgets and insights", async () => {
  const t = await reg("ins@x.com");
  await call("POST", "/transactions", { type: "expense", amount: 3500, category: "Bills", title: "Meralco" }, t);
  assert.equal((await call("PUT", "/budgets", { budgets: { Bills: 3000 } }, t)).body.budgets.Bills, 3000);
  assert.equal((await call("PUT", "/budgets", { budgets: { Bogus: 1 } }, t)).status, 400);
  const i = (await call("GET", `/insights?month=${month()}`, null, t)).body;
  assert.equal(i.total, 3500);
  assert.equal(i.bva.find((r) => r.category === "Bills").budget, 3000);
  assert.ok(i.tips.some((x) => x.tone === "warn"));
  assert.equal(i.trend.length, 6);
});

test("receipts: upload, fetch, type + auth checks", async () => {
  const t = await reg("rcpt@x.com"), other = await reg("rcpt2@x.com");
  const fd = new FormData();
  fd.append("type", "expense"); fd.append("amount", "99"); fd.append("category", "Food"); fd.append("title", "Lunch");
  fd.append("receipt", new Blob([Buffer.from("fakepng")], { type: "image/png" }), "r.png");
  const r = await call("POST", "/transactions", fd, t);
  assert.equal(r.status, 201); assert.equal(r.body.item.hasReceipt, true);
  assert.equal((await fetch(`${base}/transactions/${r.body.item.id}/receipt`, { headers: { Authorization: `Bearer ${t}` } })).status, 200);
  assert.equal((await call("GET", `/transactions/${r.body.item.id}/receipt`, null, other)).status, 404);
  const bad = new FormData();
  bad.append("amount", "5"); bad.append("category", "Food"); bad.append("title", "x");
  bad.append("receipt", new Blob(["x"], { type: "text/html" }), "x.html");
  assert.equal((await call("POST", "/transactions", bad, t)).status, 400);
});

test("profile, password change, payment methods, reset flow, delete account", async () => {
  const t = await reg("prof@x.com");
  let r = await call("PUT", "/me", { firstName: "New", lastName: "Name", city: "Cebu", prefs: { budget: false } }, t);
  assert.equal(r.body.user.name, "New Name"); assert.equal(r.body.user.prefs.budget, false); assert.equal(r.body.user.prefs.goal, true);
  assert.equal((await call("PUT", "/me", { email: "tx@x.com" }, t)).status, 409);
  assert.equal((await call("PUT", "/me/password", { current: "wrong", next: "Newpass123!" }, t)).status, 400);
  assert.equal((await call("PUT", "/me/password", { current: PW, next: "weakpass" }, t)).status, 400);
  assert.equal((await call("PUT", "/me/password", { current: PW, next: "Newpass123!" }, t)).status, 200);
  assert.equal((await call("POST", "/auth/login", { email: "prof@x.com", password: "Newpass123!" })).status, 200);

  const pm = await call("POST", "/payment-methods", { name: "GCash", detail: "09xx", kind: "ewallet" }, t);
  assert.equal(pm.status, 201);
  assert.equal((await call("POST", "/payment-methods", { name: "gcash" }, t)).status, 409);
  assert.equal((await call("GET", "/payment-methods", null, t)).body.items.length, 2); // Cash + GCash
  assert.equal((await call("DELETE", `/payment-methods/${pm.body.item.id}`, null, t)).status, 200);

  const f = await call("POST", "/auth/forgot", { email: "prof@x.com" });
  assert.ok(f.body.devCode);
  assert.equal((await call("POST", "/auth/reset", { email: "prof@x.com", code: "bad", password: "Another123!" })).status, 400);
  assert.equal((await call("POST", "/auth/reset", { email: "prof@x.com", code: f.body.devCode, password: "Another123!" })).status, 200);
  assert.equal((await call("POST", "/auth/reset", { email: "prof@x.com", code: f.body.devCode, password: "Again12345!" })).status, 400); // single use
  assert.equal((await call("POST", "/auth/login", { email: "prof@x.com", password: "Another123!" })).status, 200);

  assert.equal((await call("DELETE", "/me", { password: "nope" }, t)).status, 400);
  assert.equal((await call("DELETE", "/me", { password: "Another123!" }, t)).status, 200);
  assert.equal((await call("GET", "/me", null, t)).status, 401);
});
