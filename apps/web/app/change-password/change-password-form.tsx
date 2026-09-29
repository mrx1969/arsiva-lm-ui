"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ChangePasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword"), confirmation: data.get("confirmation") }) });
    const result = await response.json();
    if (!response.ok) { setMessage({ type: "error", text: result.message || "Password gagal diperbarui." }); setPending(false); return; }
    setMessage({ type: "success", text: result.message });
    window.setTimeout(() => { router.replace("/login"); router.refresh(); }, 1200);
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      {message && <div className={`form-alert form-alert--${message.type}`} role="alert">{message.text}</div>}
      <label className="field"><span>Password saat ini</span><div className="field-control field-control--plain"><input name="currentPassword" type="password" autoComplete="current-password" required /></div></label>
      <label className="field"><span>Password baru</span><div className="field-control field-control--plain"><input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></div><small>Minimal 12 karakter; gunakan huruf besar, huruf kecil, angka, dan simbol.</small></label>
      <label className="field"><span>Ulangi password baru</span><div className="field-control field-control--plain"><input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></div></label>
      <button className="primary-button" type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan password baru"}</button>
    </form>
  );
}
