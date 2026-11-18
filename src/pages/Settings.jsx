import { useState } from "react";
import { Home, Landmark, LogOut, Mail, Smartphone, Trash2, User, Wallet } from "lucide-react";
import { api, tokenStore, useApi } from "../api.js";
import { Btn, Card, Danger, Empty, ErrorBox, Ghost, Input, Label, Modal, Select, Toggle, fmtDate, initials, inputCls, useToast } from "../ui.jsx";
import { go, useUser } from "../session.js";
import { BudgetEditor } from "./Insights.jsx";

const KIND_ICON = { bank: Landmark, ewallet: Smartphone, cash: Wallet, card: Landmark };
const Row = ({ t, s, right }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 gap-3">
    <div className="text-xs"><b className="text-sm">{t}</b><div className="text-slate-500">{s}</div></div>{right}
  </div>
);
const IconInput = ({ icon: I, label, className = "", ...p }) => (
  <div className={className}><Label>{label}</Label>
    <div className="border border-slate-200 rounded-xl px-3 py-2.5 flex gap-2 items-center focus-within:border-emerald-400"><I size={13} className="text-slate-400" /><input {...p} className="flex-1 text-sm outline-none min-w-0" /></div></div>
);

function PasswordModal({ onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ current: "", next: "", again: "" }); const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (f.next !== f.again) return setErr("New passwords don't match.");
    try { await api.put("/me/password", { current: f.current, next: f.next }); toast("Password changed"); onClose(true); } catch (x) { setErr(x.message); }
  };
  return (
    <Modal title="Change password" onClose={() => onClose()}>
      <form onSubmit={submit} className="space-y-3">
        <Input label="Current password" type="password" autoFocus value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
        <Input label="New password" type="password" placeholder="At least 8 characters" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
        <Input label="Confirm new password" type="password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} />
        <ErrorBox>{err}</ErrorBox>
        <div className="flex justify-end gap-2"><Ghost onClick={() => onClose()}>Cancel</Ghost><Btn type="submit">Update password</Btn></div>
      </form>
    </Modal>
  );
}

function MethodModal({ onClose }) {
  const [f, setF] = useState({ name: "", detail: "", kind: "ewallet" }); const [err, setErr] = useState("");
  const submit = async (e) => { e.preventDefault(); try { await api.post("/payment-methods", f); onClose(true); } catch (x) { setErr(x.message); } };
  return (
    <Modal title="Add payment method" onClose={() => onClose()}>
      <form onSubmit={submit} className="space-y-3">
        <Input label="Name" autoFocus maxLength={40} placeholder="e.g. BDO Debit" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Details (optional)" maxLength={60} placeholder="e.g. •• 1234" value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} />
        <Select label="Type" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          <option value="bank">Bank account</option><option value="ewallet">E-wallet</option><option value="card">Card</option><option value="cash">Cash</option>
        </Select>
        <ErrorBox>{err}</ErrorBox>
        <div className="flex justify-end gap-2"><Ghost onClick={() => onClose()}>Cancel</Ghost><Btn type="submit">Add method</Btn></div>
      </form>
    </Modal>
  );
}

function DeleteModal({ onClose, onDone }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  const submit = async (e) => { e.preventDefault(); try { await api.del("/me", { password: pw }); onDone(); } catch (x) { setErr(x.message); } };
  return (
    <Modal title="Delete account" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-slate-600">This permanently deletes your account, transactions, goals, and receipts. This can't be undone.</p>
        <Input label="Confirm with your password" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
        <ErrorBox>{err}</ErrorBox>
        <div className="flex justify-end gap-2"><Ghost onClick={onClose}>Cancel</Ghost><Danger type="submit">Delete my account</Danger></div>
      </form>
    </Modal>
  );
}

export default function SettingsPage({ onChanged }) {
  const { user, setUser, logout } = useUser();
  const toast = useToast();
  const { data: pms, reload: reloadPms } = useApi("/payment-methods");
  const { data: budgets, reload: reloadBudgets } = useApi("/budgets");
  const [f, setF] = useState({ name: user.name, email: user.email, phone: user.phone, city: user.city, occupation: user.occupation });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const dirty = ["name", "email", "phone", "city", "occupation"].some((k) => f[k] !== user[k]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setErr(""); setBusy(true);
    try { const r = await api.put("/me", f); setUser(r.user); toast("Profile saved"); onChanged?.(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const pref = (k) => async (v) => {
    try { const r = await api.put("/me", { prefs: { [k]: v } }); setUser(r.user); } catch (e) { toast(e.message, "err"); }
  };

  return (<>
    <Card className="flex items-center justify-between">
      <div className="flex items-center gap-4"><div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 text-xl font-bold flex items-center justify-center">{initials(user.name)}</div>
        <div><b className="text-lg">{user.name}</b><div className="text-xs text-slate-500">{user.email} · Member since {fmtDate(user.createdAt.slice(0, 10))}</div></div></div>
      <Btn disabled={!dirty || busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</Btn>
    </Card>
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-4">
        <Card>
          <b>Personal details</b>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <IconInput label="Full name" icon={User} value={f.name} onChange={set("name")} />
            <IconInput label="Mobile number" icon={Smartphone} value={f.phone} onChange={set("phone")} placeholder="+63 9XX XXX XXXX" />
            <IconInput className="col-span-2" label="Email address" icon={Mail} type="email" value={f.email} onChange={set("email")} />
            <IconInput label="City" icon={Home} value={f.city} onChange={set("city")} />
            <IconInput label="Occupation" icon={User} value={f.occupation} onChange={set("occupation")} />
          </div>
          <div className="mt-3"><ErrorBox>{err}</ErrorBox></div>
        </Card>
        <Card>
          <b>Account & security</b>
          <Row t="Password" s={`Last changed ${fmtDate(user.passwordChangedAt.slice(0, 10))}`} right={<Ghost onClick={() => setModal("pw")}>Change</Ghost>} />
          <Row t="Active session" s="This device · stays signed in until you sign out" right={<span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold rounded-full px-2 py-0.5">Current</span>} />
          <Row t="Delete account" s="Permanently remove your account and all of your data" right={<Ghost className="!text-red-600" onClick={() => setModal("del")}><Trash2 size={13} className="inline mr-1" />Delete</Ghost>} />
        </Card>
        <Card className="flex items-center justify-between"><div><b className="text-sm">Sign out of BudgetMate</b><div className="text-xs text-slate-500">You can sign back in anytime.</div></div>
          <Danger onClick={logout} className="flex items-center gap-2"><LogOut size={14} />Sign out</Danger></Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="flex justify-between"><b>Monthly budgets</b><button className="text-xs text-emerald-700 font-semibold" onClick={() => setModal("budget")}>Edit</button></div>
          {budgets && Object.entries(budgets.budgets).map(([c, v]) => <Row key={c} t={c} s="Monthly limit" right={<b className="text-sm">₱{v.toLocaleString("en-PH")}</b>} />)}
        </Card>
        <Card><b>Preferences</b>
          <Row t="Currency" s="Fixed for your Philippine account" right={<span className="text-xs bg-slate-100 rounded px-2 py-0.5">PHP · ₱</span>} />
          <Row t="Monthly budget cycle" s="Starts on the 1st of each month" /><Row t="Time zone" s="Asia/Manila (GMT+8)" /></Card>
        <Card><b>Notifications</b>
          <Row t="Budget alerts" s="Show budget alerts under the bell" right={<Toggle on={user.prefs.budget} set={pref("budget")} />} />
          <Row t="Goal reminders" s="Monthly savings contribution reminders" right={<Toggle on={user.prefs.goal} set={pref("goal")} />} />
          <Row t="Weekly summary" s="Receive a spending recap every Monday" right={<Toggle on={user.prefs.week} set={pref("week")} />} />
          <p className="text-[10px] text-slate-400 mt-2">Preferences are saved to your account. Email delivery isn't enabled in this install.</p></Card>
        <Card><div className="flex justify-between"><b>Linked payment methods</b><button className="text-xs text-emerald-700 font-semibold" onClick={() => setModal("pm")}>Add method</button></div>
          {pms?.items.length === 0 && <Empty>No payment methods yet.</Empty>}
          {pms?.items.map((p) => { const I = KIND_ICON[p.kind] || Landmark; return (
            <div key={p.id} className="flex items-center gap-3 mt-3 text-xs"><div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><I size={14} /></div>
              <div className="flex-1"><b className="text-sm">{p.name}</b><div className="text-slate-500">{p.detail}</div></div>
              <button aria-label={`Remove ${p.name}`} className="text-slate-300 hover:text-red-500" onClick={async () => { if (!confirm(`Remove ${p.name}? Past transactions keep their label.`)) return; try { await api.del(`/payment-methods/${p.id}`); reloadPms(); } catch (e) { toast(e.message, "err"); } }}><Trash2 size={13} /></button></div>); })}
        </Card>
      </div>
    </div>
    {modal === "pw" && <PasswordModal onClose={() => setModal(null)} />}
    {modal === "pm" && <MethodModal onClose={(ok) => { setModal(null); if (ok) { toast("Payment method added"); reloadPms(); } }} />}
    {modal === "budget" && budgets && <BudgetEditor budgets={budgets.budgets} onClose={() => setModal(null)} onSaved={() => { setModal(null); reloadBudgets(); onChanged?.(); }} />}
    {modal === "del" && <DeleteModal onClose={() => setModal(null)} onDone={() => { tokenStore.clear(); location.hash = ""; location.reload(); }} />}
  </>);
}
