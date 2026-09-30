import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { getArchiveWorkspace } from "@/lib/workspace-data";

export const metadata = { title: "Arsip" };

export default async function ArchivesPage() {
  const session = await requireSession();
  const workspace = await getArchiveWorkspace(session);
  return (
    <AppShell session={session} active="archives">
      <div className="page-heading">
        <div><span className="eyebrow">Koleksi arsip</span><h1>Daftar arsip</h1><p>Kelola metadata, status verifikasi, dan penempatan fisik arsip.</p></div>
        <button className="primary-button primary-button--fit" type="button" disabled>Unggah arsip</button>
      </div>
      <section className="data-panel">
        {workspace.source !== "gas" && <div className="form-alert form-alert--success" role="status">Data arsip real belum tersambung. Setelah Apps Script URL dan secret diisi, daftar ini akan membaca Spreadsheet.</div>}
        <div className="toolbar">
          <div className="search-box">Cari judul, nomor, atau tag</div>
          <div className="select-box">Semua status</div>
          <div className="select-box">20 baris</div>
        </div>
        <div className="table-wrap">
          <table className="user-table archive-table">
            <thead><tr><th>Nomor</th><th>Judul</th><th>Pemilik</th><th>Kategori</th><th>Status</th><th>Lokasi</th><th>Diperbarui</th></tr></thead>
            <tbody>{workspace.archives.map((archive) => <tr key={archive.number + archive.title}><td><strong>{archive.number}</strong></td><td>{archive.title}</td><td>{archive.owner}</td><td>{archive.category}</td><td><span className="status-badge status-badge--warn">{archive.status}</span></td><td>{archive.location}</td><td>{archive.updatedAt}</td></tr>)}</tbody>
          </table>
        </div>
        {workspace.archives.length === 0 && <EmptyState title="Belum ada arsip" description="Data Spreadsheet berhasil dibaca, tetapi belum ada arsip pada cakupan akun ini." />}
      </section>
    </AppShell>
  );
}
