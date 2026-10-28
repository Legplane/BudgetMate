import { useState } from "react";
import {
  Wallet, Home, Receipt, Target, Clock, BarChart3, Settings as Cog, Bell, Plus,
  Utensils, Zap, Bus, BookOpen, ShoppingBag, Lightbulb, Lock, Mail, Eye, User,
  Check, ChevronRight, LogOut, Landmark, Smartphone, ArrowLeft, ShieldCheck,
} from "lucide-react";

const peso = (n, d = 0) =>
  "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: d, maximumFractionDigits: d });

const CATS = {
  Food: { i: Utensils, c: "bg-amber-100 text-amber-600" },
  Transport: { i: Bus, c: "bg-blue-100 text-blue-600" },
  Bills: { i: Zap, c: "bg-red-100 text-red-500" },
  School: { i: BookOpen, c: "bg-sky-100 text-sky-600" },
  Shopping: { i: ShoppingBag, c: "bg-purple-100 text-purple-600" },
  Other: { i: Plus, c: "bg-slate-100 text-slate-500" },
};

const START_TXS = [
  { id: 1, t: "Meralco", s: "October electric bill", cat: "Bills", amt: -1480, pm: "BPI Debit", d: "Today · October 5" },
  { id: 2, t: "Jollibee", s: "Lunch", cat: "Food", amt: -245, pm: "GCash", d: "Today · October 5" },
  { id: 3, t: "Bus and jeepney fare", s: "Commute", cat: "Transport", amt: -96, pm: "Cash", d: "Today · October 5" },
  { id: 4, t: "Freelance project", s: "Logo design balance", cat: "Other", amt: 15000, pm: "BPI Savings", d: "Yesterday · October 4" },
  { id: 5, t: "SM Supermarket", s: "Weekly groceries", cat: "Food", amt: -1320, pm: "Maya", d: "Yesterday · October 4" },
  { id: 6, t: "Monthly salary", s: "Part-time role", cat: "Other", amt: 16500, pm: "BPI Savings", d: "Friday · October 3" },
  { id: 7, t: "Printing and supplies", s: "Project materials", cat: "School", amt: -620, pm: "GCash", d: "Friday · October 3" },
];

const NAV = [
  ["home", "Home", Home], ["expenses", "Expenses", Receipt], ["goals", "Goals", Target],
  ["history", "History", Clock], ["insights", "Insights", BarChart3], ["settings", "Settings", Cog],
];

const Card = ({ className = "", children }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 p-4 ${className}`}>{children}</div>
);
const Btn = ({ className = "", ...p }) => (
  <button {...p} className={`bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-xl px-4 py-2.5 ${className}`} />
);
const Ghost = ({ className = "", ...p }) => (
  <button {...p} className={`bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl px-4 py-2.5 ${className}`} />
);
const Label = ({ children }) => (
  <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-1">{children}</div>
);
const Bar = ({ pct, color = "bg-emerald-500" }) => (
  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
    <div className={`h-full rounded-full ${color}`} style={{ width: Math.min(pct, 100) + "%" }} />
  </div>
);
const Ico = ({ cat, size = "w-9 h-9" }) => {
  const C = CATS[cat] || CATS.Other;
  return <div className={`${size} rounded-xl flex items-center justify-center ${C.c}`}><C.i size={16} /></div>;
};
const Toggle = ({ on, set }) => (
  <button onClick={() => set(!on)} className={`w-10 h-6 rounded-full p-0.5 transition ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
    <div className={`w-5 h-5 bg-white rounded-full transition ${on ? "translate-x-4" : ""}`} />
  </button>
);
const Logo = ({ dark }) => (
  <div className="flex items-center gap-2 font-bold text-lg">
    <div className="w-8 h-8 rounded-lg bg-white text-emerald-600 flex items-center justify-center border border-slate-200"><Wallet size={16} /></div>
    <span className={dark ? "text-white" : "text-slate-900"}>BudgetMate</span>
  </div>
);

/* ---------------- AUTH ---------------- */
function Auth({ mode, go }) {
  const login = mode === "login";
  const [show, setShow] = useState(false);
  const Field = ({ icon: I, label, ...p }) => (
    <div className="mb-3">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50">
        <I size={14} className="text-slate-400" />
        <input {...p} className="flex-1 bg-transparent text-sm outline-none" />
      </div>
    </div>
  );
  const perks = login
    ? [["See where your money goes", "Organize GCash, cash, Maya, and bank spending in one place."],
       ["Save with a purpose", "Create clear goals for school, travel, or your emergency fund."],
       ["Private and secure", "Your account data stays protected and in your control."]]
    : [["Add your income", "Start with allowance, salary, freelance work, or side-hustle earnings."],
       ["Track everyday spending", "Record jeepney fares, school costs, groceries, and monthly bills."],
       ["Reach your goals", "Watch every contribution bring New Laptop and other goals closer."]];
  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className={`hidden md:flex w-1/3 flex-col justify-between p-8 text-white ${login ? "bg-emerald-800" : "bg-slate-900"}`}>
        <Logo dark />
        <div>
          <div className="text-[10px] tracking-widest font-semibold text-emerald-300 mb-2">{login ? "MONEY CLARITY, MADE SIMPLE" : "START STRONG"}</div>
          <h1 className="text-3xl font-bold leading-tight mb-3">{login ? "Build better money habits, one peso at a time." : "A clear plan for the money you have today."}</h1>
          <p className="text-sm text-slate-300 mb-5">{login ? "Track daily spending, plan your savings, and stay ready for what matters next." : "Set up your account in minutes. No credit card, no complicated spreadsheets."}</p>
          {perks.map(([a, b], i) => (
            <div key={a} className="flex gap-3 mb-3">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs shrink-0">{login ? <Check size={13} /> : i + 1}</div>
              <div><div className="text-sm font-semibold">{a}</div><div className="text-xs text-slate-300">{b}</div></div>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-300">{login ? <><span className="text-2xl font-bold text-white mr-2">₱18,750</span>Average monthly amount Alex tracks</> : <span className="flex gap-2 items-center"><ShieldCheck size={14} />Secure, private, and built for your real life in the Philippines.</span>}</div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-7 shadow-sm">
          <h2 className="text-xl font-bold">{login ? "Welcome back" : "Create your account"}</h2>
          <p className="text-xs text-slate-500 mb-5">{login ? "Sign in to continue to your BudgetMate account." : "Join BudgetMate and start building a healthier money routine."}</p>
          {!login && <Field icon={User} label="Full name" defaultValue="Alex Santos" />}
          <Field icon={Mail} label="Email address" defaultValue="alex.santos@gmail.com" />
          <div className={login ? "" : "grid grid-cols-2 gap-3"}>
            <Field icon={Lock} label="Password" type={show ? "text" : "password"} defaultValue="password123" />
            {!login && <Field icon={Lock} label="Confirm password" type="password" defaultValue="password123" />}
          </div>
          <label className="flex items-center justify-between text-xs text-slate-600 mb-4">
            <span className="flex items-center gap-2"><input type="checkbox" defaultChecked className="accent-emerald-500" />{login ? "Remember me" : "I agree to the Terms of Use and Privacy Policy"}</span>
            {login && <span className="flex gap-3"><button onClick={() => setShow(!show)}><Eye size={14} /></button><a className="text-emerald-700 font-semibold">Forgot password?</a></span>}
          </label>
          <Btn className="w-full" onClick={() => go("home")}>{login ? "Sign in" : "Create account"}</Btn>
          <p className="text-xs text-center text-slate-500 mt-5">
            {login ? "Don't have an account? " : "Already have an account? "}
            <button className="text-emerald-700 font-bold" onClick={() => go(login ? "signup" : "login")}>{login ? "Create one free" : "Sign in"}</button>
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- SHELL ---------------- */
function Shell({ page, go, title, sub, action, children }) {
  const active = page === "goal" ? "goals" : page;
  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <aside className="w-48 shrink-0 bg-white border-r border-slate-200 p-3 flex flex-col">
        <div className="mb-5 mt-1"><Logo /></div>
        {NAV.map(([k, l, I]) => (
          <button key={k} onClick={() => go(k)}
            className={`flex items-center gap-2.5 text-sm font-medium rounded-xl px-3 py-2.5 mb-1 ${active === k ? "bg-emerald-100 text-emerald-800" : "text-slate-600 hover:bg-slate-50"}`}>
            <I size={15} />{l}
          </button>
        ))}
        <div className="mt-auto bg-slate-900 text-white rounded-xl p-3 text-xs">
          <div className="text-amber-400 text-[10px] font-bold flex items-center gap-1 mb-1"><Lightbulb size={11} />SMART TIP</div>
          You're ₱1,240 under your monthly food budget.
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div><h1 className="text-lg font-bold">{title}</h1><p className="text-xs text-slate-500">{sub}</p></div>
          <div className="flex items-center gap-3">
            {action}
            <div className="w-8 h-8 border border-slate-200 rounded-lg flex items-center justify-center"><Bell size={14} /></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">AS</div>
              <div className="text-xs leading-tight"><b>Alex Santos</b><br /><span className="text-slate-500">Personal account</span></div>
            </div>
          </div>
        </header>
        <div className="p-6 space-y-4 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

const Stat = ({ label, value, note, noteColor = "text-emerald-600", big }) => (
  <Card>
    <Label>{label}</Label>
    <div className={`font-bold ${big ? "text-2xl" : "text-xl"}`}>{value}</div>
    <div className={`text-[11px] mt-1 ${noteColor}`}>{note}</div>
  </Card>
);

/* ---------------- PAGES ---------------- */
function HomePage({ txs, go }) {
  const days = [40, 55, 30, 72, 45, 80, 42];
  const cats = [["Food", 4200, 31], ["Bills", 3260, 24], ["Transport", 2180, 16], ["School", 1950, 14], ["Shopping", 1120, 8]];
  return (<>
    <div className="flex items-end justify-between">
      <div><Label>Available balance</Label><div className="text-3xl font-bold">₱24,680.00</div></div>
    </div>
    <div className="grid grid-cols-4 gap-4">
      <Stat label="Monthly income" value="₱32,500" note="Salary + allowance" />
      <Stat label="Expenses" value="₱13,750" note="42% of income" noteColor="text-red-500" />
      <Stat label="Saved" value="₱6,250" note="19% savings rate" noteColor="text-blue-600" />
      <Stat label="Budget left" value="₱4,850" note="On track this month" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <div className="flex justify-between mb-3"><div className="font-bold text-sm">Spending overview</div><b className="text-sm">₱4,910 this week</b></div>
        <div className="flex items-end gap-4 h-40">
          {days.map((h, i) => (
            <div key={i} className="flex-1 text-center text-[10px] text-slate-500">
              <div className={`rounded-lg mb-1 ${i === 5 ? "bg-emerald-500" : "bg-emerald-100"}`} style={{ height: h * 1.4 }} />
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex justify-between mb-3"><b className="text-sm">By category</b><a className="text-xs text-emerald-700 font-semibold">View report</a></div>
        {cats.map(([c, a, p]) => (
          <div key={c} className="flex items-center gap-2 mb-2.5">
            <Ico cat={c} size="w-7 h-7" />
            <div className="flex-1"><div className="flex justify-between text-xs"><span>{c}</span><b>{peso(a)}</b></div><Bar pct={p * 3} /></div>
          </div>
        ))}
      </Card>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <div className="flex justify-between mb-2"><b className="text-sm">Recent transactions</b><button onClick={() => go("history")} className="text-xs text-emerald-700 font-semibold">See all</button></div>
        {txs.slice(0, 4).map((t) => (
          <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <Ico cat={t.cat} /><div className="flex-1"><div className="text-sm font-semibold">{t.t}</div><div className="text-[11px] text-slate-500">{t.d.split(" · ")[0]} · {t.pm}</div></div>
            <b className={`text-sm ${t.amt < 0 ? "text-red-500" : "text-emerald-600"}`}>{t.amt < 0 ? "−" : "+"}{peso(Math.abs(t.amt))}</b>
          </div>
        ))}
      </Card>
      <Card>
        <div className="flex justify-between mb-2"><b className="text-sm">New Laptop</b><button onClick={() => go("goal")} className="text-xs text-emerald-700 font-semibold">View goal</button></div>
        <Label>Saved</Label><div className="text-2xl font-bold">₱22,500</div>
        <div className="text-[11px] text-slate-500 mb-2">of ₱45,000 · By Mar 2027</div>
        <Bar pct={50} /><div className="text-[11px] text-emerald-600 font-semibold my-2">50% complete</div>
        <div className="bg-emerald-50 text-emerald-700 text-xs rounded-lg p-2.5">Add ₱3,750 monthly to reach this goal on time.</div>
      </Card>
    </div>
  </>);
}

function ExpensesPage({ addTx, go }) {
  const [amt, setAmt] = useState("1480");
  const [cat, setCat] = useState("Bills");
  const [note, setNote] = useState("October Meralco bill");
  const used = 3740, limit = 5000, n = Number(amt) || 0;
  const left = limit - used - n;
  const save = () => {
    if (!n) return;
    addTx({ id: Date.now(), t: note || cat, s: note, cat, amt: -n, pm: "BPI Debit", d: "Today · October 5" });
    go("history");
  };
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <b>Expense details</b><p className="text-[11px] text-slate-500 mb-4">All amounts are recorded in Philippine peso (₱).</p>
        <Label>Amount</Label>
        <div className="border border-slate-200 rounded-xl px-3 py-2.5 flex gap-2 mb-4"><span>₱</span><input value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} className="flex-1 outline-none text-sm" /></div>
        <Label>Category</Label>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {Object.keys(CATS).map((c) => { const I = CATS[c].i; return (
            <button key={c} onClick={() => setCat(c)} className={`rounded-xl border py-3 text-xs flex flex-col items-center gap-1 ${cat === c ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 text-slate-600"}`}>
              <I size={16} />{c}
            </button>); })}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div><Label>Date</Label><div className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm">October 5, 2026</div></div>
          <div><Label>Payment method</Label><div className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm">BPI Debit •• 4821</div></div>
        </div>
        <Label>Note</Label>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm mb-4 outline-none" />
        <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 flex justify-between items-center mb-8">
          <div className="text-xs"><b>Attach receipt</b><div className="text-slate-500">PNG, JPG, or PDF up to 10 MB</div></div><Ghost>Choose file</Ghost>
        </div>
        <div className="flex justify-end gap-2"><Ghost onClick={() => go("home")}>Cancel</Ghost><Btn onClick={save}>Save expense</Btn></div>
      </Card>
      <div className="space-y-4">
        <Card>
          <div className="flex justify-between"><b className="text-sm">Budget impact</b><span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${left >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{left >= 0 ? "Within budget" : "Over budget"}</span></div>
          <div className="text-xs text-slate-500 mt-2">Bills budget remaining after this expense</div>
          <div className="text-2xl font-bold mb-2">{peso(Math.max(left, 0), 2)}</div>
          <Bar pct={((used + n) / limit) * 100} color="bg-amber-500" />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>{peso(used)} used</span><span>{peso(limit)} limit</span></div>
        </Card>
        <Card>
          <b className="text-sm">Before you save</b>
          {["Date looks right", "Payment method linked", "Duplicate check passed"].map((t) => (
            <div key={t} className="flex items-center gap-2 text-xs mt-3"><div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={12} /></div>{t}</div>
          ))}
        </Card>
      </div>
    </div>
  );
}

const GOALS = [
  { n: "New Laptop", t: "Mar 15, 2027", s: 22500, g: 45000, bar: "bg-emerald-600", btn: "bg-emerald-100 text-emerald-800" },
  { n: "Baguio Trip", t: "Dec 20, 2026", s: 14500, g: 25000, bar: "bg-blue-600", btn: "bg-blue-100 text-blue-700" },
  { n: "Emergency Fund", t: "Jun 30, 2027", s: 28000, g: 60000, bar: "bg-amber-700", btn: "bg-amber-100 text-amber-800" },
];
function GoalsPage({ go }) {
  return (<>
    <div className="grid grid-cols-3 gap-4">
      <Stat label="Total saved" value="₱65,000" note="Across 3 active goals" />
      <Stat label="Monthly contributions" value="₱7,500" note="Next auto-save · Oct 15" noteColor="text-blue-600" />
      <Stat label="Overall progress" value="50%" note="₱65,000 of ₱130,000" noteColor="text-amber-600" />
    </div>
    <div className="flex justify-between items-end"><div><b>Your active goals</b><p className="text-xs text-slate-500">Keep each goal funded at a pace that works for you.</p></div><Btn><Plus size={14} className="inline mr-1" />Create goal</Btn></div>
    <div className="grid grid-cols-3 gap-4">
      {GOALS.map((g) => { const p = Math.round((g.s / g.g) * 100); return (
        <Card key={g.n}>
          <div className="flex items-center gap-2 mb-3"><Ico cat="Other" /><div><b className="text-sm">{g.n}</b><div className="text-[10px] text-slate-500">Target · {g.t}</div></div></div>
          <div className="text-2xl font-bold">{peso(g.s)}</div><div className="text-[11px] text-slate-500 mb-2">of {peso(g.g)} target</div>
          <Bar pct={p} color={g.bar} />
          <div className="flex justify-between text-[11px] my-2"><b>{p}% complete</b><span className="text-slate-500">{peso(g.g - g.s)} to go</span></div>
          <button onClick={() => go("goal")} className={`w-full rounded-lg py-2 text-xs font-semibold ${g.btn}`}>View goal details</button>
        </Card>); })}
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <div className="flex justify-between mb-3"><b className="text-sm">Contribution plan</b><a className="text-xs text-emerald-700 font-semibold">Adjust plan</a></div>
        <div className="grid grid-cols-3 gap-3">
          {[["Oct 15", "New Laptop", 3750, true], ["Oct 20", "Baguio Trip", 1750], ["Oct 30", "Emergency Fund", 2000]].map(([d, n, a, next]) => (
            <div key={n} className={`rounded-xl border p-3 ${next ? "bg-emerald-50 border-emerald-400" : "border-slate-200"}`}>
              <div className="text-[10px] text-slate-500 flex justify-between">{d}{next && <b className="text-emerald-600">NEXT</b>}</div>
              <div className="text-xs font-semibold mt-1">{n}</div><div className="text-lg font-bold mt-2">{peso(a)}</div>
            </div>))}
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><Lightbulb size={15} /></div><b className="text-sm">Savings coach</b></div>
        <p className="text-xs text-slate-500 mb-3">You're ahead on your Baguio Trip. Moving ₱500 of this month's extra budget to New Laptop keeps both goals on track.</p>
        <Ghost className="w-full">Review suggestion</Ghost>
      </Card>
    </div>
  </>);
}

function GoalDetail({ go }) {
  const [funds, setFunds] = useState(22500);
  const rows = [["Oct 1, 2026", "BPI savings transfer", 3750], ["Sep 15, 2026", "GCash contribution", 2500], ["Sep 1, 2026", "BPI savings transfer", 3750], ["Aug 20, 2026", "Extra savings", 1500], ["Aug 1, 2026", "BPI savings transfer", 3750]];
  return (<>
    <button onClick={() => go("goals")} className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><ArrowLeft size={13} />All goals</button>
    <Card>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3"><Ico cat="Other" size="w-10 h-10" /><div><b>New Laptop</b><div className="text-[11px] text-slate-500">Target date · March 15, 2027</div></div></div>
        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">On track</span>
      </div>
      <div className="flex justify-between mt-4">
        <div className="flex gap-8">
          <div><Label>Saved</Label><div className="text-2xl font-bold">{peso(funds, 2)}</div></div>
          <div><Label>Target</Label><div className="text-lg font-bold">₱45,000.00</div></div>
          <div><Label>Remaining</Label><div className="text-lg font-bold">{peso(45000 - funds, 2)}</div></div>
        </div>
        <div className="text-right"><Label>Monthly pace</Label><div className="text-lg font-bold text-emerald-600">₱3,750</div></div>
      </div>
      <div className="my-3"><Bar pct={(funds / 45000) * 100} /></div>
      <div className="flex justify-between text-[11px]"><b className="text-emerald-600">{Math.round((funds / 45000) * 100)}% funded</b><span className="text-slate-500">Projected completion · March 1, 2027</span></div>
    </Card>
    <div className="flex gap-2 justify-end -mt-1"><Ghost>Edit goal</Ghost><Btn onClick={() => setFunds(funds + 3750)}>Add funds (+₱3,750)</Btn></div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <b className="text-sm">Contribution history</b>
        <div className="mt-3 text-xs">
          <div className="grid grid-cols-3 bg-slate-50 text-[10px] font-semibold text-slate-500 p-2 rounded"><span>DATE</span><span>SOURCE</span><span className="text-right">AMOUNT</span></div>
          {rows.map(([d, s, a]) => (
            <div key={d} className="grid grid-cols-3 items-center p-2.5 border-b border-slate-100"><span>{d}</span><span className="flex items-center gap-2"><Landmark size={13} className="text-emerald-600" />{s}</span><b className="text-right text-emerald-600">+{peso(a, 2)}</b></div>))}
        </div>
      </Card>
      <div className="space-y-4">
        <Card>
          <b className="text-sm">Milestones</b>
          {[["25% · ₱11,250", "Reached Aug 2026", true], ["50% · ₱22,500", "Reached Oct 2026", true], ["75% · ₱33,750", "Next milestone"], ["100% · ₱45,000", "Goal complete"]].map(([a, b, d]) => (
            <div key={a} className="flex items-center gap-2 mt-3 text-xs"><div className={`w-6 h-6 rounded-full flex items-center justify-center ${d ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}><Check size={12} /></div><div><b>{a}</b><div className="text-[10px] text-slate-500">{b}</div></div></div>))}
        </Card>
        <Card><b className="text-sm">Goal note</b><p className="text-xs text-slate-500 mt-2">For a lightweight laptop that can handle design work, school projects, and freelance tasks.</p></Card>
      </div>
    </div>
  </>);
}

function HistoryPage({ txs }) {
  const [q, setQ] = useState("");
  const list = txs.filter((t) => (t.t + t.s).toLowerCase().includes(q.toLowerCase()));
  const groups = [...new Set(list.map((t) => t.d))];
  return (<>
    <div className="grid grid-cols-3 gap-4">
      <Stat label="Money in" value="+₱32,500" note="2 income transactions" />
      <Stat label="Money out" value={"−" + peso(txs.filter((t) => t.amt < 0).reduce((a, t) => a - t.amt, 0))} note={`${txs.filter((t) => t.amt < 0).length} expense transactions`} noteColor="text-red-500" />
      <Stat label="Net cash flow" value="+₱18,750" note="Positive this October" noteColor="text-blue-600" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <div className="flex gap-2 mb-4 text-xs">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transaction history" className="border border-slate-200 rounded-lg px-3 py-2 flex-1 outline-none" />
          {["October 2026", "All activity", "All payment methods"].map((x) => <div key={x} className="border border-slate-200 rounded-lg px-3 py-2">{x}</div>)}
        </div>
        {groups.map((g) => (
          <div key={g} className="mb-3">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{g}</div>
            {list.filter((t) => t.d === g).map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-100 text-sm">
                <Ico cat={t.cat} /><div className="flex-1"><b>{t.t}</b><div className="text-[11px] text-slate-500">{t.s}</div></div>
                <span className="text-xs text-slate-500 w-28">{t.pm}</span>
                <b className={`w-20 text-right ${t.amt < 0 ? "text-red-500" : "text-emerald-600"}`}>{t.amt < 0 ? "−" : "+"}{peso(Math.abs(t.amt))}</b>
              </div>))}
          </div>))}
      </Card>
      <div className="space-y-4">
        <Card>
          <b className="text-sm">October cash flow</b>
          <div className="flex items-end gap-3 h-28 my-3">
            {[["Income", 100, "bg-emerald-500"], ["Expenses", 42, "bg-red-500"], ["Saved", 55, "bg-blue-600"]].map(([l, h, c]) => (
              <div key={l} className="flex-1 text-[10px] text-center text-slate-500"><div className={`${c} rounded-t-lg`} style={{ height: h }} />{l}</div>))}
          </div>
          <div className="bg-emerald-50 text-emerald-700 text-xs rounded-lg p-2 flex justify-between"><span>Net cash flow</span><b>+₱18,750</b></div>
        </Card>
        <Card>
          <b className="text-sm">Payment mix</b>
          {[["GCash", 4840, 35], ["BPI", 4120, 30], ["Maya", 2750, 20], ["Cash", 2040, 15]].map(([n, a, p]) => (
            <div key={n} className="mt-3 text-xs"><div className="flex justify-between"><b>{n}</b><span>{peso(a)} · {p}%</span></div><Bar pct={p * 2.5} /></div>))}
        </Card>
      </div>
    </div>
  </>);
}

function InsightsPage() {
  const trend = [["May", 13.4], ["Jun", 14.1], ["Jul", 11.6], ["Aug", 15.8], ["Sep", 15.4], ["Oct", 13.8]];
  const bva = [["Food", 4200, 5000], ["Bills", 3260, 3000], ["Transport", 2180, 2500], ["School", 1950, 2500]];
  return (<>
    <div className="grid grid-cols-3 gap-4">
      <Stat label="Total spending" value="₱13,750" note="10.9% lower than September" />
      <Stat label="Largest category" value="Food · 31%" note="₱4,200 this month" noteColor="text-amber-600" />
      <Stat label="Budget health" value="4 of 5" note="Categories within plan" noteColor="text-blue-600" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <b className="text-sm">Monthly spending trend</b>
        <div className="flex items-end gap-4 h-36 mt-3">
          {trend.map(([m, v], i) => (
            <div key={m} className="flex-1 text-center text-[10px] text-slate-500">₱{v}k<div className={`rounded-lg my-1 ${i === 5 ? "bg-emerald-500" : "bg-emerald-100"}`} style={{ height: v * 6 }} />{m}</div>))}
        </div>
      </Card>
      <Card>
        <b className="text-sm">For you</b>
        {[["bg-emerald-50 text-emerald-800", "Nice work on food spending", "You spent ₱800 less on dining out than last month."],
          ["bg-amber-50 text-amber-800", "Bills need a quick check", "Bills are ₱260 over plan after the Meralco payment."],
          ["bg-blue-50 text-blue-800", "Commute costs are steady", "Transport is 12% below your three-month average."]].map(([c, a, b]) => (
          <div key={a} className={`${c} rounded-xl p-3 mt-3 text-xs`}><b>{a}</b><div className="opacity-80">{b}</div></div>))}
      </Card>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <b className="text-sm">Budget vs actual</b>
        {bva.map(([c, a, b]) => (
          <div key={c} className="flex items-center gap-3 mt-3"><Ico cat={c} size="w-7 h-7" />
            <div className="flex-1"><div className="flex justify-between text-xs"><b>{c}</b><span>{peso(a)} / {peso(b)} · <b className={a > b ? "text-red-500" : "text-emerald-600"}>{a > b ? peso(a - b) + " over" : peso(b - a) + " left"}</b></span></div>
              <Bar pct={(a / b) * 100} color={a > b ? "bg-red-500" : "bg-emerald-500"} /></div></div>))}
      </Card>
      <Card>
        <b className="text-sm">Category comparison</b>
        {[["Food", 4200, "−13%"], ["Bills", 3260, "+0%"], ["Transport", 2180, "−6%"], ["School", 1950, "+2%"], ["Shopping", 1120, "−18%"]].map(([c, a, p]) => (
          <div key={c} className="flex items-center gap-2 mt-3 text-xs"><Ico cat={c} size="w-7 h-7" /><b className="flex-1">{c}</b>{peso(a)}<span className={`w-10 text-right font-semibold ${p.startsWith("−") ? "text-emerald-600" : "text-red-500"}`}>{p}</span></div>))}
      </Card>
    </div>
  </>);
}

function SettingsPage({ go }) {
  const [tg, setTg] = useState({ tfa: true, budget: true, goal: true, week: true });
  const set = (k) => (v) => setTg({ ...tg, [k]: v });
  const Inp = ({ label, v, icon: I }) => (<div><Label>{label}</Label><div className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm flex gap-2 items-center"><I size={13} className="text-slate-400" />{v}</div></div>);
  const Row = ({ t, s, right }) => (<div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"><div className="text-xs"><b className="text-sm">{t}</b><div className="text-slate-500">{s}</div></div>{right || <ChevronRight size={14} className="text-slate-400" />}</div>);
  return (<>
    <Card className="flex items-center justify-between">
      <div className="flex items-center gap-4"><div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 text-xl font-bold flex items-center justify-center">AS</div><div><b className="text-lg">Alex Santos</b><div className="text-xs text-slate-500">alex.santos@gmail.com · Member since July 2026</div></div></div>
      <div className="flex gap-2"><Ghost>Change photo</Ghost><Btn>Save changes</Btn></div>
    </Card>
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-4">
        <Card>
          <b>Personal details</b>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Inp label="Full name" v="Alex Santos" icon={User} /><Inp label="Mobile number" v="+63 917 555 0148" icon={Smartphone} />
            <div className="col-span-2"><Inp label="Email address" v="alex.santos@gmail.com" icon={Mail} /></div>
            <Inp label="City" v="Quezon City" icon={Home} /><Inp label="Occupation" v="Junior designer" icon={User} />
          </div>
        </Card>
        <Card>
          <b>Account & security</b>
          <Row t="Password" s="Last changed July 12, 2026" />
          <Row t="Two-factor authentication" s="Secure sign-in with an extra verification step" right={<Toggle on={tg.tfa} set={set("tfa")} />} />
          <Row t="Active sessions" s="2 signed-in devices" />
        </Card>
        <Card className="flex items-center justify-between"><div><b className="text-sm">Sign out of BudgetMate</b><div className="text-xs text-slate-500">You can sign back in anytime.</div></div>
          <button onClick={() => go("login")} className="bg-red-500 text-white text-sm font-semibold rounded-xl px-4 py-2.5 flex items-center gap-2"><LogOut size={14} />Sign out</button></Card>
      </div>
      <div className="space-y-4">
        <Card><b>Preferences</b><Row t="Currency" s="Fixed for your Philippine account" right={<span className="text-xs bg-slate-100 rounded px-2 py-0.5">PHP · ₱</span>} /><Row t="Monthly budget cycle" s="Starts on the 1st of each month" /><Row t="Time zone" s="Asia/Manila (GMT+8)" /></Card>
        <Card><b>Notifications</b>
          <Row t="Budget alerts" s="Notify me when a category reaches 80%" right={<Toggle on={tg.budget} set={set("budget")} />} />
          <Row t="Goal reminders" s="Monthly savings contribution reminders" right={<Toggle on={tg.goal} set={set("goal")} />} />
          <Row t="Weekly summary" s="Receive a spending recap every Monday" right={<Toggle on={tg.week} set={set("week")} />} /></Card>
        <Card><div className="flex justify-between"><b>Linked payment methods</b><a className="text-xs text-emerald-700 font-semibold">Add method</a></div>
          {[["BPI Debit", "•• 4821 · Linked Jul 2026", Landmark], ["GCash", "+63 917 ••• 0148", Smartphone], ["Maya", "+63 917 ••• 0148", Wallet]].map(([n, s, I]) => (
            <div key={n} className="flex items-center gap-3 mt-3 text-xs"><div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><I size={14} /></div><div><b className="text-sm">{n}</b><div className="text-slate-500">{s}</div></div></div>))}
        </Card>
      </div>
    </div>
  </>);
}

/* ---------------- APP ---------------- */
export default function App() {
  const [page, go] = useState("login");
  const [txs, setTxs] = useState(START_TXS);
  const addTx = (t) => setTxs([t, ...txs]);
  if (page === "login" || page === "signup") return <Auth mode={page} go={go} />;
  const meta = {
    home: ["Good morning, Alex", "Here's how your money is doing this October.", <Btn key="a" onClick={() => go("expenses")}>+ Add expense</Btn>],
    expenses: ["Add expense", "Record a purchase and keep your monthly plan up to date."],
    goals: ["Savings goals", "Turn plans into progress with clear targets and steady contributions."],
    goal: ["New Laptop", "Track every contribution and stay on pace for March 2027."],
    history: ["History", "A complete timeline of your income, expenses, and savings activity.", <Ghost key="e">Export CSV</Ghost>],
    insights: ["Spending insights", "Understand your patterns and make your next peso work harder."],
    settings: ["Profile & settings", "Manage your details, security, preferences, and linked accounts."],
  }[page];
  const body = {
    home: <HomePage txs={txs} go={go} />,
    expenses: <ExpensesPage addTx={addTx} go={go} />,
    goals: <GoalsPage go={go} />,
    goal: <GoalDetail go={go} />,
    history: <HistoryPage txs={txs} />,
    insights: <InsightsPage />,
    settings: <SettingsPage go={go} />,
  }[page];
  return <Shell page={page} go={go} title={meta[0]} sub={meta[1]} action={meta[2]}>{body}</Shell>;
}
