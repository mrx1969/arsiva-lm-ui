# DESIGN.md: Arsiva-LM

## 1. Design Read (Evidence-Based)
- **Product:** Arsiva-LM — sistem kearsipan internal berbasis web, satu sumber kebenaran arsip digital seluruh divisi/unit.
- **Target Audience:** Pegawai kantor, Admin Divisi/Unit, Approver L1 (kepala divisi/unit), Approver L2 (pimpinan/direksi), Super Admin.
- **Product Type:** SaaS Application (internal enterprise dashboard).
- **Primary User Goal:** Mengunggah, menemukan, dan menyetujui arsip digital dengan cepat (< 2 detik pencarian) tanpa kebocoran lintas divisi.
- **User Roles & Workflows:** Pengguna → dashboard kartu + upload + pencarian; Admin Divisi → manajemen anggota & metadata divisi; Approver L1 → antrean validasi; Approver L2 → antrean pengesahan; Super Admin → manajemen global, audit, laporan.
- **Brand / Aesthetic Direction:** Institutional, utilitarian, tenang, tipografi-tegas. Bukan playful, bukan marketing.
- **Key Personality Traits:** Tertib, Dapat-dipercaya, Efisien.

## 2. Design Dials (Context-Specific)
- **DESIGN_VARIANCE: 2** — Konsistensi data dan prediktabilitas layout wajib; pengguna berpindah cepat antar arsip, variasi visual menambah beban kognitif.
- **MOTION_INTENSITY: 2** — Task velocity tinggi (approval < 24 jam). Animasi dibatasi pada feedback interaksi (hover, focus, transisi status).
- **VISUAL_DENSITY: 8** — Dashboard kartu + tabel metadata + filter multi-kriteria menuntut informasi padat namun terstruktur.

## 3. Visual Identity & Product-Type Adaptation
Sistem dirancang untuk **scanning, filtering, dan approval**, bukan storytelling. Distinctiveness dibangun dari: grid 12-kolom disiplin, hierarki tipografi tinggi (nomor arsip sebagai anchor), hairline border 1px, dan aksen semantik status (Draft/Validasi L1/Validasi L2/Final). Penolakan ditampilkan sebagai konteks `Draft — Perlu Revisi`, bukan status aktif terpisah. Dilarang: gradient dekoratif, frosted glass, kotak rounded berlebih (radius max 6px), shadow tebal.

## 4. Semantic Color System
```css
:root {
  --color-primary: #1F3A5F;   /* institutional navy */
  --color-secondary: #4A5A6A; /* slate */
  --color-accent: #0E7C66;    /* teal — CTA & active */
  --color-success: #2E7D32;
  --color-warning: #B26A00;
  --color-danger: #B3261E;
  --color-bg: #F7F8FA;
  --color-surface: #FFFFFF;
  --color-fg: #14181F;
  --color-muted: #5B6472;
  --color-border: #E3E6EB;
}
```
**Aturan pakai:** Netral (bg/surface/fg/muted/border) = 90% UI. `--color-accent` hanya untuk CTA utama & item aktif. `--color-success/warning/danger` khusus label status approval. Dilarang gradient neon biru/ungu sebagai indikator teknologi.

## 5. Typography & Type Scale
- **Brand family:** `Aptos` sesuai brand guideline organisasi. Tidak menggunakan Google Fonts atau font pihak ketiga eksternal.
- **Heading:** `Aptos Display` untuk `h1`–`h3`, dengan fallback `Aptos`, `Segoe UI Variable Display`, `Segoe UI`, `system-ui`, `sans-serif`.
- **Body & UI:** `Aptos` untuk navigasi, formulir, tabel, metadata, dan tombol; fallback `Segoe UI Variable Text`, `Segoe UI`, `system-ui`, `sans-serif`.
- **Nomor arsip:** `Aptos Mono` untuk nomor arsip (mis. `ARS/FIN/2026/00042`); fallback `Cascadia Mono`, `Segoe UI Mono`, `ui-monospace`, `monospace`.
- **Aptos Narrow:** hanya boleh dipakai pada tabel sangat padat setelah pengujian keterbacaan; tidak digunakan sebagai default body.
- File font web (`woff2`) hanya boleh di-self-host bila organisasi memiliki aset dan hak penggunaan web yang sesuai. Jika aset web belum tersedia, aplikasi memakai font Aptos yang terpasang di perangkat lalu fallback sistem—tanpa mengambil font dari CDN publik.

```css
:root {
  --font-display: "Aptos Display", "Aptos", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif;
  --font-sans: "Aptos", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
  --font-mono: "Aptos Mono", "Cascadia Mono", "Segoe UI Mono", ui-monospace, monospace;
}
```

| Level | Size | Weight | LH | Tracking | Rationale |
|:---|:---|:---|:---|:---|:---|
| h1 | 1.75rem | 600 | 1.2 | -0.01em | Aptos Display; judul halaman |
| h2 | 1.375rem | 600 | 1.25 | 0 | Aptos Display; section |
| h3 | 1.125rem | 600 | 1.3 | 0 | Aptos Display; judul kartu |
| body | 0.9375rem | 400 | 1.5 | 0 | Metadata |
| caption | 0.8125rem | 500 | 1.4 | 0.01em | Label status, nomor |
| mono | 0.875rem | 500 | 1.4 | 0.02em | Aptos Mono; nomor arsip |

## 6. Layout Strategy & Anti-Repetition Rules
- **Komposisi:** Dilarang pola "Hero → 3 Cards" berulang. Gunakan pola sesuai konten:
  - **Master/Detail split-pane:** daftar arsip (kiri) + preview metadata (kanan) di desktop.
  - **Data table:** antrean approval L1/L2 (kolom: nomor, judul, divisi, tanggal, status, aksi).
  - **Card grid:** hanya dashboard utama (thumbnail-first).
  - **Form layout:** upload arsip (2 kolom: file+metadata).
  - **Timeline:** audit log per dokumen.
- **Grid & Spacing:** 12 kolom, gutter 24px, margin halaman 32px (desktop) / 16px (mobile). Skala spacing: 4, 8, 12, 16, 24, 32, 48px.

## 7. Anti-AI-Slop Rules (Avoid vs. Prefer)
- **Avoid:** Tiga kartu fitur generik. → **Prefer:** Tabel data, list berhierarki, atau split-pane.
- **Avoid:** Setiap section dibungkus rounded card. → **Prefer:** Separasi via whitespace + hairline divider.
- **Avoid:** Gradient ungu/biru, blob mesh glowing. → **Prefer:** Flat neutral + aksen semantik sparse.
- **Avoid:** Ikon dekoratif & badge tanpa makna. → **Prefer:** Hierarki tipografi + label status fungsional.
- **Avoid:** Animasi layout berat. → **Prefer:** Transisi `opacity`/`transform` 150ms untuk feedback.

## 8. Card & Container Discipline
- **Card diizinkan:** item arsip di dashboard grid (draggable/thumbnail), widget statistik laporan, item antrean approval.
- **Card dilarang:** section teks standar, list audit log, form, header halaman.
- **Dilarang card nesting** (Card → Card → Card). Maksimal 1 level surface.

## 9. Component Rules & Action Hierarchy
- **Primary:** solid `--color-accent`, teks putih — hanya 1 per viewport (mis. "Upload Arsip", "Setujui").
- **Secondary:** outline 1px `--color-border`, teks `--color-fg`.
- **Tertiary:** text-only, `--color-muted` → `--color-fg` saat hover.
- **State:** hover (bg tint 4%), focus (ring 2px `--color-accent` offset 2px), disabled (opacity 0.5, cursor not-allowed), selected (border-left 3px `--color-accent`), active (bg 8% tint). Kontras teks ≥ 4.5:1 (WCAG AA).
- **Aksi sensitif:** penolakan wajib membuka dialog catatan; soft delete wajib menampilkan nomor arsip, dampak tindakan, input alasan, dan konfirmasi eksplisit.

## 10. Instant UX Performance Contract (`gas-instant-ux`)

- **Render-first:** app shell, navigasi, judul halaman, dan skeleton harus tampil segera tanpa menunggu Apps Script/Sheets.
- **Single bootstrap:** halaman dashboard melakukan satu request kritis untuk session, permission, statistik utama, antrean ringkas, dan arsip terbaru. Grafik, audit, dan riwayat panjang dimuat setelah konten utama.
- **Scoped loading:** gunakan skeleton pada wilayah yang menunggu data; jangan memblokir seluruh halaman untuk satu widget.
- **No duplicate submit:** tombol mutasi berubah ke loading/disabled dan request memakai idempotency key. Approval, grant, upload, dan soft delete tidak boleh dikirim optimistically.
- **Safe optimistic UI:** hanya untuk filter lokal, membuka/menutup panel, dan menandai notifikasi dibaca; rollback wajib tersedia jika server gagal.
- **Search debounce:** request pencarian dikirim 300 ms setelah input berhenti. Response lama diabaikan bila query terbaru sudah berubah.
- **Pagination:** daftar default 20 item; pilihan 20/50/100. Jangan mengirim atau merender seluruh histori sekaligus.
- **Local reconciliation:** setelah mutasi sukses, perbarui item terkait dan statistik yang terdampak; jangan me-reload seluruh halaman/tabel bila tidak perlu.
- **Reference cache:** divisi, unit, kategori, dan konfigurasi UI disimpan di memory/session cache tanpa menyimpan permission atau credential sensitif.
- **Failure preservation:** input form dan posisi pengguna dipertahankan saat timeout/retry; pesan error menampilkan aksi pemulihan dan `request_id`.
- **Perceived stability:** ukuran skeleton mengikuti konten akhir, area tombol tidak berubah saat loading, dan tabel mempertahankan lebar kolom agar tidak terjadi layout shift.
- **Reduced motion:** transisi maksimal 150 ms dan menghormati `prefers-reduced-motion`.

## 11. Behavioral Responsive Design
- **Desktop (≥1280px):** top nav, split-pane master/detail, tabel full kolom.
- **Tablet (768–1279px):** split-pane → stack vertikal; tabel menyembunyikan kolom sekunder (divisi, tanggal).
- **Mobile (<768px):** top nav → bottom bar (Dashboard, Search, Approval, Profil); kartu grid 1 kolom; filter → bottom sheet; tabel → list item bertumpuk.

## 12. States (Loading, Empty, Error)
- **Loading:** skeleton matching shape — kartu arsip (thumbnail + 2 baris), baris tabel (kolom sesuai lebar). Dilarang spinner infinite generik.
- **Empty:** instruksi kontekstual + aksi. Contoh: *"Belum ada arsip di divisi Anda. Mulai dengan mengunggah dokumen pertama."* + tombol **Upload Arsip**.
- **Error:** alert in-context dengan pesan spesifik (mis. *"Google Sheets sedang tidak dapat diakses. Coba lagi."*) + tombol **Retry** dan `request_id` untuk bantuan teknis.
- **Search state:** saat CacheService cold start atau `SearchIndex` sedang dibangun ulang, tampilkan indikator non-blocking *"Indeks pencarian sedang disegarkan; hasil dapat lebih lambat"*.
- **Upload progress:** tampilkan tahap `Menyiapkan sesi Drive → Mengunggah langsung ke Drive → Memverifikasi → Draft dibuat`. Kegagalan pada tiap tahap harus dapat dilanjutkan/dicoba ulang tanpa membuat arsip ganda.

## 13. Accessibility & Inclusivity (WCAG 2.1 AA)
- Navigasi keyboard penuh (Tab/Shift+Tab/Enter/Esc); focus ring ≥ 2px offset.
- ARIA: `role="status"` untuk badge approval, `aria-live="polite"` untuk notifikasi, `aria-label` pada ikon aksi.
- Touch target minimum 44×44px (mobile).
- Status komunikasi via **teks + ikon**, tidak pernah warna saja (mis. "Final ✓", "Draft — Perlu Revisi !").

## 14. Design Rationale
Split-pane & tabel memetakan langsung ke alur approval dua tingkat (L1 → L2) dan kontrol akses kombinasi divisi-peran: pengguna hanya melihat data divisinya, Approver L2 melihat semua. Kepadatan tinggi (dial 8) diperlukan karena metadata inti (judul, nomor, divisi, kategori, tanggal, serta unit/tags bila tersedia) muncul di setiap baris arsip. Warna semantik memisahkan status approval tanpa mengorbankan netralitas institusional. Tanpa retensi otomatis, arsip bersifat permanen — desain menekankan kejelasan status dan audit trail, bukan urgensi visual.

## 15. NO Invented Design Content Rule
Dilarang membuat testimonial fiktif, logo klien, screenshot abstrak, atau statistik palsu. Semua konten berasal dari scope PRD (FR-01 s/d FR-12) atau mock data yang diturunkan dari fitur nyata (contoh arsip: `ARS/FIN/2025/0042 — Laporan Keuangan Q1`).

## 16. Design Pre-Flight Checklist
- [ ] Design is derived from PRD/project context.
- [ ] Design Read is specific.
- [ ] Design dials are intentional.
- [ ] Visual direction is justified.
- [ ] Color hierarchy is intentional.
- [ ] Typography is intentional.
- [ ] Aptos family is used with licensed local/self-hosted assets or approved system fallbacks.
- [ ] App shell renders before data; critical page data uses one bootstrap request.
- [ ] Search is debounced and stale responses cannot overwrite newer results.
- [ ] Mutations prevent duplicate submission and preserve user input on failure.
- [ ] Large lists use server pagination/lazy loading instead of full-sheet payloads.
- [ ] Cards are not overused.
- [ ] Layouts are not repetitive.
- [ ] No generic AI aesthetic was introduced without justification.
- [ ] Motion has a purpose.
- [ ] Responsive behavior is defined.
- [ ] Loading states are defined where relevant.
- [ ] Empty states are defined where relevant.
- [ ] Error states are defined where relevant.
- [ ] Accessibility is defined.
- [ ] No fake content was invented.
- [ ] Design feels specific to the product.
- [ ] A coding agent can implement the design without inventing major visual decisions.
- [ ] Design System is cohesive and reusable.
