// Redirects only. It checks that a session cookie EXISTS, not that it's
// valid; Express does the real check on every API call.
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { PROTECTED_PATHS } from "shared/constants/auth";

const AUTH_PAGES = ["/signin", "/signup"];

const isProtected = (pathname) =>
  PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(getSessionCookie(request));

  if (!signedIn && isProtected(pathname)) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  if (signedIn && (pathname === "/" || AUTH_PAGES.includes(pathname))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/signin",
    "/signup",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/profile/:path*",
    "/cvs/:path*",
    "/tracker/:path*",
    "/settings/:path*",
  ],
};
