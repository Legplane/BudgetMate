import { useCallback, useEffect, useState } from "react";
import { BarChart3, Bell, Clock, Home, Lightbulb, Receipt, Settings as Cog, Target } from "lucide-react";
import { api, setUnauthorizedHandler, tokenStore, useApi } from "./api.js";
import { Btn, ConfirmProvider, Ghost, Logo, ToastProvider, initials, useToast, Loading } from "./ui.jsx";
import { UserCtx, go, useRoute, useUser } from "./session.js";
import Auth from "./pages/Auth.jsx";
import Landing from "./pages/Landing.jsx";
import HomePage from "./pages/Home.jsx";
import ExpensesPage from "./pages/Expenses.jsx";
import { GoalsPage, GoalDetail } from "./pages/Goals.jsx";
import HistoryPage from "./pages/History.jsx";
import InsightsPage from "./pages/Insights.jsx";
import SettingsPage from "./pages/Settings.jsx";

const NAV = [
  ["home", "Home", Home], ["expenses", "Expenses", Receipt], ["goals", "Goals", Target],
  ["history", "History", Clock], ["insights", "Insights", BarChart3], ["settings", "Settings", Cog],
];

const AUTH_PAGES = ["login", "signup", "forgot", "reset"];

function Root() {
  const { page, args } = useRoute();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!tokenStore.get());

  useEffect(() => {
    setUnauthorizedHandler(() => { tokenStore.clear(); setUser(null); go("login"); toast("Your session has expired. Please sign in again.", "err"); });
    if (!tokenStore.get()) return;
    api.get("/me").then((r) => setUser(r.user)).catch(() => tokenStore.clear()).finally(() => setBooting(false));
  }, [toast]);

  // Pass a message to say why (e.g. account deleted); otherwise it's a normal sign out.
  const logout = useCallback((msg) => { tokenStore.clear(); setUser(null); go("login"); toast(typeof msg === "string" ? msg : "You've been signed out.", "info"); }, [toast]);

  if (booting) return <Loading />;
  if (!user) {
    if (!page) return <Landing go={go} />;
    const mode = AUTH_PAGES.includes(page) ? page : "login";
    return <Auth mode={mode} go={go} onAuth={(u) => { setUser(u); go("home"); }} />;
  }
  if (!page || AUTH_PAGES.includes(page)) { go("home"); return null; }
  return (
    <UserCtx.Provider value={{ user, setUser, logout }}>
      <Shell page={page} args={args} />
    </UserCtx.Provider>
  );
}

function Bell_({ enabled }) {
  const [open, setOpen] = useState(false);
  const { data } = useApi(open ? "/insights" : null);
  return (
    <div className="relative">
      <button aria-label="Notifications" onClick={() => setOpen(!open)} className="w-8 h-8 border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50"><Bell size={14} /></button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg p-3 z-40 text-xs">
          <div className="font-bold text-sm mb-2">Notifications</div>
          {!enabled && <div className="text-slate-500 py-2">Budget alerts are turned off in Settings.</div>}
          {enabled && !data && <div className="text-slate-500 py-2">Loading…</div>}
          {enabled && data?.tips.map((t) => (
            <div key={t.title} className={`rounded-xl p-2.5 mb-2 ${{ good: "bg-emerald-50 text-emerald-800", warn: "bg-amber-50 text-amber-800", info: "bg-blue-50 text-blue-800" }[t.tone]}`}>
              <b>{t.title}</b><div className="opacity-80">{t.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Shell({ page, args }) {
  const { user } = useUser();
  const toast = useToast();
  const { data: summary, reload } = useApi(`/summary?v=${page}/${args.join("/")}`);
  const active = page === "goal" ? "goals" : page;
  const first = user.firstName;
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const month = new Date().toLocaleString("en-US", { month: "long" });

  const meta = {
    home: [`${greet}, ${first}`, `Here's how your money is doing this ${month}.`, <Btn key="a" onClick={() => go("expenses")}>+ Add expense</Btn>],
    expenses: [args[0] === "edit" ? "Edit transaction" : "Add expense", "Record a purchase or income and keep your monthly plan up to date."],
    goals: ["Savings goals", "Turn plans into progress with clear targets and steady contributions."],
    goal: ["Goal details", "Track every contribution and stay on pace."],
    history: ["History", "A complete timeline of your income, expenses, and savings activity.",
      <Ghost key="e" onClick={() => api.file("/transactions/export", "budgetmate-transactions.csv").catch((e) => toast(e.message, "err"))}>Export CSV</Ghost>],
    insights: ["Spending insights", "Understand your patterns and make your next peso work harder."],
    settings: ["Profile & settings", "Manage your details, security, preferences, and linked accounts."],
  }[page];

  const body = {
    home: <HomePage summary={summary} />,
    expenses: <ExpensesPage editId={args[0] === "edit" ? args[1] : null} />,
    goals: <GoalsPage />,
    goal: <GoalDetail id={args[0]} />,
    history: <HistoryPage />,
    insights: <InsightsPage />,
    settings: <SettingsPage onChanged={reload} />,
  }[page];

  if (!meta) { go("home"); return null; }
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
        {summary?.tip && (
          <div className="mt-auto bg-slate-900 text-white rounded-xl p-3 text-xs">
            <div className="text-amber-400 text-[10px] font-bold flex items-center gap-1 mb-1"><Lightbulb size={11} />SMART TIP</div>
            {summary.tip}
          </div>
        )}
      </aside>
      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div><h1 className="text-lg font-bold">{meta[0]}</h1><p className="text-xs text-slate-500">{meta[1]}</p></div>
          <div className="flex items-center gap-3">
            {meta[2]}
            <Bell_ enabled={user.prefs.budget} />
            <button onClick={() => go("settings")} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">{initials(`${user.firstName} ${user.lastName}`)}</div>
              <div className="text-xs leading-tight text-left"><b>{user.name}</b><br /><span className="text-slate-500">Personal account</span></div>
            </button>
          </div>
        </header>
        <div className="p-6 space-y-4 max-w-6xl">{body}</div>
      </main>
    </div>
  );
}

export default function App() {
  return <ToastProvider><ConfirmProvider><Root /></ConfirmProvider></ToastProvider>;
}
