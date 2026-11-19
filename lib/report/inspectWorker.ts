import { parentPort, workerData } from "node:worker_threads";
import { extractDocx, extractPdf, type ExtractedResume } from "../resume/extract.ts";
import { boundedDocx } from "./docxArchive.ts";
import { readDocxLayout } from "./docxLayout.ts";
import { InspectionLimit } from "./inspectLimits.ts";
import { checkPdfStreams } from "./pdfStreams.ts";
import { readPdfLayout } from "./pdfLayout.ts";
import type { FileInspectionFailure, ResumeFileFacts } from "./report";
import { logger } from "../logger";

type Extension = FileInspectionFailure["extension"];

/** Inspects the file first; only a file inside every budget is read for its text. */
async function read(extension: Extension, file: Uint8Array): Promise<{ facts: ResumeFileFacts; resume: ExtractedResume | null }> {
  let facts: ResumeFileFacts;
  let bounded = file;
  try {
    if (extension === "docx") {
      bounded = await boundedDocx(file);
      facts = await readDocxLayout(bounded);
    } else {
      await checkPdfStreams(file);
      facts = await readPdfLayout(file.slice());
    }
  } catch (error) {
    const reason = error instanceof InspectionLimit ? "too-large" : "unreadable";
    return { facts: { format: "invalid", extension, reason }, resume: null };
  }
  let resume: ExtractedResume | null = null;
  try {
    resume = extension === "docx" ? await extractDocx(bounded) : await extractPdf(file.slice());
  } catch (error) {
    logger.error({ error, extension, reason: "extract_failed" }, "Could not extract resume from uploaded file");
  }
  return { facts, resume };
}

const { extension, bytes }: { extension: Extension; bytes: Uint8Array } = workerData;
void read(extension, bytes).then((reading) => parentPort?.postMessage(reading));
