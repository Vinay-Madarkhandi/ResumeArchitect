import { randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { authTokens, personalTokens, recoveryCodes, sessions, users } from "@/lib/db/schema";
import { banUser, clearSessionCache, createSession, removeSessions, revokeSession, validateSession } from "./sessions";
import { authenticatePersonalToken, createPersonalToken, listPersonalTokens, readBearer, revokePersonalToken } from "./personal-tokens";
import { hashToken } from "./secrets";
import { authenticator, checkSecondFactor, protectTotp, replaceRecoveryCodes } from "./totp";
import { consumeToken, findToken, issueToken } from "./tokens";
import { purgeExpiredAuth } from "./purge";

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
vi.mock("@/lib/cache", async () => {
  const { default: Redis } = await import("ioredis-mock");
  const client = new Redis({ port: 16380 });
  return { cache: () => client };
});

let userId: string;
beforeAll(async () => {
  const setup = await import("@/lib/db") as unknown as { migrateFixture: () => Promise<void> };
  await setup.migrateFixture();
}, 30_000);
beforeEach(async () => {
  const [row] = await db.insert(users).values({
    email: `${randomUUID()}@example.com`, password_hash: "fixture",
    email_verified_at: new Date().toISOString(), password_set_at: new Date().toISOString(),
  }).returning({ id: users.id });
  userId = row.id;
});
afterAll(async () => {
  cache().disconnect();
  await fixture.close();
});

const create = () => db.transaction((tx) => createSession(tx, userId, "127.0.0.1", "Vitest"));
const cacheKey = (token: string) => `session:${hashToken(token)}`;

describe("sessions", () => {
  it("stores only the token hash and caches its owner", async () => {
    const session = await create();
    const [row] = await db.select().from(sessions).where(eq(sessions.user_id, userId));
    expect(row.id).toBe(hashToken(session.token));
    expect(row.id).not.toBe(session.token);
    await expect(validateSession(session.token)).resolves.toMatchObject({ id: userId });
    await expect(cache().get(cacheKey(session.token))).resolves.toBe(userId);
    await expect(cache().ttl(cacheKey(session.token))).resolves.toBeGreaterThanOrEqual(298);
  });

  it("rejects an expired session even when cached, and renews sessions within fifteen days", async () => {
    const session = await create();
    const id = hashToken(session.token);
    await validateSession(session.token);
    await db.update(sessions).set({ expires_at: new Date(Date.now() + 86_400_000).toISOString() }).where(eq(sessions.id, id));
    const renewed = await validateSession(session.token, true);
    expect(Date.parse(renewed!.expiresAt) - Date.now()).toBeGreaterThan(29 * 86_400_000);
    await db.update(sessions).set({ expires_at: new Date(Date.now() - 1000).toISOString() }).where(eq(sessions.id, id));
    await expect(validateSession(session.token, true)).resolves.toBeNull();
  });

  it("revokes one or all sessions and removes their cache entries", async () => {
    const [one, two, three] = await Promise.all([create(), create(), create()]);
    for (const session of [one, two, three]) await validateSession(session.token);
    await revokeSession(one.token);
    await expect(validateSession(one.token)).resolves.toBeNull();
    await expect(cache().get(cacheKey(one.token))).resolves.toBeNull();
    await expect(validateSession(two.token)).resolves.toMatchObject({ id: userId });
    const revoked = await db.transaction((tx) => removeSessions(tx, userId));
    await clearSessionCache(revoked);
    for (const session of [two, three]) {
      await expect(validateSession(session.token)).resolves.toBeNull();
      await expect(cache().get(cacheKey(session.token))).resolves.toBeNull();
    }
  });

  it("leaves no cached session behind after a ban", async () => {
    const sessionsBefore = await Promise.all([create(), create()]);
    for (const session of sessionsBefore) await validateSession(session.token);
    const cachedFor = async () => {
      const keys = await cache().keys("session:*");
      return (await Promise.all(keys.map((key) => cache().get(key)))).filter((owner) => owner === userId);
    };
    expect((await cachedFor()).length).toBeGreaterThanOrEqual(2);
    const ids = await db.transaction((tx) => banUser(tx, userId, "abuse"));
    await clearSessionCache(ids);
    expect(ids).toEqual(expect.arrayContaining(sessionsBefore.map(({ token }) => hashToken(token))));
    expect(await cachedFor()).toHaveLength(0);
    await db.update(users).set({ banned_at: null, ban_reason: null }).where(eq(users.id, userId));
  });

  it("ignores a cache write that was in flight when the account was banned", async () => {
    const session = await create();
    const key = cacheKey(session.token);
    const redis = cache() as unknown as Record<"set" | "eval", (...args: unknown[]) => Promise<unknown>>;
    const original = { set: redis.set, eval: redis.eval };
    let markWritePending!: () => void;
    let resumeCacheWrite!: () => void;
    const writePending = new Promise<void>((done) => { markWritePending = done; });
    const writeMayProceed = new Promise<void>((done) => { resumeCacheWrite = done; });
    for (const command of ["set", "eval"] as const) {
      redis[command] = async (...args: unknown[]) => {
        if (args.includes(key)) {
          markWritePending();
          await writeMayProceed;
        }
        return Reflect.apply(original[command], redis, args);
      };
    }
    const read = validateSession(session.token);
    try {
      await Promise.race([writePending, read.then(() => { throw new Error("the lookup did not reach the cache write"); })]);
      const ids = await db.transaction((tx) => banUser(tx, userId, "abuse"));
      expect(ids).toEqual([hashToken(session.token)]);
      await clearSessionCache(ids);
      resumeCacheWrite();
      await read;
      await expect(validateSession(session.token)).resolves.toBeNull();
      await expect(cache().exists(key)).resolves.toBe(0);
    } finally {
      resumeCacheWrite();
      await read;
      Object.assign(redis, original);
      await db.update(users).set({ banned_at: null, ban_reason: null }).where(eq(users.id, userId));
    }
  });

  it("revokes a banned account's cached session in Postgres", async () => {
    const session = await create();
    await validateSession(session.token);
    await db.update(users).set({ banned_at: new Date().toISOString() }).where(eq(users.id, userId));
    await expect(validateSession(session.token)).resolves.toBeNull();
    await db.update(users).set({ banned_at: null }).where(eq(users.id, userId));
    await expect(validateSession(session.token)).resolves.toBeNull();
  });
});

describe("email and reset tokens", () => {
  it("stores the digest and consumes the expected purpose exactly once", async () => {
    const { token, id } = await db.transaction((tx) => issueToken(tx, userId, "verify_email"));
    expect(id).toBe(hashToken(token));
    await expect(findToken(token, "reset_password")).resolves.toBeUndefined();
    await expect(findToken(token, "verify_email")).resolves.toEqual({ userId });
    const consume = () => db.transaction((tx) => consumeToken(tx, token, "verify_email", userId));
    const attempts = await Promise.all([consume(), consume()]);
    expect(attempts.filter(Boolean)).toHaveLength(1);
    await expect(findToken(token, "verify_email")).resolves.toBeUndefined();
  });

  it("rejects an expired password reset token", async () => {
    const { token, id } = await db.transaction((tx) => issueToken(tx, userId, "reset_password"));
    const [row] = await db.select().from(authTokens).where(eq(authTokens.id, id));
    expect(Date.parse(row.expires_at) - Date.now()).toBeGreaterThan(59 * 60_000);
    await db.update(authTokens).set({ expires_at: new Date(Date.now() - 1000).toISOString() }).where(eq(authTokens.id, id));
    await expect(findToken(token, "reset_password")).resolves.toBeUndefined();
    await expect(db.transaction((tx) => consumeToken(tx, token, "reset_password", userId))).resolves.toBeUndefined();
  });
});

it("validates authenticator codes and consumes hashed recovery codes once", async () => {
  vi.stubEnv("KEY_ENCRYPTION_SECRET", Buffer.alloc(32, 7).toString("base64"));
  try {
    const totp = authenticator("test@example.com");
    const ciphertext = protectTotp(totp);
    const check = (code: string) => db.transaction((tx) => checkSecondFactor(tx, userId, "test@example.com", ciphertext, code));
    const code = totp.generate();
    await expect(check(code)).resolves.toBe(true);
    await expect(check(code)).resolves.toBe(false);
    await expect(check(totp.generate({ timestamp: Date.now() - 30_000 }))).resolves.toBe(false);
    await expect(check(totp.generate({ timestamp: Date.now() + 30_000 }))).resolves.toBe(true);
    await expect(check("wrong")).resolves.toBe(false);
    const codes = await db.transaction((tx) => replaceRecoveryCodes(tx, userId));
    const rows = await db.select().from(recoveryCodes).where(eq(recoveryCodes.user_id, userId));
    expect(rows.map((row) => row.code_hash).sort()).toEqual(codes.map(hashToken).sort());
    expect(codes).toHaveLength(10);
    await expect(check(codes[0])).resolves.toBe(true);
    await expect(check(codes[0])).resolves.toBe(false);
  } finally {
    vi.unstubAllEnvs();
  }
});

it("releases addresses nobody verified within a week of their last link expiring", async () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const account = async (verified: boolean, linkExpired?: number) => {
    const [row] = await db.insert(users).values({
      email: `${randomUUID()}@example.com`, password_hash: "fixture", created_at: daysAgo(30),
      email_verified_at: verified ? daysAgo(30) : null,
    }).returning({ id: users.id });
    if (linkExpired !== undefined) {
      await db.insert(authTokens).values({ id: randomUUID(), user_id: row.id, purpose: "verify_email", expires_at: daysAgo(linkExpired) });
    }
    return row.id;
  };
  const abandoned = await account(false, 8);
  const neverSent = await account(false);
  const recent = await account(false, 6);
  const verified = await account(true, 8);
  await purgeExpiredAuth();
  const left = await db.select({ id: users.id }).from(users).where(inArray(users.id, [abandoned, neverSent, recent, verified]));
  expect(left.map(({ id }) => id).sort()).toEqual([recent, verified].sort());
});

describe("personal API tokens", () => {
  it("stores a SHA-256 digest, scopes metadata to its owner, and records use", async () => {
    const token = await createPersonalToken(userId, "Chrome clipper");
    const [row] = await db.select().from(personalTokens).where(eq(personalTokens.user_id, userId));
    expect(row).toMatchObject({ token_hash: hashToken(token), last_used_at: null });
    expect(readBearer(`bEaReR ${token}`)).toBe(token);
    expect(readBearer(`Bearer ${"A".repeat(43)}`)).toBeNull();
    expect(readBearer(`Basic ${token}`)).toBeNull();
    expect(readBearer(`Bearer ${token} other`)).toBeNull();

    const [result] = await listPersonalTokens(userId);
    expect(result).toEqual({ id: row.id, name: "Chrome clipper", createdAt: row.created_at, lastUsedAt: null });
    await expect(listPersonalTokens(randomUUID())).resolves.toEqual([]);
    await expect(authenticatePersonalToken(token)).resolves.toMatchObject({ id: userId });
    expect(Date.parse((await listPersonalTokens(userId))[0].lastUsedAt!)).toBeGreaterThan(0);
  });

  it("denies cross-account revocation, banned or unverified users, and revoked tokens", async () => {
    const token = await createPersonalToken(userId, "Firefox clipper");
    const [entry] = await listPersonalTokens(userId);
    await expect(revokePersonalToken(randomUUID(), entry.id)).resolves.toBe(false);

    await db.update(users).set({ banned_at: new Date().toISOString() }).where(eq(users.id, userId));
    await expect(authenticatePersonalToken(token)).resolves.toBeUndefined();
    await db.update(users).set({ banned_at: null, email_verified_at: null }).where(eq(users.id, userId));
    await expect(authenticatePersonalToken(token)).resolves.toBeUndefined();
    await db.update(users).set({ email_verified_at: new Date().toISOString() }).where(eq(users.id, userId));
    await expect(revokePersonalToken(userId, entry.id)).resolves.toBe(true);
    await expect(authenticatePersonalToken(token)).resolves.toBeUndefined();
  });
});

describe("an account whose password was never proven", () => {
  // Migrations 0000 through `last` in a folder of their own.
  function migrationsThrough(last: number) {
    const dir = mkdtempSync(join(tmpdir(), "ra-migrations-"));
    mkdirSync(join(dir, "meta"));
    const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
    journal.entries = journal.entries.filter(({ idx }: { idx: number }) => idx <= last);
    writeFileSync(join(dir, "meta/_journal.json"), JSON.stringify(journal));
    for (const { tag } of journal.entries) copyFileSync(`drizzle/${tag}.sql`, join(dir, `${tag}.sql`));
    return dir;
  }

  it("loses the sessions and API tokens it held before passwords had to be proven", async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { citext } = await import("@electric-sql/pglite/contrib/citext");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client = new PGlite({ extensions: { citext } });
    try {
      const old = drizzle(client);
      await migrate(old, { migrationsFolder: migrationsThrough(10) });
      const owners = await old.insert(users).values([
        { email: "unproven@example.com", password_hash: "fixture", email_verified_at: sql`now()` },
        { email: "proven@example.com", password_hash: "fixture", email_verified_at: sql`now()`, password_set_at: sql`now()` },
      ]).returning({ id: users.id, email: users.email });
      for (const { id } of owners) {
        await old.insert(sessions).values({ id: hashToken(randomUUID()), user_id: id, expires_at: new Date(Date.now() + 86_400_000).toISOString() });
        await old.insert(personalTokens).values({ user_id: id, name: "Clipper", token_hash: hashToken(randomUUID()) });
      }

      await migrate(old, { migrationsFolder: "drizzle" });
      const proven = owners.find(({ email }) => email === "proven@example.com")!.id;
      expect((await old.select({ owner: sessions.user_id }).from(sessions)).map(({ owner }) => owner)).toEqual([proven]);
      expect((await old.select({ owner: personalTokens.user_id }).from(personalTokens)).map(({ owner }) => owner)).toEqual([proven]);
    } finally {
      await client.close();
    }
  }, 30_000);

  it("cannot use a session or API token", async () => {
    const session = await create();
    const token = await createPersonalToken(userId, "Clipper");
    await expect(validateSession(session.token)).resolves.toMatchObject({ id: userId });
    await db.update(users).set({ password_set_at: null }).where(eq(users.id, userId));
    await expect(validateSession(session.token)).resolves.toBeNull();
    await expect(authenticatePersonalToken(token)).resolves.toBeUndefined();
  });
});
