import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { MetricGrid } from "@/components/metric-grid";
import { EmptyState } from "@/components/empty-state";
import { archiveRows, summaryMetrics, verificationTasks } from "@/lib/workspace-data";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession();
  return (
    <AppShell session={session} active="dashboard">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Ikhtisar operasional</span>
          <h1>Dashboard arsip</h1>
          <p>Pantau status arsip, antrean verifikasi, dan kesiapan lokasi penyimpanan.</p>
        </div>
        <Link className="primary-button primary-button--fit" href="/archives">Unggah arsip</Link>
      </div>

      <MetricGrid metrics={summaryMetrics} />

      <div className="workspace-grid">
        <section className="data-panel">
          <div className="data-panel__head">
            <div><span className="eyebrow">Koleksi</span><h2>Arsip terbaru</h2><p>{archiveRows.length} contoh baris siap diganti data Spreadsheet.</p></div>
            <Link className="text-button" href="/archives">Lihat semua</Link>
          </div>
          <div className="table-wrap">
            <table className="user-table">
              <thead><tr><th>Nomor</th><th>Judul</th><th>Status</th><th>Lokasi</th></tr></thead>
              <tbody>{archiveRows.map((archive) => <tr key={archive.number}><td><strong>{archive.number}</strong></td><td>{archive.title}</td><td><span className="status-badge status-badge--warn">{archive.status}</span></td><td>{archive.location}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="data-panel action-panel">
          <div className="data-panel__head">
            <div><span className="eyebrow">Antrean</span><h2>Perlu tindakan</h2><p>{verificationTasks.length} item rancangan workflow.</p></div>
          </div>
          <div className="task-list">
            {verificationTasks.map((task) => <article className="task-card" key={task.title}><strong>{task.title}</strong><span>{task.submittedBy} · {task.unit}</span><small>{task.due}</small></article>)}
          </div>
        </section>
      </div>

      <section className="status-panel">
        <div className="status-mark"><span>✓</span></div>
        <div><span className="eyebrow">Status integrasi</span><h2>Login production sudah aktif</h2><p>Ruang kerja aplikasi sudah disiapkan di Vercel. Tahap berikutnya adalah menyambungkan API GAS/Spreadsheet agar data operasional menggantikan placeholder ini.</p></div>
        {session.role === "SUPER_ADMIN" && <Link className="primary-button primary-button--fit" href="/admin/users">Kelola pengguna</Link>}
      </section>
    </AppShell>
  );
}
