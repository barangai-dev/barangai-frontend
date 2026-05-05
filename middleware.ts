import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/assessments") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/activities") ||
    pathname.startsWith("/quizzes") ||
    pathname.startsWith("/statistics") ||
    pathname.startsWith("/chatbot") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/pre-assessment");

  const isAuthRoute = pathname === "/auth";

  if (isProtectedRoute && !token) {
    const authUrl = new URL("/auth", request.url);
    authUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(authUrl);
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/assessments/:path*",
    "/settings/:path*",
    "/courses/:path*",
    "/activities/:path*",
    "/quizzes/:path*",
    "/statistics/:path*",
    "/chatbot/:path*",
    "/admin/:path*",
    "/pre-assessment/:path*",
    "/auth",
  ],
};