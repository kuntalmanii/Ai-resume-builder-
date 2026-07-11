/**
 * Next.js Proxy (formerly Middleware) for route protection.
 * Client-side auth guard handles redirects in Sprint 1.
 * Cookie-based server-side protection will be added in Sprint 4.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest): NextResponse {
  // Pass-through in Sprint 1 — client-side guard in (dashboard)/layout.tsx handles auth.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
