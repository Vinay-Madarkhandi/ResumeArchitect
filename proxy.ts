import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (request.cookies.has("ra_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  const destination = `${url.pathname}${url.search}`;
  url.pathname = "/sign-in";
  url.search = "";
  url.searchParams.set("redirect", destination);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/new/:path*", "/settings/:path*", "/onboarding/:path*", "/resumes/:path*", "/admin/:path*", "/library", "/new-tailoring"],
};
