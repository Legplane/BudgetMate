export const EXPENSE_CATS = ["Food", "Transport", "Bills", "School", "Shopping", "Other"];
export const INCOME_CAT = "Income";
export const DEFAULT_BUDGETS = { Food: 5000, Transport: 2500, Bills: 3000, School: 2500, Shopping: 2000, Other: 1000 };

const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Vercel runs in UTC, so "today" is computed in the app's timezone (default Philippines).
const TZ = process.env.APP_TZ || "Asia/Manila";
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
export const monthOf = (date) => date.slice(0, 7);
export const currentMonth = () => today().slice(0, 7);
export const validMonth = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m || "");
export const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "") && !isNaN(Date.parse(d));
export const shiftMonth = (m, delta) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const addDays = (date, n) => {
  const [y, m, d] = date.split("-").map(Number);
  return ymd(new Date(y, m - 1, d + n));
};
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
