import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { Document, Packer, Paragraph } from "docx";
import { pdfFlateBomb, pdfPages } from "./__fixtures__/bombs";
import { INSPECTION_BACKSTOP_MS, MAX_DOCX_ENTRIES, MAX_PDF_PAGES, MAX_PDF_STREAMS, MAX_UPLOAD_BYTES, MAX_XML_BYTES } from "./inspectLimits";
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

  it("budgets the work, not the clock: operators count across every page", async () => {
    const busyPage = "1 w ".repeat(15_000);
    const file = pdfPages(MAX_PDF_PAGES, () => "x").toString("latin1").replaceAll("BT /F1 12 Tf 72 720 Td (x) Tj ET", busyPage);
    await expect(inspectPdf(Buffer.from(file, "latin1"))).resolves.toMatchObject({ format: "invalid", reason: "too-large" });
  }, 30_000);

  it("rejects stream-keyword spam before burning CPU", async () => {
    const spam = Buffer.from("%PDF-1.4\n" + "stream\nendstream\n".repeat(MAX_PDF_STREAMS + 1) + "%%EOF", "latin1");
    await expect(inspectPdf(spam)).resolves.toMatchObject({ format: "invalid", reason: "too-large" });
  });

  it("gives a slow inspection well past 4 seconds before its wall-clock backstop", async () => {
    vi.useFakeTimers();
    try {
      let settled = false;
      const inspection = inspectPdf(new Uint8Array()).finally(() => { settled = true; });
      await vi.advanceTimersByTimeAsync(5_000);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(INSPECTION_BACKSTOP_MS);
      await expect(inspection).resolves.toMatchObject({ format: "invalid", reason: "too-large" });
    } finally {
      vi.useRealTimers();
    }
  });
});
