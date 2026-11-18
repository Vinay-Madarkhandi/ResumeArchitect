import { describe, expect, it } from "vitest";
import { hashPassword, passwordError, verifyPassword } from "./password";

describe("passwords", () => {
  it("uses a fresh salt and Argon2id with the configured costs", async () => {
    const password = "Violet sails across broad rivers";
    const [first, second] = await Promise.all([hashPassword(password), hashPassword(password)]);
    expect(first).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(first).not.toBe(second);
    await expect(verifyPassword(password, first)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", first)).resolves.toBe(false);
    await expect(verifyPassword(password, "invalid hash")).resolves.toBe(false);
  });

  it("rejects short, common and oversized passwords", () => {
    expect(passwordError("short")).toMatch(/10 characters/);
    expect(passwordError(" Password123 ")).toMatch(/less common/);
    expect(passwordError("s".repeat(1025))).toMatch(/at most/);
    expect(passwordError("Violet sails across broad rivers")).toBeNull();
  });
});
