import { checkOrigin } from "@/lib/auth/guards";
import { sessionToken, writeSession } from "@/lib/auth/current-user";
import { validateSession } from "@/lib/auth/sessions";

export async function POST(request: Request) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const token = await sessionToken();
  const session = token ? await validateSession(token, true) : null;
  if (!session || !token) return new Response(null, { status: 401 });
  await writeSession({ token, expiresAt: session.expiresAt });
  return new Response(null, { status: 204 });
}
