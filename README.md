# Arsiva-LM

Arsiva-LM adalah aplikasi kearsipan internal LM FEB UI. Repository ini memuat dua aplikasi yang berbeda tetapi akan diintegrasikan:

- `apps/apps-script`: backend Google Apps Script, database Google Sheets, dan UI GAS v0.5.0;
- `apps/web`: gerbang login username/password berbasis Next.js, Google Identity Platform, dan Vercel.

Panduan ini menjelaskan setup dari komputer baru sampai deployment pengujian. Jalankan tahap secara berurutan dan jangan memasukkan credential ke GitHub.

## 0. Status dan batas implementasi saat ini

Sebelum setup, pahami status berikut:

| Komponen | Status |
|---|---|
| Schema dan setup Google Sheets | Siap |
| UI Apps Script: dashboard, arsip, verifikasi, master data, lokasi, boks, barcode | Siap diuji |
| Login username/password melalui Identity Platform | Siap dikonfigurasi |
| Super Admin membuat akun dan reset password | Siap pada `apps/web` |
| Shell aplikasi Vercel: dashboard, arsip, verifikasi, lokasi, divisi, unit, pengaturan | Siap sebagai halaman awal |
| Upload file langsung ke Shared Drive | Belum diimplementasikan |
| Sinkronisasi akun Identity Platform ke tab `Users` | Belum diimplementasikan |
| Data Vercel tersambung ke Spreadsheet/GAS | Belum diimplementasikan |
| Custom domain Vercel | Bisa dipasang setelah login berhasil |

Artinya, saat ini ada dua jalur pengujian:

1. **UI GAS** memakai identitas Google Workspace dan deployment Apps Script.
2. **Aplikasi Vercel** memakai username/password, sidebar aplikasi internal, dan halaman operasional awal.

Keduanya belum menjadi satu aplikasi production penuh. Jangan menganggap halaman Vercel sudah membaca data GAS sebelum session bridge/API selesai dibuat.

## 1. Arsitektur target

```text
Pengguna
   │
   ▼
Custom domain → Vercel / Next.js
   │              ├── login username/password
   │              ├── session cookie HttpOnly
   │              └── pemeriksaan role
   │
   ├── Google Identity Platform
   │      └── password dan akun autentikasi
   │
   └── API internal / Google Apps Script
          ├── Google Sheets: metadata arsip
          ├── Shared Drive: file arsip
          ├── CacheService
          ├── LockService
          └── audit log dan notifikasi
```

Password tidak disimpan di Spreadsheet. Spreadsheet hanya menyimpan profil, role, cakupan akses, metadata arsip, dan audit.

## 2. Struktur repository

```text
.
├── apps/
│   ├── apps-script/
│   │   ├── src/                 # source .gs, .html, dan manifest GAS
│   │   ├── .clasp.json.example
│   │   └── README.md
│   └── web/
│       ├── app/                 # halaman dan API Route Next.js
│       ├── components/
│       ├── lib/
│       ├── public/brand/
│       ├── scripts/
│       ├── .env.example
│       └── README.md
├── assets/brand/                # master logo LM
├── API.md
├── DATABASE.md
├── design.md
├── features.md
└── PRD.md
```

## 3. Lembar data konfigurasi

Catat nilai berikut di password manager atau dokumen administrator terbatas. Jangan menaruh nilainya di README, chat, issue GitHub, atau Spreadsheet aplikasi.

| Nilai | Sumber | Contoh aman |
|---|---|---|
| Google Cloud Project ID | Google Cloud Console | `arsiva-lm-prod` |
| Firebase/Identity Platform Web API Key | APIs & Services → Credentials | `AIza...` |
| Service Account Email | JSON service account | `firebase-adminsdk-...@...iam.gserviceaccount.com` |
| Service Account Private Key | JSON service account | `-----BEGIN PRIVATE KEY-----...` |
| Apps Script Script ID | Apps Script → Project Settings | ID panjang |
| Apps Script Deployment ID | Deploy → Manage deployments | ID deployment |
| Spreadsheet ID | URL Google Sheets | bagian antara `/d/` dan `/edit` |
| Shared Drive root folder ID | URL folder Drive | bagian setelah `/folders/` |
| Domain Workspace | Admin Google Workspace | `contoh.co.id` |
| Domain aplikasi | DNS/Vercel | `arsip.contoh.co.id` |

## 4. Prasyarat

Siapkan:

1. Akun Google Workspace lembaga dengan izin membuat Apps Script, Spreadsheet, dan Shared Drive.
2. Akses administrator atau developer pada satu Google Cloud project.
3. Repository GitHub privat.
4. Akun/team Vercel.
5. Node.js **22 atau lebih baru**. Firebase Admin SDK yang digunakan project ini memerlukan Node.js 22+.
6. Git.
7. `clasp` untuk sinkronisasi Apps Script.

Periksa versi:

```powershell
node --version
npm --version
git --version
```

Instal `clasp`:

```powershell
npm install --global @google/clasp
clasp login
```

Aktifkan Apps Script API pada [Apps Script User Settings](https://script.google.com/home/usersettings). Dokumentasi resmi `clasp` tersedia di [Google Apps Script CLI](https://developers.google.com/apps-script/guides/clasp).

## 5. Setup source code lokal

Jika repository belum ada di komputer:

```powershell
git clone URL_REPOSITORY_GITHUB
cd "Apps Kearsipan LM"
```

Periksa status agar tidak menimpa perubahan lokal:

```powershell
git status
```

Instal dan verifikasi aplikasi web:

```powershell
cd apps/web
npm install
npm run lint
npm run build
```

Hasil yang benar:

- TypeScript selesai tanpa error;
- Next.js menampilkan `Compiled successfully`;
- route `/login`, `/dashboard`, `/change-password`, dan `/admin/users` terdaftar.

Kembali ke root repository bila diperlukan:

```powershell
cd ../..
```

## 6. Setup Google Cloud dan Identity Platform

Gunakan satu Google Cloud project khusus untuk Arsiva-LM agar IAM, billing, audit, dan API tidak bercampur dengan aplikasi lain.

### 6.1 Pilih atau buat Google Cloud project

Status repository saat ini (29 September 2026):

- Firebase project sudah dibuat dengan Project ID `arsiva-lm-2026` dan nama **Arsiva-LM 2026**.
- Alias project disimpan di `.firebaserc`.
- Konfigurasi Auth yang dapat diulang disimpan di `firebase.json`.
- Email/Password aktif, sedangkan anonymous sign-in nonaktif.
- Firebase Web App `Default Web App` sudah tersedia.

Untuk memeriksa koneksi dari root repository:

```powershell
$env:npm_config_cache = "$env:TEMP\codex-firebase-cli-cache"
npx -y firebase-tools@latest login:list
npx -y firebase-tools@latest use
```

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Pilih project yang akan dipakai atau klik **New Project**.
3. Catat **Project ID**, bukan hanya Project Name.
4. Pastikan billing dan kebijakan organisasi telah sesuai ketentuan lembaga.

### 6.2 Aktifkan Identity Platform

1. Di Google Cloud Console, cari **Identity Platform**.
2. Klik **Enable Identity Platform** atau **Get started**.
3. Buka **Providers**.
4. Pilih **Email/Password**.
5. Aktifkan **Email/Password**, lalu simpan.
6. Jangan aktifkan anonymous sign-in.

Referensi: [Google Identity Platform](https://cloud.google.com/identity-platform/docs).

### 6.3 Ambil Web API Key

1. Buka **APIs & Services → Credentials**.
2. Cari API key yang terkait project Firebase/Identity Platform, atau buat API key baru.
3. Salin nilainya sebagai `FIREBASE_WEB_API_KEY`.
4. Batasi API key ke API yang diperlukan, terutama **Identity Toolkit API**.
5. Jangan memakai pembatasan IP statis jika request berasal dari Vercel tanpa static egress IP.

API key mengidentifikasi project pada proses `signInWithPassword`. Credential administrator tetap menggunakan service account dan harus dijaga sebagai rahasia.

### 6.4 Buat service account backend

Pilihan yang paling mudah:

1. Buka [Firebase Console](https://console.firebase.google.com/) dan tambahkan Firebase ke Google Cloud project yang sama bila belum tersedia.
2. Buka **Project settings → Service accounts**.
3. Pilih **Firebase Admin SDK**.
4. Klik **Generate new private key**.
5. Simpan JSON di lokasi aman di luar repository.

Alternatif melalui IAM:

1. Buka **IAM & Admin → Service Accounts**.
2. Buat service account khusus, misalnya `arsiva-auth-admin`.
3. Berikan role minimum yang memungkinkan create/read/update user dan session Identity Platform. Untuk tahap awal, role **Identity Toolkit Admin** menyediakan permission tersebut; evaluasi kembali dengan administrator IAM sebelum production.
4. Buat JSON key hanya jika deployment non-Google memang memerlukannya.

Referensi: [Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup) dan [Identity Toolkit IAM roles](https://cloud.google.com/iam/docs/roles-permissions/identitytoolkit).

### 6.5 Petakan JSON service account ke environment variable

Dari file JSON:

| Field JSON | Environment variable |
|---|---|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

Jangan mengganti `\n` pada private key dengan spasi. Aplikasi menerima private key dengan newline asli atau literal `\n`.

## 7. Konfigurasi login lokal

Masuk ke folder web:

```powershell
cd apps/web
Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
```

Isi `.env.local`:

```dotenv
FIREBASE_PROJECT_ID=arsiva-lm-2026
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@arsiva-lm-2026.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nISI_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_WEB_API_KEY=AIza...

AUTH_USERNAME_DOMAIN=users.arsiva.internal
SESSION_COOKIE_NAME=arsiva_session
SESSION_MAX_AGE_SECONDS=28800

BOOTSTRAP_ADMIN_USERNAME=superadmin
BOOTSTRAP_ADMIN_PASSWORD=Ganti-Sementara-123!
BOOTSTRAP_ADMIN_NAME=Super Admin
```

Catatan penting:

- `AUTH_USERNAME_DOMAIN` adalah domain teknis untuk pemetaan username ke Identity Platform; pengguna tidak melihatnya.
- Jangan mengubah `AUTH_USERNAME_DOMAIN` setelah akun mulai dibuat karena akun lama tidak akan ditemukan dengan pemetaan baru.
- `SESSION_MAX_AGE_SECONDS=28800` berarti sesi maksimum 8 jam.
- `.env.local` sudah diabaikan Git dan tidak boleh di-commit.

## 8. Membuat Super Admin pertama

Pastikan `.env.local` lengkap, lalu jalankan:

```powershell
npm run bootstrap:admin
```

Perintah tersebut otomatis membaca `apps/web/.env.local`.

Hasil yang diharapkan:

```text
Super Admin 'superadmin' siap. Hapus BOOTSTRAP_ADMIN_PASSWORD dari environment, lalu login dan ganti password.
```

Setelah berhasil:

1. Hapus nilai `BOOTSTRAP_ADMIN_PASSWORD` dari `.env.local` atau ganti dengan placeholder kosong.
2. Jalankan aplikasi:

   ```powershell
   npm run dev
   ```

3. Buka `http://localhost:3000/login`.
4. Login memakai username bootstrap dan password sementara.
5. Sistem harus mengarahkan ke halaman **Buat password baru**.
6. Buat password permanen.
7. Login kembali.
8. Buka menu **Pengguna**.
9. Buat satu akun pengujian role `USER`.
10. Pastikan akun baru juga wajib mengganti password pada login pertama.

Aturan password:

- 12–128 karakter;
- memiliki huruf besar;
- memiliki huruf kecil;
- memiliki angka;
- memiliki simbol.

Role canonical yang digunakan aplikasi:

| Role | Label UI | Kegunaan |
|---|---|---|
| `SUPER_ADMIN` | Super Admin | Seluruh konfigurasi dan pengguna |
| `ADMIN_DIVISION` | Admin Divisi | Pengelolaan arsip sesuai cakupan divisi |
| `VERIFIER` | Petugas Verifikasi | Memeriksa arsip yang diajukan |
| `USER` | Pengguna | Membuat dan melihat arsip sesuai cakupan |

## 9. Setup Google Apps Script

### 9.1 Buat atau hubungkan project GAS

Project saat ini sudah ditentukan dengan Script ID
`1Pvtz46hnqTo39bz5NloaCwDloIxxqStJscO4JBsk4hAKp_3h9CtritfJ`.
Konfigurasi lokal telah disiapkan di `apps/apps-script/.clasp.json` dengan
`rootDir: "src"`. Jalankan clasp dari folder `apps/apps-script`.
Jika Google meminta autentikasi ulang (`invalid_rapt`), jalankan `clasp login`
dan pilih akun pemilik/editor project di browser.
Lihat [panduan koneksi dan status deployment GAS](apps/apps-script/README.md#koneksi-project-dan-proses-deployment)
untuk urutan backup, push, setup database, dan koneksi Vercel. Perlu diperhatikan:
deployment `USER_ACCESSING` / `DOMAIN` di bawah adalah untuk UI GAS pengujian;
server Vercel memerlukan pengaturan akses API yang berbeda.

Jika membuat project baru:

```powershell
cd apps/apps-script
clasp create --type standalone --title "Arsiva-LM" --rootDir src
```

Jika project sudah dibuat di browser:

1. Buka Apps Script.
2. Buka **Project Settings**.
3. Salin **Script ID**.
4. Salin file contoh:

   ```powershell
   Copy-Item -LiteralPath '.clasp.json.example' -Destination '.clasp.json'
   ```

5. Edit `.clasp.json`:

   ```json
   {
     "scriptId": "SCRIPT_ID_ANDA",
     "rootDir": "src"
   }
   ```

6. Jangan commit `.clasp.json`.

### 9.2 Push source GAS

```powershell
clasp push
clasp open-script
```

Jika `clasp push` menolak perubahan manifest, pastikan Apps Script API telah aktif dan akun `clasp login` memiliki akses editor ke project.

### 9.3 Isi Script Properties

Sesudah `setupProject` berhasil, ikuti [aktivasi API Vercel](apps/apps-script/README.md#aktivasi-api-setelah-setup-database).
Source sudah menyediakan `prepareVercelBridge` untuk menyiapkan secret dan
mode `API_ONLY`. Deployment UI domain pada bagian 9.6 tidak dapat menerima
request server Vercel tanpa sesi Google; gunakan deployment API sebagaimana
diuraikan pada panduan tersebut. Status di menu Pengaturan memeriksa koneksi
nyata melalui `system.health`, bukan sekadar keberadaan environment.

Di Apps Script buka **Project Settings → Script Properties**, lalu buat:

| Property | Wajib sekarang | Nilai |
|---|:---:|---|
| `ADMIN_EMAIL` | Ya | Email Google Workspace Super Admin GAS |
| `ALLOWED_GOOGLE_DOMAINS` | Ya | Domain tanpa `@`; pisahkan koma jika lebih dari satu |
| `APP_ENV` | Disarankan | `development`, `staging`, atau `production` |
| `SPREADSHEET_ID` | Opsional | Kosongkan agar `setupProject()` membuat database baru |
| `SHARED_DRIVE_ROOT_FOLDER_ID` | Nanti | Folder induk Shared Drive untuk upload production |

Contoh:

```text
ADMIN_EMAIL=admin@lembaga.co.id
ALLOWED_GOOGLE_DOMAINS=lembaga.co.id
APP_ENV=development
```

`ADMIN_EMAIL` adalah email Google Workspace untuk UI GAS. Ini berbeda dari username `superadmin` pada Identity Platform.

### 9.4 Jalankan setup database

1. Di editor Apps Script pilih fungsi `setupProject`.
2. Klik **Run**.
3. Setujui OAuth scopes Spreadsheet, Drive, email pengguna, dan layanan lain yang tercantum pada consent screen.
4. Buka **Executions** dan pastikan status **Completed**.
5. Lihat return value/log untuk memperoleh Spreadsheet ID dan URL.
6. Script otomatis menyimpan `SPREADSHEET_ID` ke Script Properties jika sebelumnya kosong.
7. Buka Spreadsheet dan pastikan tab berikut tersedia:

   - `Settings`, `Users`, `Divisions`, `Units`, `Categories`;
   - `Archives`, `FileUploads`, `Submissions`, `ApprovalTasks`;
   - `Notifications`, `AuditLogs`, `SearchIndex`;
   - `StorageLocations`, `StorageBoxes`, `ArchivePlacements`, `PhysicalMovements`;
   - tab pendukung lain sesuai [DATABASE.md](./DATABASE.md).

8. Pastikan tab `Settings` memiliki `SCHEMA_VERSION` bernilai `3`.
9. Pastikan tab `Users` memiliki satu baris `SUPER_ADMIN` dengan email `ADMIN_EMAIL`.

`setupProject()` aman dijalankan ulang. Fungsi tidak menghapus data yang sudah ada, tetapi akan berhenti bila header tab berbeda dari schema agar data tidak tertimpa.

### 9.5 Atur akses Spreadsheet

Untuk pengujian UI GAS saat deployment memakai **Execute as user accessing the web app**, setiap pengguna membutuhkan izin yang cukup terhadap resource yang dibacanya. Ini bertentangan dengan target akhir bahwa Spreadsheet hanya dapat dibuka Super Admin.

Gunakan aturan berikut:

- **Development GAS langsung**: batasi hanya beberapa akun penguji yang memang diberi akses resource.
- **Production Vercel**: Spreadsheet tetap privat untuk administrator/service identity; browser tidak mengakses Sheet langsung.

Jangan membuka Spreadsheet dengan opsi “Anyone with the link”.

### 9.6 Deploy Web App GAS untuk pengujian

1. Klik **Deploy → New deployment**.
2. Pilih **Web app**.
3. Description: `Arsiva-LM v0.5.0 test`.
4. Execute as: **User accessing the web app**.
5. Who has access: domain Google Workspace lembaga.
6. Klik **Deploy**.
7. Salin URL `/exec` dan Deployment ID.
8. Buka URL menggunakan akun yang tercatat pada tab `Users`.

Konfigurasi ini sesuai manifest `appsscript.json`. Pilihan execute-as memengaruhi permission resource; lihat [dokumentasi Web Apps Apps Script](https://developers.google.com/apps-script/guides/web).

### 9.7 Update deployment GAS

Setelah perubahan source:

```powershell
cd apps/apps-script
clasp push
clasp version "Deskripsi perubahan"
clasp deployments
```

Kemudian pilih salah satu:

- Apps Script UI: **Deploy → Manage deployments → Edit → pilih versi baru**; atau
- CLI: `clasp redeploy DEPLOYMENT_ID VERSION "Deskripsi"`.

Perbarui deployment yang sama agar URL `/exec` tetap stabil.

## 10. Siapkan Shared Drive

Tahap ini boleh dipersiapkan sekarang walaupun upload resumable belum diimplementasikan.

1. Buat Shared Drive khusus, misalnya **Arsiva-LM Production**.
2. Buat folder induk **ARSIVA_FILES**.
3. Salin folder ID dari URL Drive.
4. Isi `SHARED_DRIVE_ROOT_FOLDER_ID` pada Apps Script Properties bila sudah siap.
5. Aktifkan **Google Drive API** pada Google Cloud project.
6. Tambahkan service account yang akan mengunggah file sebagai anggota Shared Drive dengan izin minimum yang cukup.
7. Jangan memakai My Drive pribadi sebagai penyimpanan production.

Upload file 50 MB nantinya memakai alur browser → Vercel → resumable upload Google Drive. File tidak dikirim sebagai base64 melalui Apps Script.

## 11. Push ke GitHub

Dari root repository:

```powershell
git status
git add .
git status
git commit -m "docs: add complete Arsiva-LM setup guide"
git push origin NAMA_BRANCH
```

Sebelum commit, pastikan item berikut **tidak** muncul sebagai staged file:

- `apps/web/.env.local`;
- `apps/apps-script/.clasp.json`;
- `.clasprc.json`;
- file JSON service account;
- private key;
- deployment secret;
- resumable upload URL;
- folder `.vercel`, `.next`, dan `node_modules`.

Periksa cepat:

```powershell
git diff --cached --name-only
```

## 12. Deploy aplikasi login ke Vercel

### 12.1 Import repository

Koneksi yang sudah diverifikasi:

- GitHub repository: `mrx1969/arsiva-lm-ui` pada branch `main`.
- Akun connector GitHub memiliki akses push.
- Team Vercel: `lmfebuisalemba02-1045`.
- Project Vercel belum dibuat; buat saat import repository di bawah ini.

1. Buka Vercel Dashboard.
2. Klik **Add New → Project**.
3. Import repository GitHub Arsiva-LM.
4. Pada **Root Directory**, klik **Edit** dan pilih `apps/web`.
5. Framework Preset harus terdeteksi sebagai **Next.js**.
6. Node.js version gunakan **22.x** atau versi kompatibel yang lebih baru.

Panduan monorepo Vercel: [Using Monorepos](https://vercel.com/docs/monorepos).

### 12.2 Tambahkan Environment Variables

Buka **Project Settings → Environment Variables** dan tambahkan:

| Variable | Production | Preview | Development |
|---|:---:|:---:|:---:|
| `FIREBASE_PROJECT_ID` | Ya | Ya | Opsional |
| `FIREBASE_CLIENT_EMAIL` | Ya | Ya | Opsional |
| `FIREBASE_PRIVATE_KEY` | Ya | Ya | Opsional |
| `FIREBASE_WEB_API_KEY` | Ya | Ya | Opsional |
| `AUTH_USERNAME_DOMAIN` | Ya | Ya | Opsional |
| `SESSION_COOKIE_NAME` | Ya | Ya | Opsional |
| `SESSION_MAX_AGE_SECONDS` | Ya | Ya | Opsional |
| `APPS_SCRIPT_API_URL` | Ya, setelah GAS deploy | Ya | Opsional |
| `APPS_SCRIPT_SHARED_SECRET` | Ya, setelah GAS deploy | Ya | Opsional |

Rekomendasi nilai non-secret:

```text
AUTH_USERNAME_DOMAIN=users.arsiva.internal
SESSION_COOKIE_NAME=arsiva_session
SESSION_MAX_AGE_SECONDS=28800
```

Jangan menambahkan `BOOTSTRAP_ADMIN_PASSWORD` ke Vercel. Bootstrap dilakukan lokal, sekali, melalui workstation administrator.

Untuk `FIREBASE_PRIVATE_KEY`, tempel seluruh private key termasuk header dan footer. Jika memakai satu baris, pertahankan literal `\n`.

Untuk bridge data Arsiva-LM, isi:

```text
APPS_SCRIPT_API_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
APPS_SCRIPT_SHARED_SECRET=secret-panjang-yang-sama-dengan-script-properties
```

`APPS_SCRIPT_SHARED_SECRET` juga wajib disimpan pada Apps Script **Project Settings → Script Properties** dengan nama yang sama. Gunakan nilai acak panjang, simpan di password manager, dan jangan commit ke GitHub.

### 12.3 Deploy dan verifikasi

1. Klik **Deploy**.
2. Tunggu build selesai.
3. Buka URL `*.vercel.app/login`.
4. Login menggunakan akun Super Admin yang sudah dibuat.
5. Pastikan pengguna diarahkan ke `/dashboard`.
6. Buka `/admin/users` dan buat satu akun uji.
7. Logout dan login memakai akun uji.
8. Pastikan password sementara wajib diganti.
9. Uji reset password dari akun Super Admin.
10. Periksa Vercel Logs dan pastikan private key/password tidak tercetak.

Vercel membuat preview deployment untuk branch/PR dan production deployment untuk production branch. Lihat [Vercel Git deployments](https://vercel.com/docs/git).

## 13. Pasang custom domain

Disarankan menggunakan subdomain seperti `arsip.domainlembaga.id` agar tidak mengganggu website utama.

1. Di Vercel buka **Project → Settings → Domains**.
2. Tambahkan `arsip.domainlembaga.id`.
3. Vercel akan memberikan DNS record yang harus dibuat.
4. Jika DNS dikelola provider lain, buka pengelola DNS tersebut.
5. Untuk subdomain, biasanya tambahkan CNAME sesuai nilai yang diberikan Vercel.
6. Jangan menebak record; gunakan nilai yang tampil pada halaman domain project.
7. Tunggu status berubah menjadi **Valid Configuration**.
8. Pastikan sertifikat SSL telah aktif.
9. Buka `https://arsip.domainlembaga.id/login`.
10. Lakukan kembali pengujian login, logout, ganti password, dan reset password.

Referensi: [Vercel custom domain setup](https://vercel.com/docs/domains/set-up-custom-domain).

## 14. Checklist pengujian

### Login dan session

- [ ] Username valid dapat login.
- [ ] Password salah tidak menyebutkan apakah username terdaftar.
- [ ] Akun dengan password sementara diarahkan ke ganti password.
- [ ] Logout menghapus session.
- [ ] Session kadaluarsa meminta login ulang.
- [ ] Halaman `/admin/users` tidak dapat dibuka role non-admin.

### Super Admin

- [ ] Dapat membuat `USER`.
- [ ] Dapat membuat `VERIFIER`.
- [ ] Dapat membuat `ADMIN_DIVISION`.
- [ ] Dapat mereset password pengguna lain.
- [ ] Reset password mencabut session lama.
- [ ] Tidak dapat melihat password permanen pengguna.

### Apps Script dan Sheet

- [ ] `setupProject()` selesai tanpa error.
- [ ] `SCHEMA_VERSION=3`.
- [ ] Dashboard memuat skeleton lalu data.
- [ ] Menu Dashboard, Arsip, dan Verifikasi membuka view sendiri.
- [ ] Master Divisi dan Unit independen.
- [ ] Lokasi dan boks dapat dibuat.
- [ ] Barcode Code 128 dapat dicetak.
- [ ] Mutasi admin tercatat di `AuditLogs`.

### Responsif dan brand

- [ ] Logo tampil di login, sidebar, dan favicon.
- [ ] Font Aptos digunakan bila tersedia.
- [ ] Sidebar desktop dan drawer/mobile tidak menyebabkan scroll halaman yang salah.
- [ ] Form dapat digunakan dengan keyboard.
- [ ] Error dan loading state terlihat jelas.

## 15. Troubleshooting

### `Konfigurasi FIREBASE_* belum diisi`

- Pastikan file bernama tepat `.env.local` dan berada di `apps/web`.
- Pastikan tidak ada spasi sebelum nama variable.
- Restart `npm run dev` setelah mengubah environment variable.

### `DECODER routines::unsupported` atau private key invalid

- Pastikan header/footer private key lengkap.
- Jangan menghapus `-----BEGIN PRIVATE KEY-----` dan `-----END PRIVATE KEY-----`.
- Gunakan newline asli atau literal `\n`, bukan spasi.
- Pastikan key berasal dari project yang sama dengan `FIREBASE_PROJECT_ID`.

### Login selalu “Username atau password tidak sesuai”

- Pastikan provider Email/Password telah aktif.
- Pastikan `FIREBASE_WEB_API_KEY` berasal dari project yang sama.
- Pastikan `AUTH_USERNAME_DOMAIN` sama dengan saat akun dibuat.
- Periksa user pada Identity Platform/Firebase Authentication.
- Jika akun bootstrap dibuat ulang, gunakan password sementara terbaru.

### `npm run bootstrap:admin` tidak membaca environment

- Jalankan dari folder `apps/web`.
- Pastikan Node.js 22+ mendukung `--env-file`.
- Pastikan `.env.local` tersedia.

### Apps Script menampilkan `CONFIG_MISSING`

- Buka **Project Settings → Script Properties**.
- Pastikan `ADMIN_EMAIL` dan `ALLOWED_GOOGLE_DOMAINS` tersedia.
- Jalankan kembali `setupProject()`.

### Apps Script menampilkan `SCHEMA_MISMATCH`

- Jangan menghapus atau mengganti header secara manual.
- Bandingkan header dengan [DATABASE.md](./DATABASE.md).
- Buat backup Spreadsheet sebelum koreksi.
- Jangan menjalankan script yang mengosongkan tab production.

### Pengguna GAS tidak dapat membaca Spreadsheet/Drive

Deployment test saat ini berjalan sebagai user yang mengakses. Berikan akses hanya kepada akun penguji, atau tunggu integrasi production Vercel/server identity. Jangan membuka database ke publik.

### Build Vercel gagal

- Pastikan Root Directory adalah `apps/web`.
- Pastikan Node.js 22+.
- Pastikan seluruh environment variable tersedia pada environment target.
- Jalankan `npm run lint` dan `npm run build` secara lokal.

### Custom domain belum aktif

- Buka status domain pada Vercel.
- Bandingkan record DNS dengan nilai yang diminta Vercel.
- Hapus record CNAME/A lama yang konflik hanya setelah targetnya dipastikan.
- Tunggu propagasi DNS dan periksa ulang SSL.

## 16. Prosedur rilis rutin

### Perubahan Apps Script

```powershell
cd apps/apps-script
clasp push
clasp version "Ringkasan perubahan"
clasp deployments
```

Update deployment yang sama, uji URL `/exec`, lalu commit ke GitHub.

### Perubahan aplikasi Vercel

```powershell
cd apps/web
npm install
npm run lint
npm run build
cd ../..
git status
git add .
git commit -m "feat: ringkasan perubahan"
git push origin NAMA_BRANCH
```

Uji Preview Deployment sebelum merge ke production branch.

## 17. Aturan keamanan wajib

- Jangan menyimpan password atau hash password di Spreadsheet.
- Jangan mengirim private key melalui email/chat biasa.
- Jangan commit `.env.local`, `.clasp.json`, service-account JSON, atau `.vercel`.
- Super Admin mereset password; Super Admin tidak membaca password permanen pengguna.
- Gunakan password sementara hanya sekali dan wajibkan penggantian pada login pertama.
- Review anggota Shared Drive dan IAM secara berkala.
- Rotasi service account key bila dicurigai bocor.
- Gunakan repository GitHub privat.
- Gunakan akun administrator terpisah dari akun operasional harian bila kebijakan lembaga memungkinkan.
- Backup Spreadsheet sebelum migrasi schema atau perubahan besar.

## 18. Langkah pengembangan berikutnya

Urutan yang disarankan setelah semua setup di atas lulus:

1. Buat API/session bridge Vercel ↔ GAS.
2. Sambungkan dashboard, arsip, verifikasi, lokasi, divisi, dan unit Vercel ke Spreadsheet.
3. Buat sinkronisasi akun Identity Platform ↔ tab `Users` berdasarkan Firebase UID.
4. Implementasikan resumable upload ke Shared Drive.
5. Aktifkan mutasi workflow Draft → Menunggu Verifikasi → Tersimpan.
6. Implementasikan penempatan/pemindahan arsip fisik.
7. Tambahkan distributed rate limiting untuk production.
8. Tambahkan staging, automated tests, monitoring, dan backup terjadwal.

## Dokumen acuan

- [Panduan khusus Web/Login](./apps/web/README.md)
- [Panduan khusus Apps Script](./apps/apps-script/README.md)
- [Product Requirement Document](./PRD.md)
- [Daftar fitur](./features.md)
- [Panduan desain](./design.md)
- [Data model](./DATABASE.md)
- [Kontrak API](./API.md)
