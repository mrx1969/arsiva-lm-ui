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

  const envelope = createEnvelope(action, payload, session, secret);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(envelope),
    cache: "no-store"
  });
  if (!response.ok) throw new GasRequestError("APPS_SCRIPT_HTTP_ERROR", "Apps Script tidak dapat dihubungi.");
  const result = (await response.json()) as GasResponse<TData>;
  if (!result.ok || !result.data) {
    throw new GasRequestError(result.error?.code || "APPS_SCRIPT_ERROR", result.error?.message || "Data Apps Script tidak dapat dimuat.");
  }
  return result.data;
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
