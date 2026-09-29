import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import { readSession, SESSION_COOKIE } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await readSession(false);
    if (session) await getFirebaseAuth().revokeRefreshTokens(session.uid);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
