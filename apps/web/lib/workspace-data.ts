export type SummaryMetric = { label: string; value: string; accent: "navy" | "teal" | "yellow" | "muted" };
export type ArchiveRow = { number: string; title: string; owner: string; category: string; status: string; location: string; updatedAt: string };
export type VerificationTask = { title: string; submittedBy: string; unit: string; due: string; status: string };
export type StorageLocation = { code: string; name: string; detail: string; capacity: string; barcode: string };
export type MasterRow = { code: string; name: string; description: string; status: string };

export const summaryMetrics: SummaryMetric[] = [
  { label: "Total arsip", value: "0", accent: "navy" },
  { label: "Draft", value: "0", accent: "muted" },
  { label: "Menunggu verifikasi", value: "0", accent: "yellow" },
  { label: "Tersimpan", value: "0", accent: "teal" },
  { label: "Perlu tindakan", value: "0", accent: "yellow" }
];

export const archiveRows: ArchiveRow[] = [
  { number: "LM-ARS-00001", title: "Dokumen contoh pengajuan arsip", owner: "Unit Operasional", category: "Administrasi", status: "Draft", location: "Belum ditempatkan", updatedAt: "Menunggu integrasi data" },
  { number: "LM-ARS-00002", title: "Metadata arsip fisik dan digital", owner: "Divisi Internal", category: "Kelembagaan", status: "Menunggu Verifikasi", location: "Rak A / Tingkat 1", updatedAt: "Menunggu integrasi data" }
];

export const verificationTasks: VerificationTask[] = [
  { title: "Pengajuan arsip dari unit kerja", submittedBy: "Akun unit", unit: "Unit independen", due: "Hari ini", status: "Antrean" },
  { title: "Cek metadata dan lampiran Drive", submittedBy: "Petugas arsip", unit: "Lintas divisi", due: "Setelah upload aktif", status: "Belum terhubung" }
];

export const storageLocations: StorageLocation[] = [
  { code: "R-01-A-01", name: "Ruang Arsip / Rak A / Tingkat 1", detail: "Lokasi utama arsip tersentral", capacity: "Siap dipakai", barcode: "ARS-R01-A01" },
  { code: "R-01-B-01", name: "Ruang Arsip / Rak B / Tingkat 1", detail: "Cadangan saat rak A penuh", capacity: "Cadangan", barcode: "ARS-R01-B01" }
];

export const divisions: MasterRow[] = [
  { code: "DIV-01", name: "Divisi Akademik", description: "Master divisi berdiri sendiri", status: "Aktif" },
  { code: "DIV-02", name: "Divisi Keuangan", description: "Tidak menjadi induk wajib untuk unit", status: "Aktif" },
  { code: "DIV-03", name: "Divisi Operasional", description: "Dapat dipakai untuk cakupan akses", status: "Aktif" }
];

export const units: MasterRow[] = [
  { code: "UNT-01", name: "Unit Tata Usaha", description: "Unit independen tanpa relasi wajib ke divisi", status: "Aktif" },
  { code: "UNT-02", name: "Unit Arsip", description: "Pengelola fisik dan digital", status: "Aktif" },
  { code: "UNT-03", name: "Unit IT dan Aset", description: "Akses teknis aplikasi", status: "Aktif" }
];
