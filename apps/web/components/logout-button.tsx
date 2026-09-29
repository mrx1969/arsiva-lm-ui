"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return <button className={compact ? "logout-icon" : "secondary-button"} type="button" onClick={logout} disabled={pending} aria-label="Keluar">{compact ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></svg> : pending ? "Keluar…" : "Keluar"}</button>;
}
