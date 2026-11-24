import { BarChart3, FileText, Download, Target, Wallet, WalletCards } from "lucide-react";
import { Logo } from "../ui.jsx";

const FEATURES = [
  [WalletCards, "Every wallet in one list", "GCash, Maya, your bank and cash. Tag each expense with how you paid and see the split."],
  [Wallet, "A budget for each category", "Set a monthly limit for food, transport, bills, school and shopping. The form shows what is left before you save."],
  [Target, "Goals that tell you the pace", "Name a goal, pick a date, and BudgetMate works out the amount to set aside each month."],
  [FileText, "Receipts stay with the entry", "Attach a PNG, JPG or PDF to any transaction and open it again from History."],
  [BarChart3, "Insights in plain words", "See where spending went up, which budgets are close to the limit, and how this month compares with last."],
  [Download, "Your data, any time", "Export every transaction to CSV when you need it for school or a spreadsheet."],
];
const STEPS = [
  ["Add what comes in", "Allowance, salary or freelance pay. Your balance starts from here."],
  ["Log spending as it happens", "A title, an amount, a category and how you paid. It takes a few seconds."],
  ["Check in and adjust", "Insights show what changed so next month's budget is based on real numbers."],
];
const SLIP = [
  ["Allowance", "Cash", "+₱5,000", true],
  ["Jeepney fare", "Cash", "−₱13", false],
  ["Iced coffee", "GCash", "−₱120", false],
  ["Boarding house rent, Room 204", "Maya", "−₱3,500", false],
];

const CtaPrimary = ({ go, children = "Create free account" }) => (
  <button type="button" onClick={() => go("signup")} className="bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 text-white font-semibold rounded-xl px-6 py-3">{children}</button>
);

export default function Landing({ go }) {
  return (
    <div className="min-h-screen bg-[#F6F8F4] text-[#0F2A20]">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-3 text-sm font-semibold">
          <a href="#/" onClick={(e) => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }} className="hidden sm:block px-3 py-2 text-slate-600 hover:text-slate-900">Features</a>
          <button type="button" onClick={() => go("login")} className="px-3 py-2 rounded-xl hover:bg-white">Sign in</button>
          <button type="button" onClick={() => go("signup")} className="bg-[#0F2A20] hover:bg-black text-white rounded-xl px-4 py-2">Get started</button>
        </nav>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24 grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-8 items-center">
          <div>
            <h1 className="font-display font-extrabold tracking-tight leading-[0.98] text-5xl sm:text-6xl lg:text-7xl">Know where every peso went.</h1>
            <p className="mt-6 text-lg text-slate-600 max-w-[34ch] sm:max-w-[44ch] leading-relaxed">BudgetMate keeps your GCash, Maya, bank and cash spending in one place, so you can plan the month and save for what matters.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CtaPrimary go={go} />
              <button type="button" onClick={() => go("login")} className="font-semibold rounded-xl px-6 py-3 border border-slate-300 hover:bg-white">I already have an account</button>
            </div>
            <p className="mt-4 text-sm text-slate-500">Free to use. Amounts are in Philippine peso.</p>
          </div>

          {/* The memorable element: a paper slip of one day's entries */}
          <div className="relative mx-auto w-full max-w-sm lg:max-w-none lg:pl-8" aria-hidden="true">
            <div className="slip-in rotate-2 bg-white rounded-md shadow-[0_18px_40px_-18px_rgba(15,42,32,.35)] border border-slate-200 px-6 pt-6 pb-5"
              style={{ backgroundImage: "repeating-linear-gradient(transparent 0 31px, #E8EEE9 31px 32px)", backgroundPosition: "0 74px" }}>
              <div className="flex items-baseline justify-between border-b-2 border-[#0F2A20] pb-2 mb-1">
                <span className="font-display font-bold text-lg">Today</span>
                <span className="text-xs text-slate-500">Available balance</span>
              </div>
              {SLIP.map(([t, m, a, inc]) => (
                <div key={t} className="flex items-center justify-between gap-3 h-8 text-sm">
                  <span className="truncate">{t} <span className="text-xs text-slate-400">{m}</span></span>
                  <b className={`tabular-nums ${inc ? "text-emerald-700" : "text-slate-900"}`}>{a}</b>
                </div>
              ))}
              <div className="mt-4 pt-3 border-t-2 border-[#0F2A20] flex items-end justify-between">
                <span className="text-xs text-slate-500">Food budget</span>
                <b className="font-display text-3xl tabular-nums">₱1,367</b>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full w-[27%] bg-emerald-500 rounded-full" /></div>
              <div className="mt-1 text-[11px] text-slate-500">₱1,367 of ₱5,000 used this month</div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-[1fr_2fr] gap-10">
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight max-w-[14ch]">Built for everyday money in the Philippines</h2>
            <ul className="grid sm:grid-cols-2 gap-x-10">
              {FEATURES.map(([I, t, d]) => (
                <li key={t} className="py-5 border-t border-slate-200 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
                  <div className="flex items-center gap-2.5 font-semibold"><I size={17} className="text-emerald-600 shrink-0" />{t}</div>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed pl-[27px]">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight">Start in three steps</h2>
          <ol className="mt-10 grid md:grid-cols-3 gap-8">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="font-display font-extrabold text-5xl leading-none text-emerald-600/80 tabular-nums" aria-hidden="true">{i + 1}</span>
                <div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-600 leading-relaxed">{d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="bg-[#0F2A20] text-white rounded-3xl px-6 sm:px-12 py-12 sm:py-14 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight max-w-[18ch]">Make the next peso count.</h2>
              <p className="mt-3 text-emerald-100/80 max-w-[40ch]">Create an account in a minute. No card needed.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => go("signup")} className="bg-[#F4B63F] hover:bg-[#f7c35f] text-[#0F2A20] font-bold rounded-xl px-6 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Create free account</button>
              <button type="button" onClick={() => go("login")} className="font-semibold rounded-xl px-6 py-3 border border-white/30 hover:bg-white/10">Sign in</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <Logo />
          <span>Your account data stays private and under your control.</span>
        </div>
      </footer>
    </div>
  );
}
