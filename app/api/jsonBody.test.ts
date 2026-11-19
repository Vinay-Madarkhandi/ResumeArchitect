import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { readJson } from "@/lib/server/request-body";

function getRouteFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...getRouteFiles(full));
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      if (!full.includes(".test.")) files.push(full);
    }
  }
  return files;
}

describe("request JSON body limits", () => {
  it("never calls request.json() directly in any route handler", () => {
    const files = getRouteFiles(join(__dirname));
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (/\brequest\.json\s*\(/.test(content)) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });

  it("refuses oversized bodies with 413 by Content-Length and stream cap", async () => {
    const declaredOver = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-length": String(10 * 1024 * 1024) },
      body: JSON.stringify({ ok: true }),
    });
    const res1 = await readJson(declaredOver, 1024);
    expect(res1.ok).toBe(false);
    if (!res1.ok) expect(res1.response.status).toBe(413);

    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(2048));
      },
    });
    const streamedOver = new Request("http://localhost/api/test", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    const res2 = await readJson(streamedOver, 1024);
    expect(res2.ok).toBe(false);
    if (!res2.ok) expect(res2.response.status).toBe(413);
  });
});
