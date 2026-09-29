import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAuth } from "./firebase-admin";
import { HttpError } from "./http";

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME?.trim() || "arsiva_session";
export const SESSION_MAX_AGE_SECONDS = Number(process.env.SESSION_MAX_AGE_SECONDS || 28800);

export type ArsivaClaims = DecodedIdToken & {
  username?: string;
  role?: string;
  forcePasswordChange?: boolean;
};

export async function readSession(checkRevoked = true): Promise<ArsivaClaims | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    return (await getFirebaseAuth().verifySessionCookie(value, checkRevoked)) as ArsivaClaims;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<ArsivaClaims> {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.forcePasswordChange) redirect("/change-password");
  return session;
}

export async function requireSuperAdmin(): Promise<ArsivaClaims> {
  const session = await readSession();
  if (!session) throw new HttpError(401, "Sesi Anda telah berakhir. Silakan login kembali.");
  if (session.forcePasswordChange) throw new HttpError(403, "Password sementara harus diganti terlebih dahulu.");
  if (session.role !== "SUPER_ADMIN") throw new HttpError(403, "Akses ini hanya tersedia untuk Super Admin.");
  return session;
}
