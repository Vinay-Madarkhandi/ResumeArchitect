import { clipperPreflight, withClipperToken } from "@/lib/server/clipper-api";

export function OPTIONS(request: Request) {
  return clipperPreflight(request, "GET");
}

export function GET(request: Request) {
  return withClipperToken(request, async (user, headers) => Response.json(user, { headers }));
}
