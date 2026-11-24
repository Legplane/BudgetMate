import { useEffect, useState } from "react";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { api, useApi } from "../api.js";
import { Bar, Card, Empty, Ico, Loading, Select, Stat, dayLabel, monthLabel, monthOptions, peso, useConfirm, useToast, inputCls } from "../ui.jsx";
import { go } from "../session.js";

export default function HistoryPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState(""); const [dq, setDq] = useState("");
  const [month, setMonth] = useState(monthOptions(1)[0]);
  const [type, setType] = useState("all"); const [method, setMethod] = useState("all");
  useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t); }, [q]);
  const { data: pms } = useApi("/payment-methods");
  const { data, reload } = useApi(`/transactions?month=${month}&type=${type}&method=${encodeURIComponent(method)}&q=${encodeURIComponent(dq)}`);
  if (!data) return <Loading />;
  const { items, totals: t, paymentMix } = data;
  const groups = [...new Set(items.map((x) => x.date))];
  const label = month === "all" ? "All time" : monthLabel(month);
  const remove = async (x) => {
    if (!(await confirm({ title: "Delete this transaction?", message: `"${x.title}" will be removed from your history.`, danger: true }))) return;
    try { await api.del(`/transactions/${x.id}`); toast("Transaction deleted"); reload(); } catch (e) { toast(e.message, "err"); }
  };
  const barMax = Math.max(t.in, t.out, t.saved, 1);
  return (<>
    <div className="grid grid-cols-3 gap-4">
      <Stat label="Money in" value={"+" + peso(t.in)} note={`${t.inCount} income transaction${t.inCount === 1 ? "" : "s"}`} />
      <Stat label="Money out" value={"−" + peso(t.out)} note={`${t.outCount} expense transaction${t.outCount === 1 ? "" : "s"}`} noteColor="text-red-500" />
      <Stat label="Net cash flow" value={(t.net < 0 ? "−" : "+") + peso(Math.abs(t.net))} note={t.net >= 0 ? `Positive for ${label}` : `Negative for ${label}`} noteColor={t.net >= 0 ? "text-blue-600" : "text-red-500"} />
    </div>
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <div className="flex gap-2 mb-4 text-xs">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, note, room or category" aria-label="Search" className={`${inputCls} !py-2 flex-1 !text-xs`} />
          <Select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-36 [&_select]:!py-2 [&_select]:!text-xs">
            {monthOptions(12).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}<option value="all">All time</option>
          </Select>
          <Select aria-label="Activity" value={type} onChange={(e) => setType(e.target.value)} className="w-28 [&_select]:!py-2 [&_select]:!text-xs">
            <option value="all">All activity</option><option value="income">Money in</option><option value="expense">Money out</option>
          </Select>
          <Select aria-label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)} className="w-36 [&_select]:!py-2 [&_select]:!text-xs">
            <option value="all">All payment methods</option>{pms?.items.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </Select>
        </div>
        {items.length === 0 && <Empty>No transactions match these filters.</Empty>}
        {groups.map((g) => (
          <div key={g} className="mb-3">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{dayLabel(g)}</div>
            {items.filter((x) => x.date === g).map((x) => (
              <div key={x.id} className="group flex items-center gap-3 py-2 border-b border-slate-100 text-sm">
                <Ico cat={x.category} /><div className="flex-1 min-w-0"><b className="block truncate">{x.title}{x.roomNumber && <span className="ml-2 align-middle text-[10px] font-semibold bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">Room {x.roomNumber}</span>}</b><div className="text-[11px] text-slate-500 truncate">{[x.category, x.note].filter(Boolean).join(" · ")}</div></div>
                <span className="text-xs text-slate-500 w-24 truncate">{x.paymentMethod}</span>
                <span className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 text-slate-400">
                  {x.hasReceipt && <button aria-label="View receipt" title="View receipt" className="p-1 hover:text-emerald-600" onClick={() => api.file(`/transactions/${x.id}/receipt`).catch((e) => toast(e.message, "err"))}><FileText size={13} /></button>}
                  <button aria-label="Edit" title="Edit" className="p-1 hover:text-slate-700" onClick={() => go(`expenses/edit/${x.id}`)}><Pencil size={13} /></button>
                  <button aria-label="Delete" title="Delete" className="p-1 hover:text-red-500" onClick={() => remove(x)}><Trash2 size={13} /></button>
                </span>
                <b className={`w-24 text-right ${x.amount < 0 ? "text-red-500" : "text-emerald-600"}`}>{x.amount < 0 ? "−" : "+"}{peso(Math.abs(x.amount))}</b>
              </div>))}
          </div>))}
      </Card>
      <div className="space-y-4">
        <Card>
          <b className="text-sm">{label} cash flow</b>
          <div className="flex items-end gap-3 h-28 my-3">
            {[["Income", t.in, "bg-emerald-500"], ["Expenses", t.out, "bg-red-500"], ["Saved", t.saved, "bg-blue-600"]].map(([l, v, c]) => (
              <div key={l} className="flex-1 text-[10px] text-center text-slate-500"><div className={`${c} rounded-t-lg`} style={{ height: Math.max(3, (v / barMax) * 80) }} title={peso(v)} />{l}</div>))}
          </div>
          <div className="bg-emerald-50 text-emerald-700 text-xs rounded-lg p-2 flex justify-between"><span>Net cash flow</span><b>{t.net < 0 ? "−" : "+"}{peso(Math.abs(t.net))}</b></div>
        </Card>
        <Card>
          <b className="text-sm">Payment mix</b>
          {paymentMix.length === 0 && <Empty>No spending to show.</Empty>}
          {paymentMix.map((m) => (
            <div key={m.name} className="mt-3 text-xs"><div className="flex justify-between"><b>{m.name}</b><span>{peso(m.amount)} · {m.pct}%</span></div><Bar pct={m.pct} /></div>))}
        </Card>
      </div>
    </div>
  </>);
}
