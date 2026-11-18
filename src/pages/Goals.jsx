import { useState } from "react";
import { ArrowLeft, Check, Landmark, Lightbulb, Plus, Trash2 } from "lucide-react";
import { api, useApi } from "../api.js";
import { Bar, Btn, Card, Danger, Empty, ErrorBox, GOAL_COLORS, Ghost, Ico, Input, Label, Loading, Modal, Stat, fmtDate, inputCls, monthLabel, peso, todayISO, useToast } from "../ui.jsx";
import { go } from "../session.js";

const STATUS_CLS = {
  "On track": "bg-emerald-100 text-emerald-700", Completed: "bg-blue-100 text-blue-700",
  Behind: "bg-amber-100 text-amber-700", Overdue: "bg-red-100 text-red-600", "Not started": "bg-slate-100 text-slate-600",
};

function GoalForm({ goal, onClose, onSaved }) {
  const [f, setF] = useState({ name: goal?.name || "", target: goal ? String(goal.target) : "", targetDate: goal?.targetDate || "", note: goal?.note || "", color: goal?.color || "emerald" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = goal ? await api.put(`/goals/${goal.id}`, f) : await api.post("/goals", f);
      onSaved(r.item);
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal title={goal ? "Edit goal" : "Create goal"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Input label="Goal name" value={f.name} onChange={set("name")} maxLength={60} placeholder="e.g. New Laptop" autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Target amount (₱)" inputMode="decimal" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value.replace(/[^\d.]/g, "") })} />
          <Input label="Target date" type="date" value={f.targetDate} onChange={set("targetDate")} />
        </div>
        <div><Label>Colour</Label><div className="flex gap-2">
          {Object.entries(GOAL_COLORS).map(([k, c]) => (
            <button key={k} type="button" aria-label={k} onClick={() => setF({ ...f, color: k })} className={`w-7 h-7 rounded-full ${c.dot} ${f.color === k ? "ring-2 ring-offset-2 ring-slate-700" : ""}`} />
          ))}</div></div>
        <div><Label>Note</Label><textarea value={f.note} onChange={set("note")} maxLength={300} rows={2} className={inputCls} placeholder="Optional" /></div>
        <ErrorBox>{err}</ErrorBox>
        <div className="flex justify-end gap-2"><Ghost onClick={onClose}>Cancel</Ghost><Btn type="submit" disabled={busy}>{goal ? "Save goal" : "Create goal"}</Btn></div>
      </form>
    </Modal>
  );
}

function FundsForm({ goal, onClose, onSaved }) {
  const [f, setF] = useState({ amount: goal.monthlyNeeded ? String(goal.monthlyNeeded) : "", source: "", date: todayISO() });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { onSaved((await api.post(`/goals/${goal.id}/contributions`, f)).item); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal title={`Add funds to ${goal.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Input label="Amount (₱)" inputMode="decimal" autoFocus value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, "") })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <Input label="Source" value={f.source} maxLength={60} placeholder="e.g. GCash" onChange={(e) => setF({ ...f, source: e.target.value })} />
        </div>
        <p className="text-[11px] text-slate-500">Money added to a goal is set aside, so it's deducted from your available balance.</p>
        <ErrorBox>{err}</ErrorBox>
        <div className="flex justify-end gap-2"><Ghost onClick={onClose}>Cancel</Ghost><Btn type="submit" disabled={busy}>Add funds</Btn></div>
      </form>
    </Modal>
  );
}

export function GoalsPage() {
  const { data, reload } = useApi("/goals");
  const [form, setForm] = useState(false);
  if (!data) return <Loading />;
  const { items: goals, totals: t } = data;
  const behind = goals.find((g) => g.status === "Behind");
  const ahead = goals.find((g) => g.status === "On track" && g.saved > 0);
  return (<>
    <div className="grid grid-cols-3 gap-4">
      <Stat label="Total saved" value={peso(t.saved)} note={`Across ${t.active} active goal${t.active === 1 ? "" : "s"}`} />
      <Stat label="Contributed this month" value={peso(t.contributedThisMonth)} note={`${peso(t.monthlyNeeded)} needed monthly`} noteColor="text-blue-600" />
      <Stat label="Overall progress" value={`${t.pct}%`} note={`${peso(t.saved)} of ${peso(t.target)}`} noteColor="text-amber-600" />
    </div>
    <div className="flex justify-between items-end"><div><b>Your goals</b><p className="text-xs text-slate-500">Keep each goal funded at a pace that works for you.</p></div><Btn onClick={() => setForm(true)}><Plus size={14} className="inline mr-1" />Create goal</Btn></div>
    {goals.length === 0 && <Card><Empty>You don't have any goals yet. Create one to start saving with a purpose.</Empty></Card>}
    <div className="grid grid-cols-3 gap-4">
      {goals.map((g) => { const c = GOAL_COLORS[g.color] || GOAL_COLORS.emerald; return (
        <Card key={g.id}>
          <div className="flex items-center gap-2 mb-3"><Ico cat="Other" /><div className="flex-1 min-w-0"><b className="text-sm block truncate">{g.name}</b><div className="text-[10px] text-slate-500">Target · {fmtDate(g.targetDate)}</div></div>
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_CLS[g.status]}`}>{g.status}</span></div>
          <div className="text-2xl font-bold">{peso(g.saved)}</div><div className="text-[11px] text-slate-500 mb-2">of {peso(g.target)} target</div>
          <Bar pct={g.pct} color={c.bar} />
          <div className="flex justify-between text-[11px] my-2"><b>{g.pct}% complete</b><span className="text-slate-500">{peso(g.remaining)} to go</span></div>
          <button onClick={() => go(`goal/${g.id}`)} className={`w-full rounded-lg py-2 text-xs font-semibold ${c.btn}`}>View goal details</button>
        </Card>); })}
    </div>
    {goals.length > 0 && (
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <div className="mb-3"><b className="text-sm">Monthly contribution plan</b><div className="text-[11px] text-slate-500">What to set aside each month to hit every target date.</div></div>
          <div className="grid grid-cols-3 gap-3">
            {goals.filter((g) => g.status !== "Completed").map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-200 p-3">
                <div className="text-[10px] text-slate-500">By {fmtDate(g.targetDate)}</div>
                <div className="text-xs font-semibold mt-1">{g.name}</div><div className="text-lg font-bold mt-2">{peso(g.monthlyNeeded)}<span className="text-[10px] font-normal text-slate-500"> / mo</span></div>
              </div>))}
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><Lightbulb size={15} /></div><b className="text-sm">Savings coach</b></div>
          <p className="text-xs text-slate-500">
            {behind ? `${behind.name} is projected to finish after its target date. Setting aside ${peso(behind.monthlyNeeded)} a month would get it there on time.`
              : ahead ? `Nice — ${ahead.name} is on pace for ${fmtDate(ahead.targetDate)}. Keep your regular contributions going.`
              : "Add your first contribution to a goal and your coach will start suggesting a pace."}
          </p>
        </Card>
      </div>
    )}
    {form && <GoalForm onClose={() => setForm(false)} onSaved={(g) => { setForm(false); reload(); go(`goal/${g.id}`); }} />}
  </>);
}

export function GoalDetail({ id }) {
  const toast = useToast();
  const { data, error, reload } = useApi(`/goals/${id}`);
  const [modal, setModal] = useState(null);
  if (error) return <><button onClick={() => go("goals")} className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><ArrowLeft size={13} />All goals</button><ErrorBox>{error}</ErrorBox></>;
  if (!data) return <Loading />;
  const g = data.item, c = GOAL_COLORS[g.color] || GOAL_COLORS.emerald;
  const run = async (fn, msg) => { try { await fn(); toast(msg); reload(); } catch (e) { toast(e.message, "err"); } };
  return (<>
    <button onClick={() => go("goals")} className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><ArrowLeft size={13} />All goals</button>
    <Card>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3"><Ico cat="Other" size="w-10 h-10" /><div><b>{g.name}</b><div className="text-[11px] text-slate-500">Target date · {fmtDate(g.targetDate)}</div></div></div>
        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_CLS[g.status]}`}>{g.status}</span>
      </div>
      <div className="flex justify-between mt-4">
        <div className="flex gap-8">
          <div><Label>Saved</Label><div className="text-2xl font-bold">{peso(g.saved, 2)}</div></div>
          <div><Label>Target</Label><div className="text-lg font-bold">{peso(g.target, 2)}</div></div>
          <div><Label>Remaining</Label><div className="text-lg font-bold">{peso(g.remaining, 2)}</div></div>
        </div>
        <div className="text-right"><Label>Monthly pace needed</Label><div className="text-lg font-bold text-emerald-600">{peso(g.monthlyNeeded)}</div></div>
      </div>
      <div className="my-3"><Bar pct={g.pct} color={c.bar} /></div>
      <div className="flex justify-between text-[11px]"><b className="text-emerald-600">{g.pct}% funded</b>
        <span className="text-slate-500">{g.projectedDate ? `Projected completion · ${fmtDate(g.projectedDate)}` : g.status === "Completed" ? "Goal reached 🎉" : "Add contributions to see a projection"}</span></div>
    </Card>
    <div className="flex gap-2 justify-end -mt-1">
      <Danger onClick={() => { if (confirm(`Delete "${g.name}" and its contribution history?`)) run(async () => { await api.del(`/goals/${g.id}`); go("goals"); }, "Goal deleted"); }}><Trash2 size={13} className="inline mr-1" />Delete</Danger>
      <Ghost onClick={() => setModal("edit")}>Edit goal</Ghost>
      <Btn disabled={g.status === "Completed"} onClick={() => setModal("funds")}>Add funds</Btn>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <b className="text-sm">Contribution history</b>
        <div className="mt-3 text-xs">
          <div className="grid grid-cols-[1fr_1.3fr_1fr_28px] bg-slate-50 text-[10px] font-semibold text-slate-500 p-2 rounded"><span>DATE</span><span>SOURCE</span><span className="text-right">AMOUNT</span><span /></div>
          {g.contributions.length === 0 && <Empty>No contributions yet.</Empty>}
          {g.contributions.map((r) => (
            <div key={r.id} className="grid grid-cols-[1fr_1.3fr_1fr_28px] items-center p-2.5 border-b border-slate-100">
              <span>{fmtDate(r.date)}</span><span className="flex items-center gap-2"><Landmark size={13} className="text-emerald-600" />{r.source}</span>
              <b className="text-right text-emerald-600">+{peso(r.amount, 2)}</b>
              <button aria-label="Delete contribution" className="text-slate-300 hover:text-red-500 justify-self-end" onClick={() => confirm("Remove this contribution?") && run(() => api.del(`/goals/${g.id}/contributions/${r.id}`), "Contribution removed")}><Trash2 size={13} /></button>
            </div>))}
        </div>
      </Card>
      <div className="space-y-4">
        <Card>
          <b className="text-sm">Milestones</b>
          {g.milestones.map((m) => (
            <div key={m.pct} className="flex items-center gap-2 mt-3 text-xs"><div className={`w-6 h-6 rounded-full flex items-center justify-center ${m.reached ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}><Check size={12} /></div>
              <div><b>{m.pct}% · {peso(m.amount)}</b><div className="text-[10px] text-slate-500">{m.reached ? `Reached ${monthLabel(m.reached.slice(0, 7))}` : m.pct === 100 ? "Goal complete" : "Upcoming"}</div></div></div>))}
        </Card>
        {g.note && <Card><b className="text-sm">Goal note</b><p className="text-xs text-slate-500 mt-2">{g.note}</p></Card>}
      </div>
    </div>
    {modal === "edit" && <GoalForm goal={g} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast("Goal updated"); reload(); }} />}
    {modal === "funds" && <FundsForm goal={g} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast("Funds added"); reload(); }} />}
  </>);
}
