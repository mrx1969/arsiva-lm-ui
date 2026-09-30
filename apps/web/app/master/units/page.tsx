import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { getMasterWorkspace } from "@/lib/workspace-data";

export const metadata = { title: "Unit" };

export default async function UnitsPage() {
  const session = await requireSession();
  const workspace = await getMasterWorkspace(session);
  return (
    <AppShell session={session} active="units">
      <div className="page-heading">
        <div><span className="eyebrow">Master data</span><h1>Unit</h1><p>Unit dibuat terpisah dari divisi, sesuai struktur lembaga yang tidak selalu hierarkis.</p></div>
        <button className="primary-button primary-button--fit" type="button" disabled>Tambah unit</button>
      </div>
      <section className="data-panel">
        {workspace.source !== "gas" && <div className="form-alert form-alert--success" role="status">Unit masih memakai data awal sampai master data Spreadsheet tersambung.</div>}
        <div className="table-wrap"><table className="user-table"><thead><tr><th>Kode</th><th>Nama</th><th>Keterangan</th><th>Status</th></tr></thead><tbody>{workspace.units.map((row) => <tr key={row.code}><td><strong>{row.code}</strong></td><td>{row.name}</td><td>{row.description}</td><td><span className="status-badge">{row.status}</span></td></tr>)}</tbody></table></div>
      </section>
    </AppShell>
  );
}
