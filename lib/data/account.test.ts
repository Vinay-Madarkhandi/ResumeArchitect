import { randomBytes, randomUUID } from "node:crypto";
import { eq, getTableName, is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { credentialTables, deleteAccountRows, exportAccountData, exportedTables } from "./account";

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

beforeAll(async () => {
  const setup = await import("@/lib/db") as unknown as { migrateFixture: () => Promise<void> };
  await setup.migrateFixture();
}, 30_000);
afterAll(() => fixture.close());

// Rows that outlive the account on purpose: the audit trail keeps what an
// administrator did, with the actor set to null.
const retainedAfterDeletion = new Set(["audit_log"]);

function ownership() {
  const tables = Object.values(schema as Record<string, unknown>)
    .filter((value): value is PgTable => is(value, PgTable)).map((table) => getTableConfig(table));
  const owned = new Set(["users"]);
  const referencing = new Set<string>();
  for (let grew = true; grew;) {
    grew = false;
    for (const table of tables) {
      if (owned.has(table.name)) continue;
      for (const key of table.foreignKeys) {
        if (!owned.has(getTableName(key.reference().foreignTable))) continue;
        referencing.add(table.name);
        if (key.onDelete === "cascade") {
          owned.add(table.name);
          grew = true;
        }
      }
    }
  }
  const unlinkedUserIds = tables.filter((table) => !owned.has(table.name) &&
    table.columns.some((column) => column.name === "user_id" || column.name.endsWith("_user_id"))).map(({ name }) => name);
  return { owned, notCascading: [...referencing].filter((name) => !owned.has(name)), unlinkedUserIds };
}

describe("account data coverage", () => {
  const { owned, notCascading, unlinkedUserIds } = ownership();

  it("finds the owned tables through the schema's foreign keys", () => {
    expect(owned).toContain("resume_shares");
    expect(owned).toContain("interview_answers");
    expect(unlinkedUserIds).toEqual([]);
  });

  it("exports every table that holds an account's rows", () => {
    const covered: string[] = [...Object.values(exportedTables), ...credentialTables].map(getTableName);
    expect([...owned].filter((name) => !covered.includes(name))).toEqual([]);
  });

  it("deletes every table that holds an account's rows with the account", () => {
    expect(notCascading.filter((name) => !retainedAfterDeletion.has(name))).toEqual([]);
  });

  it("returns exactly the declared export sections", async () => {
    const [{ id }] = await db.insert(schema.users).values({ email: `${randomUUID()}@example.com`, password_hash: "fixture" })
      .returning({ id: schema.users.id });
    expect(Object.keys(await exportAccountData(id)).sort()).toEqual(Object.keys(exportedTables).sort());
  });
});

describe("published resume snapshots", () => {
  async function publishedResume() {
    const [user] = await db.insert(schema.users).values({ email: `${randomUUID()}@example.com`, password_hash: "fixture" })
      .returning({ id: schema.users.id });
    const [resume] = await db.insert(schema.resumes).values({ user_id: user.id, title: "Snapshot", kind: "master" })
      .returning({ id: schema.resumes.id });
    const slug = randomBytes(32).toString("base64url");
    await db.insert(schema.resumeShares).values({
      resume_id: resume.id, slug, content: { type: "doc", content: [] } as never, template: "classic", password_hash: "share-secret",
    });
    return { userId: user.id, resumeId: resume.id, slug };
  }

  it("are in the owner's export, without the share password hash", async () => {
    const { userId, slug } = await publishedResume();
    const { resumeShares } = await exportAccountData(userId);
    expect(resumeShares).toEqual([expect.objectContaining({ slug, password_protected: true })]);
    expect(JSON.stringify(resumeShares)).not.toContain("share-secret");
  });

  it("are deleted with the account", async () => {
    const { userId, resumeId } = await publishedResume();
    await db.transaction((tx) => deleteAccountRows(tx, userId));
    await expect(db.select().from(schema.resumeShares).where(eq(schema.resumeShares.resume_id, resumeId))).resolves.toEqual([]);
  });
});
