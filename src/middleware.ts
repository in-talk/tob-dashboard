import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { rolesForPage } from "@/lib/auth/roles";

// Deny-by-default gate. Every page and API route requires a valid session
// JWT, except the handful of public paths below. This only verifies the JWT
// (signature + expiry) because the edge runtime cannot reach Postgres; the
// full check (account active, token not revoked, role, client scope) happens
// again in each API route (withApiAuth) and page (withAuth).

const PUBLIC_PAGES = new Set(["/signin", "/unauthorize"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PAGES.has(pathname)) return true;
  // NextAuth's own endpoints (csrf, callback, session, signout, providers).
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.id || !token.role) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // API routes do their own role checks (they vary per route and method).
  if (isApi) return NextResponse.next();

  const allowed = rolesForPage(pathname);
  if (!allowed.includes(token.role as never)) {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorize";
    url.search = "?reason=forbidden";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals and static images/fonts.
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)",
  ],
};
