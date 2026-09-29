import Image from "next/image";
import Link from "next/link";
import type { ArsivaClaims } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export function AppShell({ session, active, children }: { session: ArsivaClaims; active: "dashboard" | "users"; children: React.ReactNode }) {
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
          <span className="sidebar-section">Administrasi</span>
          {isAdmin && <Link className={active === "users" ? "active" : ""} href="/admin/users"><UsersIcon />Pengguna</Link>}
          <Link href="/change-password"><KeyIcon />Ganti password</Link>
        </nav>
        <div className="sidebar-account">
          <div className="avatar">{String(session.name || session.username || "A").charAt(0).toUpperCase()}</div>
          <div><strong>{String(session.name || session.username || "Pengguna")}</strong><span>{String(session.role || "USER").replaceAll("_", " ")}</span></div>
          <LogoutButton compact />
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-topbar"><div><span>RUANG KERJA</span><strong>{active === "users" ? "Pengguna" : "Dashboard"}</strong></div><span className="environment-pill">INTERNAL</span></header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

function GridIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>; }
function UsersIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.35-3.6 2.2-5.5 5.5-5.5s5.15 1.9 5.5 5.5M15 6.5a3 3 0 0 1 0 5.8M16 14c2.7.4 4.2 2 4.5 5"/></svg>; }
function KeyIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 7-7M15 8l2 2M17 6l2 2"/></svg>; }
