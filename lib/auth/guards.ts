import { appUrl } from "./config";

export function checkOrigin(request: Request): Response | undefined {
  if (request.headers.get("origin") !== appUrl().origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
}
