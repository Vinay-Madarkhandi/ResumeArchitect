import { describe, expect, it } from "vitest";
import { jobClipSchema, jobSchema } from "./schema";

describe("tracker input", () => {
  it("drops NUL characters that Postgres would reject", () => {
    const job = jobSchema.parse({
      title: "Backend\0 Engineer", company: "\0Acme", description: "Go\0 and SQL", notes: "call\0 back",
      contacts: [{ name: "Ada\0", role: "\0", email: "", linkedin: "" }],
    });
    expect(job).toMatchObject({ title: "Backend Engineer", company: "Acme", description: "Go and SQL", notes: "call back" });
    expect(job.contacts[0]).toMatchObject({ name: "Ada", role: "" });
  });

  it("still requires a title once NULs are gone", () => {
    expect(jobClipSchema.safeParse({ title: "\0\0" }).success).toBe(false);
  });
});
