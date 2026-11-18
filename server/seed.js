import bcrypt from "bcryptjs";
import db, { initDb } from "./db.js";
import { DEFAULT_BUDGETS, today, shiftMonth, currentMonth } from "./lib.js";

export const DEMO = { email: "alex.santos@gmail.com", password: "password123" };

// Creates a demo account with realistic data on a brand-new database only.
export async function seedDemo() {
  await initDb();
  if ((await db.get("SELECT COUNT(*) AS n FROM users")).n > 0) return;

  await db.transaction(async (tx) => {
    const uid = await tx.insert(
      "INSERT INTO users (name,email,password_hash,phone,city,occupation) VALUES (?,?,?,?,?,?)",
      "Alex Santos", DEMO.email, bcrypt.hashSync(DEMO.password, 10), "+63 917 555 0148", "Quezon City", "Junior designer");

    for (const [c, l] of Object.entries(DEFAULT_BUDGETS))
      await tx.run("INSERT INTO budgets (user_id, category, limit_amount) VALUES (?,?,?)", uid, c, l);
    for (const r of [["BPI Debit", "•• 4821", "bank"], ["GCash", "+63 917 ••• 0148", "ewallet"], ["Maya", "+63 917 ••• 0148", "ewallet"], ["Cash", "On hand", "cash"]])
      await tx.run("INSERT INTO payment_methods (user_id,name,detail,kind) VALUES (?,?,?,?)", uid, ...r);

    const nowDay = Number(today().slice(8));
    const cur = currentMonth();
    // [day, title, note, category, amount, method]
    const tpl = [
      [3, "Monthly salary", "Part-time role", "Income", 16500, "BPI Debit"],
      [4, "Freelance project", "Logo design balance", "Income", 15000, "BPI Debit"],
      [5, "Meralco", "Electric bill", "Bills", -1480, "BPI Debit"],
      [5, "Jollibee", "Lunch", "Food", -245, "GCash"],
      [5, "Bus and jeepney fare", "Commute", "Transport", -96, "Cash"],
      [6, "SM Supermarket", "Weekly groceries", "Food", -1320, "Maya"],
      [7, "Printing and supplies", "Project materials", "School", -620, "GCash"],
      [8, "Internet bill", "PLDT Fibr", "Bills", -1299, "BPI Debit"],
      [9, "Grab", "Ride to client meeting", "Transport", -210, "GCash"],
      [11, "Coffee", "Study session", "Food", -180, "Cash"],
      [12, "Uniqlo", "Shirt", "Shopping", -790, "Maya"],
      [13, "Jeepney fare", "Commute", "Transport", -120, "Cash"],
      [14, "SM Supermarket", "Weekly groceries", "Food", -1150, "Maya"],
      [15, "Tuition installment", "School fees", "School", -1200, "BPI Debit"],
      [16, "Mang Inasal", "Dinner", "Food", -260, "GCash"],
      [17, "MRT load", "Commute", "Transport", -300, "Cash"],
      [18, "Water bill", "Maynilad", "Bills", -480, "BPI Debit"],
    ];
    const mult = [0.92, 1.05, 0.88, 1.12, 1.04, 0.95];
    for (let i = 5; i >= 0; i--) {
      const m = shiftMonth(cur, -i), k = mult[5 - i];
      for (const [d, t, n, c, a, p] of tpl) {
        if (m === cur && d > nowDay) continue;
        const amt = c === "Income" || c === "Bills" ? a : Math.round((a * k) / 5) * 5;
        await tx.run("INSERT INTO transactions (user_id,title,note,category,amount,payment_method,date) VALUES (?,?,?,?,?,?,?)",
          uid, t, n, c, amt, p, `${m}-${String(d).padStart(2, "0")}`);
      }
    }
    const goal = (...a) => tx.insert("INSERT INTO goals (user_id,name,target,target_date,note,color) VALUES (?,?,?,?,?,?)", uid, ...a);
    const contrib = (...a) => tx.run("INSERT INTO contributions (goal_id,user_id,amount,source,date) VALUES (?,?,?,?,?)", a[0], uid, ...a.slice(1));
    const yr = Number(cur.slice(0, 4));
    const laptop = await goal("New Laptop", 45000, `${yr + 1}-03-15`, "For a lightweight laptop that can handle design work, school projects, and freelance tasks.", "emerald");
    const trip = await goal("Baguio Trip", 25000, `${yr}-12-28`, "Weekend getaway with friends.", "blue");
    const fund = await goal("Emergency Fund", 60000, `${yr + 1}-06-30`, "Three months of expenses.", "amber");
    for (let i = 5; i >= 0; i--) {
      const m = shiftMonth(cur, -i);
      await contrib(laptop, 5000, "BPI savings transfer", `${m}-01`);
      await contrib(trip, 3200, "GCash contribution", `${m}-10`);
      await contrib(fund, 3500, "BPI savings transfer", `${m}-20`);
    }
  });
  console.log(`Seeded demo account: ${DEMO.email} / ${DEMO.password}`);
}
