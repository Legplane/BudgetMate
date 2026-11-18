import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  Wallet, Plus, Utensils, Zap, Bus, BookOpen, ShoppingBag, Banknote, X, AlertCircle, Check,
} from "lucide-react";

export const peso = (n, d = 0) =>
  "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: d, maximumFractionDigits: d });

export const CATS = {
  Food: { i: Utensils, c: "bg-amber-100 text-amber-600" },
  Transport: { i: Bus, c: "bg-blue-100 text-blue-600" },
  Bills: { i: Zap, c: "bg-red-100 text-red-500" },
  School: { i: BookOpen, c: "bg-sky-100 text-sky-600" },
  Shopping: { i: ShoppingBag, c: "bg-purple-100 text-purple-600" },
  Other: { i: Plus, c: "bg-slate-100 text-slate-500" },
  Income: { i: Banknote, c: "bg-emerald-100 text-emerald-600" },
};
export const EXPENSE_CATS = ["Food", "Transport", "Bills", "School", "Shopping", "Other"];

export const GOAL_COLORS = {
  emerald: { bar: "bg-emerald-600", btn: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  blue: { bar: "bg-blue-600", btn: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  amber: { bar: "bg-amber-700", btn: "bg-amber-100 text-amber-800", dot: "bg-amber-600" },
  purple: { bar: "bg-purple-600", btn: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  red: { bar: "bg-red-500", btn: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

/* ---------- dates ---------- */
const pad = (n) => String(n).padStart(2, "0");
export const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => isoOf(new Date());
export const thisMonth = () => todayISO().slice(0, 7);
const toDate = (iso) => new Date(iso + "T00:00:00");
export const fmtDate = (iso) => toDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const monthLabel = (m) => toDate(m + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" });
export const monthOptions = (n = 12) => {
  const d = new Date(); d.setDate(1);
  return Array.from({ length: n }, (_, i) => { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; });
};
export const dayLabel = (iso) => {
  const t = todayISO();
  const y = isoOf(new Date(Date.now() - 864e5));
  const long = toDate(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  if (iso === t) return `Today · ${long}`;
  if (iso === y) return `Yesterday · ${long}`;
  return `${toDate(iso).toLocaleDateString("en-US", { weekday: "long" })} · ${long}`;
};
export const initials = (n = "") => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

/* ---------- primitives ---------- */
export const Card = ({ className = "", children }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 p-4 ${className}`}>{children}</div>
);
export const Btn = ({ className = "", ...p }) => (
  <button type="button" {...p} className={`bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl px-4 py-2.5 ${className}`} />
);
export const Ghost = ({ className = "", ...p }) => (
  <button type="button" {...p} className={`bg-white hover:bg-slate-50 disabled:opacity-50 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl px-4 py-2.5 ${className}`} />
);
export const Danger = ({ className = "", ...p }) => (
  <button type="button" {...p} className={`bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl px-4 py-2.5 ${className}`} />
);
export const Label = ({ children }) => (
  <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-1">{children}</div>
);
export const Bar = ({ pct, color = "bg-emerald-500" }) => (
  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
    <div className={`h-full rounded-full ${color}`} style={{ width: Math.max(0, Math.min(pct || 0, 100)) + "%" }} />
  </div>
);
export const Ico = ({ cat, size = "w-9 h-9" }) => {
  const C = CATS[cat] || CATS.Other;
  return <div className={`${size} rounded-xl flex items-center justify-center shrink-0 ${C.c}`}><C.i size={16} /></div>;
};
export const Toggle = ({ on, set }) => (
  <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} className={`w-10 h-6 rounded-full p-0.5 transition ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
    <div className={`w-5 h-5 bg-white rounded-full transition ${on ? "translate-x-4" : ""}`} />
  </button>
);
export const Logo = ({ dark }) => (
  <div className="flex items-center gap-2 font-bold text-lg">
    <div className="w-8 h-8 rounded-lg bg-white text-emerald-600 flex items-center justify-center border border-slate-200"><Wallet size={16} /></div>
    <span className={dark ? "text-white" : "text-slate-900"}>BudgetMate</span>
  </div>
);
export const Stat = ({ label, value, note, noteColor = "text-emerald-600", big }) => (
  <Card>
    <Label>{label}</Label>
    <div className={`font-bold ${big ? "text-2xl" : "text-xl"}`}>{value}</div>
    <div className={`text-[11px] mt-1 ${noteColor}`}>{note}</div>
  </Card>
);
export const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 bg-white";
export const Input = ({ label, className = "", ...p }) => (
  <div className={className}>{label && <Label>{label}</Label>}<input {...p} className={inputCls} /></div>
);
export const Select = ({ label, children, className = "", ...p }) => (
  <div className={className}>{label && <Label>{label}</Label>}<select {...p} className={inputCls}>{children}</select></div>
);
export const Empty = ({ children }) => <div className="text-xs text-slate-500 py-6 text-center">{children}</div>;
export const ErrorBox = ({ children }) => children ? (
  <div className="flex items-start gap-2 bg-red-50 text-red-700 text-xs rounded-xl p-3"><AlertCircle size={14} className="shrink-0 mt-px" />{children}</div>
) : null;
export const Loading = () => <div className="text-sm text-slate-500 py-10 text-center">Loading…</div>;

export function Modal({ title, onClose, children, width = "max-w-md" }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className={`bg-white rounded-2xl w-full ${width} p-6 shadow-xl max-h-[90vh] overflow-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((msg, kind = "ok") => {
    const id = Math.random();
    setList((l) => [...l, { id, msg, kind }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2">
        {list.map((t) => (
          <div key={t.id} className={`text-sm font-medium rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2 text-white ${t.kind === "err" ? "bg-red-500" : "bg-slate-900"}`}>
            {t.kind === "err" ? <AlertCircle size={14} /> : <Check size={14} className="text-emerald-400" />}{t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
