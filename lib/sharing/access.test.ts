import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isShareSlug, newShareSlug, shareGrant, validShareGrant } from "./access";

describe("resume share access", () => {
  it("generates URL-safe slugs backed by 32 random bytes", () => {
    const slugs = Array.from({ length: 64 }, newShareSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(isShareSlug(slug)).toBe(true);
      expect(Buffer.from(slug, "base64url")).toHaveLength(32);
    }
    for (const invalid of ["", "../private", "/".repeat(43), "x".repeat(42), "x".repeat(44)]) {
      expect(isShareSlug(invalid)).toBe(false);
    }
  });

  it("uses Argon2id and binds the browser grant to this slug and password hash", async () => {
    const password = "reader-access-phrase";
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("different phrase", hash)).toBe(false);

    const slug = newShareSlug();
    const grant = shareGrant(slug, hash);
    expect(validShareGrant(grant, slug, hash)).toBe(true);
    expect(validShareGrant(undefined, slug, hash)).toBe(false);
    expect(validShareGrant(hash, slug, hash)).toBe(false);
    expect(validShareGrant(grant, newShareSlug(), hash)).toBe(false);
    expect(validShareGrant(grant, slug, await hashPassword(password))).toBe(false);
  });
});
