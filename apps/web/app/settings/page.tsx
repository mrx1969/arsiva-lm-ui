import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { hasGasConfig } from "@/lib/gas";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const session = await requireSession();
  const gasReady = hasGasConfig();
  return (
    <AppShell session={session} active="settings">
      <div className="page-heading">
        <div><span className="eyebrow">Konfigurasi</span><h1>Pengaturan</h1><p>Ringkasan koneksi dan parameter aplikasi production.</p></div>
      </div>
      <section className="data-panel settings-grid">
        <div className="setting-row"><span>Autentikasi</span><strong>Firebase Email/Password aktif</strong></div>
        <div className="setting-row"><span>Frontend</span><strong>Vercel Next.js</strong></div>
        <div className="setting-row"><span>Database arsip</span><strong>{gasReady ? "Google Spreadsheet melalui GAS API siap" : "Menunggu APPS_SCRIPT_API_URL dan secret"}</strong></div>
        <div className="setting-row"><span>Upload file</span><strong>Disiapkan untuk Shared Drive resumable upload</strong></div>
      </section>
    </AppShell>
  );
}
