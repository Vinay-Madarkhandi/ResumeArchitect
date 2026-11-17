/**
 * Only same-origin paths survive: "/x" yes; "//evil.com", "/\\evil.com",
 * "/\t/evil.com" (the URL parser strips tabs and newlines) and absolute URLs no.
 */
export function safeRedirect(target: string | null | undefined, fallback = "/dashboard"): string {
  if (!target || !target.startsWith("/")) return fallback;
  try {
    const base = "http://same.invalid";
    const url = new URL(target, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
