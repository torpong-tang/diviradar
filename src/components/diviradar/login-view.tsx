"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, PieChart, ShieldCheck } from "lucide-react";

type LoginState = {
  email: string;
  password: string;
};

export function LoginView({
  busy,
  error,
  login,
  onLoginChange,
  onSubmit
}: {
  busy: boolean;
  error: string;
  login: LoginState;
  onLoginChange: (login: LoginState) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} className="glass w-full max-w-md rounded-3xl p-8 shadow-glow">
        <div className="mb-8">
          <div className="mb-4 inline-flex rounded-2xl bg-gold/15 p-3 text-gold">
            <PieChart size={34} />
          </div>
          <h1 className="text-3xl font-extrabold">DiviRadar</h1>
          <p className="mt-2 text-slate-300">Dividend Copilot สำหรับพอร์ตหุ้นปันผลไทย</p>
        </div>
        {error && <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/12 p-3 text-rose-100">{error}</div>}
        <label className="mb-2 block font-semibold text-slate-200">Email</label>
        <input className="field mb-4" value={login.email} onChange={(event) => onLoginChange({ ...login, email: event.target.value })} />
        <label className="mb-2 block font-semibold text-slate-200">Password</label>
        <div className="relative mb-6">
          <input
            className="field pr-12"
            type={showPassword ? "text" : "password"}
            value={login.password}
            onChange={(event) => onLoginChange({ ...login, password: event.target.value })}
          />
          <button
            type="button"
            aria-label="Toggle password"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-300"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <button className="btn btn-yellow w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          Login
        </button>
      </form>
    </main>
  );
}
