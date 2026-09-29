import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { archiveRows } from "@/lib/workspace-data";

export const metadata = { title: "Arsip" };

export default async function ArchivesPage() {
  const session = await requireSession();
  return (
    <AppShell session={session} active="archives">
      <div className="page-heading">
        <div><span className="eyebrow">Koleksi arsip</span><h1>Daftar arsip</h1><p>Kelola metadata, status verifikasi, dan penempatan fisik arsip.</p></div>
        <button className="primary-button primary-button--fit" type="button" disabled>Unggah arsip</button>
      </div>
      <section className="data-panel">
        <div className="toolbar">
          <div className="search-box">Cari judul, nomor, atau tag</div>
          <div className="select-box">Semua status</div>
          <div className="select-box">20 baris</div>
        </div>
        <div className="table-wrap">
          <table className="user-table archive-table">
            <thead><tr><th>Nomor</th><th>Judul</th><th>Pemilik</th><th>Kategori</th><th>Status</th><th>Lokasi</th><th>Diperbarui</th></tr></thead>
            <tbody>{archiveRows.map((archive) => <tr key={archive.number}><td><strong>{archive.number}</strong></td><td>{archive.title}</td><td>{archive.owner}</td><td>{archive.category}</td><td><span className="status-badge status-badge--warn">{archive.status}</span></td><td>{archive.location}</td><td>{archive.updatedAt}</td></tr>)}</tbody>
          </table>
        </div>
        <EmptyState title="Data arsip belum tersambung" description="Halaman sudah siap menerima data dari Spreadsheet melalui API GAS pada tahap integrasi berikutnya." />
      </section>
    </AppShell>
  );
}
