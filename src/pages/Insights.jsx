import { useState } from "react";
import { Pencil } from "lucide-react";
import { api, useApi } from "../api.js";
import { Bar, Btn, Card, Empty, Ghost, Ico, Input, Loading, Modal, Select, Stat, EXPENSE_CATS, monthLabel, monthOptions, peso, useConfirm, useToast } from "../ui.jsx";

const TONE = { good: "bg-emerald-50 text-emerald-800", warn: "bg-amber-50 text-amber-800", info: "bg-blue-50 text-blue-800" };

export function BudgetEditor({ budgets, onClose, onSaved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [v, setV] = useState(Object.fromEntries(EXPENSE_CATS.map((c) => [c, String(budgets[c] ?? 0)])));
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!(await confirm({ title: "Save your monthly budgets?", message: "The new limits apply to this and future months." }))) return;
    setBusy(true);
    try { await api.put("/budgets", { budgets: v }); toast("Budgets updated"); onSaved(); } catch (x) { toast(x.message, "err"); setBusy(false); }
  };
  return (
    <Modal title="Monthly budgets" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="text-xs text-slate-500">Set how much you plan to spend in each category every month.</p>
        <div className="grid grid-cols-2 gap-3">
          {EXPENSE_CATS.map((c) => <Input key={c} label={c} inputMode="numeric" value={v[c]} onChange={(e) => setV({ ...v, [c]: e.target.value.replace(/[^\d.]/g, "") })} />)}
        </div>
        <div className="flex justify-end gap-2"><Ghost onClick={onClose}>Cancel</Ghost><Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Save budgets"}</Btn></div>
      </form>
    </Modal>
  );
}

export default function InsightsPage() {
  const [month, setMonth] = useState(monthOptions(1)[0]);
  const [edit, setEdit] = useState(false);
  const { data: d, reload } = useApi(`/insights?month=${month}`);
  if (!d) return <Loading />;
  const maxTrend = Math.max(...d.trend.map((t) => t.amount), 1);
  return (<>
    <div className="flex justify-end">
      <Select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44">
        {monthOptions(12).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
      </Select>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Stat label="Total spending" value={peso(d.total)}
        note={d.totalChange === null ? "No data for last month" : `${Math.abs(d.totalChange)}% ${d.totalChange <= 0 ? "lower" : "higher"} than last month`}
        noteColor={d.totalChange !== null && d.totalChange > 0 ? "text-red-500" : "text-emerald-600"} />
      <Stat label="Largest category" value={d.largest ? `${d.largest.category} · ${d.largest.pct}%` : "—"} note={d.largest ? `${peso(d.largest.amount)} this month` : "No expenses yet"} noteColor="text-amber-600" />
      <Stat label="Budget health" value={`${d.health.within} of ${d.health.of}`} note="Categories within plan" noteColor="text-blue-600" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <b className="text-sm">Monthly spending trend</b>
        <div className="flex items-end gap-4 h-36 mt-3">
          {d.trend.map((t, i) => (
            <div key={t.month} className="flex-1 text-center text-[10px] text-slate-500">{t.amount ? `₱${(t.amount / 1000).toFixed(1)}k` : "—"}
              <div className={`rounded-lg my-1 ${i === d.trend.length - 1 ? "bg-emerald-500" : "bg-emerald-100"}`} style={{ height: Math.max(3, (t.amount / maxTrend) * 90) }} />{t.label}</div>))}
        </div>
      </Card>
      <Card>
        <b className="text-sm">For you</b>
        {d.tips.map((t) => <div key={t.title} className={`${TONE[t.tone]} rounded-xl p-3 mt-3 text-xs`}><b>{t.title}</b><div className="opacity-80">{t.body}</div></div>)}
      </Card>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <div className="flex justify-between"><b className="text-sm">Budget vs actual</b>
          <button onClick={() => setEdit(true)} className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><Pencil size={11} />Edit budgets</button></div>
        {d.bva.length === 0 && <Empty>No budgets or spending yet.</Empty>}
        {d.bva.map((r) => (
          <div key={r.category} className="flex items-center gap-3 mt-3"><Ico cat={r.category} size="w-7 h-7" />
            <div className="flex-1"><div className="flex justify-between text-xs"><b>{r.category}</b><span>{peso(r.spent)} / {peso(r.budget)} · <b className={r.spent > r.budget ? "text-red-500" : "text-emerald-600"}>{r.spent > r.budget ? peso(r.spent - r.budget) + " over" : peso(r.budget - r.spent) + " left"}</b></span></div>
              <Bar pct={r.budget ? (r.spent / r.budget) * 100 : 100} color={r.spent > r.budget ? "bg-red-500" : "bg-emerald-500"} /></div></div>))}
      </Card>
      <Card>
        <b className="text-sm">Category comparison</b>
        {d.compare.length === 0 && <Empty>Nothing to compare yet.</Empty>}
        {d.compare.map((c) => (
          <div key={c.category} className="flex items-center gap-2 mt-3 text-xs"><Ico cat={c.category} size="w-7 h-7" /><b className="flex-1">{c.category}</b>{peso(c.amount)}
            <span className={`w-10 text-right font-semibold ${c.change === null ? "text-slate-400" : c.change <= 0 ? "text-emerald-600" : "text-red-500"}`}>{c.change === null ? "new" : `${c.change < 0 ? "−" : "+"}${Math.abs(c.change)}%`}</span></div>))}
      </Card>
    </div>
    {edit && <BudgetEditor budgets={d.budgets} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} />}
  </>);
}
