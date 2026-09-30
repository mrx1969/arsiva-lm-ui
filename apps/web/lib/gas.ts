import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import type { ArsivaClaims } from "./auth";

type GasEnvelope<TPayload> = {
  action: string;
  meta: {
    request_id: string;
    timestamp: string;
    nonce: string;
    actor: {
      uid: string;
      username: string;
      email: string;
      name: string;
      role: string;
      division_id: string;
      unit_id: string;
    };
  };
  payload: TPayload;
  signature: string;
};

type GasResponse<TData> = {
  ok: boolean;
  data: TData | null;
  error: { code: string; message: string; details?: unknown[] } | null;
  meta?: Record<string, unknown>;
};

export class GasConfigMissingError extends Error {}

export class GasRequestError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export function hasGasConfig(): boolean {
  return Boolean(process.env.APPS_SCRIPT_API_URL?.trim() && process.env.APPS_SCRIPT_SHARED_SECRET?.trim());
}

export async function callGas<TData, TPayload extends Record<string, unknown> = Record<string, unknown>>(
  action: string,
  payload: TPayload,
  session: ArsivaClaims
): Promise<TData> {
  const url = process.env.APPS_SCRIPT_API_URL?.trim();
  const secret = process.env.APPS_SCRIPT_SHARED_SECRET?.trim();
  if (!url || !secret) throw new GasConfigMissingError("Konfigurasi Apps Script belum diisi.");
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
    throw new GasRequestError("APPS_SCRIPT_URL_INVALID", "Gunakan URL deployment Apps Script yang berakhiran /exec.");
  }

  const envelope = createEnvelope(action, payload, session, secret);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(envelope),
      cache: "no-store",
      signal: AbortSignal.timeout(20000)
    });
  } catch {
    throw new GasRequestError("APPS_SCRIPT_UNREACHABLE", "Koneksi Apps Script gagal atau melewati batas waktu. Coba lagi.");
  }
  if (!response.ok) throw new GasRequestError("APPS_SCRIPT_HTTP_ERROR", "Apps Script tidak dapat dihubungi.");
  let result: GasResponse<TData>;
  try {
    result = (await response.json()) as GasResponse<TData>;
  } catch {
    throw new GasRequestError("APPS_SCRIPT_ACCESS_ERROR", "Apps Script belum menerima request API. Periksa akses deployment dan versi yang aktif.");
  }
  if (!result || typeof result.ok !== "boolean") {
    throw new GasRequestError("APPS_SCRIPT_RESPONSE_INVALID", "Format respons Apps Script tidak sesuai.");
  }
  if (!result.ok || result.data == null) {
    throw new GasRequestError(result.error?.code || "APPS_SCRIPT_ERROR", result.error?.message || "Data Apps Script tidak dapat dimuat.");
  }
  return result.data;
}

export async function checkGasConnection(session: ArsivaClaims) {
  if (!hasGasConfig()) return { ready: false, message: "Konfigurasi koneksi belum lengkap" };
  try {
    const data = await callGas<{ database_ready: boolean; api_only: boolean }>("system.health", {}, session);
    return { ready: data.database_ready && data.api_only, message: data.database_ready && data.api_only ? "Spreadsheet terhubung; akses API aktif" : "Koneksi tersedia; mode API belum aktif" };
  } catch (error) {
    return { ready: false, message: error instanceof GasRequestError ? error.message : "Koneksi Spreadsheet belum dapat diverifikasi" };
  }
}

function createEnvelope<TPayload extends Record<string, unknown>>(
  action: string,
  payload: TPayload,
  session: ArsivaClaims,
  secret: string
): GasEnvelope<TPayload> {
  const meta = {
    request_id: randomUUID(),
    timestamp: new Date().toISOString(),
    nonce: randomUUID(),
    actor: {
      uid: String(session.uid || ""),
      username: String(session.username || ""),
      email: String(session.email || session.username || ""),
      name: String(session.name || session.username || "Pengguna"),
      role: String(session.role || "USER"),
      division_id: String((session as { division_id?: string }).division_id || ""),
      unit_id: String((session as { unit_id?: string }).unit_id || "")
    }
  };
  const canonical = JSON.stringify({ action, meta, payload });
  const signature = createHmac("sha256", secret).update(canonical).digest("base64url");
  return { action, meta, payload, signature };
}
