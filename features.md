# FEATURES.md: Arsiva-LM

## 1. Ikhtisar Modul Fitur

Arsiva-LM dibagi menjadi lima modul fungsional yang memetakan langsung ke Functional Requirements pada PRD. Setiap modul memiliki user stories, acceptance criteria, dan edge cases.

| Modul | Kode | FR Terkait |
|:---|:---|:---|
| Manajemen Arsip | MOD-ARS | FR-01, FR-02, FR-10, FR-11 |
| Dashboard & Pencarian | MOD-DSH | FR-03, FR-04 |
| Alur Persetujuan | MOD-APR | FR-05, FR-06 |
| Tata Kelola & RBAC | MOD-GOV | FR-07, FR-08 |
| Audit & Pelaporan | MOD-AUD | FR-09, FR-12 |

## 2. MOD-ARS — Manajemen Arsip

### 2.1 User Stories
- **US-ARS-01:** Sebagai Pengguna, saya ingin mengunggah dokumen dengan metadata lengkap agar arsip dapat ditemukan kembali.
- **US-ARS-02:** Sebagai Pengguna, saya ingin sistem menomori arsip otomatis agar tidak terjadi duplikasi.
- **US-ARS-03:** Sebagai Pengguna, saya ingin melihat pratinjau dokumen tanpa mengunduhnya.

### 2.2 Acceptance Criteria
- **AC-ARS-01:** Form upload menolak file di luar tipe PDF, DOCX, XLSX, JPG, PNG; ukuran maksimum 50 MB.
- **AC-ARS-02:** Field wajib (judul, divisi, kategori, tanggal arsip, dan file) tervalidasi sebelum draft dibuat. Unit opsional tetapi, jika diisi, wajib berada di bawah divisi terpilih.
- **AC-ARS-03:** Nomor arsip hanya dihasilkan oleh server dengan format `{KODE_DIVISI}/{TAHUN}/{URUTAN_5_DIGIT}` dan bersifat unik per divisi per tahun.
- **AC-ARS-04:** File asli tersimpan di Google Shared Drive; Google Sheets hanya menyimpan metadata, checksum, status, dan `drive_file_id`.
- **AC-ARS-05:** Preview menggunakan Google Drive viewer setelah hak akses pengguna diverifikasi; file tidak boleh memiliki public sharing link.
- **AC-ARS-06:** Upload memakai resumable upload session sekali pakai. Vercel BFF hanya membuat session; browser mengirim byte file langsung ke Google Drive agar file 50 MB tidak melewati batas payload Vercel Function atau Apps Script.
- **AC-ARS-07:** Backend memverifikasi Drive file ID, parent folder, ukuran, MIME type, dan checksum sebelum membuat draft. Tipe yang tidak dapat dipreview ditawarkan sebagai unduhan terautentikasi.

### 2.3 Edge Cases
- Upload gagal atau tidak dikonfirmasi → session berstatus `FAILED`/`EXPIRED`; file yatim dipindahkan ke folder karantina oleh time-driven trigger setelah 24 jam.
- Dua pengguna submit bersamaan pada divisi/tahun sama → penomoran menggunakan Apps Script `ScriptLock` dan tab `NumberCounters`.
- File dengan nama mengandung karakter non-ASCII → nama file tampilan dipertahankan, sedangkan identitas internal memakai UUID/Drive file ID.
- Metadata objek dari klien berbeda dengan metadata Drive → pembuatan arsip ditolak dan kejadian dicatat ke tab audit.

## 3. MOD-DSH — Dashboard & Pencarian

### 3.1 User Stories
- **US-DSH-01:** Sebagai Pengguna, saya ingin melihat arsip divisi saya dalam tampilan kartu modern.
- **US-DSH-02:** Sebagai Pengguna, saya ingin mencari arsip via kata kunci dan filter.

### 3.2 Acceptance Criteria
- **AC-DSH-01:** Kartu menampilkan thumbnail, judul, nomor, divisi, tags, dan badge status persetujuan.
- **AC-DSH-02:** Filter tersedia untuk divisi, unit, kategori, status, dan rentang tanggal.
- **AC-DSH-03:** Hasil pencarian ditargetkan < 3 detik ketika CacheService hangat dan < 5 detik saat cold start untuk maksimum 10.000 arsip.
- **AC-DSH-04:** Hasil pencarian otomatis difilter sesuai kombinasi divisi-peran pengguna (Pengguna hanya melihat divisi sendiri + arsip yang di-grant).
- **AC-DSH-05:** App shell dan skeleton tampil sebelum data selesai dimuat; dashboard menggunakan satu bootstrap request untuk data kritis dan lazy-load untuk data sekunder.
- **AC-DSH-06:** Pencarian menggunakan debounce 300 ms, mengabaikan response stale, dan daftar menggunakan pagination 20/50/100 item.
- **AC-DSH-07:** Mutasi mencegah submit ganda, mempertahankan input saat gagal, dan memperbarui item terkait tanpa me-reload seluruh halaman.

### 3.3 Edge Cases
- Cache miss atau indeks belum siap → Apps Script membaca tab `SearchIndex`; jika indeks tidak sinkron, UI menampilkan indikator dan admin dapat menjalankan reindex.
- Query kosong → tampilkan 20 arsip terbaru sesuai scope akses.

## 4. MOD-APR — Alur Persetujuan Dua Tingkat

### 4.1 User Stories
- **US-APR-01:** Sebagai Approver L1, saya ingin memvalidasi dokumen divisi saya.
- **US-APR-02:** Sebagai Approver L2, saya ingin mengesahkan dokumen menjadi Final.
- **US-APR-03:** Sebagai Pengunggah, saya ingin menerima notifikasi hasil persetujuan/penolakan.

### 4.2 State Machine Status
```text
DRAFT --submit--> PENDING_L1 --approve--> PENDING_L2 --approve--> FINAL
                       |                       |
                    reject                  reject
                       |                       |
                       +---------> DRAFT <-----+
```

`REJECTED` bukan status aktif arsip. Penolakan disimpan sebagai keputusan pada riwayat approval. Setiap pengajuan ulang menaikkan `submission_cycle`, sehingga keputusan dari siklus sebelumnya tetap utuh.

### 4.3 Acceptance Criteria
- **AC-APR-01:** Approver L1 hanya dapat menyetujui dokumen dari divisinya.
- **AC-APR-02:** Approver L2 hanya dapat mengesahkan dokumen berstatus `PENDING_L2`.
- **AC-APR-03:** Penolakan wajib menyertakan catatan minimal 10 karakter.
- **AC-APR-04:** Setiap transisi status mengirim notifikasi in-app dan email ke pihak terkait.
- **AC-APR-05:** Sistem mengirim reminder setelah 12 jam dan mengalihkan tugas ke alternate approver aktif setelah 24 jam tanpa aksi.
- **AC-APR-06:** Hanya pengunggah, Admin Divisi pada divisi yang sama, atau Super Admin yang dapat mengajukan draft. Pengajuan dilakukan melalui aksi eksplisit, bukan otomatis setelah upload.
- **AC-APR-07:** Keputusan approval unik berdasarkan kombinasi arsip, siklus pengajuan, dan tingkat approval.

### 4.4 Edge Cases
- Approver L1 menolak → dokumen kembali ke `DRAFT` milik pengunggah, riwayat penolakan tersimpan.
- Approver L2 menolak setelah L1 setuju → dokumen kembali ke `DRAFT`, L1 dan pengunggah dinotifikasi.
- Approver tidak aktif → sistem menunjuk alternate approver berdasarkan konfigurasi divisi.
- Dua approver memutuskan bersamaan → transaksi pertama yang valid menang; request kedua menerima `409 APPROVAL_INVALID_STAGE`.

## 5. MOD-GOV — Tata Kelola & RBAC

### 5.1 User Stories
- **US-GOV-01:** Sebagai Super Admin, saya ingin mengelola pengguna, peran, divisi, dan unit.
- **US-GOV-02:** Sebagai Admin Divisi, saya ingin mengelola anggota divisi saya saja.

### 5.2 Acceptance Criteria
- **AC-GOV-01:** Matriks otorisasi mengikuti tabel Role pada PRD; setiap endpoint divalidasi middleware RBAC.
- **AC-GOV-02:** Admin Divisi tidak dapat mengubah peran lintas divisi.
- **AC-GOV-03:** Tidak ada kebijakan retensi otomatis; penghapusan arsip final hanya oleh Super Admin dengan alasan audit wajib.
- **AC-GOV-04:** Pemberian akses lintas divisi (grant) hanya oleh Super Admin atau Approver L2, dengan masa berlaku opsional.
- **AC-GOV-05:** Email terverifikasi Google menjadi identitas pengguna; role dan divisi pada tab `Users` menjadi sumber otorisasi dan diperiksa ulang pada setiap aksi Apps Script.
- **AC-GOV-06:** Super Admin mengelola kategori, konfigurasi format nomor, approver utama, dan alternate approver. Admin Divisi hanya mengelola anggota ber-role internal `USER` dalam divisinya.

### 5.3 Edge Cases
- Penghapusan arsip final → soft delete + audit log; file dipindahkan ke folder `Archived` pada Shared Drive dan tetap dapat dipulihkan oleh Super Admin.
- Perubahan role/divisi atau penonaktifan pengguna → berlaku pada request berikutnya karena Apps Script selalu membaca/memvalidasi scope dari tab `Users` (dengan cache berumur pendek yang diinvalidasi saat perubahan).

## 6. MOD-AUD — Audit & Pelaporan

### 6.1 User Stories
- **US-AUD-01:** Sebagai Super Admin, saya ingin melihat riwayat audit lengkap.
- **US-AUD-02:** Sebagai Super Admin, saya ingin laporan statistik arsip per divisi.

### 6.2 Acceptance Criteria
- **AC-AUD-01:** Audit log mencatat aksi: `UPLOAD`, `UPDATE_METADATA`, `APPROVE_L1`, `APPROVE_L2`, `REJECT`, `VIEW`, `DELETE` dengan username, timestamp, dan IP.
- **AC-AUD-02:** Laporan statistik menampilkan jumlah arsip per divisi, distribusi status approval, dan aktivitas pengguna per periode.
- **AC-AUD-03:** Audit log bersifat append-only dan tidak dapat diubah dari UI.
- **AC-AUD-04:** Ekspor laporan tersedia dalam format CSV dan XLSX.
- **AC-AUD-05:** Audit log menyimpan `request_id`, actor, IP, user agent, entitas, aksi, serta ringkasan perubahan sebelum/sesudah tanpa menyimpan password, token, atau URL bertanda tangan.

### 6.3 Edge Cases
- View dokumen melalui Drive viewer/proxy → tetap tercatat sebagai `VIEW` dengan referensi arsip.
- Laporan periode besar (> 1 tahun) → dibuat sebagai job pada tab `ReportJobs`, diproses oleh time-driven trigger, lalu dikirim ke email saat selesai.

## 7. Matriks Traceability Fitur

| Fitur | Modul | Prioritas | Rilis |
|:---|:---|:---|:---|
| Upload & metadata arsip | MOD-ARS | P0 | v1.0 |
| Penomoran otomatis | MOD-ARS | P0 | v1.0 |
| Preview Google Drive | MOD-ARS | P1 | v1.0 |
| Dashboard kartu | MOD-DSH | P0 | v1.0 |
| SearchIndex + CacheService | MOD-DSH | P0 | v1.0 |
| Approval dua tingkat | MOD-APR | P0 | v1.0 |
| Notifikasi in-app & email | MOD-APR | P1 | v1.0 |
| RBAC divisi-peran | MOD-GOV | P0 | v1.0 |
| Tanpa retensi + audit delete | MOD-GOV | P0 | v1.0 |
| Audit log | MOD-AUD | P0 | v1.0 |
| Laporan statistik | MOD-AUD | P1 | v1.1 |

Untuk skema database dan ERD lihat `DATABASE.md`; untuk kontrak endpoint lihat `API.md`.
