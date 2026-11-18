import { Bar, Card, Empty, Ico, Label, Loading, Stat, peso, Btn } from "../ui.jsx";
import { go } from "../session.js";
import { dayLabel } from "../ui.jsx";

export function TxRow({ t, right }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <Ico cat={t.category} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{t.title}</div>
        <div className="text-[11px] text-slate-500">{dayLabel(t.date).split(" · ")[0]} · {t.paymentMethod || "—"}</div>
      </div>
      {right}
      <b className={`text-sm ${t.amount < 0 ? "text-red-500" : "text-emerald-600"}`}>{t.amount < 0 ? "−" : "+"}{peso(Math.abs(t.amount))}</b>
    </div>
  );
}

export default function HomePage({ summary: s }) {
  if (!s) return <Loading />;
  const max = Math.max(...s.week.map((d) => d.amount), 1);
  const g = s.goal;
  return (<>
    <div><Label>Available balance</Label><div className="text-3xl font-bold">{peso(s.balance, 2)}</div></div>
    <div className="grid grid-cols-4 gap-4">
      <Stat label="Monthly income" value={peso(s.income)} note="This month" />
      <Stat label="Expenses" value={peso(s.expenses)} note={`${s.expensePct}% of income`} noteColor="text-red-500" />
      <Stat label="Saved" value={peso(s.saved)} note={`${s.savingsRate}% savings rate`} noteColor="text-blue-600" />
      <Stat label="Budget left" value={peso(s.budgetLeft)} note={s.budgetLeft < 0 ? "Over budget" : "On track this month"} noteColor={s.budgetLeft < 0 ? "text-red-500" : "text-emerald-600"} />
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <div className="flex justify-between mb-3"><div className="font-bold text-sm">Spending overview</div><b className="text-sm">{peso(s.weekTotal)} last 7 days</b></div>
        <div className="flex items-end gap-4 h-40">
          {s.week.map((d) => (
            <div key={d.date} className="flex-1 text-center text-[10px] text-slate-500" title={`${d.date}: ${peso(d.amount)}`}>
              <div className={`rounded-lg mb-1 ${d.today ? "bg-emerald-500" : "bg-emerald-100"}`} style={{ height: Math.max(4, (d.amount / max) * 130) }} />
              {d.label}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex justify-between mb-3"><b className="text-sm">By category</b><button onClick={() => go("insights")} className="text-xs text-emerald-700 font-semibold">View report</button></div>
        {s.categories.length === 0 && <Empty>No expenses yet this month.</Empty>}
        {s.categories.slice(0, 5).map((c) => (
          <div key={c.category} className="flex items-center gap-2 mb-2.5">
            <Ico cat={c.category} size="w-7 h-7" />
            <div className="flex-1"><div className="flex justify-between text-xs"><span>{c.category}</span><b>{peso(c.amount)}</b></div><Bar pct={c.pct} /></div>
          </div>
        ))}
      </Card>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <div className="flex justify-between mb-2"><b className="text-sm">Recent transactions</b><button onClick={() => go("history")} className="text-xs text-emerald-700 font-semibold">See all</button></div>
        {s.recent.length === 0 && <Empty>No transactions yet. <button className="text-emerald-700 font-semibold" onClick={() => go("expenses")}>Add your first one</button>.</Empty>}
        {s.recent.slice(0, 4).map((t) => <TxRow key={t.id} t={t} />)}
      </Card>
      <Card>
        {g ? (<>
          <div className="flex justify-between mb-2"><b className="text-sm">{g.name}</b><button onClick={() => go(`goal/${g.id}`)} className="text-xs text-emerald-700 font-semibold">View goal</button></div>
          <Label>Saved</Label><div className="text-2xl font-bold">{peso(g.saved)}</div>
          <div className="text-[11px] text-slate-500 mb-2">of {peso(g.target)} · By {new Date(g.targetDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</div>
          <Bar pct={g.pct} /><div className="text-[11px] text-emerald-600 font-semibold my-2">{g.pct}% complete</div>
          <div className="bg-emerald-50 text-emerald-700 text-xs rounded-lg p-2.5">Add {peso(g.monthlyNeeded)} monthly to reach this goal on time.</div>
        </>) : (<>
          <b className="text-sm">Savings goals</b>
          <Empty>Set a goal to start saving with a purpose.</Empty>
          <Btn className="w-full" onClick={() => go("goals")}>Create a goal</Btn>
        </>)}
      </Card>
    </div>
  </>);
}
