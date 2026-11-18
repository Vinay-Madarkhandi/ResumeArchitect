import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { authTokens, recoveryCodes, users } from "@/lib/db/schema";
import type { EmailJob } from "@/lib/queue";
import { seedAdmins } from "@/lib/auth/accounts";
import { hashToken } from "@/lib/auth/secrets";
import { openText } from "@/lib/crypto/keyCipher";
import { authenticator, protectTotp, replaceRecoveryCodes } from "@/lib/auth/totp";
import { changeEmail, forgotPassword, requestSignInLink, resetPassword, signIn, signInWithLink, signUp, verifyEmail } from "./auth";

const fixture = vi.hoisted(() => ({
  serverKey: process.env.KEY_ENCRYPTION_SECRET ??= Buffer.alloc(32, 3).toString("base64"),
  close: async () => {},
  ip: "203.0.113.1",
  cookies: new Map<string, string>(),
  mail: [] as EmailJob[],
}));
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
vi.mock("@/lib/queue", () => ({
  emailQueue: () => ({ add: async (_name: string, job: EmailJob) => void fixture.mail.push(job) }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": fixture.ip, "user-agent": "Vitest" }),
  cookies: async () => ({
    get: (name: string) => fixture.cookies.has(name) ? { value: fixture.cookies.get(name) } : undefined,
    set: (name: string, value: string) => void (value ? fixture.cookies.set(name, value) : fixture.cookies.delete(name)),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw Object.assign(new Error("NEXT_REDIRECT"), { url }); },
}));

const OWNER = "owner-correct-horse";
const ATTACKER = "attacker-battery-staple";

beforeAll(async () => {
  const setup = await import("@/lib/db") as unknown as { migrateFixture: () => Promise<void> };
  await setup.migrateFixture();
}, 30_000);
beforeEach(() => {
  fixture.ip = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
  fixture.cookies.clear();
  fixture.mail.length = 0;
});
afterAll(async () => {
  cache().disconnect();
  await fixture.close();
});

const victim = () => `victim-${randomUUID()}@example.com`;
const account = async (email: string) => (await db.select().from(users).where(eq(users.email, email)))[0];
const from = (ip: string) => { fixture.ip = ip; };

function lastLink(to: string, template: "verify" | "reset" | "changeEmail" | "signIn") {
  const job = fixture.mail.findLast((entry) => "to" in entry && entry.to === to && entry.template === template);
  if (!job || !("sealedLink" in job.data)) throw new Error(`No ${template} mail for ${to}`);
  return new URL(openText(job.data.sealedLink)).searchParams.get("token")!;
}

async function ageLinks(email: string, ms: number) {
  const user = await account(email);
  const rows = await db.select().from(authTokens).where(eq(authTokens.user_id, user.id));
  for (const row of rows) {
    await db.update(authTokens).set({ expires_at: new Date(Date.parse(row.expires_at) - ms).toISOString() })
      .where(eq(authTokens.id, row.id));
  }
}

async function resetWith(token: string, password: string) {
  await expect(resetPassword(token, password)).rejects.toMatchObject({ url: "/sign-in?reset=1" });
}

describe("an unverified address squatted by someone else", () => {
  it("lets the inbox owner sign up again, verify, and sign in with their own password", async () => {
    const email = victim();
    from("198.51.100.7");
    await signUp(email, ATTACKER);
    fixture.mail.length = 0;

    from("203.0.113.9");
    await expect(signUp(email, OWNER)).resolves.toEqual({});
    await expect(verifyEmail(lastLink(email, "verify"), false, OWNER)).resolves.toEqual({});

    fixture.cookies.clear();
    await expect(signIn(email, ATTACKER, "")).resolves.toHaveProperty("error");
    await expect(signIn(email, OWNER, "")).resolves.toEqual({});
  });

  it("sends a fresh, working link for every accepted sign-up, however close together", async () => {
    const email = victim();
    await signUp(email, ATTACKER);
    await signUp(email, OWNER);
    const links = fixture.mail.filter((job) => "to" in job && job.to === email && job.template === "verify")
      .map((job) => "sealedLink" in job.data ? new URL(openText(job.data.sealedLink)).searchParams.get("token")! : "");
    expect(links).toHaveLength(2);
    await expect(verifyEmail(links[0], false, OWNER)).resolves.toEqual({});
    await expect(verifyEmail(links[1], false, OWNER)).resolves.toEqual({ error: "This link has expired or has already been used." });
  });

  it("verifies from a link the owner did not request without knowing the squatter's password", async () => {
    const email = victim();
    await signUp(email, ATTACKER);
    await expect(verifyEmail(lastLink(email, "verify"), false, OWNER)).resolves.toEqual({});
    fixture.cookies.clear();
    await expect(signIn(email, ATTACKER, "")).resolves.toHaveProperty("error");
    await expect(signIn(email, OWNER, "")).resolves.toEqual({});
  });

  it("sends a password reset link that verifies the address", async () => {
    const email = victim();
    await signUp(email, ATTACKER);
    await forgotPassword(email);
    await resetWith(lastLink(email, "reset"), OWNER);
    await expect(signIn(email, ATTACKER, "")).resolves.toHaveProperty("error");
    await expect(signIn(email, OWNER, "")).resolves.toEqual({});
    expect((await account(email)).email_verified_at).not.toBeNull();
  });

  it("grants an ADMIN_EMAILS role only once the inbox is proven", async () => {
    const email = victim();
    vi.stubEnv("ADMIN_EMAILS", email);
    try {
      await signUp(email, ATTACKER);
      await seedAdmins();
      expect((await account(email)).role).toBe("user");
      await verifyEmail(lastLink(email, "verify"), false, OWNER);
      expect((await account(email)).role).toBe("admin");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("never activates or promotes a password chosen before the address was verified", async () => {
    const email = victim();
    vi.stubEnv("ADMIN_EMAILS", email);
    try {
      await signUp(email, ATTACKER);
      // What a manual verification used to leave: verified, password still the squatter's.
      await db.update(users).set({ email_verified_at: sql`now()` }).where(eq(users.email, email));
      await seedAdmins();
      expect((await account(email)).role).toBe("user");
      await expect(signIn(email, ATTACKER, "")).resolves.toHaveProperty("error");

      await forgotPassword(email);
      await resetWith(lastLink(email, "reset"), OWNER);
      await seedAdmins();
      expect((await account(email)).role).toBe("admin");
      await expect(signIn(email, OWNER, "")).resolves.toEqual({});
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("answers a repeat sign-up for a verified address exactly like a new one, sending nothing", async () => {
    const email = victim();
    await signUp(email, OWNER);
    await verifyEmail(lastLink(email, "verify"), false, OWNER);
    fixture.mail.length = 0;
    await expect(signUp(email, ATTACKER)).resolves.toEqual({});
    expect(fixture.mail).toEqual([]);
  });
});

it("never queues a usable link in plaintext", async () => {
  const email = victim();
  await signUp(email, OWNER);
  const token = lastLink(email, "verify");
  expect(JSON.stringify(fixture.mail)).not.toContain(token);
});

describe("sign-in throttling", () => {
  const tooMany = { error: "Too many sign-in attempts. Try again in a few minutes." };
  const backingOff = { ...tooMany, offerLink: true };

  async function failFromManyAddresses(email: string) {
    for (let attempt = 1; attempt <= 20; attempt++) {
      from(`198.51.100.${attempt}`);
      await expect(signIn(email, "wrong-password-guess", "")).resolves.not.toEqual(tooMany);
    }
    from("192.0.2.200");
  }

  it("backs off an account after twenty failures from any address, then lets the owner in", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const email = victim();
      await signUp(email, OWNER);
      await verifyEmail(lastLink(email, "verify"), false, OWNER);
      await failFromManyAddresses(email);
      await expect(signIn(email, OWNER, "")).resolves.toEqual(backingOff);
      vi.setSystemTime(Date.now() + 3_600_000);
      await expect(signIn(email, OWNER, "")).resolves.toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });

  it("throttles an unknown address the same way", async () => {
    const email = victim();
    await failFromManyAddresses(email);
    await expect(signIn(email, OWNER, "")).resolves.toEqual(backingOff);
    await expect(requestSignInLink(email)).resolves.toEqual({});
    expect(fixture.mail).toEqual([]);
  });

  async function verifiedOwner() {
    const email = victim();
    await signUp(email, OWNER);
    await verifyEmail(lastLink(email, "verify"), false, OWNER);
    fixture.cookies.clear();
    return email;
  }

  it("lets the owner in with a one-time emailed link while guesses keep the account backing off", async () => {
    const email = await verifiedOwner();
    await failFromManyAddresses(email);
    await expect(signIn(email, OWNER, "")).resolves.toEqual(backingOff);

    await expect(requestSignInLink(email)).resolves.toEqual({});
    const token = lastLink(email, "signIn");
    const [stored] = await db.select().from(authTokens).where(eq(authTokens.id, hashToken(token)));
    expect(stored.purpose).toBe("sign_in");
    expect(Date.parse(stored.expires_at) - Date.now()).toBeLessThanOrEqual(15 * 60_000);

    await expect(signInWithLink(token, "")).resolves.toEqual({});
    expect(fixture.cookies.get("ra_session")).toBeTruthy();
    await expect(signInWithLink(token, "")).resolves.toHaveProperty("error");

    fixture.cookies.clear();
    await expect(signIn(email, OWNER, "")).resolves.toEqual({});
  });

  it("offers the emailed link to an owner whose own address has hit its limit too", async () => {
    const email = await verifiedOwner();
    from("192.0.2.50");
    for (let attempt = 1; attempt <= 5; attempt++) await signIn(email, "owner-typo-guess", "");
    await expect(signIn(email, OWNER, "")).resolves.toEqual(tooMany);
    await failFromManyAddresses(email);
    from("192.0.2.50");
    await expect(signIn(email, OWNER, "")).resolves.toEqual(backingOff);
  }, 20_000);

  it("returns to the page the owner was headed for, and only on this site", async () => {
    const email = await verifiedOwner();
    await requestSignInLink(email, "/tracker?job=42");
    await expect(signInWithLink(lastLink(email, "signIn"), "")).resolves.toEqual({ redirect: "/tracker?job=42" });
    await requestSignInLink(email, "/.//evil.com");
    await expect(signInWithLink(lastLink(email, "signIn"), "")).resolves.toEqual({});
  });

  it("rejects an expired sign-in link", async () => {
    const email = await verifiedOwner();
    await requestSignInLink(email);
    const token = lastLink(email, "signIn");
    await ageLinks(email, 15 * 60_000);
    await expect(signInWithLink(token, "")).resolves.toHaveProperty("error");
    expect(fixture.cookies.has("ra_session")).toBe(false);
  });

  it("still asks for the authenticator code when two-factor is on", async () => {
    vi.stubEnv("KEY_ENCRYPTION_SECRET", Buffer.alloc(32, 7).toString("base64"));
    try {
      const email = await verifiedOwner();
      const totp = authenticator(email);
      await db.update(users).set({ totp_secret_ciphertext: protectTotp(totp), totp_enabled_at: sql`now()` })
        .where(eq(users.email, email));
      await requestSignInLink(email);
      const token = lastLink(email, "signIn");
      await expect(signInWithLink(token, "")).resolves.toEqual({ needsCode: true });
      await expect(signInWithLink(token, String((Number(totp.generate()) + 1) % 1e6).padStart(6, "0"))).resolves.toMatchObject({ needsCode: true, error: expect.any(String) });
      expect(fixture.cookies.has("ra_session")).toBe(false);
      await expect(signInWithLink(token, totp.generate())).resolves.toEqual({});
      expect(fixture.cookies.get("ra_session")).toBeTruthy();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("spends one recovery code, and only with the session, when two tabs use the same link", async () => {
    vi.stubEnv("KEY_ENCRYPTION_SECRET", Buffer.alloc(32, 7).toString("base64"));
    try {
      const email = await verifiedOwner();
      const { id } = await account(email);
      await db.update(users).set({ totp_secret_ciphertext: protectTotp(authenticator(email)), totp_enabled_at: sql`now()` })
        .where(eq(users.id, id));
      const codes = await db.transaction((tx) => replaceRecoveryCodes(tx, id));
      await requestSignInLink(email);
      const token = lastLink(email, "signIn");

      const results = await Promise.all([signInWithLink(token, codes[0]), signInWithLink(token, codes[1])]);
      expect(results).toContainEqual({});
      expect(results).toContainEqual({ error: "This link has expired or has already been used." });
      const unused = await db.select().from(recoveryCodes).where(and(eq(recoveryCodes.user_id, id), isNull(recoveryCodes.used_at)));
      expect(unused).toHaveLength(9);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

it("answers an email change the same whether or not the new address is registered", async () => {
  const signedUp = async (email: string) => {
    fixture.cookies.clear();
    await signUp(email, OWNER);
    await verifyEmail(lastLink(email, "verify"), false, OWNER);
  };
  const [taken, current] = [victim(), victim()];
  await signedUp(taken);
  await signedUp(current);
  fixture.mail.length = 0;

  const free = victim();
  await expect(changeEmail(free, OWNER, "")).resolves.toEqual({});
  await expect(changeEmail(taken, OWNER, "")).resolves.toEqual({});
  expect(fixture.mail.map((job) => ["to" in job && job.to, job.template])).toEqual([[free, "changeEmail"], [taken, "changeEmail"]]);
});
