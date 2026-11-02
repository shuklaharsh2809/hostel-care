import { NextResponse, type NextRequest } from "next/server";
const SESSION_COOKIE = "hc_token";

// Optimistic check only: real authorization happens in requireUser() on every page/action.
export function proxy(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*"] };
