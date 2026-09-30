# Arsiva-LM Apps Script

Folder ini adalah project Google Apps Script terpisah. Semua file di `src/` dapat dipush menggunakan `clasp`.

## Koneksi project dan proses deployment

Project yang diberikan untuk Arsiva-LM:
`1Pvtz46hnqTo39bz5NloaCwDloIxxqStJscO4JBsk4hAKp_3h9CtritfJ`.

Jalankan perintah dari folder `apps/apps-script`. Konfigurasi lokal `.clasp.json`
di folder ini memakai `rootDir: "src"`. Jika menjalankan clasp dari dalam `src`,
konfigurasi di sana harus memakai `rootDir: "."`, agar tidak mencari `src/src`.
Kedua file konfigurasi lokal diabaikan Git dan tidak berisi password.

Urutan sinkronisasi:

1. Jalankan `clasp status` dan pastikan seluruh file `.gs`, `.html`, dan
   `appsscript.json` terdaftar. Saat diperiksa pada 30 September 2026, ada 19 file.
2. Jalankan `clasp deployments` untuk memeriksa akses dan deployment yang sudah ada.
3. Jika Google menampilkan `invalid_grant` / `invalid_rapt`, jalankan `clasp login`
   dan selesaikan autentikasi di browser dengan akun pemilik/editor project.
   Jangan mengirim token, password, atau file `.clasprc.json` ke chat/GitHub.
4. Sebelum push pertama dari checkout ini, simpan source remote menggunakan
   `clasp clone SCRIPT_ID --rootDir src` di folder backup terpisah yang masih kosong.
   Jangan menjalankan `clasp pull` ke folder sumber kerja karena dapat menimpa perubahan lokal.
5. Dari folder kerja `apps/apps-script`, jalankan `clasp push`.
6. Buka editor Apps Script, isi Script Properties yang diperlukan, lalu jalankan
   `setupProject`. Setujui izin Google yang diminta dan periksa tab spreadsheet.
7. Buat/perbarui deployment Web App dan salin URL `/exec`. Script ID di atas
   berbeda dari Deployment ID; jangan memakai Script ID untuk membuat URL API.
8. Isi `APPS_SCRIPT_API_URL` dan `APPS_SCRIPT_SHARED_SECRET` di Vercel, lalu redeploy.
   Nilai secret harus sama dengan Script Property GAS dan hanya digunakan di server.
9. Uji dashboard, daftar arsip, dan master data menggunakan akun aplikasi.

**Status 30 September 2026:** autentikasi clasp diperbarui, 19 file berhasil
dipush, dan deployment yang sudah ada berhasil diperbarui dari versi 8 ke
versi 9 (`ARSIVA LM - Vercel signed data bridge`). Pemeriksaan syntax seluruh
file GAS, JSON manifest, dan `git diff --check` berhasil.

Deployment ID:
`AKfycbxfi23I5Lf_kcBc_t_EBet-Pq4lFdI-7whytv-sExEUwCC6ZimRE2S9W9u8hp3ye23lng`.

URL Web App:
<https://script.google.com/macros/s/AKfycbxfi23I5Lf_kcBc_t_EBet-Pq4lFdI-7whytv-sExEUwCC6ZimRE2S9W9u8hp3ye23lng/exec>.

Backup source remote sebelum push disimpan di komputer ini pada
`C:/Users/Admin/AppData/Local/Temp/arsiva-gas-backup-35a9537d26bc4107b59c937db4fc3e4b/src`.
Folder Temp dapat dibersihkan Windows; versi 8 juga tetap tersedia pada project
sebagai versi sebelumnya untuk rollback deployment.

Percobaan `clasp run setupProject` mengembalikan error penyimpanan Google
`NOT_FOUND`, sehingga setup database belum terverifikasi pada langkah ini.
Jalankan `setupProject` melalui editor Apps Script, periksa hasilnya pada
Executions, dan pastikan `SPREADSHEET_ID` menunjuk spreadsheet yang dapat dibuka
akun pemilik. Error ini sendiri belum membuktikan spreadsheet hilang; mode
eksekusi API clasp juga perlu dikonfigurasi agar `clasp run` dapat digunakan.

Koneksi Vercel belum terverifikasi: secret di kedua sisi dan mode akses API
production masih perlu dikonfigurasi sesuai bagian berikut.

### Perbedaan deployment UI GAS dan API Vercel

Manifest saat ini menggunakan `USER_ACCESSING` dan `DOMAIN`, untuk pengujian
UI GAS dengan akun Workspace. Server Vercel tidak membawa sesi login Google
pengguna sehingga konfigurasi ini belum dapat digunakan sebagai API Vercel.

Untuk API production, dibutuhkan deployment yang berjalan sebagai pemilik script
dan dapat menerima request server tanpa sesi Google. Request `doPost` wajib tetap
diverifikasi dengan HMAC. Sebelum mengaktifkan akses tersebut, tutup akses UI GAS
dan fungsi setup/administrasi dari pengguna anonim; jangan hanya mengganti akses
deployment menjadi publik. Jika kebijakan Workspace tidak mengizinkan akses
tanpa sesi Google, integrasi harus disesuaikan dengan kebijakan tersebut.

Spreadsheet tetap privat. Akses endpoint API bukan izin membuka spreadsheet.

### Aktivasi API setelah setup database

1. Buka file `Setup.gs` di editor GAS. Pilih fungsi `prepareVercelBridge`, lalu
   jalankan sendiri sebagai pemilik/editor project. Fungsi ini tidak mengubah
   data arsip. Ia membuat `APPS_SCRIPT_SHARED_SECRET` bila belum ada dan mengisi
   `API_ONLY=true`. Secret yang sudah ada dipertahankan.
2. Buka Project Settings → Script Properties. Salin nilai
   `APPS_SCRIPT_SHARED_SECRET` secara privat ke environment **Production** project
   Vercel `arsiva-lm-ui` dengan nama yang sama. Jangan kirim nilainya ke chat,
   GitHub, screenshot, atau log. Jangan gunakan awalan `NEXT_PUBLIC_`.
3. Setelah mode API aktif, halaman GAS langsung tidak lagi menyajikan aplikasi
   HTML. `doGet` hanya memberi informasi layanan tanpa data arsip, dan fungsi
   RPC UI diblokir. Aplikasi pengguna tetap dibuka melalui Vercel.
4. Deploy Web App API sebagai **Me (pemilik deployment)** dengan akses **Anyone**
   (termasuk tanpa sesi Google), setelah menyetujui perubahan akses tersebut.
   Jika kebijakan Workspace melarang pilihan ini, jangan menggantinya dengan
   membuka akses Spreadsheet; laporkan kebijakan untuk menyesuaikan integrasi.
5. Salin URL `/exec` deployment API ke `APPS_SCRIPT_API_URL` di Production Vercel.
   Bila membuat deployment API baru, URL dapat berbeda dari deployment UI lama.
   Pastikan source API terbaru dipilih dan mode `API_ONLY=true` aktif sebelum
   membuka endpoint tanpa sesi Google.
6. Redeploy Vercel agar environment baru digunakan. Login sebagai Super Admin,
   lalu buka Pengaturan. Status **Spreadsheet terhubung; akses API aktif** hanya
   muncul bila request HMAC `system.health` berhasil, tab schema tersedia, dan
   mode API aktif. Keberadaan environment saja tidak dianggap sukses.
7. Uji Dashboard, Arsip, Divisi, Unit, dan Lokasi. Periksa data terhadap Spreadsheet.
   Penyimpanan/unggah/keputusan verifikasi belum otomatis aktif hanya karena
   pembacaan berhasil; action bridge tahap ini berfokus pada pembacaan.

`system.health` hanya melayani actor Super Admin dengan signature valid.
Request dibatasi timestamp ±5 menit. Pencatatan nonce memakai lock dan cache
10 menit untuk menolak replay selama masa valid request; CacheService bersifat
best effort sehingga mutasi masa depan tetap memerlukan idempotency persisten.
Cache dashboard 30 detik menyertakan identitas, role, dan cakupan divisi/unit.
Data master tetap dibaca secara batch, bukan per sel.

Pemeriksaan lokal:

```powershell
node --test apps/apps-script/tests/internal-api.test.cjs
cd apps/web
npm run lint
npm run build
```

Pada 30 September 2026, lima tes signature/replay/akses dan build Next.js lulus.
Setup database telah dilaporkan selesai oleh administrator; Script Properties
`SPREADSHEET_ID` tersedia. Aktivasi API dan environment Vercel masih harus
dikonfirmasi dengan tes koneksi setelah konfigurasinya diterapkan.

## Susunan File

```text
src/
├── appsscript.json
├── Config.gs
├── BrandAssets.gs
├── Code.gs
├── Setup.gs
├── Database.gs
├── AuthService.gs
├── CacheService.gs
├── DashboardService.gs
├── ArchiveService.gs
├── NotificationService.gs
├── AdminService.gs
├── AuditService.gs
├── Validation.gs
├── Utils.gs
├── index.html
├── styles.html
├── scripts.html
└── admin-scripts.html
```

## Entry Point

- `doGet()` menyajikan HTMLService UI.
- `doPost()` menerima request internal dari Vercel BFF dengan HMAC signature.
- `setupProject()` membuat/memeriksa spreadsheet dan tab.
- `getDashboardBootstrap()` adalah satu round-trip untuk data kritis dashboard.
- `getArchivesPage()` menyediakan pagination/filter.
- `searchArchives()` menyediakan pencarian ter-debounce dari client.
- `getArchiveDetail()` membaca detail arsip setelah pemeriksaan scope akses.
- `getArchivePreview()` mencatat audit `VIEW` sebelum membuka Google Drive.
- `getNotifications()` memuat notifikasi pengguna secara lazy.
- `markNotificationRead()` adalah contoh safe optimistic mutation.
- `getAdminBootstrap()` memuat seluruh master admin dalam satu lazy round-trip.
- `saveAdminRecord()` membuat/mengubah master data dengan lock dan pemeriksaan `row_version`.
- `getAuditLogs()` menyediakan audit read-only yang dipaginasi.

## Integrasi Vercel BFF

Apps Script tidak dipanggil langsung oleh browser production. Vercel mengirim envelope JSON ke `doPost()` dengan action, metadata actor, payload, dan signature HMAC SHA-256.

Script Properties yang perlu diisi:

| Property | Fungsi |
|---|---|
| `APPS_SCRIPT_SHARED_SECRET` | Secret aktif untuk memverifikasi request Vercel |
| `APPS_SCRIPT_PREVIOUS_SECRET` | Opsional, dipakai saat rotasi secret |

Action internal tahap awal:

| Action | Kegunaan |
|---|---|
| `dashboard.bootstrap` | Statistik, arsip terbaru, task verifikasi |
| `archives.list` | Daftar arsip paginated |
| `verification_tasks.list` | Antrean verifikasi |
| `master.bootstrap` | Divisi, unit, kategori, lokasi, dan boks |

Vercel harus memakai secret yang sama pada environment variable `APPS_SCRIPT_SHARED_SECRET` dan URL deployment `/exec` pada `APPS_SCRIPT_API_URL`.

## Prinsip Implementasi

- Spreadsheet dibuka sekali per execution dan referensinya digunakan ulang.
- Pembacaan menggunakan `getValues()` per range, bukan per cell.
- Mutasi satu row menggunakan satu `setValues()`.
- `ScriptLock` melindungi write bersama.
- Cache master data selalu menyertakan `DATA_VERSION`.
- Response hanya berupa JSON-compatible values.
- UI tidak menyimpan permission atau credential di browser storage.
- UI v0.5.0 menggunakan sidebar multi-view, Aptos, halaman Verifikasi Arsip satu tahap, master Divisi/Unit independen, lokasi fisik, boks, dan cetak barcode Code 128 sesuai `design.md`.
- App mark LM ditanamkan melalui `BrandAssets.gs` agar favicon dan logo sidebar tersedia di HTMLService tanpa hosting eksternal.
- Menu administrasi hanya ditampilkan untuk Super Admin dan setiap mutasi dicatat ke audit log.

Sesudah `clasp push`, jalankan kembali `setupProject()` agar tab penyimpanan fisik tersedia dan schema naik ke versi 3.

Lihat [README utama](../../README.md) untuk setup lengkap.
