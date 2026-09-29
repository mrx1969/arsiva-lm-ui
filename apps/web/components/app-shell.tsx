import Image from "next/image";
import Link from "next/link";
import type { ArsivaClaims } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

type ActiveRoute = "dashboard" | "archives" | "verification" | "storage" | "divisions" | "units" | "users" | "settings";

const pageTitles: Record<ActiveRoute, string> = {
  dashboard: "Dashboard",
  archives: "Arsip",
  verification: "Verifikasi Arsip",
  storage: "Lokasi Penyimpanan",
  divisions: "Divisi",
  units: "Unit",
  users: "Pengguna",
  settings: "Pengaturan"
};

export function AppShell({ session, active, children }: { session: ArsivaClaims; active: ActiveRoute; children: React.ReactNode }) {
  const isAdmin = session.role === "SUPER_ADMIN";
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <Image src="/brand/lm-mark.png" width={38} height={38} alt="LM FEB UI" />
          <div><strong>Arsiva-LM</strong><span>Kearsipan internal</span></div>
        </div>
        <nav className="sidebar-nav" aria-label="Navigasi utama">
          <span className="sidebar-section">Ruang kerja</span>
          <Link className={active === "dashboard" ? "active" : ""} href="/dashboard"><GridIcon />Dashboard</Link>
          <Link className={active === "archives" ? "active" : ""} href="/archives"><ArchiveIcon />Arsip</Link>
          <Link className={active === "verification" ? "active" : ""} href="/verification"><CheckIcon />Verifikasi Arsip</Link>
          <span className="sidebar-section">Master Data</span>
          <Link className={active === "storage" ? "active" : ""} href="/storage"><StorageIcon />Lokasi Penyimpanan</Link>
          <Link className={active === "divisions" ? "active" : ""} href="/master/divisions"><OrgIcon />Divisi</Link>
          <Link className={active === "units" ? "active" : ""} href="/master/units"><BuildingIcon />Unit</Link>
          <span className="sidebar-section">Administrasi</span>
          {isAdmin && <Link className={active === "users" ? "active" : ""} href="/admin/users"><UsersIcon />Pengguna</Link>}
          <Link className={active === "settings" ? "active" : ""} href="/settings"><SettingsIcon />Pengaturan</Link>
          <Link href="/change-password"><KeyIcon />Ganti password</Link>
        </nav>
        <div className="sidebar-account">
          <div className="avatar">{String(session.name || session.username || "A").charAt(0).toUpperCase()}</div>
          <div><strong>{String(session.name || session.username || "Pengguna")}</strong><span>{String(session.role || "USER").replaceAll("_", " ")}</span></div>
          <LogoutButton compact />
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-topbar"><div><span>RUANG KERJA</span><strong>{pageTitles[active]}</strong></div><span className="environment-pill">INTERNAL</span></header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

function GridIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>; }
function ArchiveIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4z"/><path d="M3 4h18v3H3z"/><path d="M9 12h6"/></svg>; }
function CheckIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="m8 12 3 3 5-6"/></svg>; }
function StorageIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="M4 10h16M9 5v14M15 5v14"/></svg>; }
function OrgIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v5M7 20v-5h10v5M5 15h14"/><rect x="9" y="3" width="6" height="4"/><rect x="3" y="18" width="4" height="3"/><rect x="10" y="18" width="4" height="3"/><rect x="17" y="18" width="4" height="3"/></svg>; }
function BuildingIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V5h9v15M14 9h5v11M8 9h3M8 13h3M8 17h3M17 13h1M17 17h1"/></svg>; }
function UsersIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.35-3.6 2.2-5.5 5.5-5.5s5.15 1.9 5.5 5.5M15 6.5a3 3 0 0 1 0 5.8M16 14c2.7.4 4.2 2 4.5 5"/></svg>; }
function SettingsIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/></svg>; }
function KeyIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 7-7M15 8l2 2M17 6l2 2"/></svg>; }
