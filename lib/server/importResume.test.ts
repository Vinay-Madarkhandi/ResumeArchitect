import { describe, expect, it } from "vitest";
import { detectKind } from "./importResume";

describe("detectKind", () => {
  it("accepts uppercase extensions like .DOCX and .PDF", () => {
    expect(detectKind(new File([""], "Resume.DOCX"))).toBe("docx");
    expect(detectKind(new File([""], "CV.PDF"))).toBe("pdf");
  });
});
