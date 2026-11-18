import { describe, expect, it } from "vitest";
import { accountActionError, isAdmin } from "./policy";

const target = { id: "target", role: "admin", banned_at: null, email_verified_at: "verified" };

describe("admin authorization", () => {
  it("requires the admin role", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin({ role: "user" })).toBe(false);
    expect(isAdmin({ role: "admin" })).toBe(true);
  });

  it.each(["ban", "delete"])("blocks self-%s even with other admins", (action) => {
    expect(accountActionError(action, target.id, target, 1)).toBeDefined();
  });

  it.each(["ban", "delete", "demote"])("prevents %s of the last active admin", (action) => {
    expect(accountActionError(action, "actor", target, 0)).toBeDefined();
    expect(accountActionError(action, "actor", target, 1)).toBeUndefined();
  });

  it("allows promotion only for a verified and active account", () => {
    expect(accountActionError("promote", "actor", { ...target, banned_at: "banned" }, 1)).toBeDefined();
    expect(accountActionError("promote", "actor", { ...target, email_verified_at: null }, 1)).toBeDefined();
    expect(accountActionError("promote", "actor", target, 1)).toBeUndefined();
  });
});
