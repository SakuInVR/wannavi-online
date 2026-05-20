import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ID = process.env.ADMIN_BASIC_AUTH_ID;
const ADMIN_PW = process.env.ADMIN_BASIC_AUTH_PW;

export function proxy(request: NextRequest) {
  // Only protect /admin routes
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // If credentials are not configured, block all admin access
  if (!ADMIN_ID || !ADMIN_PW) {
    return new NextResponse("Admin access not configured", { status: 503 });
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Admin Area"',
      },
    });
  }

  // Parse Basic Auth
  const [, encoded] = authHeader.split(" ");
  const decoded = atob(encoded ?? "");
  const [id, pw] = decoded.split(":");

  if (id !== ADMIN_ID || pw !== ADMIN_PW) {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Admin Area"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
