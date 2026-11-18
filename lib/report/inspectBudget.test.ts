import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { Document, Packer, Paragraph } from "docx";
import { pdfFlateBomb, pdfPages } from "./__fixtures__/bombs";
import { INSPECTION_TIMEOUT_MS, MAX_DOCX_ENTRIES, MAX_UPLOAD_BYTES, MAX_XML_BYTES } from "./inspectLimits";
import { inspectDocx } from "./inspectDocx";
import { inspectPdf } from "./inspectPdf";

describe("file inspection budget", () => {
  it("inspects an ordinary Word file", async () => {
    const docx = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Ada Lovelace")] }] }));
    expect((await inspectDocx(docx)).format).toBe("docx");
  });

  it("rejects a small compressed archive whose declared contents exceed the expansion budget", async () => {
    const zip = await JSZip.loadAsync(await Packer.toBuffer(new Document({
      sections: [{ children: [new Paragraph("Ada Lovelace")] }],
    })));
    zip.file("word/media/repeated.bin", new Uint8Array(25 * 1024 * 1024));
    const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    expect(bytes.byteLength).toBeLessThan(100 * 1024);
    await expect(inspectDocx(bytes)).resolves.toMatchObject({ format: "invalid", reason: "too-large" });
  });

  it("checks the upload size before copying or parsing the input", async () => {
    const bytes = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    await expect(inspectPdf(bytes)).resolves.toEqual({
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
    await expect(inspectDocx(bytes)).resolves.toMatchObject({ format: "invalid", reason: "too-large" });
  });

  it("counts the bytes a PDF's streams inflate to before pdf.js reads them", async () => {
    await expect(inspectPdf(await pdfFlateBomb(64))).resolves.toMatchObject({ format: "invalid", reason: "too-large" });
    await expect(inspectPdf(pdfPages(2))).resolves.toMatchObject({ format: "pdf", hasTextLayer: true });
  }, 30_000);

  it("refuses PDF streams it can't measure: encrypted, or behind a legacy filter", async () => {
    const encrypted = Buffer.from(pdfPages(1).toString("latin1").replace("/Root 1 0 R", "/Root 1 0 R /Encr#79pt 9 0 R"), "latin1");
    const legacy = Buffer.from(pdfPages(1).toString("latin1").replace("<< /Length", "<< /Filter /ASCIIHexDecode /Length"), "latin1");
    for (const file of [encrypted, legacy]) {
      await expect(inspectPdf(file)).resolves.toMatchObject({ format: "invalid", reason: "unreadable" });
    }
  }, 30_000);

  it("stops inspection at its deadline", async () => {
    vi.useFakeTimers();
    try {
      const inspection = inspectPdf(new Uint8Array());
      vi.advanceTimersByTime(INSPECTION_TIMEOUT_MS);
      await expect(inspection).resolves.toMatchObject({ format: "invalid", reason: "too-large" });
    } finally {
      vi.useRealTimers();
    }
  });
});
