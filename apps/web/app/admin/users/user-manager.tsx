"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type User = { uid: string; username: string; displayName: string; role: string; disabled: boolean; forcePasswordChange: boolean; lastSignIn: string | null };

export function UserManager({ currentUid }: { currentUid: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setUsers(result.users);
    else setNotice({ type: "error", text: result.message || "Data pengguna gagal dimuat." });
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null);
    const form = event.currentTarget; const data = new FormData(form);
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
    const result = await response.json();
    if (!response.ok) { setNotice({ type: "error", text: result.message }); return; }
    setNotice({ type: "success", text: result.message }); form.reset(); setShowCreate(false); await load();
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!resetUser) return;
    const form = event.currentTarget; const data = new FormData(form);
    const response = await fetch("/api/admin/users/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: resetUser.username, temporaryPassword: data.get("temporaryPassword") }) });
    const result = await response.json();
    if (!response.ok) { setNotice({ type: "error", text: result.message }); return; }
    setNotice({ type: "success", text: result.message }); setResetUser(null); await load();
  }

  return (
    <section className="data-panel">
      <div className="data-panel__head"><div><h2>Daftar akun</h2><p>{users.length} akun terdaftar</p></div><button className="primary-button primary-button--fit" type="button" onClick={() => setShowCreate((v) => !v)}>+ Tambah pengguna</button></div>
      {notice && <div className={`form-alert form-alert--${notice.type}`} role="status">{notice.text}</div>}
      {showCreate && <form className="admin-form" onSubmit={createUser}>
        <div className="admin-form__heading"><strong>Akun baru</strong><span>Pengguna akan diminta mengganti password saat login pertama.</span></div>
        <label className="field"><span>Nama lengkap</span><div className="field-control field-control--plain"><input name="displayName" required maxLength={100} /></div></label>
        <label className="field"><span>Username</span><div className="field-control field-control--plain"><input name="username" required minLength={3} maxLength={40} autoCapitalize="none" /></div></label>
        <label className="field"><span>Peran</span><div className="field-control field-control--plain"><select name="role" defaultValue="USER"><option value="USER">Pengguna</option><option value="VERIFIER">Petugas Verifikasi</option><option value="ADMIN_DIVISION">Admin Divisi</option><option value="SUPER_ADMIN">Super Admin</option></select></div></label>
        <label className="field"><span>Password sementara</span><div className="field-control field-control--plain"><input name="temporaryPassword" type="password" required minLength={12} maxLength={128} /></div></label>
        <div className="admin-form__actions"><button className="text-button" type="button" onClick={() => setShowCreate(false)}>Batal</button><button className="primary-button primary-button--fit" type="submit">Buat akun</button></div>
      </form>}
      <div className="table-wrap">
        <table className="user-table"><thead><tr><th>Pengguna</th><th>Username</th><th>Peran</th><th>Status</th><th>Login terakhir</th><th>Aksi</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="table-empty">Memuat pengguna…</td></tr> : users.map((user) => <tr key={user.uid}>
            <td><strong>{user.displayName}</strong>{user.uid === currentUid && <small>Anda</small>}</td><td>{user.username}</td><td><span className="role-badge">{user.role.replaceAll("_", " ")}</span></td><td>{user.disabled ? <span className="status-badge status-badge--off">Nonaktif</span> : user.forcePasswordChange ? <span className="status-badge status-badge--warn">Password sementara</span> : <span className="status-badge">Aktif</span>}</td><td>{user.lastSignIn ? new Date(user.lastSignIn).toLocaleString("id-ID") : "Belum pernah"}</td><td><button className="text-button" type="button" disabled={user.uid === currentUid} onClick={() => setResetUser(user)}>Reset password</button></td>
          </tr>)}</tbody></table>
      </div>
      {resetUser && <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title"><span className="eyebrow">Keamanan akun</span><h2 id="reset-title">Reset password</h2><p>Setel password sementara untuk <strong>{resetUser.displayName}</strong>. Semua sesi aktifnya akan langsung dicabut.</p><form className="auth-form" onSubmit={resetPassword}><label className="field"><span>Password sementara baru</span><div className="field-control field-control--plain"><input name="temporaryPassword" type="password" required minLength={12} maxLength={128} autoFocus /></div><small>Minimal 12 karakter, lengkap dengan huruf besar, huruf kecil, angka, dan simbol.</small></label><div className="dialog__actions"><button className="text-button" type="button" onClick={() => setResetUser(null)}>Batal</button><button className="primary-button primary-button--fit" type="submit">Reset password</button></div></form></div></div>}
    </section>
  );
}
