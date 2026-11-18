import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { appUrl } from "@/lib/auth/config";
import { rateLimit } from "@/lib/cache/rateLimit";
import { db } from "@/lib/db";
import { resumes, users } from "@/lib/db/schema";
import { docxBomb, docxResume, pdfFlateBomb, pdfPages } from "@/lib/report/__fixtures__/bombs";
import { putObject } from "@/lib/storage";
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
  const client = new Redis({ port: 16383 });
  return { cache: () => client };
});
vi.mock("@/lib/storage", () => ({ putObject: vi.fn(async () => {}), deleteObjects: vi.fn(async () => {}) }));
vi.mock("@/lib/auth/current-user", () => ({ currentUser: async () => ({ id: fixture.userId }) }));

const MB = 1024 * 1024;
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function signIn() {
  const [user] = await db.insert(users).values({ email: `${randomUUID()}@example.com`, password_hash: "fixture" }).returning();
  fixture.userId = user.id;
}

function fileForm(file: Buffer, name: string, type: string) {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(file)], name, { type }));
  return form;
}

const post = (body: BodyInit, headers: Record<string, string> = {}) => POST(new Request(`${appUrl().origin}/api/resumes/parse`, {
  method: "POST", headers: { origin: appUrl().origin, ...headers }, body, duplex: "half",
} as RequestInit));

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

const savedResumes = async () => db.select().from(resumes).where(eq(resumes.user_id, fixture.userId));

beforeAll(async () => {
  const setup = await import("@/lib/db") as unknown as { migrateFixture: () => Promise<void> };
  await setup.migrateFixture();
}, 30_000);
beforeEach(() => vi.mocked(putObject).mockClear());
afterAll(() => fixture.close());

describe("POST /api/resumes/parse", () => {
  it("imports an ordinary Word upload word for word and keeps the original", async () => {
    await signIn();
    const response = await post(fileForm(docxResume(), "resume.docx", DOCX));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ usedAi: false, keepsDesign: true });
    expect(putObject).toHaveBeenCalledOnce();
    expect(JSON.stringify((await savedResumes())[0].content)).toContain("Built Go services");
  }, 30_000);

  it.each([
    ["bomb_250.docx", () => docxBomb(250), "resume.docx", DOCX],
    ["bomb_lying.docx", () => docxBomb(250, { lying: true }), "resume.docx", DOCX],
    ["pdf_flatebomb.pdf", () => pdfFlateBomb(600), "resume.pdf", "application/pdf"],
    ["pdf_2000pages.pdf", () => pdfPages(2000), "resume.pdf", "application/pdf"],
  ] as const)("rejects %s within the memory budget, before storing or saving it", async (_label, build, name, type) => {
    await signIn();
    const form = fileForm(await build(), name, type);
    const { result: response, growthMb } = await peakGrowth(() => post(form));
    expect(response.status).toBe(422);
    expect(growthMb).toBeLessThan(256);
    expect(putObject).not.toHaveBeenCalled();
    expect(await savedResumes()).toHaveLength(0);
  }, 60_000);

  it("refuses an oversize body by its declared length, without reading it", async () => {
    await signIn();
    let pulled = 0;
    const body = new ReadableStream({ pull(controller) { pulled += MB; controller.enqueue(new Uint8Array(MB)); } });
    const response = await post(body, { "content-length": String(200 * MB), "content-type": "multipart/form-data; boundary=x" });
    expect(response.status).toBe(413);
    expect(pulled).toBeLessThanOrEqual(2 * MB);
  });

  it("rate-limits imports before reading the file, with or without a Gemini key", async () => {
    await signIn();
    for (let i = 0; i < 30; i++) await rateLimit("ai-resume-import", fixture.userId, 30, 3_600_000);
    const form = fileForm(await docxBomb(250), "resume.docx", DOCX);
    const { result: response, growthMb } = await peakGrowth(() => post(form));
    expect(response.status).toBe(429);
    expect(growthMb).toBeLessThan(64);
    expect(putObject).not.toHaveBeenCalled();
  }, 30_000);
});
