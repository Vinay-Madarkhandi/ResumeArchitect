import { Worker } from "node:worker_threads";
import type { FileInspectionFailure, ResumeFileFacts } from "./report";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_DOCX_BYTES = 24 * 1024 * 1024;
export const MAX_DOCX_ENTRIES = 256;
export const MAX_XML_BYTES = 1024 * 1024;
export const MAX_PDF_PAGES = 20;
export const INSPECTION_TIMEOUT_MS = 4_000;

type FileFormat = FileInspectionFailure["extension"];
export type InspectionResult<F extends FileFormat> = Extract<ResumeFileFacts, { format: F }> | FileInspectionFailure;

export class InspectionLimit extends Error {}

export async function inspectWithinBudget<F extends FileFormat>(
  extension: F,
  file: ArrayBuffer | Uint8Array,
): Promise<InspectionResult<F>> {
  const failure = (reason: FileInspectionFailure["reason"]): FileInspectionFailure => ({ format: "invalid", extension, reason });
  if (file.byteLength > MAX_UPLOAD_BYTES) return failure("too-large");
  const source = file instanceof Uint8Array ? file : new Uint8Array(file);
  const bytes = new Uint8Array(source);

  try {
    const worker = new Worker(new URL("./inspectWorkerEntry.mjs", import.meta.url), {
      execArgv: [],
      workerData: { extension, bytes },
      transferList: [bytes.buffer],
      resourceLimits: { maxOldGenerationSizeMb: 96, maxYoungGenerationSizeMb: 16, stackSizeMb: 2 },
    });
    return await new Promise<InspectionResult<F>>((resolve) => {
      let settled = false;
      const finish = (result: InspectionResult<F>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        void worker.terminate();
        resolve(result);
      };
      const timer = setTimeout(() => finish(failure("too-large")), INSPECTION_TIMEOUT_MS);
      worker.once("message", finish);
      worker.once("error", () => finish(failure("unreadable")));
      worker.once("exit", () => finish(failure("unreadable")));
    });
  } catch {
    return failure("unreadable");
  }
}
