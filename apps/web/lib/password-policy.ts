export function validatePassword(password: unknown): string | null {
  const value = String(password ?? "");
  if (value.length < 12 || value.length > 128) return "Password harus terdiri dari 12–128 karakter.";
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return "Password harus memuat huruf besar, huruf kecil, angka, dan simbol.";
  }
  return null;
}
