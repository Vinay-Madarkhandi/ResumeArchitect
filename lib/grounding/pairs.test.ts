import { describe, expect, it } from "vitest";
import { checkGrounding } from "@/lib/grounding";
import { verifyChange } from "@/lib/grounding/tailoring";

type Pair = [kind: "legit" | "invented", label: string, before: string, after: string];

// Reviewer's 34 pairs from /tmp/ra-review/pairs.test.ts
const reviewerPairs: Pair[] = [
  ["legit", "synonym Golang→Go", "Built Golang services for payments", "Built Go services for payments"],
  ["legit", "synonym Postgres→PostgreSQL", "Migrated reporting data to Postgres", "Migrated reporting data to PostgreSQL"],
  ["legit", "synonym k8s→Kubernetes", "Deployed internal apps on k8s", "Deployed internal apps on Kubernetes"],
  ["legit", "synonym JS→JavaScript", "Wrote front-end code in JS and Node.js", "Wrote front-end code in JavaScript and Node.js"],
  ["legit", "tense build→built", "Build REST APIs in Python", "Built REST APIs in Python"],
  ["legit", "tense maintain→maintained", "Maintain CI pipelines in GitHub Actions", "Maintained CI pipelines in GitHub Actions"],
  ["legit", "reorder clauses", "Reduced invoice latency by 38% using Redis caching", "Using Redis caching, reduced invoice latency by 38%"],
  ["legit", "reorder prepositional", "Led onboarding for 12 new hires at Acme Corp", "Led onboarding at Acme Corp for 12 new hires"],
  ["legit", "spelled-out five→5", "Managed a team of five engineers", "Managed a team of 5 engineers"],
  ["legit", "thirty percent→30%", "Cut cloud costs by thirty percent", "Cut cloud costs by 30%"],
  ["legit", "2,000→2000", "Processed 2,000 orders per day", "Processed 2000 orders per day"],
  ["legit", "$4M→$4 million", "Owned a $4M budget", "Owned a $4 million budget"],
  ["legit", "verb synonym improved→raised", "Improved test coverage from 40% to 85%", "Raised test coverage from 40% to 85%"],
  ["legit", "responsible for→active verb", "Responsible for maintaining the billing service", "Maintained the billing service"],
  ["legit", "compress collaboration", "Collaborated with designers and product managers to ship features", "Shipped features with designers and product managers"],
  ["legit", "adjective→noun phrase", "Developed dashboards in React and TypeScript", "Developed React and TypeScript dashboards"],
  ["legit", "drop article only", "Wrote the unit tests for the billing service", "Wrote unit tests for billing service"],
  ["invented", "added tool Kafka", "Built Go services for payments", "Built Go and Kafka services for payments"],
  ["invented", "added tool not in list (Rust)", "Wrote automation scripts in Bash", "Wrote automation scripts in Rust"],
  ["invented", "employer swap", "Software Engineer at Acme Corp", "Software Engineer at Google"],
  ["invented", "title inflation", "Software Engineer at Acme", "Senior Software Engineer at Acme"],
  ["invented", "duration change", "3 years of experience in Python", "5 years of experience in Python"],
  ["invented", "date change", "Junior Developer, 2021–2022", "Junior Developer, 2019–2022"],
  ["invented", "degree invented", "B.S. in Biology", "M.S. in Computer Science"],
  ["invented", "certification invented", "Studied for the AWS exam", "AWS Certified Solutions Architect"],
  ["invented", "team size", "Managed a team of 4", "Managed a team of 12"],
  ["invented", "metric to different outcome", "Sorted 38% of the incoming product samples", "Cut invoice latency by 38%"],
  ["invented", "new user count", "Built internal dashboards", "Built internal dashboards used by 10,000 users"],
  ["invented", "ownership inflation, no entities", "Helped with deployments", "Led all deployments"],
  ["invented", "invented revenue", "Assisted the sales team", "Closed $2M in enterprise deals"],
  ["invented", "scale inflation", "Worked on a payments app", "Architected a payments platform processing 1M transactions daily"],
  ["invented", "PhD invented", "Volunteer math tutor", "PhD in Mathematics"],
  ["invented", "causal link between separate claims", "Built Go services. Reduced costs by 20%.", "Built Go services that reduced costs by 20%"],
  ["invented", "spelled-out new metric", "Reduced costs", "Reduced costs by twenty percent"],
];

// Additional 22 pairs covering all required entity/claim types
const additionalPairs: Pair[] = [
  ["legit", "synonym TS→TypeScript", "Frontend development with TS and React", "Frontend development with TypeScript and React"],
  ["legit", "split slash skills", "Proficient in Python/Django/PostgreSQL", "Proficient in Python, Django, and PostgreSQL"],
  ["legit", "split pipe skills", "Skills: Go | Docker | Kubernetes", "Skills: Go, Docker, and Kubernetes"],
  ["legit", "currency $3M→$3 million", "Managed $3M pipeline", "Managed $3 million pipeline"],
  ["legit", "range formatting", "Led team of 5-8 engineers", "Led team of 5 to 8 engineers"],
  ["legit", "synonym AWS S3", "Stored assets in AWS S3", "Stored assets in Amazon S3"],
  ["legit", "active verb assisted→helped", "Assisted senior engineers with code reviews", "Helped senior engineers with code reviews"],
  ["legit", "drop filler words", "Successfully managed and executed project delivery", "Managed project delivery"],
  ["legit", "reorder skills list", "Experience with Docker, Go, and Kafka", "Experience with Kafka, Go, and Docker"],
  ["legit", "tense lead→led", "Lead sprint planning meetings", "Led sprint planning meetings"],
  ["legit", "spelled-out twelve→12", "Mentored twelve junior developers", "Mentored 12 junior developers"],
  ["invented", "added tech Docker", "Deployed web app to production", "Deployed web app to Docker in production"],
  ["invented", "added database MongoDB", "Maintained backend services", "Maintained MongoDB backend services"],
  ["invented", "employer swap Apple", "Software Engineer at Startup Co", "Software Engineer at Apple"],
  ["invented", "seniority inflation Principal", "Software Engineer at Stripe", "Principal Software Engineer at Stripe"],
  ["invented", "seniority inflation Head of", "Managed sprint backlog", "Head of Engineering managing sprint backlog"],
  ["invented", "certification CKA", "Managed Kubernetes clusters", "Certified Kubernetes Administrator (CKA) managing clusters"],
  ["invented", "degree M.S.", "B.S. in Electrical Engineering", "M.S. in Electrical Engineering"],
  ["invented", "duration inflation 2 to 4 years", "2 years of Go development", "4 years of Go development"],
  ["invented", "date shift", "Backend Engineer, 2018–2020", "Backend Engineer, 2016–2020"],
  ["invented", "metric swap latency to throughput", "Reduced latency by 25%", "Increased throughput by 25%"],
  ["invented", "scope inflation contributed to owned", "Contributed to auth module", "Owned auth module"],
];

const allPairs = [...reviewerPairs, ...additionalPairs];

describe("Grounding pairs table test", () => {
  it("satisfies reviewer acceptance criteria (0 FN, <= 1 FP on reviewer legit, catches every invented pair)", () => {
    let reviewerFp = 0;
    let reviewerFn = 0;
    let totalFn = 0;
    let totalFp = 0;

    for (const [kind, , before, after] of reviewerPairs) {
      const g = checkGrounding([before], after);
      const flagged = g.flags.length > 0;
      if (kind === "legit" && flagged) {
        reviewerFp++;
      } else if (kind === "invented" && !flagged) {
        reviewerFn++;
      }
    }

    expect(reviewerFn, "Reviewer pairs should have 0 false negatives").toBe(0);
    expect(reviewerFp, "Reviewer legit pairs should have at most 1 false positive").toBeLessThanOrEqual(1);

    for (const [kind, , before, after] of allPairs) {
      const g = checkGrounding([before], after);
      const flagged = g.flags.length > 0;
      if (kind === "legit" && flagged) {
        totalFp++;
      } else if (kind === "invented" && !flagged) {
        totalFn++;
      }
    }

    expect(totalFn, "All pairs must have 0 false negatives (catch every invented pair)").toBe(0);
    expect(totalFp, "Total false positives should be <= 1").toBeLessThanOrEqual(1);
  });

  describe("individual pairs verification", () => {
    for (const [kind, label, before, after] of allPairs) {
      it(`${kind}: ${label}`, () => {
        const g = checkGrounding([before], after);
        if (kind === "invented") {
          expect(g.flags.length, `Expected "${after}" to be flagged against "${before}"`).toBeGreaterThan(0);
        } else {
          // Allow at most 1 FP across the entire suite, but ideally 0
          if (g.flags.length > 0) {
            expect(["adjective→noun phrase"]).toContain(label);
          } else {
            expect(g.flags.length).toBe(0);
          }
        }
      });
    }
  });

  it("verifyChange blocks invented changes and allows legit changes", () => {
    const job = { requirements: [] } as unknown as Parameters<typeof verifyChange>[2];
    for (const [kind, label, before, after] of allPairs) {
      const t = verifyChange(
        { id: "c1", op: "rewrite", before, after, reason: "", requirementIds: [] },
        before,
        job,
        before,
      );
      const blockingFlags = t.filter((f) => f.kind !== "dropped" && f.kind !== "filler");
      if (kind === "invented") {
        expect(blockingFlags.length, `verifyChange should flag invented: ${label}`).toBeGreaterThan(0);
      } else {
        expect(blockingFlags.length, `verifyChange should allow legit: ${label}`).toBe(0);
      }
    }
  });
});
