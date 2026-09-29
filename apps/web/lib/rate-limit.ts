import { HttpError } from "./http";

type Entry = { count: number; resetAt: number };
const attempts = new Map<string, Entry>();

export function enforceLoginRateLimit(key: string, limit = 8, windowMs = 15 * 60 * 1000): void {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) throw new HttpError(429, "Terlalu banyak percobaan login. Tunggu 15 menit lalu coba lagi.");
  current.count += 1;
}

export function clearLoginRateLimit(key: string): void {
  attempts.delete(key);
}
