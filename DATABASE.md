# DATABASE.md: Arsiva-LM — Google Sheets Data Model

## 1. Keputusan Arsitektur Data

Arsiva-LM menggunakan satu spreadsheet Google Workspace bernama logis `ARSIVA_LM_DATA` sebagai sumber data MVP. Spreadsheet tidak dibagikan sebagai editor kepada pengguna aplikasi. Hanya Apps Script owner, service account yang disetujui, dan administrator terbatas yang memiliki akses langsung.

- Apps Script adalah satu-satunya komponen yang membaca/menulis data bisnis.
- Google Shared Drive menyimpan file; Sheets hanya menyimpan metadata dan `drive_file_id`.
- ID semua entitas berupa UUID string; referensi antar-tab divalidasi oleh Apps Script karena Sheets tidak memiliki foreign key.
- Tanggal/waktu disimpan sebagai ISO-8601 UTC, misalnya `2026-09-16T03:15:00.000Z`.
- Boolean disimpan sebagai `TRUE`/`FALSE`; enum memakai uppercase English code.
- Nilai kosong memakai sel kosong, bukan teks `null`.
- Secret, OAuth credential, resumable upload URL, session cookie, dan private key dilarang disimpan di spreadsheet. Gunakan Apps Script Properties atau Vercel Environment Variables.
- Setiap tab data memiliki header tetap di baris pertama, protected range, filter, dan tidak boleh diubah manual pada production.

Google Sheets bukan database transaksional. Konsistensi dijaga melalui `LockService`, idempotency key, optimistic row version, batch read/write, operation journal, serta repair job berkala.

## 2. Struktur Google Drive

```text
Arsiva-LM (Shared Drive)
├── Active/
│   └── {DIVISION_CODE}/
│       └── {YEAR}/
├── Archived/
│   └── {DIVISION_CODE}/
│       └── {YEAR}/
├── Quarantine/
├── Exports/
└── Backups/
```

Aturan:

- File ID, bukan nama/path, menjadi referensi utama.
- Nama file fisik memakai `{archive_uuid}__{sanitized_original_name}` agar tidak bentrok.
- Folder dan file tidak diberi sharing `anyoneWithLink`.
- Upload tidak lengkap atau tidak terdaftar setelah 24 jam dipindahkan ke `Quarantine`.
- Soft delete memindahkan file dari `Active` ke `Archived`, bukan ke Trash.
- Aplikasi menyimpan `drive_parent_folder_id` untuk validasi bahwa file berada pada folder yang benar.

## 3. Daftar Tab

| Tab | Fungsi |
|:---|:---|
| `Settings` | Konfigurasi non-secret dan versi data |
| `Divisions` | Master divisi |
| `Units` | Master unit |
| `Categories` | Master kategori |
| `Users` | Identitas Google, role, dan scope |
| `NumberCounters` | Urutan nomor arsip per divisi/tahun |
| `FileUploads` | Status resumable upload ke Drive |
| `Archives` | Metadata inti arsip |
| `AccessGrants` | Izin baca lintas divisi |
| `ApproverConfigs` | Approver utama dan alternate |
| `Submissions` | Siklus pengajuan arsip |
| `ApprovalTasks` | Tugas aktif L1/L2 |
| `Approvals` | Keputusan approval immutable |
| `Notifications` | Notifikasi in-app dan status email |
| `AuditLogs` | Audit append-only dengan hash chain |
| `IdempotencyKeys` | Pencegahan mutasi ganda |
| `Operations` | Journal operasi multi-tab dan recovery |
| `SearchIndex` | Indeks pencarian terdenormalisasi |
| `ReportJobs` | Antrean ekspor CSV/XLSX |

## 4. Definisi Kolom

Kolom `created_at`, `updated_at`, dan `row_version` digunakan pada tab mutable kecuali disebutkan lain. `row_version` dimulai dari 1 dan bertambah setiap update.

### 4.1 `Settings`

`key`, `value`, `description`, `updated_at`, `updated_by_email`.

Key minimum:

- `SCHEMA_VERSION`
- `DATA_VERSION` — dinaikkan setelah mutasi untuk invalidasi cache
- `ALLOWED_GOOGLE_DOMAINS` — daftar domain, bukan secret
- `ACTIVE_ROOT_FOLDER_ID`, `ARCHIVED_ROOT_FOLDER_ID`, `QUARANTINE_FOLDER_ID`, `EXPORTS_FOLDER_ID`
- `MAX_FILE_SIZE_BYTES` — default `52428800`
- `SEARCH_CACHE_SECONDS`
- `REMINDER_HOURS` — default 12
- `ESCALATION_HOURS` — default 24

### 4.2 `Divisions`

`id`, `code`, `name`, `drive_group_email`, `active_folder_id`, `archive_number_format`, `is_active`, `created_at`, `updated_at`, `row_version`.

- `code` uppercase dan unik.
- `drive_group_email` adalah Google Group yang menerima akses folder divisi; `active_folder_id` menunjuk folder divisi di Shared Drive.
- Format awal: `{DIVISION}/{YEAR}/{SEQUENCE:5}`.

### 4.3 `Units`

`id`, `division_id`, `code`, `name`, `is_active`, `created_at`, `updated_at`, `row_version`.

Unique logis: `(division_id, code)`. Apps Script wajib memeriksa bahwa `division_id` aktif.

### 4.4 `Categories`

`id`, `code`, `name`, `description`, `is_active`, `created_at`, `updated_at`, `row_version`.

`code` dan `name` unik secara case-insensitive.

### 4.5 `Users`

`id`, `google_sub`, `email`, `full_name`, `role`, `division_id`, `unit_id`, `is_active`, `last_login_at`, `created_at`, `updated_at`, `row_version`.

Role: `SUPER_ADMIN`, `ADMIN_DIVISION`, `APPROVER_L1`, `APPROVER_L2`, `USER`.

- `google_sub` dari Google ID token adalah identitas unik dan immutable; email bukan primary identity.
- Email disimpan lowercase dan harus berada pada hosted domain yang diizinkan.
- `ADMIN_DIVISION`, `APPROVER_L1`, dan `USER` wajib memiliki `division_id`.
- Bila `unit_id` terisi, unit tersebut wajib berasal dari `division_id` yang sama.

### 4.6 `NumberCounters`

`division_id`, `year`, `last_sequence`, `updated_at`, `updated_by_email`.

Unique logis: `(division_id, year)`. Pembuatan nomor wajib memakai `LockService.getScriptLock()`, membaca counter terbaru, menambah satu, lalu menulis counter dan arsip sebelum lock dilepas.

### 4.7 `FileUploads`

`id`, `requested_by_user_id`, `requested_by_email`, `expected_file_name`, `expected_mime_type`, `expected_size_bytes`, `expected_checksum`, `drive_file_id`, `drive_parent_folder_id`, `actual_mime_type`, `actual_size_bytes`, `actual_checksum`, `status`, `expires_at`, `verified_at`, `consumed_at`, `failure_reason`, `created_at`, `updated_at`, `row_version`.

Status: `INITIATED`, `UPLOADING`, `UPLOADED`, `VERIFIED`, `CONSUMED`, `FAILED`, `EXPIRED`, `QUARANTINED`.

Resumable upload session URI tidak disimpan di tab ini. Vercel membuat sesi melalui Drive API dan mengembalikan URI langsung ke browser. Apps Script hanya menerima Drive file ID setelah upload selesai, kemudian memverifikasi file melalui Drive API sebelum status `VERIFIED`.

### 4.8 `Archives`

`id`, `archive_number`, `title`, `division_id`, `unit_id`, `category_id`, `classification_path`, `tags_json`, `status`, `uploaded_by_user_id`, `upload_id`, `drive_file_id`, `drive_parent_folder_id`, `original_file_name`, `mime_type`, `size_bytes`, `checksum`, `archive_date`, `current_submission_cycle`, `needs_revision`, `deleted_at`, `deleted_by_user_id`, `deletion_reason`, `created_at`, `updated_at`, `row_version`.

Status aktif: `DRAFT`, `PENDING_L1`, `PENDING_L2`, `FINAL`.

- `archive_number` unik dan immutable.
- `tags_json` berisi array JSON maksimum 20 string yang sudah dinormalisasi.
- `needs_revision = TRUE` bila submission terakhir ditolak; nilainya kembali `FALSE` saat diajukan ulang.
- Hanya `DRAFT` yang dapat diubah.
- Soft delete wajib mengisi tiga kolom delete bersama-sama dan memindahkan file ke folder `Archived`.

### 4.9 `AccessGrants`

`id`, `archive_id`, `grantee_user_id`, `permission`, `reason`, `expires_at`, `granted_by_user_id`, `revoked_at`, `revoked_by_user_id`, `created_at`, `updated_at`, `row_version`.

Permission fase awal hanya `VIEW`. Grant aktif bila belum dicabut dan `expires_at` kosong atau belum terlewati.

### 4.10 `ApproverConfigs`

`id`, `division_id`, `level`, `primary_approver_user_id`, `alternate_approver_user_id`, `effective_from`, `effective_until`, `is_active`, `created_at`, `updated_at`, `row_version`.

- L1 wajib mempunyai `division_id`.
- L2 boleh global dengan `division_id` kosong.
- Role dan status aktif approver diperiksa ketika task dibuat dan saat keputusan dikirim.

### 4.11 `Submissions`

`id`, `archive_id`, `cycle_number`, `submitted_by_user_id`, `submitted_at`, `result`, `completed_at`, `created_at`.

Result: `PENDING`, `APPROVED`, `REJECTED`. Unique logis: `(archive_id, cycle_number)`. Baris tidak diedit kecuali `result` dan `completed_at` oleh workflow engine.

### 4.12 `ApprovalTasks`

`id`, `submission_id`, `archive_id`, `level`, `assigned_to_user_id`, `status`, `assigned_at`, `due_at`, `reminder_sent_at`, `escalated_at`, `completed_at`, `created_at`, `updated_at`, `row_version`.

Status: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`. Unique logis: `(submission_id, level)`.

### 4.13 `Approvals`

`id`, `submission_id`, `task_id`, `archive_id`, `approver_user_id`, `level`, `decision`, `note`, `decided_at`, `created_at`.

Decision: `APPROVED`, `REJECTED`. Unique logis: `(submission_id, level)`. Baris immutable. `note` wajib minimal 10 karakter untuk penolakan.

### 4.14 `Notifications`

`id`, `user_id`, `type`, `title`, `message`, `data_json`, `read_at`, `email_status`, `email_sent_at`, `email_attempts`, `last_email_error`, `created_at`, `updated_at`, `row_version`.

Email status: `PENDING`, `SENT`, `FAILED`, `SKIPPED`. `data_json` dilarang berisi OAuth token, session URL, credential, atau link publik.

### 4.15 `AuditLogs`

`id`, `occurred_at`, `request_id`, `actor_user_id`, `actor_email_snapshot`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `metadata_json`, `previous_hash`, `row_hash`.

- Append-only: Apps Script hanya menyediakan fungsi `appendAudit()`.
- `row_hash = SHA-256(canonical_row_without_row_hash + previous_hash)`.
- Hash chain membantu mendeteksi perubahan, tetapi bukan pengganti immutable audit database. Pemeriksaan hash dijalankan harian dan hasilnya dikirim ke Super Admin.
- Spreadsheet dan tab dilindungi; pengguna aplikasi tidak memiliki akses editor langsung.
- Password, token, resumable URI, private key, dan isi file tidak pernah dicatat.

Aksi minimum: `LOGIN`, `UPLOAD_INIT`, `UPLOAD_VERIFY`, `CREATE_DRAFT`, `UPDATE_METADATA`, `SUBMIT`, `APPROVE_L1`, `APPROVE_L2`, `REJECT_L1`, `REJECT_L2`, `VIEW`, `GRANT_ACCESS`, `REVOKE_ACCESS`, `SOFT_DELETE`, `RESTORE`, `USER_CHANGE`, `REINDEX`, dan `EXPORT_REPORT`.

### 4.16 `IdempotencyKeys`

`key`, `actor_user_id`, `action`, `request_hash`, `response_json`, `status`, `expires_at`, `created_at`, `completed_at`.

Key yang sama dengan payload berbeda menghasilkan konflik. Record dapat dibersihkan setelah masa simpan operasional yang ditentukan, kecuali masih direferensikan operation journal.

### 4.17 `Operations`

`id`, `request_id`, `action`, `entity_type`, `entity_id`, `status`, `steps_json`, `last_completed_step`, `error_message`, `started_at`, `completed_at`, `recovery_attempts`, `updated_at`.

Status: `STARTED`, `COMPLETED`, `FAILED`, `RECOVERY_REQUIRED`, `RECOVERED`. Tab ini menjadi journal untuk operasi multi-tab karena Sheets tidak memiliki rollback transaksi.

### 4.18 `SearchIndex`

`archive_id`, `access_division_id`, `archive_number_normalized`, `title_normalized`, `category_normalized`, `unit_normalized`, `tags_normalized`, `combined_text`, `status`, `archive_date`, `is_deleted`, `source_row_version`, `indexed_at`.

Satu baris per arsip. `combined_text` memakai lowercase, normalisasi spasi/diakritik, dan tidak menyimpan isi file. Access grant dievaluasi terpisah agar indeks tidak menggandakan baris per pengguna.

### 4.19 `ReportJobs`

`id`, `requested_by_user_id`, `format`, `filters_json`, `status`, `drive_file_id`, `expires_at`, `failure_reason`, `created_at`, `started_at`, `completed_at`, `updated_at`, `row_version`.

Status: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `EXPIRED`.

## 5. Pola Konsistensi dan Concurrency

### 5.1 Mutasi Satu Entitas

1. Verifikasi signature request internal dan actor Google.
2. Ambil `ScriptLock` dengan timeout terbatas.
3. Periksa idempotency key.
4. Batch-load referensi yang diperlukan dengan `getValues()`.
5. Validasi RBAC, relasi, status, dan `row_version` bila dikirim klien.
6. Tambahkan operation berstatus `STARTED`.
7. Lakukan batch write, update SearchIndex, append audit, dan naikkan `DATA_VERSION`.
8. Simpan response idempotent dan tandai operation `COMPLETED`.
9. Flush spreadsheet bila diperlukan, lalu lepaskan lock pada blok `finally`.

Lock harus dipegang sesingkat mungkin; panggilan jaringan seperti Drive API dan email tidak dilakukan saat lock aktif.

### 5.2 Operasi Parsial

Jika eksekusi berhenti setelah sebagian tab berubah, operation tetap `STARTED`/`RECOVERY_REQUIRED`. Time-driven repair job memeriksa journal, menentukan langkah terakhir, lalu melanjutkan secara idempotent atau menandai kasus untuk pemeriksaan admin.

### 5.3 Cache dan Lookup

- Master data dan map `id → row` disimpan di CacheService dengan TTL pendek.
- Cache key selalu memasukkan `DATA_VERSION`.
- Mutasi menaikkan versi untuk menghindari hasil lama.
- Hindari `getValue()`/`setValue()` dalam loop; gunakan batch array dan `setValues()`.
- Daftar besar dipaginasi sebelum dikirim ke frontend.

## 6. Workflow Utama

1. **Upload:** Vercel memverifikasi Google session → membuat record `FileUploads` melalui Apps Script → Vercel memulai Drive resumable upload → browser mengunggah langsung ke Drive → completion diverifikasi Apps Script.
2. **Membuat draft:** lock → validasi upload `VERIFIED` → tambah counter → format nomor lima digit → append `Archives`, `SearchIndex`, audit → tandai upload `CONSUMED`.
3. **Submit:** lock → buat `Submissions` dan `ApprovalTasks` L1 → ubah arsip ke `PENDING_L1` → append audit/notifikasi.
4. **Approve L1:** lock → append keputusan → selesaikan task L1 → buat task L2 → status `PENDING_L2`.
5. **Approve L2:** lock → append keputusan → submission `APPROVED` → arsip `FINAL`.
6. **Reject:** lock → append keputusan → submission `REJECTED` → arsip `DRAFT`, `needs_revision = TRUE`.
7. **Soft delete:** validasi Super Admin dan alasan → ubah metadata → setelah lock dilepas pindahkan file ke `Archived`; operation journal melacak kegagalan pemindahan.

## 7. Trigger Apps Script

| Trigger | Interval | Fungsi |
|:---|:---|:---|
| `processNotifications` | Setiap 5–10 menit | Kirim email tertunda dengan pemeriksaan quota |
| `processApprovalReminders` | Setiap jam | Reminder 12 jam dan eskalasi 24 jam |
| `repairOperations` | Setiap 15 menit | Pulihkan operation parsial |
| `cleanupUploads` | Setiap jam | Expire/karantina upload yatim |
| `processReportJobs` | Setiap 10 menit | Buat ekspor CSV/XLSX |
| `verifyAuditChain` | Harian | Verifikasi hash chain dan notifikasi anomali |
| `backupSpreadsheet` | Harian | Salin spreadsheet ke folder backup |
| `rebuildSearchIndex` | Harian + manual | Rekonsiliasi indeks dengan Archives |

Trigger harus idempotent, mencatat `request_id`, dan berhenti dengan aman sebelum batas waktu eksekusi. Quota Apps Script berbeda menurut jenis akun dan dapat berubah; dashboard admin wajib menampilkan kegagalan terakhir dan sisa quota email bila tersedia.

## 8. Backup, Akses, dan Exit Criteria

- Backup harian disimpan di folder `Backups` dengan nama tanggal dan masa simpan yang disetujui organisasi; kebijakan ini terpisah dari retensi arsip.
- Drive version history diaktifkan sesuai kebijakan Workspace.
- Source Apps Script disimpan di GitHub melalui `clasp`; spreadsheet ID dan deployment ID berada di secret/environment configuration.
- Production spreadsheet tidak digunakan untuk development/test. Setiap environment memiliki spreadsheet, Apps Script deployment, Shared Drive folder, OAuth client, dan Vercel environment sendiri.

Evaluasi migrasi metadata dari Sheets ke **Google Firestore** (tetap dalam ekosistem Google) bila salah satu terjadi:

- Arsip aktif melebihi 10.000 baris atau pengguna aktif bersamaan konsisten melebihi 25.
- P95 pencarian cache hangat melebihi 3 detik selama tujuh hari.
- Kontensi lock atau kegagalan quota mengganggu operasi harian.
- Kebutuhan audit mengharuskan immutable storage/database transaction yang sesungguhnya.

Kontrak API Vercel dipertahankan agar migrasi datastore tidak memerlukan penulisan ulang frontend.

## 9. Referensi Resmi

- Google Apps Script Web Apps: https://developers.google.com/apps-script/guides/web
- Apps Script Lock Service: https://developers.google.com/apps-script/reference/lock
- Apps Script quotas: https://developers.google.com/apps-script/guides/services/quotas
- Google Drive resumable uploads: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Apps Script `clasp`: https://developers.google.com/apps-script/guides/clasp
