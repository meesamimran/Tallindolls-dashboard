import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Temporary: lock the demo to the Content/Posts page only.
// All other dashboard routes redirect to /content.
// Remove or rename this file to restore full dashboard access.

const ALLOWED = new Set([
  "/content",
  "/api",
  "/_next",
  "/favicon.ico",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(js|css|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Allow the content page + audio-reel page
  if (pathname === "/content" || pathname === "/audio-reel" || pathname === "/history" || pathname === "/") {
    // Redirect root to /content
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/content", request.url));
    }
    return NextResponse.next();
  }

  // Redirect everything else to /content
  return NextResponse.redirect(new URL("/content", request.url));
}

export const config = {
  matcher: "/((?!_next|api|favicon.ico).*)",
};
