const base = "http://same.invalid";
// A path that a browser, router or upstream server could read as another host.
const offSite = /^\/[\\/]|[\u0000-\u001f\u007f]/;

/**
 * Only same-site paths survive. The check runs on the path this returns, raw and
 * decoded, because dot segments ("/.//evil.com") and escapes ("/%2F/evil.com")
 * can turn an input that starts with one slash into "//evil.com".
 */
export function safeRedirect(target: string | null | undefined, fallback = "/dashboard"): string {
  if (!target?.startsWith("/")) return fallback;
  try {
    const url = new URL(target, base);
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (url.origin !== base || offSite.test(path) || offSite.test(decodeURIComponent(url.pathname))) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
