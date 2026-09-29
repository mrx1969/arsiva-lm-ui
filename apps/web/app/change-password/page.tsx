import Image from "next/image";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Ganti Password" };

export default async function ChangePasswordPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  return (
    <main className="password-page">
      <section className="password-card">
        <div className="password-brand"><Image src="/brand/lm-mark.png" width={44} height={44} alt="LM FEB UI" /><div><strong>Arsiva-LM</strong><span>Keamanan akun</span></div></div>
        <span className="eyebrow">{session.forcePasswordChange ? "Tindakan wajib" : "Pengaturan akun"}</span>
        <h1>{session.forcePasswordChange ? "Buat password baru" : "Ganti password"}</h1>
        <p>{session.forcePasswordChange ? "Password sementara hanya berlaku untuk login pertama. Buat password pribadi sebelum melanjutkan." : "Konfirmasi password saat ini, kemudian buat password baru untuk akun Anda."}</p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
