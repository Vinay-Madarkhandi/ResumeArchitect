import { describe, expect, it } from "vitest";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { specifics, verifyChange } from "./tailoring";

const job = { requirements: [] } as unknown as JobAnalysis;

function check(before: string, after: string) {
  return verifyChange({ id: "c1", op: "rewrite", before, after, reason: "", requirementIds: [], cites: [] }, before, job);
}

// Edits a real tailoring run made: each reads smoother and says less.
describe("verifyChange on vaguer rewrites", () => {
  it("flags a version and a database the rewrite dropped", () => {
    const flags = check(
      "Re-architected the backend from a single-instance MySQL design into a horizontally scalable, multi-instance Spring Boot 4 service on PostgreSQL with Flyway migrations",
      "Re-architected backend to a horizontally scalable, multi-instance Spring Boot microservices architecture on PostgreSQL with Flyway, demonstrating cloud-native principles.",
    );
    expect(flags.find((f) => f.kind === "dropped")?.value).toBe("MySQL, Spring Boot 4");
    expect(flags.find((f) => f.kind === "filler")?.value).toBe("demonstrating");
  });

  it("flags state names, DNS, and padding", () => {
    const states = check(
      "Designed fast/slow worker pools and an alert state machine (UP / SUSPECT / DOWN) with debounce thresholds to prevent alert flapping",
      "Designed robust alert state machine with debounce thresholds and worker pools to prevent alert flapping, enhancing monitoring reliability.",
    );
    expect(states.find((f) => f.kind === "dropped")?.value).toBe("UP, SUSPECT, DOWN");
    expect(states.find((f) => f.kind === "filler")?.value).toBe("robust, enhancing");

    const dns = check(
      "Implemented a durable email outbox with retries for reliable alerting, plus SSRF protection at monitor creation and DNS resolution",
      "Implemented durable email outbox with retries for reliable alerting and integrated SSRF protection for enhanced security.",
    );
    expect(dns.find((f) => f.kind === "dropped")?.value).toBe("DNS");
  });

  it("stays quiet when the specifics survive and nothing is padded", () => {
    expect(
      check(
        "Built a Next.js frontend for tenant-specific dashboards",
        "I build the Next.js frontend for tenant-specific dashboards",
      ),
    ).toEqual([]);
  });

  it("doesn't flag filler the original already used", () => {
    expect(check("Built a robust Spring Boot API", "Built a robust Spring Boot REST API").map((f) => f.kind)).not.toContain("filler");
  });
});

describe("specifics", () => {
  it("ignores the capital that starts the line", () => {
    expect(specifics("Developed APIs with Spring MVC and Next.js")).toEqual(["APIs", "Spring MVC", "Next.js"]);
  });
});
