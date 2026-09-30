import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { getDashboardWorkspace } from "@/lib/workspace-data";

export const metadata = { title: "Verifikasi Arsip" };

export default async function VerificationPage() {
  const session = await requireSession();
  const workspace = await getDashboardWorkspace(session);
  return (
    <AppShell session={session} active="verification">
      <div className="page-heading">
        <div><span className="eyebrow">Kontrol mutu arsip</span><h1>Verifikasi arsip</h1><p>Petugas memeriksa metadata dan lampiran sebelum arsip resmi disimpan.</p></div>
      </div>
      <section className="data-panel">
        {workspace.source !== "gas" && <div className="form-alert form-alert--success" role="status">Antrean verifikasi masih memakai data awal sampai Apps Script bridge dikonfigurasi di Vercel.</div>}
        <div className="verification-board">
          {workspace.tasks.map((task) => (
            <article className="verification-card" key={task.title}>
              <div><strong>{task.title}</strong><span>{task.submittedBy} · {task.unit}</span></div>
              <span className="status-badge status-badge--warn">{task.status}</span>
              <small>{task.due}</small>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
