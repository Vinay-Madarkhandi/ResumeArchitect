import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { resumes, users } from "@/lib/db/schema";
import { appUrl } from "@/lib/auth/config";
import { PATCH } from "./route";

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
vi.mock("@/lib/auth/current-user", () => ({ currentUser: async () => ({ id: fixture.userId }) }));

const account = async () => {
  const [row] = await db.insert(users).values({ email: `${randomUUID()}@example.com`, password_hash: "fixture" }).returning();
  return row.id;
};
const resumeOf = async (userId: string) => {
  const [row] = await db.insert(resumes).values({ user_id: userId, kind: "master", title: "Resume" }).returning();
  return row.id;
};
const rename = (id: string) => PATCH(
  new Request(`${appUrl().origin}/api/resumes/${id}`, {
    method: "PATCH", headers: { origin: appUrl().origin, "content-type": "application/json" },
    body: JSON.stringify({ title: "Renamed" }),
  }),
  { params: Promise.resolve({ id }) },
);

beforeAll(async () => {
  const setup = await import("@/lib/db") as unknown as { migrateFixture: () => Promise<void> };
  await setup.migrateFixture();
}, 30_000);
afterAll(() => fixture.close());

it("answers 404 for a resume the caller does not own", async () => {
  const other = await resumeOf(await account());
  fixture.userId = await account();
  const own = await resumeOf(fixture.userId);
  expect((await rename(other)).status).toBe(404);
  expect((await rename(randomUUID())).status).toBe(404);
  expect((await rename(own)).status).toBe(200);
});
