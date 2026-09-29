"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.get("username"), password: data.get("password") })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Login gagal.");
      router.replace(result.forcePasswordChange ? "/change-password" : "/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login gagal.");
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      {error && <div className="form-alert" role="alert"><AlertIcon /> <span>{error}</span></div>}
      <label className="field">
        <span>Username</span>
        <div className="field-control">
          <UserIcon />
          <input name="username" autoComplete="username" inputMode="text" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={40} placeholder="contoh: nama.pengguna" />
        </div>
      </label>
      <label className="field">
        <span>Password</span>
        <div className="field-control">
          <LockIcon />
          <input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={128} placeholder="Masukkan password" />
          <button className="field-action" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </label>
      <button className="primary-button" type="submit" disabled={pending}>
        <span>{pending ? "Memverifikasi…" : "Masuk ke aplikasi"}</span>
        {pending ? <span className="spinner" aria-hidden="true" /> : <ArrowIcon />}
      </button>
    </form>
  );
}

function UserIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.25"/><path d="M5.75 19c.45-3.45 2.53-5.25 6.25-5.25s5.8 1.8 6.25 5.25"/></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10" width="13" height="10" rx="2"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/></svg>; }
function EyeIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.25-5 9-5 9 5 9 5-3.25 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.25"/></svg>; }
function EyeOffIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16M10.2 7.2A9.4 9.4 0 0 1 12 7c5.75 0 9 5 9 5a14 14 0 0 1-2.1 2.5M14.3 16.7A9 9 0 0 1 12 17c-5.75 0-9-5-9-5a15 15 0 0 1 3-3.4"/></svg>; }
function ArrowIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M14 7l5 5-5 5"/></svg>; }
function AlertIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></svg>; }
