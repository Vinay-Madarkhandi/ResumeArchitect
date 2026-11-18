import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isIP } from "node:net";
import { DESTINATION_HEADER, signInPath } from "./protected-paths";
import { validateSession } from "./sessions";

export const SESSION_COOKIE = "ra_session";
export const sessionOptions = { httpOnly: true, secure: true, sameSite: "lax", path: "/" } as const;
export const sessionToken = async () => (await cookies()).get(SESSION_COOKIE)?.value;

export const currentUser = cache(async () => {
  const token = await sessionToken();
  return token ? validateSession(token) : null;
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect(signInPath((await headers()).get(DESTINATION_HEADER)));
  return user;
}

export async function requestDetails() {
  const values = await headers();
  // The last address is appended by the trusted ingress.
  const reported = values.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "";
  return { ip: isIP(reported) ? reported : null, userAgent: values.get("user-agent")?.slice(0, 512) ?? null };
}

export async function writeSession(session: { token: string; expiresAt: string }) {
  (await cookies()).set(SESSION_COOKIE, session.token, { ...sessionOptions, expires: new Date(session.expiresAt) });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, "", { ...sessionOptions, maxAge: 0 });
}
