import { describe, expect, it } from "vitest";
import { answerQuote, checkGrounding } from ".";
import { VERIFY_CLAIM } from "./placeholder";

const sparse = "Sorted product samples";
const kafka = "Built a Kafka pipeline that cut invoice latency by 38%";

describe("candidate claim grounding", () => {
  it.each([
    "How did you measure the effect of your Kafka pipeline on invoice latency?",
    "The 38% reduction makes the result measurable.",
    "Backend Engineer | Go services and incident response",
    "List Kafka in your Skills section so recruiters can find it.",
    kafka,
  ])("flags the reviewer's unsupported wording %j", (output) => {
    const result = checkGrounding([sparse], output);
    expect(result.supported).toHaveLength(0);
    expect(result.text).toContain(VERIFY_CLAIM);
    expect(result.flags.length).toBeGreaterThan(0);
  });

  it("requires the quantity and the thing it measures in the same source claim", () => {
    const result = checkGrounding(["Sorted 38% of the incoming product samples"], kafka);
    expect(result.flags).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "number", value: "38%", message: expect.stringContaining("invoice latency") }),
      expect.objectContaining({ kind: "skill", value: "Kafka" }),
    ]));
    expect(result.text).toBe(VERIFY_CLAIM);
    expect(checkGrounding(["Managed a team of 12. Saved time."], "Managed a team of 12 and saved 12 hours").flags).toHaveLength(2);
  });

  it("grounds a real metric and accepts conservative synonyms", () => {
    const source = "# Experience\n- Built Golang services.\n- Cut invoice latency by 38%";
    const output = "I build Go services. I reduced invoice latency by 38 percent.";
    const result = checkGrounding([source], output);
    expect(result.text).toBe(output);
    expect(result.flags).toEqual([]);
    expect(result.supported.map((claim) => claim.evidence)).toEqual(["Built Golang services", "Cut invoice latency by 38%"]);
  });

  it("keeps dates, durations, employers and titles tied to the stated role", () => {
    const source = "Engineer at Acme Corp for 3 years\nManager at Example Ltd for 2 years";
    expect(checkGrounding([source], "Engineer at Acme Corp for 3 years").flags).toEqual([]);
    const result = checkGrounding([source], "Senior Engineer at Acme Corp for 2 years");
    expect(result.flags.map((flag) => flag.kind)).toEqual(expect.arrayContaining(["title", "name", "number"]));
  });

  it("holds back negation changes, implied ownership and replaced link targets", () => {
    expect(checkGrounding(["I never built Kafka services"], "I built Kafka services").unsupported).toHaveLength(1);
    expect(checkGrounding(["Build Kafka services?"], "Built Kafka services").unsupported).toHaveLength(1);
    expect(checkGrounding(["Cut invoice latency by 3,8%"], "Cut invoice latency by 38%").unsupported).toHaveLength(1);
    expect(checkGrounding(["Worked on a Go service"], "Led a Go service").unsupported).toHaveLength(1);
    expect(checkGrounding(["Maintained the [site](https://a.example)"], "Maintained the [site](https://b.example)").unsupported).toHaveLength(1);
  });

  it("only quotes actual words from the given answer", () => {
    expect(answerQuote(sparse, "The 38% reduction makes the result measurable.")).toBeNull();
    expect(answerQuote("I sorted product samples. I logged their arrival.", "“I sorted product samples.”")).toBe("I sorted product samples.");
    expect(answerQuote("I sorted product samples.", "Sorted product samples")).toBeNull();
  });
});
