# Arsiva-LM Web Gateway

Gerbang autentikasi untuk Arsiva-LM yang berjalan di Vercel dan memakai Google Identity Platform/Firebase Authentication. Pengguna masuk dengan **username + password**, tetapi password tidak pernah disimpan di Spreadsheet atau Apps Script.

> Untuk setup end-to-end Google Cloud, Apps Script, Google Sheets, GitHub, Vercel, Shared Drive, dan custom domain, ikuti [README utama](../../README.md). Dokumen ini hanya merinci komponen `apps/web`.

## Arsitektur autentikasi

1. Username dinormalisasi dan dipetakan secara internal ke alamat teknis Firebase, misalnya `budi@users.arsiva.internal`.
2. Password diverifikasi oleh Google Identity Platform melalui server Vercel.
3. Setelah berhasil, server membuat session cookie `HttpOnly`, `SameSite=Lax`, dan `Secure` di production.
4. Peran dan status wajib ganti password disimpan sebagai Firebase custom claims.
5. Spreadsheet tetap menjadi sumber data profil, unit/divisi, dan cakupan arsip; tidak menyimpan password maupun hash password.

## Fitur tersedia

- Login username/password dengan pesan error aman.
- Pembatasan percobaan login dasar di sisi server.
- Password sementara wajib diganti saat login pertama.
- Ganti password dengan verifikasi password saat ini.
- Super Admin dapat membuat akun dan menetapkan peran.
- Super Admin dapat mereset password pengguna dan mencabut semua sesi aktif.
- Logo resmi LM FEB UI, favicon LM, font Aptos, dan tone warna selaras dengan Arsiva-LM.

## Prasyarat

- Node.js 22 atau lebih baru;
- Google Cloud project dengan Identity Platform aktif;
- provider Email/Password aktif;
- Web API Key project;
- service account yang boleh mengelola user Identity Platform.

## 1. Aktifkan Google Identity Platform

1. Buka Google Cloud Console pada project yang dipakai Arsiva-LM.
2. Masuk ke **Identity Platform** lalu aktifkan layanan.
3. Buka **Providers** dan aktifkan provider **Email/Password**.
4. Di **APIs & Services → Credentials**, salin Web API Key untuk `FIREBASE_WEB_API_KEY`.
5. Buat service account khusus backend dan beri hak minimum untuk mengelola Firebase Authentication.
6. Buat JSON key service account. Nilainya dipasang sebagai environment variable Vercel, bukan disimpan di Git.

> Alamat email teknis tidak digunakan untuk korespondensi. Pengguna tetap hanya melihat dan memasukkan username.

## 2. Konfigurasi lokal

Salin `.env.example` menjadi `.env.local`, lalu isi semua nilai Firebase. Jangan commit `.env.local`.

```powershell
cd apps/web
Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
npm install
npm run lint
npm run build
npm run dev
```

Aplikasi lokal tersedia di `http://localhost:3000`. Halaman login dapat terlihat tanpa credential, tetapi proses login baru berhasil setelah seluruh `FIREBASE_*` benar.

### Pemetaan JSON service account

| Field JSON | Variable |
|---|---|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

Pertahankan newline private key sebagai newline asli atau literal `\n`.

## 3. Buat Super Admin pertama

Isi sementara variabel berikut di `.env.local`:

- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_NAME`

Kemudian jalankan:

```powershell
npm run bootstrap:admin
```

Script tersebut otomatis membaca `.env.local` melalui opsi Node.js `--env-file`. Jalankan perintah dari folder `apps/web`.

Setelah berhasil:

1. Hapus `BOOTSTRAP_ADMIN_PASSWORD` dari `.env.local` dan environment terminal.
2. Login memakai username bootstrap.
3. Ganti password sementara saat diminta.
4. Buat akun lain melalui menu **Pengguna**.

Script bootstrap boleh dijalankan ulang untuk memulihkan akun Super Admin, tetapi jangan dijadikan endpoint web.

## 4. Environment Vercel

Tambahkan semua variabel berikut di Project Settings → Environment Variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_WEB_API_KEY`
- `AUTH_USERNAME_DOMAIN`
- `SESSION_COOKIE_NAME`
- `SESSION_MAX_AGE_SECONDS`

Variabel `BOOTSTRAP_*` tidak perlu dipasang di Vercel. Set root directory project Vercel ke `apps/web`, Framework Preset ke Next.js, dan Node.js ke versi 22 atau lebih baru.

Gunakan nilai `AUTH_USERNAME_DOMAIN` yang sama pada local, Preview, dan Production. Mengubahnya setelah akun dibuat akan mengubah email teknis hasil pemetaan username.

## 5. Aturan akun

- Username: 3–40 karakter, huruf kecil, angka, titik, garis bawah, atau tanda hubung.
- Password: 12–128 karakter, minimal satu huruf besar, huruf kecil, angka, dan simbol.
- Peran: `SUPER_ADMIN`, `ADMIN_DIVISION`, `VERIFIER`, atau `USER`.
- Reset password menghasilkan password sementara dan mencabut seluruh sesi pengguna.
- Super Admin tidak dapat mereset password akunnya sendiri dari tabel; gunakan menu **Ganti password**.

## Catatan production

Rate limiter saat ini bersifat per-instance dan cukup untuk pengembangan. Sebelum aplikasi dipakai luas, pindahkan rate limit ke Google Cloud Armor/API Gateway atau penyimpanan terdistribusi yang disetujui lembaga. Tahap integrasi berikutnya adalah pertukaran token server-to-server antara Vercel dan Apps Script agar halaman arsip lama memakai sesi yang sama.

Saat ini akun Identity Platform dan baris pada tab `Users` belum tersinkron otomatis. Jangan memakai gateway ini sebagai production penuh sebelum sinkronisasi user dan session bridge selesai.
