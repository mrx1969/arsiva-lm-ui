import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import { assertSameOrigin, errorResponse, HttpError } from "@/lib/http";
import { clearLoginRateLimit, enforceLoginRateLimit } from "@/lib/rate-limit";
import { normalizeUsername, usernameToEmail, validateUsername } from "@/lib/username";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export const runtime = "nodejs";

type IdentityResponse = { idToken?: string; error?: { message?: string } };

function safeLoginMessage(code: string): string {
  if (code.includes("TOO_MANY_ATTEMPTS")) return "Akun sementara dikunci karena terlalu banyak percobaan. Coba kembali beberapa saat lagi.";
  if (code.includes("USER_DISABLED")) return "Akun ini dinonaktifkan. Hubungi Super Admin.";
  return "Username atau password tidak sesuai.";
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const username = normalizeUsername(body.username);
    const password = String(body.password ?? "");
    if (validateUsername(username) || !password) throw new HttpError(400, "Username dan password wajib diisi.");

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const rateKey = `${forwarded || "unknown"}:${username}`;
    enforceLoginRateLimit(rateKey);

    const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
    if (!apiKey) throw new Error("FIREBASE_WEB_API_KEY belum diisi.");
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: usernameToEmail(username), password, returnSecureToken: true }),
      cache: "no-store"
    });
    const result = (await response.json()) as IdentityResponse;
    if (!response.ok || !result.idToken) throw new HttpError(401, safeLoginMessage(result.error?.message || "INVALID_LOGIN_CREDENTIALS"));

    const firebaseAuth = getFirebaseAuth();
    const claims = await firebaseAuth.verifyIdToken(result.idToken, true);
    const sessionCookie = await firebaseAuth.createSessionCookie(result.idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000
    });
    clearLoginRateLimit(rateKey);

    const nextResponse = NextResponse.json({ ok: true, forcePasswordChange: claims.forcePasswordChange === true });
    nextResponse.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS
    });
    return nextResponse;
  } catch (error) {
    return errorResponse(error);
  }
}
