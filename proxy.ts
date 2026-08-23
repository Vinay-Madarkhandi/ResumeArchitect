import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/proxy";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/auth-confirm"];
const AUTH_PATHS = ["/sign-in", "/sign-up"];
const ONBOARDING_PREFIX = "/onboarding";
// /onboarding/upload and /onboarding/review are also the "replace master
// resume" flow reached from the Library, so an already-onboarded user must
// still be able to visit them — only the one-time steps below force a
// completed user back to /library.
const ONBOARDING_ONLY_PATHS = ["/onboarding", "/onboarding/profile", "/onboarding/connect-gemini"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse, user } = await createClient(request);
  const { pathname } = request.nextUrl;

  if (!user) {
    if (isPublicPath(pathname)) return supabaseResponse;
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Authenticated from here on.
  if (AUTH_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/library", request.url));
  }

  const isOnboardingPath = pathname.startsWith(ONBOARDING_PREFIX);
  const needsOnboardingCheck = isOnboardingPath || !isPublicPath(pathname);

  if (needsOnboardingCheck) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .single();

    const onboarded = Boolean(profile?.onboarding_completed_at);

    if (!onboarded && !isOnboardingPath && !isPublicPath(pathname)) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    if (onboarded && ONBOARDING_ONLY_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL("/library", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, fonts, images
     * - api routes handle their own auth checks per-endpoint
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
