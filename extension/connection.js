export const api = globalThis.browser ?? globalThis.chrome;

export function resolveServer(value) {
  const url = new URL(value.trim());
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:"))
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Enter the HTTPS origin of your server, or an HTTP localhost URL.");
  }
  return url;
}

export async function serverRequest(server, token, path, data) {
  const origin = resolveServer(server);
  if (!/^ra_pat_[\w-]{43}$/.test(token)) throw new Error("Enter a valid ResumeArchitect token.");
  const headers = { Authorization: `Bearer ${token}` };
  if (data) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(new URL(path, origin), {
      method: data ? "POST" : "GET",
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Couldn’t reach your server. Check the URL and the clipper’s site permission.");
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || `Server returned HTTP ${response.status}.`);
  if (!result) throw new Error("The server didn’t return a ResumeArchitect response.");
  return result;
}
