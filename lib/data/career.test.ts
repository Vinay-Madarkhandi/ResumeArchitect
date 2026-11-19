import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { NORTHWIND } from "@/lib/career/fixtures";
import { clearAccountData, exportAccountData } from "./account";
import { createCoverLetterScan, getCoverLetterScan, listCoverLetterScans } from "./cover-letter-scans";
import { addInterviewAnswer, createInterviewSession, getInterviewSession, listInterviewAnswers, listInterviewSessions } from "./interview";
import { createLinkedInReview, getLinkedInReview, listLinkedInReviews, saveLinkedInSuggestions } from "./linkedin-reviews";

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

const report = { score: { total: 50, parts: [] }, checks: [], keywords: null };

describe("career tool data is scoped to its owner", () => {
  it("LinkedIn reviews", async () => {
    const id = await createLinkedInReview(owner, { target_label: "Backend Engineer", profile: {}, report, score: 50 });
    expect(await getLinkedInReview(stranger, id)).toBeUndefined();
    expect(await listLinkedInReviews(stranger)).toEqual([]);
    expect(await saveLinkedInSuggestions(stranger, id, { headlines: [], about: { text: "", flags: [] }, notes: [] })).toBe(false);
    expect(await saveLinkedInSuggestions(owner, id, { headlines: [], about: { text: "Hi", flags: [] }, notes: [] })).toBe(true);
    expect((await getLinkedInReview(owner, id))?.suggestions).toMatchObject({ about: { text: "Hi" } });
    expect(await getLinkedInReview(owner, "not-a-uuid")).toBeUndefined();
  });

  it("cover letter scans", async () => {
    const id = await createCoverLetterScan(owner, { target_label: "Backend Engineer", letter: "Dear Sam", report, score: 40 });
    expect(await getCoverLetterScan(stranger, id)).toBeUndefined();
    expect(await listCoverLetterScans(stranger)).toEqual([]);
    expect((await listCoverLetterScans(owner)).map((s) => s.id)).toContain(id);
  });

  it("interview sessions and answers", async () => {
    const id = await createInterviewSession(owner, { target_label: "Backend Engineer", job_analysis: NORTHWIND, questions: [] });
    expect(await getInterviewSession(stranger, id)).toBeUndefined();
    expect(await addInterviewAnswer(stranger, id, { question_id: "q", answer: "x", feedback: {}, score: 10 })).toBeUndefined();
    await addInterviewAnswer(owner, id, { question_id: "q", answer: "first", feedback: {}, score: 40 });
    await addInterviewAnswer(owner, id, { question_id: "q", answer: "second", feedback: {}, score: 70 });
    expect(await listInterviewAnswers(stranger, id)).toEqual([]);
    expect((await listInterviewAnswers(owner, id)).map((a) => a.answer)).toEqual(["first", "second"]);
    expect(await listInterviewSessions(owner)).toEqual([expect.objectContaining({ id, answers: 2, best: 70 })]);
  });

  it("are exported with the account and removed when it is cleared", async () => {
    const data = await exportAccountData(owner);
    expect(data.linkedinReviews).toHaveLength(1);
    expect(data.coverLetterScans).toHaveLength(1);
    expect(data.interviewAnswers).toHaveLength(2);
    await clearAccountData(owner);
    const after = await exportAccountData(owner);
    expect([after.linkedinReviews, after.coverLetterScans, after.interviewSessions, after.interviewAnswers]).toEqual([[], [], [], []]);
  });
});
