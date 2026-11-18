import { describe, expect, it } from "vitest";
import { Document, Packer, Paragraph } from "docx";
import { inspectResumeFile } from "./inspectFile";

describe("inspectResumeFile", () => {
  it("inspects a .docx by its name, whatever the case", async () => {
    const docx = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Ada Lovelace")] }] }));
    expect((await inspectResumeFile("Ada_Resume.DOCX", docx)).format).toBe("docx");
  });

  it("reports other formats by extension for the file-type check", async () => {
    expect(await inspectResumeFile("resume.pages", new Uint8Array())).toEqual({ format: "other", extension: "pages" });
    expect(await inspectResumeFile("scan.PNG", new Uint8Array())).toEqual({ format: "other", extension: "png" });
    expect(await inspectResumeFile("resume", new Uint8Array())).toEqual({ format: "other", extension: "" });
  });
});
