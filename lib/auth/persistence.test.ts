import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { authTokens, personalTokens, recoveryCodes, sessions, users } from "@/lib/db/schema";
import { clearSessionCache, createSession, removeSessions, revokeSession, validateSession } from "./sessions";
import { authenticatePersonalToken, createPersonalToken, listPersonalTokens, readBearer, revokePersonalToken } from "./personal-tokens";
import { hashToken } from "./secrets";
import { authenticator, checkSecondFactor, protectTotp, replaceRecoveryCodes } from "./totp";
import { consumeToken, findToken, issueToken } from "./tokens";

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
    email: `${randomUUID()}@example.com`, password_hash: "fixture", email_verified_at: new Date().toISOString(),
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
    await expect(check(totp.generate())).resolves.toBe(true);
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
