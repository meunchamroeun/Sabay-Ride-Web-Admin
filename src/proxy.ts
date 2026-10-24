import { NextResponse, type NextRequest } from "next/server";
import { API_ENVIRONMENTS, type ApiEnv } from "@/config/env";

/**
 * Forwards /backend/<env>/… to that API without the browser's Origin header.
 *
 * The API runs Spring CORS and answers "403 Invalid CORS request" to any Origin it does not list
 * (it allows localhost:3000, not the deployed domains). The browser only ever talks to this site,
 * so the hop to the API is server-to-server and needs no Origin; dropping it means sign-in works
 * on every domain the dashboard is served from without a CORS entry for each.
 */
export function proxy(request: NextRequest) {
  const [, , env, ...rest] = request.nextUrl.pathname.split("/"); // "", "backend", env, …path
  const base = API_ENVIRONMENTS[env as ApiEnv];
  if (!base) return NextResponse.next();

  const target = new URL(`${base}/${rest.join("/")}${request.nextUrl.search}`);
  const headers = new Headers(request.headers);
  headers.delete("origin");
  headers.delete("referer");

  // Backend bug (reported): sign-in fails with 409 CONSTRAINT_VIOLATION when the client IP is
  // IPv6. Send IPv4-mapped addresses as plain IPv4; for other IPv6 clients forward no client IP
  // so the API records the connection address instead, rather than rejecting the sign-in.
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded
      .split(",")
      .map((ip) => ip.trim().replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i, "$1"))
      .filter((ip) => ip && !ip.includes(":"));
    if (ips.length) headers.set("x-forwarded-for", ips.join(", "));
    else headers.delete("x-forwarded-for");
  }
  const realIp = headers.get("x-real-ip");
  if (realIp?.includes(":")) headers.delete("x-real-ip");

  return NextResponse.rewrite(target, { request: { headers } });
}

// Must be a literal (read at build time); keep in sync with config.proxyPath.
export const config = {
  matcher: "/backend/:path*",
};
