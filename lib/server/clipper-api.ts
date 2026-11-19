import { requestDetails } from "@/lib/auth/current-user";
import { authenticatePersonalToken, readBearer } from "@/lib/auth/personal-tokens";
import { rateLimit } from "@/lib/cache/rateLimit";
import { logger } from "@/lib/logger";

function allowedExtensionOrigin(origin: string) {
  return /^(chrome-extension:\/\/[a-p]{32}|moz-extension:\/\/[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12})$/.test(origin)
    && (process.env.CLIPPER_EXTENSION_ORIGINS ?? "").split(",").some((entry) => entry.trim() === origin);
}

function responseHeaders(origin: string | null) {
  const headers = new Headers({ Vary: "Origin", "Cache-Control": "no-store" });
  if (origin && allowedExtensionOrigin(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

export function clipperPreflight(request: Request, method: "GET" | "POST") {
  const origin = request.headers.get("origin");
  const headers = responseHeaders(origin);
  headers.append("Vary", "Access-Control-Request-Method, Access-Control-Request-Headers");
  if (!headers.has("Access-Control-Allow-Origin") || request.headers.get("access-control-request-method") !== method) {
    return new Response(null, { status: 403, headers });
  }
  headers.set("Access-Control-Allow-Methods", method);
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Max-Age", "600");
  return new Response(null, { status: 204, headers });
}

type TokenUser = NonNullable<Awaited<ReturnType<typeof authenticatePersonalToken>>>;
export async function withClipperToken(request: Request, run: (user: TokenUser, headers: Headers) => Promise<Response>) {
  const origin = request.headers.get("origin");
  const headers = responseHeaders(origin);
  const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });
  const limited = (seconds: number) => {
    headers.set("Retry-After", String(seconds));
    return error("Too many requests. Try again shortly.", 429);
  };

  if (origin !== null && !headers.has("Access-Control-Allow-Origin")) return error("Extension origin is not allowed.", 403);
  try {
    const { ip } = await requestDetails();
    const ipWait = await rateLimit("clipper-ip", ip ?? "unknown", 180, 60_000);
    if (ipWait > 0) return limited(ipWait);

    const token = readBearer(request.headers.get("authorization"));
    const user = token ? await authenticatePersonalToken(token) : undefined;
    if (!user) {
      headers.set("WWW-Authenticate", "Bearer");
      return error("A valid personal API token is required.", 401);
    }
    const userWait = await rateLimit("clipper-user", user.id, 60, 60_000);
    if (userWait > 0) return limited(userWait);
    return await run(user, headers);
  } catch {
    logger.error("Clipper API request failed");
    return error("Couldn't complete the request. Try again.", 500);
  }
}
