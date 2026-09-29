import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { UserManager } from "./user-manager";

export const metadata = { title: "Pengguna" };

export default async function UsersPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.forcePasswordChange) redirect("/change-password");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");
  return (
    <AppShell session={session} active="users">
      <div className="page-heading"><div><span className="eyebrow">Administrasi akses</span><h1>Pengguna</h1><p>Buat akun internal dan atur ulang akses tanpa melihat password pengguna.</p></div></div>
      <UserManager currentUid={session.uid} />
    </AppShell>
  );
}
