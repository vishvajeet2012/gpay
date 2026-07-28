import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "admin_session";
const ADMIN_SESSION_VALUE = "vj_admin_session_ok_v1";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin (except login page)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = req.cookies.get(ADMIN_COOKIE)?.value;
    if (session !== ADMIN_SESSION_VALUE) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  // If already logged in, skip login page
  if (pathname === "/admin/login") {
    const session = req.cookies.get(ADMIN_COOKIE)?.value;
    if (session === ADMIN_SESSION_VALUE) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
