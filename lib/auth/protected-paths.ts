import { safeRedirect } from "@/lib/safeRedirect";

// The sections that need a signed-in user. proxy.ts sends signed-out visits to
// sign-in with their destination and passes it on for requireUser(), which does
// the same when the cookie turns out to be stale.
const signedInSections = [
  "dashboard", "tracker", "new", "settings", "onboarding", "resumes", "linkedin", "interview", "cover-letter",
];

export const DESTINATION_HEADER = "x-ra-destination";

export const requiresSignIn = (pathname: string) =>
  signedInSections.some((section) => pathname === `/${section}` || pathname.startsWith(`/${section}/`));

export function signInPath(destination: string | null | undefined) {
  const redirect = safeRedirect(destination, "");
  return redirect ? `/sign-in?${new URLSearchParams({ redirect })}` : "/sign-in";
}
