import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { config, proxy } from "@/proxy";
import { requireUser } from "./current-user";
import { DESTINATION_HEADER } from "./protected-paths";

const fixture = vi.hoisted(() => ({ destination: null as string | null }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(fixture.destination ? { "x-ra-destination": fixture.destination } : {}),
  cookies: async () => ({ get: () => ({ value: "stale-session-token" }) }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw Object.assign(new Error("NEXT_REDIRECT"), { url }); },
}));

const { unstable_doesMiddlewareMatch } = createRequire(import.meta.url)("next/experimental/testing/server");
const matches = (url: string) => unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }) as boolean;

type Route = { path: string; guarded: boolean };
const guard = /\brequire(Onboarded)?User\(/;

// Every page under app/, with whether it or a layout above it requires a user.
function pages(dir = "app", segments: string[] = [], guardedAbove = false): Route[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const read = (name: string) => entries.some((entry) => entry.name === name) ? readFileSync(join(dir, name), "utf8") : "";
  const guarded = guardedAbove || guard.test(read("layout.tsx"));
  const routes = read("page.tsx") ? [{ path: `/${segments.join("/")}`, guarded: guarded || guard.test(read("page.tsx")) }] : [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "api" || entry.name.startsWith("_")) continue;
    const segment = /^\(.*\)$/.test(entry.name) ? [] : [entry.name.replace(/^\[.*\]$/, "sample-id")];
    routes.push(...pages(join(dir, entry.name), [...segments, ...segment], guarded));
  }
  return routes;
}

const routes = pages();
const request = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, "http://localhost"), { headers: { ...(cookie ? { cookie } : {}), [DESTINATION_HEADER]: "/spoofed" } });

describe("protected routes", () => {
  it("finds the app's pages", () => {
    expect(routes.filter((route) => route.guarded).map((route) => route.path)).toEqual(expect.arrayContaining([
      "/dashboard", "/linkedin", "/interview", "/cover-letter", "/onboarding", "/resumes", "/resumes/sample-id", "/scan", "/scans", "/scan/sample-id",
    ]));
    expect(routes.filter((route) => !route.guarded).map((route) => route.path)).toEqual(expect.arrayContaining([
      "/", "/sign-in", "/sign-in/link", "/r/sample-id", "/admin",
    ]));
  });

  it.each(routes.filter((route) => route.guarded))("sends a signed-out visit to $path to sign-in and back", ({ path }) => {
    const destination = `${path}?tab=notes`;
    expect(matches(destination)).toBe(true);
    const response = proxy(request(destination));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("redirect")).toBe(destination);

    const signedIn = proxy(request(destination, "ra_session=token"));
    expect(signedIn.headers.get("location")).toBeNull();
    expect(signedIn.headers.get(`x-middleware-request-${DESTINATION_HEADER}`)).toBe(destination);
  });

  it.each(routes.filter((route) => !route.guarded))("lets $path through without a session", ({ path }) => {
    const response = proxy(request(path));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get(`x-middleware-request-${DESTINATION_HEADER}`)).toBeNull();
  });

  it("runs on every page, dotted paths included, so no client can supply the destination", () => {
    for (const path of ["/resumes/sample-id.pdf", "/linkedin/v1.2", "/favicon.ico", "/r/sample.id"]) expect(matches(path)).toBe(true);
    const signedIn = proxy(request("/resumes/sample-id.pdf", "ra_session=token"));
    expect(signedIn.headers.get(`x-middleware-request-${DESTINATION_HEADER}`)).toBe("/resumes/sample-id.pdf");
    expect(matches("/_next/static/chunk.js")).toBe(false);
    expect(matches("/api/session")).toBe(false);
  });

  it("leaves requireUser() out of API routes, which the proxy skips", () => {
    const handlers = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? handlers(join(dir, entry.name)) : [join(dir, entry.name)]);
    expect(handlers("app/api").filter((file) => guard.test(readFileSync(file, "utf8")))).toEqual([]);
  });

  it("keeps the destination when a stale cookie reaches a protected page", async () => {
    fixture.destination = "/linkedin?tab=notes";
    await expect(requireUser()).rejects.toMatchObject({ url: "/sign-in?redirect=%2Flinkedin%3Ftab%3Dnotes" });
    fixture.destination = null;
    await expect(requireUser()).rejects.toMatchObject({ url: "/sign-in" });
  });

  it.each(["//evil.com", "/.//evil.com", "/%2F/evil.com", "https://evil.com"])("drops an off-site destination %j", async (destination) => {
    fixture.destination = destination;
    try {
      await expect(requireUser()).rejects.toMatchObject({ url: "/sign-in" });
    } finally {
      fixture.destination = null;
    }
  });
});
