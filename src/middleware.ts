import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Better Auth sets either cookie name depending on whether the connection is HTTPS
  const session =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!session) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!auth|api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|apple-touch-icon.png).*)",
  ],
};
