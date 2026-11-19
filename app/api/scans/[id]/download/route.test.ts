import { describe, expect, it, vi } from "vitest";
import type { getScan } from "@/lib/data/scans";
import { GET } from "./route";

const fixture = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  scan: undefined as Awaited<ReturnType<typeof getScan>> | undefined,
}));

vi.mock("@/lib/auth/current-user", () => ({
  currentUser: async () => fixture.user,
}));

vi.mock("@/lib/data/scans", () => ({
  getScan: async (_userId: string, id: string) => (id === "scan-1" ? fixture.scan : undefined),
}));

describe("GET /api/scans/[id]/download", () => {
  it("returns 401 when not signed in", async () => {
    fixture.user = null;
    const res = await GET(new Request("http://localhost/api/scans/scan-1/download"), {
      params: Promise.resolve({ id: "scan-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when scan not found", async () => {
    fixture.user = { id: "user-1" };
    fixture.scan = undefined;
    const res = await GET(new Request("http://localhost/api/scans/missing/download"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("sets X-Content-Type-Options: nosniff on the downloaded report", async () => {
    fixture.user = { id: "user-1" };
    fixture.scan = {
      id: "scan-1",
      matchRate: 85,
      createdAt: new Date().toISOString(),
      resumeId: "resume-1",
      resumeLabel: "My Resume",
      jobId: "job-1",
      jobTitle: "Software Engineer",
      company: "Acme",
      resumeContent: null as never,
      resumeText: "Resume text",
      resumeTitle: "My Resume",
      jobText: "Requirements: Go",
      jobUrl: null,
      tracked: false,
      report: {
        matchRate: 85,
        verdict: { target: 75, reached: true, message: "Strong match." },
        breakdown: [],
        hardSkills: [],
        softSkills: [],
        otherKeywords: [],
        searchability: [],
        formatting: [],
        recruiterTips: [],
        predictedSkills: [],
      },
    };
    const res = await GET(new Request("http://localhost/api/scans/scan-1/download"), {
      params: Promise.resolve({ id: "scan-1" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="match-report.txt"');
  });
});
