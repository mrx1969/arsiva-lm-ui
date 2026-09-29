import Image from "next/image";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

export default async function LoginPage() {
  const session = await readSession();
  if (session?.forcePasswordChange) redirect("/change-password");
  if (session) redirect("/dashboard");

  return (
    <main className="login-shell">
      <section className="login-brand" aria-label="Tentang Arsiva-LM">
        <div className="login-brand__top">
          <Image className="login-lockup" src="/brand/lm-lockup-white.png" width={500} height={107} priority alt="Universitas Indonesia dan Lembaga Management FEB UI" />
        </div>
        <div className="login-brand__copy">
          <span className="eyebrow eyebrow--light">Ruang kerja internal</span>
          <h1>Arsip yang tertata,<br />mudah ditemukan.</h1>
          <p>Kelola rekod, verifikasi dokumen, dan lacak lokasi fisik arsip dalam satu ruang kerja yang terkendali.</p>
        </div>
        <div className="login-brand__meta">
          <span>ARSIVA–LM</span>
          <span>AKSES TERBATAS</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-mobile-logo">
            <Image src="/brand/lm-mark.png" width={46} height={46} alt="LM FEB UI" />
            <div><strong>Arsiva-LM</strong><span>Kearsipan internal</span></div>
          </div>
          <div className="login-heading">
            <span className="eyebrow">Portal pengguna</span>
            <h2>Masuk ke ruang arsip</h2>
            <p>Gunakan akun yang dibuat oleh Super Admin.</p>
          </div>
          <LoginForm />
          <p className="login-help">Tidak dapat mengakses akun? Hubungi Super Admin untuk reset password.</p>
        </div>
        <footer className="login-footer"><span>© 2026 LM FEB UI</span><span>Sistem internal · Bukan untuk akses publik</span></footer>
      </section>
    </main>
  );
}
