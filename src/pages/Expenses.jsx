import { useEffect, useRef, useState } from "react";
import { Check, AlertTriangle, Paperclip } from "lucide-react";
import { api, useApi } from "../api.js";
import { Bar, Btn, CATS, Card, ErrorBox, Ghost, Input, Label, Loading, Select, EXPENSE_CATS, inputCls, peso, todayISO, useToast } from "../ui.jsx";
import { go } from "../session.js";

export default function ExpensesPage({ editId }) {
  const toast = useToast();
  const { data: pmData } = useApi("/payment-methods");
  const { data: existing, error: loadErr } = useApi(editId ? `/transactions/${editId}` : null);
  const [f, setF] = useState({ type: "expense", amount: "", category: "Food", title: "", note: "", date: todayISO(), paymentMethod: "" });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!existing) return;
    const t = existing.item;
    setF({ type: t.amount > 0 ? "income" : "expense", amount: String(Math.abs(t.amount)), category: t.amount > 0 ? "Food" : t.category, title: t.title, note: t.note, date: t.date, paymentMethod: t.paymentMethod });
  }, [existing]);
  useEffect(() => {
    if (pmData && !editId && !f.paymentMethod && pmData.items[0]) set("paymentMethod", pmData.items[0].name);
  }, [pmData, editId, f.paymentMethod]);

  const month = (/^\d{4}-\d{2}-\d{2}$/.test(f.date) ? f.date : todayISO()).slice(0, 7);
  const { data: ins } = useApi(`/insights?month=${month}`);
  const { data: monthTx } = useApi(`/transactions?month=${month}`);

  const n = Number(f.amount) || 0;
  const row = ins?.bva.find((r) => r.category === f.category);
  const limit = ins?.budgets?.[f.category] ?? 0;
  const orig = existing?.item;
  const sameBucket = orig && orig.amount < 0 && orig.category === f.category && orig.date.slice(0, 7) === month;
  const used = (row?.spent || 0) - (sameBucket ? Math.abs(orig.amount) : 0);
  const left = limit - used - (f.type === "expense" ? n : 0);
  const dup = monthTx?.items.some((t) => t.id !== Number(editId) && t.date === f.date && Math.abs(t.amount) === n && t.title.toLowerCase() === (f.title || f.note || f.category).toLowerCase());
  const future = f.date > todayISO();

  const checks = [
    [n > 0, "Amount entered"],
    [!!f.date && !future, future ? "Date is in the future" : "Date looks right"],
    [!!f.paymentMethod, "Payment method selected"],
    [!dup, dup ? "Possible duplicate found" : "Duplicate check passed"],
  ];

  const save = async () => {
    setErr("");
    if (!n) return setErr("Enter an amount greater than zero.");
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append("receipt", file);
    setBusy(true);
    try {
      if (editId) await api.put(`/transactions/${editId}`, fd); else await api.post("/transactions", fd);
      toast(editId ? "Transaction updated" : f.type === "income" ? "Income added" : "Expense saved");
      go("history");
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  if (editId && !existing) return loadErr ? <ErrorBox>{loadErr}</ErrorBox> : <Loading />;
  const isExp = f.type === "expense";
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <div className="flex justify-between items-start">
          <div><b>{isExp ? "Expense details" : "Income details"}</b><p className="text-[11px] text-slate-500 mb-4">All amounts are recorded in Philippine peso (₱).</p></div>
          <div className="flex bg-slate-100 rounded-xl p-0.5 text-xs font-semibold">
            {["expense", "income"].map((t) => (
              <button key={t} type="button" onClick={() => set("type", t)} className={`px-3 py-1.5 rounded-lg capitalize ${f.type === t ? "bg-white shadow-sm" : "text-slate-500"}`}>{t}</button>
            ))}
          </div>
        </div>
        <Label>Amount</Label>
        <div className="border border-slate-200 rounded-xl px-3 py-2.5 flex gap-2 mb-4 focus-within:border-emerald-400">
          <span>₱</span><input inputMode="decimal" aria-label="Amount" placeholder="0.00" value={f.amount} onChange={(e) => set("amount", e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))} className="flex-1 outline-none text-sm" />
        </div>
        {isExp && (<>
          <Label>Category</Label>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {EXPENSE_CATS.map((c) => { const I = CATS[c].i; return (
              <button key={c} type="button" onClick={() => set("category", c)} className={`rounded-xl border py-3 text-xs flex flex-col items-center gap-1 ${f.category === c ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                <I size={16} />{c}
              </button>); })}
          </div>
        </>)}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Input label="Date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
          <Select label="Payment method" value={f.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
            <option value="">Select…</option>
            {pmData?.items.map((p) => <option key={p.id} value={p.name}>{p.name}{p.detail ? ` · ${p.detail}` : ""}</option>)}
            {f.paymentMethod && !pmData?.items.some((p) => p.name === f.paymentMethod) && <option value={f.paymentMethod}>{f.paymentMethod}</option>}
          </Select>
        </div>
        <Input label={isExp ? "Merchant / title" : "Source"} className="mb-4" value={f.title} maxLength={100} onChange={(e) => set("title", e.target.value)} placeholder={isExp ? "e.g. Meralco" : "e.g. Monthly salary"} />
        <Label>Note</Label>
        <input value={f.note} maxLength={200} onChange={(e) => set("note", e.target.value)} placeholder="Optional" className={`${inputCls} mb-4`} />
        <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 flex justify-between items-center mb-4">
          <div className="text-xs"><b>Attach receipt</b>
            <div className="text-slate-500">{file ? <span className="inline-flex items-center gap-1"><Paperclip size={11} />{file.name}</span> : orig?.hasReceipt ? "A receipt is already attached. Choose a file to replace it." : "PNG, JPG, or PDF up to 10 MB"}</div></div>
          <div className="flex gap-2">
            {orig?.hasReceipt && !file && <Ghost onClick={() => api.file(`/transactions/${editId}/receipt`).catch((e) => toast(e.message, "err"))}>View</Ghost>}
            <Ghost onClick={() => fileRef.current.click()}>Choose file</Ghost>
          </div>
          <input ref={fileRef} type="file" hidden accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => {
            const x = e.target.files[0];
            if (x && x.size > 10 * 1024 * 1024) { setErr("Receipt must be under 10 MB."); e.target.value = ""; return; }
            setFile(x || null);
          }} />
        </div>
        <div className="mb-4"><ErrorBox>{err}</ErrorBox></div>
        <div className="flex justify-end gap-2"><Ghost onClick={() => go(editId ? "history" : "home")}>Cancel</Ghost><Btn disabled={busy} onClick={save}>{busy ? "Saving…" : editId ? "Save changes" : isExp ? "Save expense" : "Save income"}</Btn></div>
      </Card>
      <div className="space-y-4">
        {isExp ? (
          <Card>
            <div className="flex justify-between"><b className="text-sm">Budget impact</b><span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${left >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{left >= 0 ? "Within budget" : "Over budget"}</span></div>
            <div className="text-xs text-slate-500 mt-2">{f.category} budget remaining after this expense</div>
            <div className={`text-2xl font-bold mb-2 ${left < 0 ? "text-red-500" : ""}`}>{peso(left, 2)}</div>
            <Bar pct={limit ? ((used + n) / limit) * 100 : 100} color={left >= 0 ? "bg-amber-500" : "bg-red-500"} />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>{peso(used)} used</span><span>{peso(limit)} limit</span></div>
          </Card>
        ) : (
          <Card><b className="text-sm">Income</b><p className="text-xs text-slate-500 mt-2">Income increases your available balance and your monthly income total.</p></Card>
        )}
        <Card>
          <b className="text-sm">Before you save</b>
          {checks.map(([ok, t]) => (
            <div key={t} className="flex items-center gap-2 text-xs mt-3">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${ok ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>{ok ? <Check size={12} /> : <AlertTriangle size={12} />}</div>{t}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
