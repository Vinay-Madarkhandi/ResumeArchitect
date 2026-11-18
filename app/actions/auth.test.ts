import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { authTokens, users } from "@/lib/db/schema";
import type { EmailJob } from "@/lib/queue";
import { seedAdmins } from "@/lib/auth/accounts";
import { changeEmail, forgotPassword, resetPassword, signIn, signUp, verifyEmail } from "./auth";

const fixture = vi.hoisted(() => ({
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

function lastLink(to: string, template: "verify" | "reset" | "changeEmail") {
  const job = fixture.mail.findLast((entry) => entry.to === to && entry.template === template);
  if (!job || job.template === "alert") throw new Error(`No ${template} mail for ${to}`);
  return new URL(job.data.link).searchParams.get("token")!;
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
    await ageLinks(email, 60_000);

    from("203.0.113.9");
    await expect(signUp(email, OWNER)).resolves.toEqual({});
    await expect(verifyEmail(lastLink(email, "verify"), false, OWNER)).resolves.toEqual({});

    fixture.cookies.clear();
    await expect(signIn(email, ATTACKER, "")).resolves.toHaveProperty("error");
    await expect(signIn(email, OWNER, "")).resolves.toEqual({});
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

  it("answers a repeat sign-up for a verified address exactly like a new one, sending nothing", async () => {
    const email = victim();
    await signUp(email, OWNER);
    await verifyEmail(lastLink(email, "verify"), false, OWNER);
    fixture.mail.length = 0;
    await expect(signUp(email, ATTACKER)).resolves.toEqual({});
    expect(fixture.mail).toEqual([]);
  });
});

describe("sign-in throttling", () => {
  const tooMany = { error: "Too many sign-in attempts. Try again in a few minutes." };

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
      await expect(signIn(email, OWNER, "")).resolves.toEqual(tooMany);
      vi.setSystemTime(Date.now() + 3_600_000);
      await expect(signIn(email, OWNER, "")).resolves.toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });

  it("throttles an unknown address the same way", async () => {
    const email = victim();
    await failFromManyAddresses(email);
    await expect(signIn(email, OWNER, "")).resolves.toEqual(tooMany);
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
  expect(fixture.mail.map(({ to, template }) => [to, template])).toEqual([[free, "changeEmail"], [taken, "changeEmail"]]);
});
