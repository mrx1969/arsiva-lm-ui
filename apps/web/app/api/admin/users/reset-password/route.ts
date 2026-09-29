import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import { requireSuperAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse, HttpError } from "@/lib/http";
import { validatePassword } from "@/lib/password-policy";
import { normalizeUsername, usernameToEmail, validateUsername } from "@/lib/username";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const username = normalizeUsername(body.username);
    const temporaryPassword = String(body.temporaryPassword ?? "");
    if (validateUsername(username)) throw new HttpError(400, "Username tidak valid.");
    const passwordError = validatePassword(temporaryPassword);
    if (passwordError) throw new HttpError(400, passwordError);

    const firebaseAuth = getFirebaseAuth();
    const target = await firebaseAuth.getUserByEmail(usernameToEmail(username));
    if (target.uid === admin.uid) throw new HttpError(400, "Gunakan menu Ganti Password untuk akun Anda sendiri.");
    await firebaseAuth.updateUser(target.uid, { password: temporaryPassword });
    await firebaseAuth.setCustomUserClaims(target.uid, { ...(target.customClaims || {}), forcePasswordChange: true });
    await firebaseAuth.revokeRefreshTokens(target.uid);
    return NextResponse.json({ ok: true, message: "Password sementara berhasil disetel. Semua sesi pengguna telah dicabut." });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "auth/user-not-found") {
      return errorResponse(new HttpError(404, "Akun tidak ditemukan."));
    }
    return errorResponse(error);
  }
}
