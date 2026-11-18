import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appUrl } from "@/lib/auth/config";
import { rateLimit } from "@/lib/cache/rateLimit";
import { db } from "@/lib/db";
import { jobDescriptions, scans, users } from "@/lib/db/schema";
import { docxBomb, docxResume, pdfFlateBomb, pdfPages } from "@/lib/report/__fixtures__/bombs";
import { POST } from "./route";

const fixture = vi.hoisted(() => ({ close: async () => {}, userId: "" }));
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
vi.mock("@/lib/cache", async () => {
  const { default: Redis } = await import("ioredis-mock");
  const client = new Redis({ port: 16382 });
  return { cache: () => client };
});
vi.mock("@/lib/auth/current-user", () => ({ currentUser: async () => ({ id: fixture.userId }) }));

const MB = 1024 * 1024;
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const JOB_TEXT = "Backend Engineer. Requirements: Go, PostgreSQL, Kafka, and experience with incident response for payments.";
const FACTS = {
  title: "Backend Engineer", level: "mid", hardSkills: [{ term: "Go", importance: "high" }, { term: "PostgreSQL", importance: "high" }],
  softSkills: [], education: null, yearsRequired: null, predictedSkills: [],
};

async function signIn() {
  const [user] = await db.insert(users).values({ email: `${randomUUID()}@example.com`, password_hash: "fixture" }).returning();
  fixture.userId = user.id;
  const [job] = await db.insert(jobDescriptions).values({ user_id: user.id, raw_text: JOB_TEXT, job_facts: FACTS as never }).returning();
  return job.id;
}

const headers = (extra: Record<string, string> = {}) => ({ origin: appUrl().origin, ...extra });

function uploadForm(file: Buffer, name: string, type: string, job: Record<string, string>) {
  const form = new FormData();
  form.set("resumeSource", "upload");
  form.set("file", new File([new Uint8Array(file)], name, { type }));
  for (const [key, value] of Object.entries(job)) form.set(key, value);
  return form;
}

const post = (body: BodyInit, init: RequestInit = {}) =>
  POST(new Request(`${appUrl().origin}/api/scans`, { method: "POST", headers: headers(), body, ...init, duplex: "half" } as RequestInit));

/** Runs `work` while sampling this process's resident memory, which includes any worker threads. */
async function peakGrowth<T>(work: () => Promise<T>): Promise<{ result: T; growthMb: number }> {
  const before = process.memoryUsage().rss;
  let peak = before;
  const sample = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 20);
  try {
    const result = await work();
    peak = Math.max(peak, process.memoryUsage().rss);
    return { result, growthMb: (peak - before) / MB };
  } finally {
    clearInterval(sample);
  }
}

const scanCount = async () => (await db.select().from(scans).where(eq(scans.user_id, fixture.userId))).length;
const jobCount = async () => (await db.select().from(jobDescriptions).where(eq(jobDescriptions.user_id, fixture.userId))).length;

beforeAll(async () => {
  const setup = await import("@/lib/db") as unknown as { migrateFixture: () => Promise<void> };
  await setup.migrateFixture();
}, 30_000);
afterAll(() => fixture.close());

describe("POST /api/scans uploads", () => {
  it("scans an ordinary Word upload and keeps its layout facts", async () => {
    const jobId = await signIn();
    const response = await post(uploadForm(docxResume(), "resume.docx", DOCX, { jobSource: "saved", jobId }));
    expect(response.status).toBe(201);
    const [scan] = await db.select().from(scans).where(eq(scans.user_id, fixture.userId));
    expect(scan.resume_text).toContain("Built Go services");
    expect(JSON.stringify(scan.report)).toContain("A .docx file is the format ATS read most reliably.");
  }, 30_000);

  it.each([
    ["bomb_250.docx", () => docxBomb(250), "resume.docx", DOCX, /too large or complex/],
    ["bomb_lying.docx", () => docxBomb(250, { lying: true }), "resume.docx", DOCX, /couldn't be read/],
    ["pdf_flatebomb.pdf", () => pdfFlateBomb(600), "resume.pdf", "application/pdf", /too large or complex/],
    ["pdf_2000pages.pdf", () => pdfPages(2000), "resume.pdf", "application/pdf", /too large or complex/],
  ] as const)("rejects %s within the memory budget and saves nothing", async (_label, build, name, type, message) => {
    const jobId = await signIn();
    const form = uploadForm(await build(), name, type, { jobSource: "saved", jobId });
    const { result: response, growthMb } = await peakGrowth(() => post(form));
    expect(response.status).toBe(422);
    expect((await response.json()).error).toMatch(message);
    expect(growthMb).toBeLessThan(256);
    expect(await scanCount()).toBe(0);
  }, 60_000);

  it("refuses a body over the upload limit by its declared length, without reading it", async () => {
    await signIn();
    let pulled = 0;
    const body = new ReadableStream({ pull(controller) { pulled += MB; controller.enqueue(new Uint8Array(MB)); } });
    const response = await post(body, { headers: headers({ "content-length": String(200 * MB), "content-type": "multipart/form-data; boundary=x" }) });
    expect(response.status).toBe(413);
    expect(pulled).toBeLessThanOrEqual(2 * MB);
  });

  it("stops reading an undeclared body once it passes the upload limit", async () => {
    await signIn();
    let pulled = 0;
    const body = new ReadableStream({
      pull(controller) {
        if (pulled >= 200 * MB) return controller.close();
        pulled += MB;
        controller.enqueue(new Uint8Array(MB));
      },
    });
    const response = await post(body, { headers: headers({ "content-type": "multipart/form-data; boundary=x" }) });
    expect(response.status).toBe(413);
    expect(pulled).toBeLessThan(12 * MB);
  });

  it("applies the scan rate limit before reading the file or saving the job", async () => {
    await signIn();
    for (let i = 0; i < 60; i++) await rateLimit("scan", fixture.userId, 60, 3_600_000);
    const jobsBefore = await jobCount();
    const form = uploadForm(await docxBomb(250), "resume.docx", DOCX, { jobSource: "paste", jobText: `${JOB_TEXT} New posting.` });
    const { result: response, growthMb } = await peakGrowth(() => post(form));
    expect(response.status).toBe(429);
    expect(growthMb).toBeLessThan(64);
    expect(await jobCount()).toBe(jobsBefore);
  }, 30_000);
});
