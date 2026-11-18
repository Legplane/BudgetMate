import { useState } from "react";
import { Check, Eye, EyeOff, Lock, Mail, ShieldCheck, User, KeyRound } from "lucide-react";
import { api, tokenStore } from "../api.js";
import { Btn, Card, ErrorBox, Label, Logo } from "../ui.jsx";

const Field = ({ icon: I, label, ...p }) => (
  <div className="mb-3">
    <Label>{label}</Label>
    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus-within:border-emerald-400">
      <I size={14} className="text-slate-400" />
      <input {...p} className="flex-1 bg-transparent text-sm outline-none min-w-0" />
    </div>
  </div>
);

export default function Auth({ mode, go, onAuth }) {
  const login = mode === "login", signup = mode === "signup";
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", code: "", terms: false, remember: true });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const type = show ? "text" : "password";

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setInfo("");
    try {
      if (signup) {
        if (f.password !== f.confirm) throw new Error("Passwords don't match.");
        if (!f.terms) throw new Error("Please agree to the Terms of Use and Privacy Policy.");
      }
      setBusy(true);
      if (mode === "forgot") {
        const r = await api.post("/auth/forgot", { email: f.email });
        setInfo(r.message);
        if (r.devCode) { setF({ ...f, code: r.devCode }); setInfo(`${r.message} Email isn't set up in this install, so your code is shown here: ${r.devCode}`); }
        go("reset", false, { email: f.email });
        return;
      }
      if (mode === "reset") {
        if (f.password !== f.confirm) throw new Error("Passwords don't match.");
        const r = await api.post("/auth/reset", { email: f.email, code: f.code, password: f.password });
        setInfo(r.message);
        setTimeout(() => go("login"), 900);
        return;
      }
      const r = await api.post(signup ? "/auth/register" : "/auth/login", signup
        ? { name: f.name, email: f.email, password: f.password }
        : { email: f.email, password: f.password, remember: f.remember });
      tokenStore.clear();
      tokenStore.set(r.token, signup ? true : f.remember);
      onAuth(r.user);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  const perks = login || mode === "forgot" || mode === "reset"
    ? [["See where your money goes", "Organize GCash, cash, Maya, and bank spending in one place."],
       ["Save with a purpose", "Create clear goals for school, travel, or your emergency fund."],
       ["Private and secure", "Your account data stays protected and in your control."]]
    : [["Add your income", "Start with allowance, salary, freelance work, or side-hustle earnings."],
       ["Track everyday spending", "Record jeepney fares, school costs, groceries, and monthly bills."],
       ["Reach your goals", "Watch every contribution bring New Laptop and other goals closer."]];
  const titles = {
    login: ["Welcome back", "Sign in to continue to your BudgetMate account."],
    signup: ["Create your account", "Join BudgetMate and start building a healthier money routine."],
    forgot: ["Forgot your password?", "Enter your email and we'll generate a reset code."],
    reset: ["Choose a new password", "Enter the reset code and your new password."],
  }[mode];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className={`hidden md:flex w-1/3 flex-col justify-between p-8 text-white ${signup ? "bg-slate-900" : "bg-emerald-800"}`}>
        <Logo dark />
        <div>
          <div className="text-[10px] tracking-widest font-semibold text-emerald-300 mb-2">{signup ? "START STRONG" : "MONEY CLARITY, MADE SIMPLE"}</div>
          <h1 className="text-3xl font-bold leading-tight mb-3">{signup ? "A clear plan for the money you have today." : "Build better money habits, one peso at a time."}</h1>
          <p className="text-sm text-slate-300 mb-5">{signup ? "Set up your account in minutes. No credit card, no complicated spreadsheets." : "Track daily spending, plan your savings, and stay ready for what matters next."}</p>
          {perks.map(([a, b], i) => (
            <div key={a} className="flex gap-3 mb-3">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs shrink-0">{signup ? i + 1 : <Check size={13} />}</div>
              <div><div className="text-sm font-semibold">{a}</div><div className="text-xs text-slate-300">{b}</div></div>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-300 flex gap-2 items-center"><ShieldCheck size={14} />Secure, private, and built for your real life in the Philippines.</div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-7 shadow-sm">
          <form onSubmit={submit} noValidate>
            <h2 className="text-xl font-bold">{titles[0]}</h2>
            <p className="text-xs text-slate-500 mb-5">{titles[1]}</p>
            {signup && <Field icon={User} label="Full name" value={f.name} onChange={set("name")} autoComplete="name" placeholder="Juan Dela Cruz" />}
            <Field icon={Mail} label="Email address" type="email" value={f.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" />
            {mode === "reset" && <Field icon={KeyRound} label="Reset code" value={f.code} onChange={set("code")} autoComplete="one-time-code" />}
            {mode !== "forgot" && (
              <div className={signup || mode === "reset" ? "grid grid-cols-2 gap-3" : ""}>
                <Field icon={Lock} label={mode === "reset" ? "New password" : "Password"} type={type} value={f.password} onChange={set("password")} autoComplete={login ? "current-password" : "new-password"} placeholder={login ? "" : "At least 8 characters"} />
                {(signup || mode === "reset") && <Field icon={Lock} label="Confirm password" type={type} value={f.confirm} onChange={set("confirm")} autoComplete="new-password" />}
              </div>
            )}
            {(login || signup) && (
              <div className="flex items-center justify-between text-xs text-slate-600 mb-4">
                <label className="flex items-center gap-2">
                  {login
                    ? <><input type="checkbox" checked={f.remember} onChange={set("remember")} className="accent-emerald-500" />Remember me</>
                    : <><input type="checkbox" checked={f.terms} onChange={set("terms")} className="accent-emerald-500" />I agree to the Terms of Use and Privacy Policy</>}
                </label>
                <span className="flex gap-3 items-center">
                  <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>{show ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                  {login && <button type="button" className="text-emerald-700 font-semibold" onClick={() => go("forgot")}>Forgot password?</button>}
                </span>
              </div>
            )}
            <div className="space-y-3 mb-3"><ErrorBox>{err}</ErrorBox>{info && <div className="bg-emerald-50 text-emerald-700 text-xs rounded-xl p-3">{info}</div>}</div>
            <Btn type="submit" disabled={busy} className="w-full">
              {busy ? "Please wait…" : { login: "Sign in", signup: "Create account", forgot: "Send reset code", reset: "Update password" }[mode]}
            </Btn>
          </form>
          <p className="text-xs text-center text-slate-500 mt-5">
            {login && <>Don't have an account? <button className="text-emerald-700 font-bold" onClick={() => go("signup")}>Create one free</button></>}
            {signup && <>Already have an account? <button className="text-emerald-700 font-bold" onClick={() => go("login")}>Sign in</button></>}
            {(mode === "forgot" || mode === "reset") && <button className="text-emerald-700 font-bold" onClick={() => go("login")}>Back to sign in</button>}
          </p>
        </Card>
      </div>
    </div>
  );
}
