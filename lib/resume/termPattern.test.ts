import { describe, expect, it } from "vitest";
import { termPattern } from "./termPattern";

describe("termPattern", () => {
  it("matches whole tokens only", () => {
    expect(termPattern("Go").test("Built services in Go.")).toBe(true);
    expect(termPattern("Go").test("Good communicator")).toBe(false);
    expect(termPattern("C++").test("Wrote C++ and Rust")).toBe(true);
    expect(termPattern("CI/CD").test("owned the CI CD pipeline")).toBe(true);
  });
});
