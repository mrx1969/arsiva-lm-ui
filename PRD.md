# PRD: Arsiva-LM

## Executive Summary & Product Vision
Arsiva-LM adalah sistem kearsipan internal berbasis web untuk mengelola arsip digital seluruh divisi dan unit kantor. Produk dibangun di atas Google Workspace: Google Sheets sebagai sumber data terstruktur, Apps Script sebagai workflow engine, dan Google Shared Drive sebagai penyimpanan file. Source code dikelola di GitHub dan aplikasi React/Next.js dipublikasikan melalui Vercel dengan custom domain kantor.

## Problem Statement & Target Users
- **Masalah:** Arsip tersebar di drive lokal, tidak ada kontrol akses terpusat, alur persetujuan tidak jelas, pencarian dokumen lambat.
- **Target Pengguna:** Pegawai kantor, admin divisi/unit, approver level 1 (kepala divisi/unit), approver level 2 (pimpinan/direksi), dan super admin.

## System Scope & User Roles

| Role | Upload | View | Approve L1 | Approve L2 | Manage Users/Divisi | Search Scope |
|---|---|---|---|---|---|---|
| Super Admin | Ya | Ya | Ya | Ya | Ya | Semua arsip |
| Admin Divisi | Ya | Divisi sendiri | Tidak | Tidak | Divisi sendiri | Divisi sendiri |
| Approver L1 | Tidak | Divisi sendiri | Ya | Tidak | Tidak | Divisi sendiri |
| Approver L2 | Tidak | Semua arsip | Tidak | Ya | Tidak | Semua arsip |
| Pengguna | Ya | Divisi sendiri + granted | Tidak | Tidak | Tidak | Kombinasi divisi-peran |

Akses baca ditentukan otomatis oleh kombinasi divisi pengguna dan peran. Akses lintas divisi hanya untuk Super Admin, Approver L2, atau pemberian izin eksplisit.

## Functional Requirements
- **FR-01** – Upload arsip digital (PDF, DOCX, XLSX, JPG, PNG; maksimum 50 MB) dengan metadata wajib: judul, divisi, kategori, tanggal arsip, dan file. Unit bersifat opsional sesuai struktur organisasi; tags bersifat opsional. Nomor arsip dibuat otomatis oleh server saat draft dibuat.
- **FR-02** – File asli disimpan di Google Shared Drive. Browser mengunggah file langsung ke Google Drive melalui resumable upload session; file tidak melewati Apps Script atau Vercel Function. Google Sheets menyimpan metadata, checksum, status upload, dan Drive file ID.
- **FR-03** – Dashboard modern kartu menampilkan thumbnail, judul, nomor, divisi, tag, status persetujuan, serta filter divisi/unit/kategori/status/tanggal.
- **FR-04** – Pencarian global menggunakan tab `SearchIndex` dan Apps Script CacheService untuk judul, nomor arsip, tags, dan metadata. Hasil selalu difilter sesuai kombinasi divisi-peran pengguna.
- **FR-05** – Alur persetujuan dua tingkat: draft → diajukan → Approver L1 validasi → Approver L2 sahkan → status Final. Penolakan mengembalikan dokumen ke status Draft dengan catatan dan menyimpan riwayat keputusan berdasarkan siklus pengajuan.
- **FR-06** – Notifikasi in-app dan email Google Workspace melalui Apps Script/MailApp untuk pengajuan, persetujuan, dan penolakan.
- **FR-07** – Kebijakan tanpa retensi: tidak ada penghapusan otomatis atau masa simpan. Arsip final hanya dapat dinonaktifkan melalui soft delete oleh Super Admin dengan alasan audit; file dipindahkan ke folder `Archived` pada Shared Drive dan tidak dimasukkan ke Trash oleh aplikasi.
- **FR-08** – Manajemen pengguna, peran, divisi, dan unit oleh Super Admin. Admin Divisi hanya dapat mengelola anggota divisinya.
- **FR-09** – Tab audit mencatat upload, perubahan metadata, approval, penolakan, view dokumen, dan soft delete (email actor, waktu, aksi, request ID). Baris audit diberi hash berantai untuk membantu mendeteksi perubahan tidak sah.
- **FR-10** – Penomoran arsip otomatis dan atomik per divisi/tahun dengan format awal `{KODE_DIVISI}/{TAHUN}/{URUTAN_5_DIGIT}`. Nomor hanya dibuat oleh server dan tidak dapat diubah pengguna.
- **FR-11** – Preview menggunakan Google Drive viewer setelah Apps Script memverifikasi hak akses. Permission folder/file Drive wajib mencerminkan divisi, role global, dan grant lintas divisi sehingga Drive menjadi lapisan otorisasi kedua. File tidak diberi public link; jika tipe file tidak dapat dipreview, aplikasi menawarkan unduhan terautentikasi.
- **FR-12** – Admin-facing: laporan statistik arsip per divisi, status approval, dan aktivitas pengguna.

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| Performa pencarian | Target < 3 detik saat cache hangat dan < 5 detik saat cold start untuk ≤ 10.000 arsip |
| Keamanan | Google Workspace Sign-In, pembatasan hosted domain, RBAC pada setiap aksi, HTTPS, spreadsheet/Shared Drive tidak dibagikan ke pengguna umum |
| Skalabilitas MVP | Maksimum operasional awal 10.000 arsip dan 25 pengguna aktif bersamaan; lakukan evaluasi migrasi ke Firestore jika terlampaui |
| Ketersediaan | Best effort mengikuti Google Workspace, Apps Script, dan Vercel; monitoring endpoint dan kegagalan trigger wajib |
| Backup | Salinan spreadsheet harian, version history Drive, dan ekspor konfigurasi Apps Script; target RPO 24 jam |

## Technology Stack & Rationale

| Component | Technology | Why |
|---|---|---|
| Frontend/BFF | Next.js (React + TypeScript) di Vercel | UI responsif, route handler untuk autentikasi dan adapter aman menuju Apps Script |
| Workflow/API internal | Google Apps Script Web App | Aturan bisnis, RBAC, penomoran, approval, audit, trigger, dan email |
| Database MVP | Google Sheets | Mudah dikelola tim internal; tab terstruktur dan protected range menjadi sumber data |
| Storage | Google Shared Drive | File tetap berada dalam domain Google Workspace dan mendukung viewer Drive |
| Auth | Google Identity Services | Login akun kantor; server memverifikasi ID token, audience, issuer, expiry, dan hosted domain |
| Search | Apps Script + `SearchIndex` + CacheService | Indeks ringan yang sesuai dengan arsitektur Google Sheets pada skala MVP |
| Source control | GitHub + `clasp` | Satu repository untuk Next.js, Apps Script, dokumentasi, dan workflow CI/CD |
| Hosting/domain | Vercel | Preview deployment dari GitHub, production deployment dari branch `main`, HTTPS dan custom domain |

## Success Metrics & KPIs

| KPI | Target |
|---|---|
| Waktu pencarian dokumen | < 3 detik untuk cache hangat pada skala MVP |
| Durasi siklus approval dua tingkat | < 24 jam per dokumen |
| Adopsi arsip digital internal | ≥ 80% dokumen terarsip dalam 6 bulan |
| Jumlah insiden kehilangan data | 0 |
| Kepuasan pengguna terhadap UI kartu | ≥ 4,0/5,0 |

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| Salah konfigurasi RBAC divisi-peran | Akses tidak sah ke arsip sensitif | Unit test otorisasi, audit log lengkap, review akses berkala |
| Apps Script/Sheets mencapai quota atau terjadi kontensi write | Request lambat/gagal | Batch read/write, CacheService, LockService, retry terbatas, monitoring quota, dan exit criteria ke Firestore |
| SearchIndex tidak sinkron dengan tab arsip | Hasil pencarian tidak akurat | Update indeks di dalam operasi yang sama, pemeriksaan berkala, dan reindex manual via admin |
| Tidak ada retensi menyebabkan Shared Drive tumbuh tak terkendali | Kapasitas dan biaya storage meningkat | Monitoring kapasitas, folder `Archived`, kompresi dokumen, dan alert batas |
| Persetujuan dua tingkat terhambat karena approver absen | Dokumen tertunda | Eskalasi ke alternate approver, reminder otomatis |
| Apps Script bukan database transaksional | Data antar-tab dapat tidak konsisten | ScriptLock, idempotency key, operation journal, validasi relasi, dan repair job |
| Permission Drive tidak sinkron dengan RBAC aplikasi | Akses gagal atau akses berlebih | Google Group per divisi, operation journal, rekonsiliasi permission berkala, dan fail-closed pada preview |
| Endpoint Apps Script menerima trafik tidak sah | Quota dapat terkuras | HMAC request, timestamp/nonce anti-replay, validasi sebelum membaca Sheets, monitoring, dan rotasi deployment URL/secret saat insiden |

## Constraints & Assumptions
- **Constraints:** Aplikasi internal-only untuk satu/lebih hosted domain Google Workspace yang dikonfigurasi; tanpa retensi otomatis; alur persetujuan wajib dua tingkat; Apps Script memiliki quota dan batas waktu eksekusi yang dapat berubah; file maksimum 50 MB menggunakan upload langsung ke Drive.
- **Assumptions:** Pengguna memiliki akun Google Workspace kantor; administrator menyediakan Shared Drive dan service account/credential Google Cloud yang diperlukan; fase MVP tidak melebihi 10.000 arsip dan 25 pengguna aktif bersamaan; satu akun memiliki satu role utama dan maksimal satu divisi/unit aktif.

## Out of Scope
- Tanda tangan elektronik / e-signature.
- OCR otomatis atau ekstraksi teks dari gambar.
- Versioning file/check-in/check-out. Nomor siklus pengajuan hanya digunakan untuk menjaga riwayat approval setelah penolakan dan bukan versi dokumen.
- Aplikasi mobile native (hanya web responsif).
- Alur persetujuan lebih dari dua tingkat atau paralel.
- Integrasi sistem eksternal (ERP, HRIS) pada versi ini.
