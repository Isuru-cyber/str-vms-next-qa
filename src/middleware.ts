import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("str_vms_session")?.value;

  // 1. If user is on the login page and already has a session token, redirect to dashboard
  if (pathname === "/login") {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // 2. Protect API routes (except public auth endpoints)
  if (pathname.startsWith("/api/")) {
    const isPublicApi =
      pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/logout");

    if (!isPublicApi && !token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Session required." },
        { status: 401 }
      );
    }

    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // 3. Protect all other application dashboard routes
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    const safeFrom = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
    loginUrl.searchParams.set("from", safeFrom);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org; connect-src 'self' https://*.supabase.co;"
  );
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
