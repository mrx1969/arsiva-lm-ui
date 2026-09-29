const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,38}[a-z0-9])?$/;

export function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return "Username harus 3–40 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda hubung.";
  }
  return null;
}

export function usernameToEmail(username: string): string {
  const domain = process.env.AUTH_USERNAME_DOMAIN?.trim() || "users.arsiva.internal";
  return `${normalizeUsername(username)}@${domain}`;
}

export function emailToUsername(email?: string | null): string {
  return String(email ?? "").split("@")[0] || "pengguna";
}
