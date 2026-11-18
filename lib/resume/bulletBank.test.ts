import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import { documentText } from "@/lib/resume/units";
import { bulletKey, harvestBullets, includedKeys, insertBullet, mergeBank, removeBullet } from "@/lib/resume/bulletBank";
import { emptyDocumentContent } from "@/lib/schemas/document";

const RESUME = markdownToDocument(`# Ada Lovelace

## Experience

### Senior Engineer — Analytical Engines

- Built a **Kafka** pipeline that cut invoice latency by 38%
- Ran the on-call rotation

### Engineer — Difference Co

- Wrote the billing service in Go

## Projects

- Open-source notebook for Bernoulli numbers`);

const lines = (doc: Parameters<typeof documentText>[0]) => documentText(doc).split("\n");

describe("career history bullets", () => {
  it("harvests each bullet with the role and section it was written under", () => {
    const bank = harvestBullets(RESUME);
    expect(bank.map((b) => [b.markdown, b.role, b.section])).toEqual([
      ["Built a **Kafka** pipeline that cut invoice latency by 38%", "Senior Engineer — Analytical Engines", "Experience"],
      ["Ran the on-call rotation", "Senior Engineer — Analytical Engines", "Experience"],
      ["Wrote the billing service in Go", "Engineer — Difference Co", "Experience"],
      ["Open-source notebook for Bernoulli numbers", null, "Projects"],
    ]);
  });

  it("treats spacing, case and a trailing period as the same bullet", () => {
    expect(bulletKey("  Ran the  On-call rotation. ")).toBe(bulletKey("Ran the on-call rotation"));
  });

  it("toggles a bullet off for one resume and back on under its role, keeping everything else", () => {
    const [kafka] = harvestBullets(RESUME);
    const off = removeBullet(RESUME, kafka.key);
    expect(includedKeys(off).has(kafka.key)).toBe(false);
    expect(lines(off)).toEqual(lines(RESUME).filter((l) => !l.startsWith("Built a Kafka")));

    // The bank still has it, because the bank is the union of every resume.
    expect(mergeBank(harvestBullets(RESUME), off).map((b) => b.key)).toContain(kafka.key);

    const on = insertBullet(off, kafka);
    const text = lines(on);
    expect(text.indexOf("Built a Kafka pipeline that cut invoice latency by 38%")).toBeGreaterThan(text.indexOf("Senior Engineer — Analytical Engines"));
    expect(text.indexOf("Built a Kafka pipeline that cut invoice latency by 38%")).toBeLessThan(text.indexOf("Engineer — Difference Co"));
    expect(includedKeys(on)).toEqual(includedKeys(RESUME));
  });

  it("keeps formatting when a bullet comes back", () => {
    const [kafka] = harvestBullets(RESUME);
    const on = insertBullet(removeBullet(RESUME, kafka.key), kafka);
    expect(JSON.stringify(on)).toContain('"marks":[{"type":"bold"}]');
  });

  it("adds a bullet from another resume to the matching role, or its section, or the end", () => {
    const fromElsewhere = { key: bulletKey("Mentored two engineers"), markdown: "Mentored two engineers", section: "Experience", role: "Engineer — Difference Co" };
    expect(lines(insertBullet(RESUME, fromElsewhere)).at(-3)).toBe("Mentored two engineers");

    const unknownRole = { ...fromElsewhere, role: "Intern — Somewhere Else" };
    expect(lines(insertBullet(RESUME, unknownRole)).at(-3)).toBe("Mentored two engineers");

    const noHome = { ...fromElsewhere, role: null, section: "Volunteering" };
    expect(lines(insertBullet(RESUME, noHome)).at(-1)).toBe("Mentored two engineers");

    expect(documentText(insertBullet(emptyDocumentContent(), noHome))).toBe("Mentored two engineers");
  });

  it("never adds the same bullet twice", () => {
    const [kafka] = harvestBullets(RESUME);
    expect(insertBullet(RESUME, kafka)).toBe(RESUME);
  });
});
