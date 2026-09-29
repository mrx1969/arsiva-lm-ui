import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import { requireSuperAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse, HttpError } from "@/lib/http";
import { validatePassword } from "@/lib/password-policy";
import { emailToUsername, normalizeUsername, usernameToEmail, validateUsername } from "@/lib/username";

export const runtime = "nodejs";
const ALLOWED_ROLES = new Set(["SUPER_ADMIN", "ADMIN_DIVISION", "VERIFIER", "USER"]);

export async function GET() {
  try {
    await requireSuperAdmin();
    const result = await getFirebaseAuth().listUsers(500);
    const users = result.users.map((user) => ({
      uid: user.uid,
      username: String(user.customClaims?.username || emailToUsername(user.email)),
      displayName: user.displayName || "—",
      role: String(user.customClaims?.role || "USER"),
      disabled: user.disabled,
      forcePasswordChange: user.customClaims?.forcePasswordChange === true,
      lastSignIn: user.metadata.lastSignInTime || null
    }));
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireSuperAdmin();
    const body = await request.json();
    const username = normalizeUsername(body.username);
    const displayName = String(body.displayName ?? "").trim();
    const temporaryPassword = String(body.temporaryPassword ?? "");
    const role = String(body.role ?? "USER").trim().toUpperCase();
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(temporaryPassword);
    if (usernameError) throw new HttpError(400, usernameError);
    if (!displayName || displayName.length > 100) throw new HttpError(400, "Nama pengguna wajib diisi, maksimal 100 karakter.");
    if (passwordError) throw new HttpError(400, passwordError);
    if (!ALLOWED_ROLES.has(role)) throw new HttpError(400, "Peran pengguna tidak valid.");

    const firebaseAuth = getFirebaseAuth();
    const user = await firebaseAuth.createUser({
      email: usernameToEmail(username),
      emailVerified: true,
      password: temporaryPassword,
      displayName,
      disabled: false
    });
    await firebaseAuth.setCustomUserClaims(user.uid, { username, role, forcePasswordChange: true });
    return NextResponse.json({ ok: true, uid: user.uid, message: "Akun dibuat. Pengguna wajib mengganti password saat login pertama." }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "auth/email-already-exists") {
      return errorResponse(new HttpError(409, "Username tersebut sudah digunakan."));
    }
    return errorResponse(error);
  }
}
