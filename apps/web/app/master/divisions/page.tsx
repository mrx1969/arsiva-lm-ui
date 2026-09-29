import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { divisions } from "@/lib/workspace-data";

export const metadata = { title: "Divisi" };

export default async function DivisionsPage() {
  const session = await requireSession();
  return (
    <AppShell session={session} active="divisions">
      <div className="page-heading">
        <div><span className="eyebrow">Master data</span><h1>Divisi</h1><p>Divisi berdiri sendiri dan tidak menjadi syarat pembuatan unit.</p></div>
        <button className="primary-button primary-button--fit" type="button" disabled>Tambah divisi</button>
      </div>
      <section className="data-panel"><MasterTable rows={divisions} /></section>
    </AppShell>
  );
}

function MasterTable({ rows }: { rows: typeof divisions }) {
  return <div className="table-wrap"><table className="user-table"><thead><tr><th>Kode</th><th>Nama</th><th>Keterangan</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.code}><td><strong>{row.code}</strong></td><td>{row.name}</td><td>{row.description}</td><td><span className="status-badge">{row.status}</span></td></tr>)}</tbody></table></div>;
}
