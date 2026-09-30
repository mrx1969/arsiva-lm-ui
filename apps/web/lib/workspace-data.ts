import "server-only";
import type { ArsivaClaims } from "./auth";
import { callGas, GasConfigMissingError, GasRequestError, hasGasConfig } from "./gas";

export type SummaryMetric = { label: string; value: string; accent: "navy" | "teal" | "yellow" | "muted" };
export type ArchiveRow = { number: string; title: string; owner: string; category: string; status: string; location: string; updatedAt: string };
export type VerificationTask = { title: string; submittedBy: string; unit: string; due: string; status: string };
export type StorageLocation = { code: string; name: string; detail: string; capacity: string; barcode: string };
export type MasterRow = { code: string; name: string; description: string; status: string };
export type WorkspaceSource = "placeholder" | "gas" | "gas-error";

type GasDashboard = {
  stats?: { total?: number; draft?: number; pending_verification?: number; final?: number };
  latest_archives?: GasArchive[];
  verification_tasks?: GasTask[];
};

type GasArchivePage = { rows?: GasArchive[] };
type GasMaster = { divisions?: GasMasterRow[]; units?: GasMasterRow[]; locations?: GasLocation[]; boxes?: GasBox[] };
type GasArchive = {
  archive_number?: string;
  title?: string;
  division_name?: string;
  unit_name?: string;
  category_name?: string;
  status?: string;
  location_label?: string;
  updated_at?: string;
};
type GasTask = { archive_title?: string; archive_number?: string; due_at?: string; status?: string };
type GasLocation = { code?: string; name?: string; type?: string; status?: string; notes?: string; capacity?: number; barcode_value?: string };
type GasBox = { code?: string; label?: string; status?: string; capacity?: number; occupancy?: number; barcode_value?: string };
type GasMasterRow = { code?: string; name?: string; is_active?: boolean; description?: string };

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

export async function getDashboardWorkspace(session: ArsivaClaims) {
  if (!hasGasConfig()) return { source: "placeholder" as WorkspaceSource, metrics: summaryMetrics, archives: archiveRows, tasks: verificationTasks };
  try {
    const data = await callGas<GasDashboard>("dashboard.bootstrap", {}, session);
    return {
      source: "gas" as WorkspaceSource,
      metrics: metricsFromStats(data.stats, data.verification_tasks?.length || 0),
      archives: (data.latest_archives || []).map(mapArchive),
      tasks: (data.verification_tasks || []).map(mapTask)
    };
  } catch (error) {
    if (!(error instanceof GasConfigMissingError) && !(error instanceof GasRequestError)) console.error(error);
    return { source: "gas-error" as WorkspaceSource, metrics: summaryMetrics, archives: archiveRows, tasks: verificationTasks };
  }
}

export async function getArchiveWorkspace(session: ArsivaClaims) {
  if (!hasGasConfig()) return { source: "placeholder" as WorkspaceSource, archives: archiveRows };
  try {
    const data = await callGas<GasArchivePage>("archives.list", { page: 1, page_size: 20 }, session);
    return { source: "gas" as WorkspaceSource, archives: (data.rows || []).map(mapArchive) };
  } catch (error) {
    if (!(error instanceof GasConfigMissingError) && !(error instanceof GasRequestError)) console.error(error);
    return { source: "gas-error" as WorkspaceSource, archives: archiveRows };
  }
}

export async function getMasterWorkspace(session: ArsivaClaims) {
  if (!hasGasConfig()) return { source: "placeholder" as WorkspaceSource, divisions, units, locations: storageLocations };
  try {
    const data = await callGas<GasMaster>("master.bootstrap", {}, session);
    return {
      source: "gas" as WorkspaceSource,
      divisions: (data.divisions || []).map(mapMaster),
      units: (data.units || []).map(mapMaster),
      locations: [...(data.locations || []).map(mapLocation), ...(data.boxes || []).map(mapBox)]
    };
  } catch (error) {
    if (!(error instanceof GasConfigMissingError) && !(error instanceof GasRequestError)) console.error(error);
    return { source: "gas-error" as WorkspaceSource, divisions, units, locations: storageLocations };
  }
}

function metricsFromStats(stats: GasDashboard["stats"], pendingTasks: number): SummaryMetric[] {
  return [
    { label: "Total arsip", value: String(stats?.total || 0), accent: "navy" },
    { label: "Draft", value: String(stats?.draft || 0), accent: "muted" },
    { label: "Menunggu verifikasi", value: String(stats?.pending_verification || 0), accent: "yellow" },
    { label: "Tersimpan", value: String(stats?.final || 0), accent: "teal" },
    { label: "Perlu tindakan", value: String(pendingTasks), accent: "yellow" }
  ];
}

function mapArchive(item: GasArchive): ArchiveRow {
  return {
    number: item.archive_number || "-",
    title: item.title || "Tanpa judul",
    owner: item.unit_name || item.division_name || "-",
    category: item.category_name || "-",
    status: humanizeStatus(item.status),
    location: item.location_label || "Belum ditempatkan",
    updatedAt: formatDate(item.updated_at)
  };
}

function mapTask(item: GasTask): VerificationTask {
  return {
    title: item.archive_title || item.archive_number || "Pengajuan arsip",
    submittedBy: item.archive_number || "Arsip",
    unit: "Verifikasi",
    due: formatDate(item.due_at),
    status: humanizeStatus(item.status)
  };
}

function mapMaster(item: GasMasterRow): MasterRow {
  return {
    code: item.code || "-",
    name: item.name || "-",
    description: item.description || "Master data dari Spreadsheet",
    status: item.is_active === false ? "Nonaktif" : "Aktif"
  };
}

function mapLocation(item: GasLocation): StorageLocation {
  return {
    code: item.code || "-",
    name: item.name || "-",
    detail: item.notes || item.type || "Lokasi fisik",
    capacity: item.capacity ? String(item.capacity) : humanizeStatus(item.status),
    barcode: item.barcode_value || "-"
  };
}

function mapBox(item: GasBox): StorageLocation {
  return {
    code: item.code || "-",
    name: item.label || item.code || "-",
    detail: "Boks arsip",
    capacity: `${item.occupancy || 0}/${item.capacity || 0}`,
    barcode: item.barcode_value || "-"
  };
}

function humanizeStatus(value?: string): string {
  const status = String(value || "").replaceAll("_", " ").toLowerCase();
  if (!status) return "-";
  return status.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
