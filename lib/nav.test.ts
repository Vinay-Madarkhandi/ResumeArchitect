import { describe, expect, it } from "vitest";
import { NAV, navFor, owns } from "./nav";

const area = (id: string) => NAV.find((a) => a.id === id)!;

describe("navigation ownership", () => {
  it("keeps scan history under Scan and not under a lookalike prefix", () => {
    expect(owns(area("scan"), "/scan")).toBe(true);
    expect(owns(area("scan"), "/scan/abc")).toBe(true);
    expect(owns(area("scan"), "/scans")).toBe(true);
    expect(owns(area("scan"), "/scanner")).toBe(false);
  });

  it("puts tailoring and the resume list under Resumes", () => {
    expect(owns(area("resumes"), "/resumes")).toBe(true);
    expect(owns(area("resumes"), "/new")).toBe(true);
  });

  it("makes Career tools current for each of its tools", () => {
    for (const path of ["/linkedin", "/linkedin/1", "/interview/2", "/cover-letter"]) expect(owns(area("career"), path)).toBe(true);
    expect(owns(area("career"), "/tracker")).toBe(false);
  });

  it("gives every route to exactly one area", () => {
    for (const path of ["/dashboard", "/scan", "/scans", "/resumes", "/new", "/tracker", "/linkedin", "/interview", "/cover-letter", "/settings", "/admin/users"]) {
      expect(navFor(true).filter((a) => owns(a, path))).toHaveLength(1);
    }
  });

  it("shows Admin to admins only", () => {
    expect(navFor(false).some((a) => a.id === "admin")).toBe(false);
    expect(navFor(true).at(-1)?.id).toBe("admin");
  });

  it("links every leaf into the area that owns it", () => {
    for (const a of NAV) for (const leaf of a.children ?? []) expect(owns(a, leaf.href)).toBe(true);
  });
});
