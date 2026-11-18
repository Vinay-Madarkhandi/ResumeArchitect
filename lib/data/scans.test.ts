import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { buildMatchReport } from "@/lib/report/matchReport";
import type { JobFacts } from "@/lib/schemas/jobFacts";
import { addJobs, deleteJob, listJobs } from "./jobs";
import { createJobDescription, findJobDescriptionByText, getJobDescription, listScanTargets, saveJobFacts } from "./job-descriptions";
import { createScan, deleteScan, getScan, saveScannedResume, listScans } from "./scans";

const fixture = vi.hoisted(() => ({ close: async () => {} }));
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { citext } = await import("@electric-sql/pglite/contrib/citext");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite({ extensions: { citext } });
  const db = drizzle(client);
  fixture.close = () => client.close();
  return { db, migrateFixture: () => migrate(db, { migrationsFolder: "drizzle" }) };
});

async function newUser() {
  const [row] = await db.insert(users).values({ email: `${randomUUID()}@example.com`, password_hash: "fixture" }).returning({ id: users.id });
  return row.id;
}

let owner: string;
let stranger: string;
beforeAll(async () => {
  const setup = await import("@/lib/db") as unknown as { migrateFixture: () => Promise<void> };
  await setup.migrateFixture();
  owner = await newUser();
  stranger = await newUser();
}, 30_000);
afterAll(() => fixture.close());

const JOB_TEXT = "Backend Engineer. We need Go and PostgreSQL experience, and clear communication.";
const FACTS: JobFacts = {
  title: "Backend Engineer", level: "mid",
  hardSkills: [{ term: "Go", importance: "high" }, { term: "PostgreSQL", importance: "high" }],
  softSkills: [{ term: "communication", importance: "medium" }],
  education: null, yearsRequired: null, predictedSkills: [],
};
const resume = markdownToDocument("# Ada Lovelace\n\n## Experience\n\n- Built Go services");

async function scanFor(userId: string, jobId: string) {
  const report = buildMatchReport({ job: FACTS, jobText: JOB_TEXT, resume, file: null, asOf: new Date(2026, 10, 18) });
  return createScan(userId, {
    resumeId: null, resumeLabel: "resume.docx", resumeText: "Ada Lovelace", resumeContent: resume, jobDescriptionId: jobId, report,
  });
}

describe("scans", () => {
  it("are listed, read, and deleted only by their owner", async () => {
    const jobId = await createJobDescription(owner, { raw_text: JOB_TEXT });
    const id = await scanFor(owner, jobId);

    expect(await getScan(stranger, id)).toBeUndefined();
    expect(await listScans(stranger)).toEqual([]);
    expect(await deleteScan(stranger, id)).toBeUndefined();

    const scan = await getScan(owner, id);
    expect(scan).toMatchObject({ id, jobId, resumeLabel: "resume.docx", resumeContent: resume, jobText: JOB_TEXT, tracked: false });
    expect(scan?.report.matchRate).toBe(scan?.matchRate);
    expect((await listScans(owner)).map((s) => s.id)).toContain(id);

    expect(await deleteScan(owner, id)).toEqual({ id });
    expect(await getScan(owner, id)).toBeUndefined();
  });

  it("can't be linked to someone else's scan", async () => {
    const jobId = await createJobDescription(owner, { raw_text: JOB_TEXT });
    const id = await scanFor(owner, jobId);
    const values = { kind: "tailored" as const, title: "Scanned resume", content: resume };
    expect(await saveScannedResume(stranger, id, values)).toBeUndefined();
    expect((await getScan(owner, id))?.resumeId).toBeNull();
    const saved = await saveScannedResume(owner, id, values);
    expect(saved).toBeTruthy();
    expect(await saveScannedResume(owner, id, values)).toBe(saved);
    expect((await getScan(owner, id))?.resumeId).toBe(saved);
  });
});

describe("job facts", () => {
  it("are cached on the owner's job and name an untitled job", async () => {
    const jobId = await createJobDescription(owner, { raw_text: `${JOB_TEXT} ${randomUUID()}` });
    await saveJobFacts(stranger, jobId, FACTS);
    expect((await getJobDescription(owner, jobId))?.job_facts).toBeNull();

    await saveJobFacts(owner, jobId, FACTS);
    expect(await getJobDescription(owner, jobId)).toMatchObject({ job_facts: FACTS, job_title: "Backend Engineer" });
    expect((await listScanTargets(owner)).find((t) => t.id === jobId)).toMatchObject({ hasFacts: true });
    expect(await listScanTargets(stranger)).toEqual([]);
  });

  it("are reused when the same posting is pasted again", async () => {
    const text = `${JOB_TEXT} ${randomUUID()}`;
    const jobId = await createJobDescription(owner, { raw_text: text });
    expect((await findJobDescriptionByText(owner, text))?.id).toBe(jobId);
    expect(await findJobDescriptionByText(stranger, text)).toBeUndefined();
  });
});

describe("tracked jobs", () => {
  it("are deleted only by their owner, with their scans", async () => {
    const [{ id }] = await addJobs(owner, [{
      title: "Platform Engineer", company: "", location: "", salary: "", url: "", description: JOB_TEXT, stage: "saved",
      notes: "", contacts: [], interviews: [], followUp: null, excitement: null,
    }]);
    const scanId = await scanFor(owner, id);
    expect((await listJobs(owner)).find((j) => j.id === id)).toMatchObject({ reportId: scanId, matchRate: expect.any(Number) });

    expect(await deleteJob(stranger, id)).toBeUndefined();
    expect(await deleteJob(owner, id)).toEqual({ id });
    expect((await listJobs(owner)).some((j) => j.id === id)).toBe(false);
    expect(await getScan(owner, scanId)).toBeUndefined();
  });
});
