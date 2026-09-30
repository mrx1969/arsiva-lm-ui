import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { getMasterWorkspace } from "@/lib/workspace-data";

export const metadata = { title: "Lokasi Penyimpanan" };

export default async function StoragePage() {
  const session = await requireSession();
  const workspace = await getMasterWorkspace(session);
  return (
    <AppShell session={session} active="storage">
      <div className="page-heading">
        <div><span className="eyebrow">Identitas fisik</span><h1>Lokasi penyimpanan</h1><p>Kelola ruang, rak, tingkat, posisi, dan barcode yang ditempel pada rak arsip.</p></div>
        <button className="primary-button primary-button--fit" type="button" disabled>Cetak barcode</button>
      </div>
      <section className="data-panel">
        {workspace.source !== "gas" && <div className="form-alert form-alert--success" role="status">Lokasi masih memakai data awal sampai master data Spreadsheet tersambung.</div>}
        <div className="table-wrap">
          <table className="user-table">
            <thead><tr><th>Kode</th><th>Nama lokasi</th><th>Keterangan</th><th>Kapasitas</th><th>Barcode</th></tr></thead>
            <tbody>{workspace.locations.map((location) => <tr key={location.code + location.name}><td><strong>{location.code}</strong></td><td>{location.name}</td><td>{location.detail}</td><td>{location.capacity}</td><td><span className="barcode-chip">{location.barcode}</span></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
