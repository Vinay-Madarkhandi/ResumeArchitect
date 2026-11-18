import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { Document, Packer, Paragraph } from "docx";
import { INSPECTION_TIMEOUT_MS, MAX_DOCX_ENTRIES, MAX_UPLOAD_BYTES, MAX_XML_BYTES } from "./inspectBudget";
import { inspectResumeFile } from "./inspectFile";

describe("inspectResumeFile", () => {
  it("inspects a .docx by its name, whatever the case", async () => {
    const docx = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Ada Lovelace")] }] }));
    expect((await inspectResumeFile("Ada_Resume.DOCX", docx)).format).toBe("docx");
  });

  it("rejects a small compressed archive whose declared contents exceed the expansion budget", async () => {
    const zip = await JSZip.loadAsync(await Packer.toBuffer(new Document({
      sections: [{ children: [new Paragraph("Ada Lovelace")] }],
    })));
    zip.file("word/media/repeated.bin", new Uint8Array(25 * 1024 * 1024));
    const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    expect(bytes.byteLength).toBeLessThan(100 * 1024);
    await expect(inspectResumeFile("resume.docx", bytes)).resolves.toMatchObject({ format: "invalid", reason: "too-large" });
  });

  it("checks the upload size before copying or parsing the input", async () => {
    const bytes = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    await expect(inspectResumeFile("resume.pdf", bytes)).resolves.toEqual({
      format: "invalid", extension: "pdf", reason: "too-large",
    });
  });

  it.each(["entries", "XML part"] as const)("rejects an archive over its %s limit", async (kind) => {
    const zip = new JSZip();
    if (kind === "entries") {
      for (let i = 0; i <= MAX_DOCX_ENTRIES; i++) zip.file(`entry-${i}`, "");
    } else {
      zip.file("word/document.xml", " ".repeat(MAX_XML_BYTES + 1));
    }
    const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    await expect(inspectResumeFile("resume.docx", bytes)).resolves.toMatchObject({ format: "invalid", reason: "too-large" });
  });

  it("stops inspection at its deadline", async () => {
    vi.useFakeTimers();
    try {
      const inspection = inspectResumeFile("resume.pdf", new Uint8Array());
      vi.advanceTimersByTime(INSPECTION_TIMEOUT_MS);
      await expect(inspection).resolves.toMatchObject({ format: "invalid", reason: "too-large" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports other formats by extension for the file-type check", async () => {
    expect(await inspectResumeFile("resume.pages", new Uint8Array())).toEqual({ format: "other", extension: "pages" });
    expect(await inspectResumeFile("scan.PNG", new Uint8Array())).toEqual({ format: "other", extension: "png" });
    expect(await inspectResumeFile("resume", new Uint8Array())).toEqual({ format: "other", extension: "" });
  });
});
