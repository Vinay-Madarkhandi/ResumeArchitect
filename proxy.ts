import { type NextRequest, NextResponse } from "next/server";
import { DESTINATION_HEADER, requiresSignIn, signInPath } from "@/lib/auth/protected-paths";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.delete(DESTINATION_HEADER);
  if (requiresSignIn(pathname)) {
    const destination = `${pathname}${search}`;
    if (!request.cookies.has("ra_session")) return NextResponse.redirect(new URL(signInPath(destination), request.url));
    headers.set(DESTINATION_HEADER, destination);
  }
  return NextResponse.next({ request: { headers } });
}

// Matchers must be literals, so the proxy runs on every page and checks the shared list.
export const config = {
  matcher: ["/((?!api/|_next/|.*\\.[^/]+$).*)"],
};
