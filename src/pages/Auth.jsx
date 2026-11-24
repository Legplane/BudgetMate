import { useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, Lock, Mail, ShieldCheck, User, KeyRound } from "lucide-react";
import { api, tokenStore } from "../api.js";
import { Btn, Card, Label, Logo, PasswordRules, inputCls, useConfirm, useToast } from "../ui.jsx";
import { SUFFIXES, emailOk, nameProblem, passwordProblem } from "../validation.js";

// Text field with a leading icon. `reveal` turns it into a password field with an eye icon inside the input.
function Field({ icon: I, label, reveal, className = "mb-3", ...p }) {
  const [show, setShow] = useState(false);
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus-within:border-emerald-400">
        {I && <I size={14} className="text-slate-400 shrink-0" />}
        <input {...p} type={reveal ? (show ? "text" : "password") : p.type} className="flex-1 bg-transparent text-sm outline-none min-w-0" />
        {reveal && (
          <button type="button" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow(!show)} className="text-slate-400 hover:text-slate-700">
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Auth({ mode, go, onAuth }) {
  const toast = useToast();
  const confirm = useConfirm();
  const login = mode === "login", signup = mode === "signup", reset = mode === "reset";
  const [f, setF] = useState({ firstName: "", middleName: "", lastName: "", suffix: "", email: "", password: "", confirm: "", code: "", terms: false, remember: true });
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const newPw = signup || reset;

  // Returns the first problem with the form, or null. Errors are shown as toasts.
  const problem = () => {
    if (signup) {
      const n = nameProblem(f); if (n) return n;
    }
    if (!emailOk(f.email.trim())) return "Please enter a valid email address.";
    if (mode === "forgot") return null;
    if (login) return f.password ? null : "Please enter your password.";
    if (reset && !f.code.trim()) return "Please enter the reset code.";
    if (newPw) {
      const pw = passwordProblem(f.password); if (pw) return pw;
      if (f.password !== f.confirm) return "Passwords don't match.";
    }
    if (signup && !f.terms) return "Please agree to the Terms of Use and Privacy Policy.";
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setInfo("");
    const bad = problem();
    if (bad) return toast(bad, "err");
    if (signup && !(await confirm({ title: "Create your account?", message: `We'll create a BudgetMate account for ${f.email.trim()}.` }))) return;
    if (reset && !(await confirm({ title: "Update your password?", message: "Your old password will stop working." }))) return;
    setBusy(true);
    try {
      if (mode === "forgot") {
        const r = await api.post("/auth/forgot", { email: f.email });
        setInfo(r.message);
        if (r.devCode) { setF({ ...f, code: r.devCode }); setInfo(`${r.message} Email isn't set up in this install, so your code is shown here: ${r.devCode}`); }
        toast("Reset code generated.");
        go("reset");
        return;
      }
      if (reset) {
        const r = await api.post("/auth/reset", { email: f.email, code: f.code, password: f.password });
        toast(r.message);
        go("login");
        return;
      }
      const r = await api.post(signup ? "/auth/register" : "/auth/login", signup
        ? { firstName: f.firstName, middleName: f.middleName, lastName: f.lastName, suffix: f.suffix, email: f.email, password: f.password }
        : { email: f.email, password: f.password, remember: f.remember });
      tokenStore.clear();
      tokenStore.set(r.token, signup ? true : f.remember);
      toast(signup ? `Account created. Welcome to BudgetMate, ${r.user.firstName}!` : `Signed in. Welcome back, ${r.user.firstName}!`);
      onAuth(r.user);
    } catch (x) { toast(x.message, "err"); } finally { setBusy(false); }
  };

  const perks = !signup
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
        <button type="button" onClick={() => go("")} aria-label="BudgetMate home" className="self-start"><Logo dark /></button>
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
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Card className={`w-full ${signup ? "max-w-lg" : "max-w-md"} p-7 shadow-sm`}>
          <form onSubmit={submit} noValidate>
            <h2 className="text-xl font-bold">{titles[0]}</h2>
            <p className="text-xs text-slate-500 mb-5">{titles[1]}</p>
            {signup && (<>
              <div className="grid grid-cols-2 gap-3">
                <Field icon={User} label="First name" value={f.firstName} onChange={set("firstName")} autoComplete="given-name" placeholder="Juan" maxLength={50} />
                <Field icon={User} label="Last name" value={f.lastName} onChange={set("lastName")} autoComplete="family-name" placeholder="Dela Cruz" maxLength={50} />
              </div>
              <div className="grid grid-cols-[1fr_8rem] gap-3">
                <Field icon={User} label="Middle name (optional)" value={f.middleName} onChange={set("middleName")} autoComplete="additional-name" maxLength={50} />
                <div className="mb-3"><Label>Suffix (optional)</Label>
                  <select aria-label="Suffix" value={f.suffix} onChange={set("suffix")} className={`${inputCls} !bg-slate-50`}>
                    <option value="">None</option>{SUFFIXES.map((s) => <option key={s}>{s}</option>)}
                  </select></div>
              </div>
            </>)}
            <Field icon={Mail} label="Email address" type="email" value={f.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" />
            {reset && <Field icon={KeyRound} label="Reset code" value={f.code} onChange={set("code")} autoComplete="one-time-code" />}
            {mode !== "forgot" && (
              <div className={newPw ? "grid grid-cols-2 gap-3" : ""}>
                <Field key={`pw-${mode}`} icon={Lock} reveal label={reset ? "New password" : "Password"} value={f.password} onChange={set("password")} autoComplete={login ? "current-password" : "new-password"} />
                {newPw && <Field key={`cf-${mode}`} icon={Lock} reveal label="Confirm password" value={f.confirm} onChange={set("confirm")} autoComplete="new-password"
                  aria-invalid={!!f.confirm && f.confirm !== f.password} />}
              </div>
            )}
            {newPw && (
              <div className="-mt-1 mb-3">
                <PasswordRules value={f.password} />
                {f.confirm && (f.confirm === f.password
                  ? <div className="text-[11px] text-emerald-700 mt-1.5 flex items-center gap-1.5"><Check size={11} />Passwords match</div>
                  : <div className="text-[11px] text-red-600 mt-1.5">Passwords don't match yet</div>)}
              </div>
            )}
            {(login || signup) && (
              <div className="flex items-center justify-between text-xs text-slate-600 mb-4">
                <label className="flex items-center gap-2">
                  {login
                    ? <><input type="checkbox" checked={f.remember} onChange={set("remember")} className="accent-emerald-500" />Remember me</>
                    : <><input type="checkbox" checked={f.terms} onChange={set("terms")} className="accent-emerald-500" />I agree to the Terms of Use and Privacy Policy</>}
                </label>
                {login && <button type="button" className="text-emerald-700 font-semibold" onClick={() => go("forgot")}>Forgot password?</button>}
              </div>
            )}
            {info && <div className="bg-emerald-50 text-emerald-700 text-xs rounded-xl p-3 mb-3">{info}</div>}
            <Btn type="submit" disabled={busy} className="w-full">
              {busy ? "Please wait…" : { login: "Sign in", signup: "Create account", forgot: "Send reset code", reset: "Update password" }[mode]}
            </Btn>
          </form>
          <p className="text-xs text-center text-slate-500 mt-5">
            {login && <>Don't have an account? <button className="text-emerald-700 font-bold" onClick={() => go("signup")}>Create one free</button></>}
            {signup && <>Already have an account? <button className="text-emerald-700 font-bold" onClick={() => go("login")}>Sign in</button></>}
            {(mode === "forgot" || reset) && <button className="text-emerald-700 font-bold" onClick={() => go("login")}>Back to sign in</button>}
          </p>
        </Card>
        <button type="button" onClick={() => go("")} className="mt-4 text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><ArrowLeft size={12} />Back to home</button>
      </div>
    </div>
  );
}
