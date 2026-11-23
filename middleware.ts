import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith("/admin") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Allow explicit session-expired redirect to clear stale HttpOnly cookie on /login
  if (pathname === "/login" && request.nextUrl.searchParams.get("expired") === "1") {
    const res = NextResponse.next();
    res.cookies.delete("admin_token");
    return res;
  }

  // Prevent logged in user from going back to /login
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
