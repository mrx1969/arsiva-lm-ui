# Arsiva-LM

Arsiva-LM adalah aplikasi kearsipan internal berbasis Google Workspace. Tahap awal repository ini menyediakan Google Apps Script Web App yang dapat dijalankan langsung untuk memvalidasi struktur data, autentikasi domain, dashboard, dan pola Instant UX sebelum frontend Vercel dibangun.

## Arsitektur Target

```text
Pengguna kantor
  ├── Tahap awal: Apps Script HTMLService
  └── Production: Next.js pada Vercel + custom domain
                         │
                         ▼
                Google Apps Script
                  ├── Google Sheets (metadata)
                  ├── Google Shared Drive (file)
                  ├── CacheService
                  ├── LockService
                  └── MailApp / triggers
```

## Struktur Repository

```text
.
├── apps/
│   └── apps-script/
│       ├── src/                 # file yang dipush ke Apps Script
│       │   ├── *.gs             # backend/service/repository
│       │   ├── *.html           # HTMLService UI
│       │   └── appsscript.json
│       ├── .clasp.json.example
│       └── README.md
├── API.md
├── DATABASE.md
├── design.md
├── features.md
└── PRD.md
```

Frontend Vercel nantinya ditempatkan di `apps/web/`. Folder tersebut sengaja belum dibuat agar fase GAS dapat diverifikasi terlebih dahulu.

## Prasyarat

1. Akun Google Workspace kantor.
2. Izin membuat Apps Script, Google Sheets, dan folder/Shared Drive.
3. Node.js 20 atau lebih baru.
4. `clasp`:

   ```bash
   npm install --global @google/clasp
   clasp login
   ```

5. Aktifkan Apps Script API pada `https://script.google.com/home/usersettings`.

## Langkah 1 — Buat Project Apps Script

Pilihan A, buat project dari terminal:

```bash
cd apps/apps-script
clasp create --type standalone --title "Arsiva-LM" --rootDir src
```

Pilihan B, bila project sudah dibuat dari browser:

1. Salin Script ID dari **Project Settings**.
2. Salin `.clasp.json.example` menjadi `.clasp.json`.
3. Ganti `YOUR_APPS_SCRIPT_ID` dengan Script ID sebenarnya.

`.clasp.json` berisi identifier environment dan tidak boleh di-commit.

## Langkah 2 — Atur Script Properties

Di Apps Script buka **Project Settings → Script Properties**, lalu tambahkan:

| Property | Wajib | Nilai |
|:---|:---:|:---|
| `ADMIN_EMAIL` | Ya | Email Google Workspace Super Admin pertama |
| `SPREADSHEET_ID` | Tidak | Kosongkan agar `setupProject()` membuat spreadsheet baru |
| `SHARED_DRIVE_ROOT_FOLDER_ID` | Belum | Diisi pada fase upload Drive |
| `ALLOWED_GOOGLE_DOMAINS` | Ya | Domain dipisahkan koma, contoh `kantor.go.id` |
| `APP_ENV` | Tidak | `development`, `staging`, atau `production` |

Jangan menyimpan property rahasia di source code atau Google Sheets.

## Langkah 3 — Push Source

```bash
cd apps/apps-script
clasp push
```

Saat diminta membuat manifest, gunakan file `src/appsscript.json` dari repository.

## Langkah 4 — Inisialisasi Spreadsheet

1. Buka project: `clasp open-script`.
2. Pilih fungsi `setupProject`.
3. Klik **Run** dan selesaikan proses authorization.
4. Buka execution log. Hasil berisi Spreadsheet ID dan URL.
5. Pastikan seluruh tab pada `DATABASE.md` telah dibuat.

`setupProject()` aman dijalankan ulang: tab yang sudah valid tidak dihapus atau dikosongkan. Jika header production berbeda dari schema, setup berhenti agar data tidak tertimpa.

## Langkah 5 — Deploy Web App untuk Uji Internal

1. Klik **Deploy → New deployment → Web app**.
2. Untuk tahap HTMLService internal, pilih **Execute as: User accessing the web app**.
3. Batasi akses ke domain Google Workspace kantor.
4. Buka URL deployment menggunakan akun yang sama dengan `ADMIN_EMAIL`.

Dashboard harus menampilkan app shell/skeleton lebih dahulu, lalu memuat data melalui satu fungsi `getDashboardBootstrap()`.

## Langkah 6 — GitHub

```bash
git init
git add .
git commit -m "chore: scaffold Arsiva-LM GAS app"
```

Sebelum push, pastikan file berikut tidak masuk commit:

- `.clasp.json`
- `.clasprc.json`
- `.env*`
- service-account JSON
- token, deployment secret, atau resumable upload URL

## Langkah 7 — Vercel dan Custom Domain

Dilakukan setelah API GAS, autentikasi, serta alur arsip stabil:

1. Buat `apps/web` sebagai Next.js frontend/BFF.
2. Hubungkan repository GitHub ke Vercel.
3. Simpan Apps Script URL dan credential pada Vercel Environment Variables.
4. Buat Preview Deployment dari pull request.
5. Hubungkan custom domain pada Vercel Project Settings.

Detail protokol Vercel → Apps Script tersedia di `API.md`.

## Aturan Instant UX

Skill `gas-instant-ux` menjadi pedoman wajib:

- satu bootstrap request untuk data kritis;
- render app shell dan skeleton sebelum data tersedia;
- tidak ada `getValue()`/`setValue()` di dalam loop;
- setiap tab dibaca dalam batch dan dihitung di memory;
- master data memakai CacheService dengan versioned invalidation;
- daftar memakai pagination 20/50/100;
- pencarian menggunakan debounce 300 ms;
- write yang rawan bentrok memakai ScriptLock;
- duplicate submit dicegah di client dan server;
- approval, grant, upload, serta delete tidak menggunakan optimistic UI;
- secondary data dimuat secara lazy.

## Status Implementasi

- [x] Dokumen kebutuhan, desain, data model, dan API.
- [x] Scaffold Apps Script terpisah.
- [x] Setup otomatis tab Google Sheets.
- [x] Dashboard bootstrap, skeleton, statistik, task ringkas, dan arsip terbaru.
- [x] Pagination/search dasar yang mengikuti access scope.
- [ ] CRUD arsip dan resumable upload Google Drive.
- [ ] Workflow approval lengkap.
- [ ] Notifikasi email dan scheduled triggers.
- [ ] Vercel BFF, Google Identity Services, dan custom domain.
- [ ] Test otomatis, staging deployment, dan production hardening.

## Dokumen Acuan

- [PRD](./PRD.md)
- [Fitur](./features.md)
- [Desain](./design.md)
- [Data Model](./DATABASE.md)
- [API](./API.md)
- [Panduan Apps Script](./apps/apps-script/README.md)

