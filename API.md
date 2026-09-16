# API.md: Arsiva-LM — Vercel, Apps Script, dan Google Workspace

## 1. Arsitektur Request

```text
Browser pada custom domain
        │
        ├── Google Identity Services (login akun kantor)
        │
        ▼
Next.js di Vercel
  ├── UI React
  └── /api/v1/* sebagai Backend-for-Frontend (BFF)
        │
        ├── Google Drive API: membuat resumable upload session
        └── request bertanda tangan
                ▼
        Apps Script Web App (doPost)
          ├── RBAC dan workflow
          ├── Google Sheets
          ├── Google Shared Drive
          ├── CacheService/LockService
          └── MailApp + time-driven triggers
```

Frontend tidak memanggil Apps Script secara langsung. Vercel BFF diperlukan untuk:

- memverifikasi Google ID token dan hosted domain;
- membuat session cookie yang aman;
- menyembunyikan URL deployment Apps Script dan shared secret;
- menormalisasi CORS serta kontrak REST;
- memulai Drive resumable upload tanpa melewatkan file melalui Vercel Function.

Apps Script tetap menjadi pemilik aturan bisnis. Vercel BFF tidak menentukan role atau status workflow; ia hanya memverifikasi identitas, mengadaptasi protokol, dan mengakses Drive API untuk sesi upload.

## 2. Konvensi API Publik (Vercel)

- Base URL: `/api/v1` pada custom domain, misalnya `https://arsip.example.go.id/api/v1`.
- JSON menggunakan `snake_case`, waktu ISO-8601 UTC, dan ID UUID.
- Session pengguna disimpan pada cookie `HttpOnly; Secure; SameSite=Lax`; state-changing request wajib lolos CSRF/origin check.
- Endpoint mutasi kritis membutuhkan `Idempotency-Key`.
- `request_id` dibuat di Vercel dan diteruskan sampai Apps Script/AuditLogs.
- Maksimum `per_page` adalah 100.
- Response file tidak diproxy melalui Vercel Function karena batas payload; browser berkomunikasi langsung dengan Google Drive untuk upload/preview setelah mendapat izin yang sesuai.

### 2.1 Instant UX Contract (`gas-instant-ux`)

- Initial dashboard memakai satu `GET /dashboard/bootstrap`, bukan beberapa request paralel kecil.
- Vercel boleh mengagregasi data tampilan, tetapi Apps Script membaca spreadsheet satu kali per tab/range yang diperlukan dan menghitung hasil di memory.
- Dilarang melakukan Spreadsheet service call di dalam loop serta dilarang membuka spreadsheet berulang kali dalam satu execution.
- Master data menggunakan CacheService dengan cache key yang memasukkan `DATA_VERSION`; setiap mutasi terkait harus menginvalidasi/menaikkan versi.
- List menggunakan pagination dan projection kolom. Response hanya berisi field yang dibutuhkan UI.
- Search UI memakai debounce 300 ms, sementara API menerima `request_id/query_id` agar client dapat mengabaikan response stale.
- Mutasi memakai idempotency key, optimistic row version, dan duplicate-submit protection.
- Panggilan Drive API, email, atau layanan eksternal tidak dilakukan selama `ScriptLock` aktif.
- Tanggal dikonversi ke ISO string dan object Apps Script seperti `Sheet`, `Range`, atau `Blob` tidak pernah dikembalikan ke client.
- Apps Script mengembalikan response ringkas; stack trace, secret, internal deployment ID, dan resumable URI tidak masuk ke error log pengguna.

Sukses:

```json
{
  "success": true,
  "data": {},
  "meta": { "request_id": "01J7..." }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid.",
    "details": [{ "field": "title", "message": "Judul wajib diisi." }],
    "request_id": "01J7..."
  }
}
```

## 3. Authentication dan Trust Boundary

### 3.1 `POST /auth/google`

Menerima response credential Google Identity Services. Server wajib memverifikasi CSRF, signature Google, `aud`, `iss`, `exp`, dan claim `hd` terhadap daftar hosted domain kantor. `sub` digunakan sebagai identitas Google yang stabil; email hanya atribut akun.

Request:

```json
{
  "credential": "<google_id_token>",
  "g_csrf_token": "<double_submit_value>"
}
```

Setelah token valid, BFF memanggil Apps Script action `auth.resolve_user`. Apps Script memastikan `google_sub`/email terdaftar dan aktif pada tab `Users`, lalu mengembalikan profil dan scope. BFF membuat session cookie; Google token mentah tidak ditulis ke log atau spreadsheet.

Status: `200`, `401 GOOGLE_TOKEN_INVALID`, `403 DOMAIN_NOT_ALLOWED`, `403 USER_NOT_REGISTERED`, `403 ACCOUNT_INACTIVE`, `429`.

### 3.2 Session

- `GET /auth/me`: profil, role, division, unit, dan feature permissions.
- `POST /auth/logout`: menghapus session server/cookie.
- Session berumur pendek dan dapat dicabut dengan `SESSION_SECRET` rotation. Role tetap diperiksa Apps Script pada setiap aksi sehingga perubahan tab `Users` berlaku tanpa menunggu session kedaluwarsa.

### 3.3 Vercel → Apps Script

Apps Script Web App dijalankan sebagai deployment owner dan hanya menerima request `POST` dengan envelope bertanda tangan. Karena Apps Script Web App tidak memberikan kontrak header kustom yang memadai untuk protokol internal, signature ditempatkan di body.

```json
{
  "action": "archives.list",
  "meta": {
    "request_id": "01J7...",
    "timestamp": "2026-09-16T03:15:00.000Z",
    "nonce": "c01c3b50-1ed7-4ca6-a787-f2ec3a0fd399",
    "actor_sub": "google-account-sub",
    "actor_email": "budi@kantor.co.id"
  },
  "payload": {},
  "signature": "base64url-hmac-sha256"
}
```

Signature dihitung dari canonical JSON `action + meta + payload` menggunakan HMAC-SHA256. Secret yang sama disimpan di Vercel Environment Variables dan Apps Script Properties, tidak di GitHub/Sheets. Apps Script menolak timestamp lebih lama dari lima menit, nonce yang pernah dipakai, signature tidak valid, actor tidak aktif, dan action yang tidak dikenal.

Rotasi secret menggunakan dua key sementara (`current` dan `previous`) agar deployment tidak terputus.

## 4. Matriks Endpoint Publik

| Method & Path | Akses | Apps Script action |
|:---|:---|:---|
| `POST /auth/google` | Public | `auth.resolve_user` |
| `GET /auth/me` | Session | `auth.resolve_user` |
| `POST /auth/logout` | Session | — |
| `GET /dashboard/bootstrap` | Semua role | `dashboard.bootstrap` |
| `POST /uploads` | Super Admin, Admin Divisi, User | `uploads.create` |
| `POST /uploads/{id}/complete` | Pemilik upload | `uploads.complete` |
| `POST /archives` | Super Admin, Admin Divisi, User | `archives.create` |
| `GET /archives` | Semua role | `archives.list` |
| `GET /archives/{id}` | Memiliki akses | `archives.get` |
| `PATCH /archives/{id}` | Pemilik/Admin scope, Draft | `archives.update` |
| `POST /archives/{id}/submit` | Pemilik/Admin scope/Super Admin | `archives.submit` |
| `GET /archives/{id}/preview` | Memiliki akses | `archives.preview_authorize` |
| `DELETE /archives/{id}` | Super Admin | `archives.soft_delete` |
| `POST /archives/{id}/restore` | Super Admin | `archives.restore` |
| `GET /approval-tasks` | Approver/Super Admin | `approval_tasks.list` |
| `POST /archives/{id}/approval-decisions` | Assignee/Super Admin | `approvals.decide` |
| `GET /search` | Semua role | `search.query` |
| `POST /archives/{id}/grants` | Super Admin, Approver L2 | `grants.create` |
| `DELETE /archives/{id}/grants/{grant_id}` | Super Admin, Approver L2 | `grants.revoke` |
| `GET /notifications` | Session | `notifications.list` |
| `PATCH /notifications/{id}/read` | Pemilik | `notifications.mark_read` |
| `GET /audit-logs` | Super Admin | `audit.list` |
| `POST /report-exports` | Super Admin | `reports.create` |
| `GET /report-exports/{id}` | Peminta/Super Admin | `reports.get` |
| `/divisions`, `/units`, `/categories`, `/users` | Sesuai RBAC | `master.*` |
| `/approver-configurations` | Super Admin | `approver_configs.*` |
| `POST /admin/search/reindex` | Super Admin | `search.rebuild` |
| `GET /admin/health` | Super Admin | `system.health` |

`dashboard.bootstrap` mengembalikan profil/scope, master data minimum, statistik utama, maksimum lima task approval, maksimum sepuluh arsip terbaru, dan unread notification count. Grafik, audit timeline, histori lengkap, serta dataset laporan tidak termasuk bootstrap dan dimuat secara lazy.

## 5. Upload Langsung ke Google Drive

Vercel Function memiliki batas request/response body, sehingga file maksimum 50 MB tidak dikirim ke `/api/v1` atau Apps Script. Alurnya:

1. Browser mengirim metadata file ke `POST /uploads`.
2. BFF memverifikasi session dan meminta Apps Script membuat record upload serta destination folder.
3. BFF menggunakan service account yang menjadi anggota Shared Drive untuk membuat Drive resumable upload session.
4. BFF mengembalikan session URI satu kali kepada browser; URI tidak dicatat di log.
5. Browser mengunggah byte langsung ke session URI Google Drive dan menampilkan progress/resume.
6. Browser memanggil `POST /uploads/{id}/complete`.
7. BFF/Apps Script membaca metadata Drive dan memverifikasi ID, parent, MIME, ukuran, dan checksum sebelum menandai `VERIFIED`.

### 5.1 `POST /uploads`

Request:

```json
{
  "file_name": "laporan-pajak-q1.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 2458912,
  "checksum": "md5-or-approved-checksum"
}
```

Response `201`:

```json
{
  "success": true,
  "data": {
    "upload_id": "fe8c772d-f4c2-4a18-a687-908c9647e78b",
    "drive_file_id": "1AbC...preGeneratedId",
    "upload_method": "PUT",
    "resumable_upload_url": "https://www.googleapis.com/upload/drive/v3/files?...",
    "expires_at": "2026-09-16T04:00:00Z"
  }
}
```

`resumable_upload_url` diperlakukan seperti credential sementara: hanya dikirim kepada pemilik session, tidak disimpan di Sheets, analytics, error tracker, atau browser persistent storage.

Tipe: PDF, DOCX, XLSX, JPG, PNG. Maksimum 50 MB. File dengan executable content, MIME mismatch, atau extension mismatch ditolak.

### 5.2 `POST /uploads/{id}/complete`

Tidak membutuhkan body. Response `200` berisi `status: VERIFIED`. Jika upload belum selesai, metadata berbeda, atau file tidak berada pada folder tujuan, respons `422 UPLOAD_VERIFICATION_FAILED` dan file dipindahkan ke karantina.

## 6. Arsip dan Penomoran

### 6.1 `POST /archives`

`Idempotency-Key` wajib. Klien tidak mengirim nomor arsip atau Drive folder.

```json
{
  "upload_id": "fe8c772d-f4c2-4a18-a687-908c9647e78b",
  "title": "Laporan Pajak Q1 2026",
  "division_id": "b10863d4-820e-475e-ab49-e604c12c4655",
  "unit_id": "72d4aaf2-3fc7-47e1-a982-cefcc99aca1a",
  "category_id": "ed129319-93f6-4f2c-aed6-7b068ee8bce3",
  "archive_date": "2026-03-31",
  "tags": ["pajak", "q1", "laporan"]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "4a33edb8-07c8-4c25-bb53-35d8f9e7242c",
    "archive_number": "KEU/2026/00142",
    "status": "DRAFT",
    "row_version": 1
  }
}
```

Apps Script mengambil `ScriptLock`, memeriksa idempotency, memvalidasi upload, menambah `NumberCounters`, lalu menulis Archives, SearchIndex, AuditLogs, dan status upload. Operasi dicatat di `Operations` agar dapat dipulihkan bila berhenti di tengah.

### 6.2 List, Detail, dan Update

`GET /archives` menerima `division_id`, `unit_id`, `category_id`, `status`, `date_from`, `date_to`, `q`, `sort`, `page`, `per_page`.

`PATCH /archives/{id}` hanya untuk `DRAFT` dan menerima `row_version` untuk optimistic concurrency. Nomor arsip/divisi immutable. Konflik versi menghasilkan `409 ROW_VERSION_CONFLICT` dengan versi terbaru.

### 6.3 Submit

`POST /archives/{id}/submit` membutuhkan `Idempotency-Key`. Apps Script membuat siklus submission dan task L1, mengubah status ke `PENDING_L1`, mengirim notifikasi in-app, lalu email diproses trigger.

### 6.4 Preview

`GET /archives/{id}/preview` terlebih dahulu memverifikasi RBAC dan mencatat `VIEW`. Response:

```json
{
  "success": true,
  "data": {
    "preview_url": "https://drive.google.com/file/d/1AbC.../preview",
    "download_url": "https://drive.google.com/uc?id=1AbC...&export=download",
    "preview_mode": "GOOGLE_DRIVE",
    "mime_type": "application/pdf"
  }
}
```

Drive tetap menjadi lapisan otorisasi kedua. Folder per divisi dibagikan kepada Google Group divisi; Approver L2/Super Admin memakai group global; grant lintas divisi menambahkan permission pengguna/grup pada file dan dicabut saat grant berakhir. Jika permission Drive tidak sinkron, endpoint mengembalikan `409 DRIVE_PERMISSION_PENDING` dan menjadwalkan rekonsiliasi.

### 6.5 Soft Delete

`DELETE /archives/{id}` hanya untuk Super Admin dan menerima alasan minimal 10 karakter. Metadata diubah lebih dahulu; file kemudian dipindahkan ke `Archived`, permission pengguna dicabut, dan hasil dipantau melalui operation journal. Restore melakukan proses kebalikan.

## 7. Approval

### 7.1 `GET /approval-tasks`

Filter: `level`, `status`, `division_id`, `due_before`, `page`, `per_page`. Approver hanya melihat task miliknya; Super Admin dapat melihat semua.

### 7.2 `POST /archives/{id}/approval-decisions`

`Idempotency-Key` wajib. Level tidak dikirim oleh klien.

```json
{
  "decision": "REJECTED",
  "note": "Tanggal dokumen tidak sesuai dengan berkas yang diunggah."
}
```

Apps Script memakai `ScriptLock`, membaca ulang actor/task/status, dan hanya menerima keputusan pertama yang valid. L1 approve → `PENDING_L2`; L2 approve → `FINAL`; penolakan level mana pun → `DRAFT` dan `needs_revision = TRUE`. Catatan penolakan minimal 10 karakter.

## 8. Search

### `GET /search`

Query `q` opsional. Filter: `division_id`, `unit_id`, `category_id`, `status`, `date_from`, `date_to`, `page`, `per_page`.

Apps Script mengambil SearchIndex dari CacheService berdasarkan `DATA_VERSION`. Cache miss membaca tab SearchIndex dalam satu batch. Access scope diterapkan sebelum hasil dikirim.

```json
{
  "success": true,
  "data": [],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 0,
    "last_page": 1,
    "took_ms": 180,
    "search_source": "CACHE",
    "index_refreshed_at": "2026-09-16T03:00:00Z"
  }
}
```

Nilai `search_source`: `CACHE` atau `SHEET_INDEX`. Bila source row version dan indeks berbeda, sistem menampilkan hasil yang aman, menjadwalkan reindex, dan memberi `index_stale: true` tanpa memperluas scope akses.

## 9. Grant, Notifikasi, Audit, dan Laporan

- Grant lintas divisi hanya oleh Super Admin/Approver L2. Mutasi dianggap selesai setelah row AccessGrants dan Drive permission sinkron; operation journal memulihkan kegagalan parsial.
- Email diproses time-driven trigger agar kegagalan/quota email tidak membatalkan approval. `MailApp.getRemainingDailyQuota()` diperiksa sebelum batch.
- AuditLogs hanya dapat dibaca Super Admin dan memiliki hash chain. API tidak menyediakan update/delete audit.
- ReportJobs diproses trigger, disimpan ke folder Drive `Exports`, dan dibagikan hanya kepada peminta/Super Admin. Link dicabut saat job kedaluwarsa.
- `GET /admin/health` menampilkan waktu trigger terakhir, jumlah operation yang perlu recovery, umur SearchIndex, status backup terakhir, serta kegagalan email—tanpa menampilkan secret.

## 10. Access Scope

- `SUPER_ADMIN`: seluruh data dan fungsi admin.
- `APPROVER_L2`: seluruh arsip aktif untuk pencarian/pengesahan; tidak otomatis dapat mengedit metadata.
- `ADMIN_DIVISION`: arsip dan pengguna ber-role `USER` pada divisinya.
- `APPROVER_L1`: arsip divisinya dan task yang ditugaskan.
- `USER`: arsip divisinya ditambah grant lintas divisi yang aktif.
- Arsip soft-deleted hanya terlihat pada endpoint admin eksplisit.
- Detail di luar scope mengembalikan `404`, bukan `403`.
- Izin Google Drive harus mengikuti scope aplikasi menggunakan Google Groups/folder permission dan per-file permission untuk grant.

## 11. Error Codes

| Code | HTTP | Arti |
|:---|:---|:---|
| `GOOGLE_TOKEN_INVALID` | 401 | ID token tidak valid/kedaluwarsa |
| `SESSION_INVALID` | 401 | Session aplikasi tidak valid |
| `DOMAIN_NOT_ALLOWED` | 403 | Akun bukan domain kantor |
| `USER_NOT_REGISTERED` | 403 | Akun belum terdaftar |
| `ACCOUNT_INACTIVE` | 403 | Akun dinonaktifkan |
| `FORBIDDEN` | 403 | Aksi tidak diizinkan |
| `ARCHIVE_NOT_FOUND` | 404 | Tidak ditemukan atau di luar scope |
| `UPLOAD_NOT_FOUND` | 404 | Session upload tidak ditemukan |
| `IDEMPOTENCY_CONFLICT` | 409 | Key sama, payload berbeda |
| `ROW_VERSION_CONFLICT` | 409 | Data telah berubah |
| `APPROVAL_INVALID_STAGE` | 409 | Task/status telah berubah |
| `DRIVE_PERMISSION_PENDING` | 409 | Sinkronisasi izin Drive belum selesai |
| `UPLOAD_VERIFICATION_FAILED` | 422 | File Drive tidak cocok |
| `VALIDATION_ERROR` | 422 | Payload tidak valid |
| `RATE_LIMITED` | 429 | Batas request terlampaui |
| `APPS_SCRIPT_QUOTA_EXCEEDED` | 503 | Quota Google sementara habis |
| `APPS_SCRIPT_UNAVAILABLE` | 503 | Web App/Sheets tidak tersedia |
| `DRIVE_UNAVAILABLE` | 503 | Drive API tidak tersedia |

## 12. Repository dan Deployment

Struktur GitHub yang disarankan:

```text
/
├── apps/
│   ├── web/                 # Next.js + Vercel route handlers
│   └── apps-script/         # .gs/.ts source + appsscript.json + clasp config template
├── packages/
│   └── contracts/           # schema request/response dan enum bersama
├── docs/                    # PRD, fitur, desain, data model, API
├── .github/workflows/
└── README.md
```

- Pull request: lint, type-check, unit test, dan Vercel Preview Deployment.
- Merge ke `main`: Vercel production deployment otomatis ke custom domain.
- Apps Script: build dan deploy versioned melalui `clasp`; production deployment sebaiknya memakai GitHub Environment approval.
- Secret minimum: Google OAuth client ID/secret, service account credential, Apps Script URL/deployment ID, HMAC secret, session secret, spreadsheet ID, dan Shared Drive/folder IDs.
- `.clasp.json` production, `.clasprc.json`, service-account JSON, `.env*`, spreadsheet ID, dan deployment secrets tidak boleh di-commit.
- Development, staging, dan production memakai Google/Vercel resource terpisah.

Vercel custom domain dikonfigurasi pada Project Settings → Domains. DNS record mengikuti nilai yang ditampilkan Vercel; setelah verifikasi, HTTPS dikelola otomatis. GitHub integration menghasilkan preview per pull request dan production deployment dari branch utama.

## 13. Referensi Resmi

- Apps Script Web Apps: https://developers.google.com/apps-script/guides/web
- Apps Script quotas: https://developers.google.com/apps-script/guides/services/quotas
- LockService: https://developers.google.com/apps-script/reference/lock
- Google ID token verification: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- Drive resumable upload: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Apps Script `clasp`: https://developers.google.com/apps-script/guides/clasp
- Vercel GitHub integration: https://vercel.com/docs/git/vercel-for-github
- Vercel custom domains: https://vercel.com/docs/domains/set-up-custom-domain
- Vercel Function limits: https://vercel.com/docs/functions/limitations
