import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { Document, Packer, Paragraph } from "docx";
import { MAX_DOCX_ENTRIES, MAX_UPLOAD_BYTES, MAX_XML_BYTES } from "./inspectLimits";
import { inspectDocx } from "./inspectDocx";
import { inspectPdf } from "./inspectPdf";
import { parseSemaphore, ParseBusyError, readWithinBudget } from "./inspectBudget";

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

  it("proves the limit, not luck, stopped it: a child that allocates 1 GB of Buffer gets killed and reported as too-large", async () => {
    const before = process.memoryUsage().rss;
    const result = await readWithinBudget("pdf", Buffer.from("RA_ALLOC_TEST"));
    const after = process.memoryUsage().rss;
    const growthMb = (after - before) / (1024 * 1024);
    expect(result.facts).toEqual({ format: "invalid", extension: "pdf", reason: "too-large" });
    expect(growthMb).toBeLessThan(50);
  });

  const HOSTILE_FILES = [
    "e_single.pdf",
    "e_double.pdf",
    "e_triple.pdf",
    "e_parms_after.pdf",
    "e_parms_before.pdf",
    "e_arr_parms.pdf",
    "e_indirect_len.pdf",
    "e_lying_len.pdf",
    "e_lzw.pdf",
    "e_ahx_flate.pdf",
    "e_escaped_name.pdf",
    "e_flate_abbr.pdf",
    "e_newline_filter.pdf",
    "e_form_xobject.pdf",
  ];

  it.each(HOSTILE_FILES)("rejects hostile fixture %s within the memory limit with parent RSS growth < 50 MB", async (filename) => {
    const filePath = join(__dirname, "__fixtures__/hostile_pdfs", filename);
    const bytes = readFileSync(filePath);
    const before = process.memoryUsage().rss;
    const result = await readWithinBudget("pdf", bytes);
    const after = process.memoryUsage().rss;
    const growthMb = (after - before) / (1024 * 1024);
    expect(growthMb).toBeLessThan(50);
    expect(result.facts.format).toBe("invalid");
    if (result.facts.format === "invalid") {
      expect(["too-large", "unreadable"]).toContain(result.facts.reason);
    }
  }, 30_000);

  const REAL_FILES = [
    ["chrome_jpeg_photo.pdf", 1],
    ["chrome_png_photo.pdf", 1],
    ["chrome_text.pdf", 0],
  ] as const;

  it.each(REAL_FILES)("accepts real PDF fixture %s with text and layout facts", async (filename, expectedImages) => {
    const filePath = join(__dirname, "__fixtures__/real_pdfs", filename);
    const bytes = readFileSync(filePath);
    const result = await readWithinBudget("pdf", bytes);
    expect(result.facts).toMatchObject({
      format: "pdf",
      hasTextLayer: true,
      images: expectedImages,
    });
    if (result.resume && result.resume.source === "word") {
      expect(JSON.stringify(result.resume.content)).toContain("Ada Lovelace");
    } else if (result.resume && result.resume.source === "text") {
      expect(result.resume.text).toContain("Ada Lovelace");
    }
  }, 30_000);

  it("limits concurrency to 2 parses and returns ParseBusyError when queue is full", async () => {
    parseSemaphore.reset();
    const release1 = await parseSemaphore.acquire();
    const release2 = await parseSemaphore.acquire();

    // 2 are active. Now queue 2 tasks.
    const queued1 = parseSemaphore.acquire();
    const queued2 = parseSemaphore.acquire();

    // 5th task should be refused immediately with ParseBusyError
    await expect(parseSemaphore.acquire()).rejects.toThrow(ParseBusyError);

    release1();
    const release3 = await queued1;
    release2();
    const release4 = await queued2;
    release3();
    release4();
  });
});
