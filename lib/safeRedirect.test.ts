import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safeRedirect";

describe("safeRedirect", () => {
  it.each([
    ["/settings?tab=key", "/settings?tab=key"],
    ["/resumes/abc#notes", "/resumes/abc#notes"],
    ["/a/../dashboard", "/dashboard"],
    ["/tracker?q=//evil.com", "/tracker?q=//evil.com"],
    ["/linkedin/report.pdf", "/linkedin/report.pdf"],
  ])("keeps the same-site path %j", (target, expected) => expect(safeRedirect(target)).toBe(expected));

  it.each([
    null, undefined, "", "dashboard", "https://evil.com", "javascript:alert(1)", "\\\\evil.com", "\\/evil.com",
    "//evil.com", "///evil.com", "/\\evil.com", "/\\/evil.com",
    "/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\u0000//evil.com",
    "/.//evil.com", "/..//evil.com", "/./\\evil.com", "/a/..//evil.com", "/%2e%2e//evil.com", "/%2E//evil.com",
    "/%2F/evil.com", "/%2f%2fevil.com", "/%5Cevil.com", "/%5c%5cevil.com", "/%2e/%2fevil.com", "/%09/evil.com",
    "/%E0%A4%A",
  ])("never leaves the site for %j", (target) => {
    expect(safeRedirect(target)).toBe("/dashboard");
  });

  it("returns the fallback it is given", () => expect(safeRedirect("//evil.com", "/")).toBe("/"));
});
