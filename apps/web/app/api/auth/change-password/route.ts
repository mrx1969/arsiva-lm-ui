import { NextRequest, NextResponse } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/auth";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import { assertSameOrigin, errorResponse, HttpError } from "@/lib/http";
import { validatePassword } from "@/lib/password-policy";
import { emailToUsername, usernameToEmail } from "@/lib/username";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await readSession();
    if (!session) throw new HttpError(401, "Sesi Anda telah berakhir. Silakan login kembali.");
    const body = await request.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    const confirmation = String(body.confirmation ?? "");
    const passwordError = validatePassword(newPassword);
    if (!currentPassword) throw new HttpError(400, "Password saat ini wajib diisi.");
    if (passwordError) throw new HttpError(400, passwordError);
    if (newPassword !== confirmation) throw new HttpError(400, "Konfirmasi password baru tidak sama.");
    if (newPassword === currentPassword) throw new HttpError(400, "Password baru harus berbeda dari password saat ini.");

    const username = String(session.username || emailToUsername(session.email));
    const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
    if (!apiKey) throw new Error("FIREBASE_WEB_API_KEY belum diisi.");
    const check = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: usernameToEmail(username), password: currentPassword, returnSecureToken: true }),
      cache: "no-store"
    });
    if (!check.ok) throw new HttpError(401, "Password saat ini tidak sesuai.");

    const firebaseAuth = getFirebaseAuth();
    const user = await firebaseAuth.getUser(session.uid);
    await firebaseAuth.updateUser(session.uid, { password: newPassword });
    await firebaseAuth.setCustomUserClaims(session.uid, { ...(user.customClaims || {}), forcePasswordChange: false });
    await firebaseAuth.revokeRefreshTokens(session.uid);

    const response = NextResponse.json({ ok: true, message: "Password berhasil diperbarui. Silakan login kembali." });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
