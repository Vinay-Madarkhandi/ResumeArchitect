import { extractDocx, extractPdf, type ExtractedResume } from "../resume/extract";
import { boundedDocx } from "./docxArchive";
import { readDocxLayout } from "./docxLayout";
import { InspectionLimit } from "./inspectLimits";
import { readPdfLayout } from "./pdfLayout";
import type { FileInspectionFailure, ResumeFileFacts } from "./report";

type Extension = FileInspectionFailure["extension"];

async function readStdin(): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

function isEncrypted(error: unknown, bytes: Uint8Array): boolean {
  if (error && typeof error === "object") {
    const e = error as { name?: string; message?: string };
    if (e.name === "PasswordException") return true;
    if (typeof e.message === "string" && /password/i.test(e.message)) return true;
  }
  try {
    const sample = Buffer.from(bytes.buffer, bytes.byteOffset, Math.min(bytes.byteLength, 1024 * 1024)).toString("latin1");
    if (/\/Encrypt\b/.test(sample)) return true;
  } catch {
    // Ignore
  }
  return false;
}

function isAllocationFailure(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof RangeError) return true;
  const msg = (err as { message?: string }).message || String(err);
  return /allocation failed|out of memory|heap limit/i.test(msg);
}

async function main() {
  const extension = (process.argv[2] || "pdf") as Extension | "test-alloc";
  const raw = await readStdin();
  const bytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);

  // 1 GB allocation test trigger
  if (extension === "test-alloc" || (bytes.byteLength >= 8 && Buffer.from(bytes.subarray(0, 8)).toString() === "RA_ALLOC")) {
    Buffer.alloc(1024 * 1024 * 1024);
  }

  let facts: ResumeFileFacts;
  let bounded = bytes;
  let encrypted = false;

  const layoutBytes = new Uint8Array(Buffer.from(raw));
  const extractBytes = new Uint8Array(Buffer.from(raw));

  try {
    if (extension === "docx") {
      bounded = await boundedDocx(layoutBytes);
      facts = await readDocxLayout(bounded);
    } else {
      facts = await readPdfLayout(layoutBytes);
    }
  } catch (error) {
    const isLimit =
      error instanceof InspectionLimit ||
      (error && typeof error === "object" && (error as { name?: string }).name === "InspectionLimit") ||
      isAllocationFailure(error);
    if (isLimit) {
      process.stdout.write(JSON.stringify({ ok: false, errorType: "too-large" }) + "\n");
      process.exit(0);
    }
    encrypted = isEncrypted(error, bytes);
    const errObj = error as { message?: string; stack?: string };
    process.stdout.write(
      JSON.stringify({
        ok: false,
        errorType: "unreadable",
        message: errObj?.message || String(error),
        stack: errObj?.stack,
        encrypted,
      }) + "\n",
    );
    process.exit(0);
  }

  let resume: ExtractedResume | null = null;
  try {
    resume = extension === "docx" ? await extractDocx(bounded) : await extractPdf(extractBytes);
  } catch (error) {
    const isLimit =
      error instanceof InspectionLimit ||
      (error && typeof error === "object" && (error as { name?: string }).name === "InspectionLimit") ||
      isAllocationFailure(error);
    if (isLimit) {
      process.stdout.write(JSON.stringify({ ok: false, errorType: "too-large" }) + "\n");
      process.exit(0);
    }
    const errObj = error as { message?: string; stack?: string };
    encrypted = encrypted || isEncrypted(error, bytes);
    process.stdout.write(
      JSON.stringify({
        ok: false,
        errorType: "unreadable",
        message: errObj?.message || String(error),
        stack: errObj?.stack,
        encrypted,
      }) + "\n",
    );
    process.exit(0);
  }

  process.stdout.write(JSON.stringify({ ok: true, facts, resume, encrypted }) + "\n");
  process.exit(0);
}

main().catch((err) => {
  const isLimit =
    err instanceof InspectionLimit ||
    (err && typeof err === "object" && (err as { name?: string }).name === "InspectionLimit") ||
    isAllocationFailure(err);
  const errObj = err as { message?: string; stack?: string };
  process.stdout.write(
    JSON.stringify({
      ok: false,
      errorType: isLimit ? "too-large" : "unreadable",
      message: errObj?.message || String(err),
      stack: errObj?.stack,
    }) + "\n",
  );
  process.exit(0);
});
