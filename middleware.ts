import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { normalizeHost } from "@/server/tenant/normalize-host";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const normalizedHost = normalizeHost(request.headers.get("host"));

  requestHeaders.set("x-tenant-host", normalizedHost);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

