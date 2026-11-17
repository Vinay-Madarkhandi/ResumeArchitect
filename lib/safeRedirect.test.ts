import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safeRedirect";

describe("safeRedirect", () => {
  it("allows same-origin paths", () => expect(safeRedirect("/settings?tab=key")).toBe("/settings?tab=key"));
  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeRedirect("//evil.com")).toBe("/dashboard");
    expect(safeRedirect("/\\evil.com")).toBe("/dashboard");
    expect(safeRedirect("https://evil.com")).toBe("/dashboard");
    expect(safeRedirect(null)).toBe("/dashboard");
  });
});

describe("safeRedirect with control characters", () => {
  it("rejects paths the URL parser turns into another origin", () => {
    expect(safeRedirect("/\t/evil.com")).toBe("/dashboard");
    expect(safeRedirect("/\n/evil.com")).toBe("/dashboard");
  });
});
