import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession();
  return (
    <AppShell session={session} active="dashboard">
      <div className="page-heading"><div><span className="eyebrow">Akses berhasil</span><h1>Selamat datang, {String(session.name || session.username || "Pengguna")}</h1><p>Sesi autentikasi Arsiva-LM telah aktif dan aman.</p></div></div>
      <section className="status-panel">
        <div className="status-mark"><span>✓</span></div>
        <div><span className="eyebrow">Status integrasi</span><h2>Gerbang login siap digunakan</h2><p>Langkah berikutnya adalah menghubungkan ruang kerja arsip GAS yang sudah ada ke sesi ini melalui API server-to-server.</p></div>
        {session.role === "SUPER_ADMIN" && <Link className="primary-button primary-button--fit" href="/admin/users">Kelola pengguna</Link>}
      </section>
    </AppShell>
  );
}
