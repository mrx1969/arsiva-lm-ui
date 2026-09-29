import { NextRequest, NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) throw new HttpError(403, "Permintaan tidak diizinkan.");
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
  console.error("Unhandled request error", error);
  return NextResponse.json({ ok: false, message: "Terjadi kendala pada server. Silakan coba lagi." }, { status: 500 });
}
