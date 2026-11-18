import { Worker } from "node:worker_threads";
import type { ExtractedResume } from "@/lib/resume/extract";
import type { FileInspectionFailure, ResumeFileFacts } from "./report";
import { INSPECTION_BACKSTOP_MS, MAX_UPLOAD_BYTES } from "./inspectLimits";

type FileFormat = FileInspectionFailure["extension"];
export type InspectionResult<F extends FileFormat> = Extract<ResumeFileFacts, { format: F }> | FileInspectionFailure;

/** The layout facts, and the resume text when the file passed inspection. */
export interface FileReading<F extends FileFormat> {
  facts: InspectionResult<F>;
  resume: ExtractedResume | null;
}

/**
 * Reads an uploaded PDF or Word file in a worker thread with its own heap
 * limit, so no parser runs on the server's main thread or past the budgets
 * in inspectLimits.
 */
export async function readWithinBudget<F extends FileFormat>(extension: F, file: ArrayBuffer | Uint8Array): Promise<FileReading<F>> {
  const failure = (reason: FileInspectionFailure["reason"]): FileReading<F> => ({ facts: { format: "invalid", extension, reason }, resume: null });
  if (file.byteLength > MAX_UPLOAD_BYTES) return failure("too-large");
  const source = file instanceof Uint8Array ? file : new Uint8Array(file);
  const bytes = new Uint8Array(source);

  try {
    const worker = new Worker(new URL("./inspectWorker.ts", import.meta.url), {
      execArgv: process.env.VITEST ? ["--require", "tsx/cjs"] : [],
      workerData: { extension, bytes },
      transferList: [bytes.buffer],
      resourceLimits: { maxOldGenerationSizeMb: 96, maxYoungGenerationSizeMb: 16, stackSizeMb: 2 },
    });
    return await new Promise<FileReading<F>>((resolve) => {
      let settled = false;
      const finish = (result: FileReading<F>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        void worker.terminate();
        resolve(result);
      };
      const timer = setTimeout(() => finish(failure("too-large")), INSPECTION_BACKSTOP_MS);
      worker.once("message", finish);
      worker.once("error", () => finish(failure("unreadable")));
      worker.once("exit", () => finish(failure("unreadable")));
    });
  } catch {
    return failure("unreadable");
  }
}

export async function inspectWithinBudget<F extends FileFormat>(extension: F, file: ArrayBuffer | Uint8Array): Promise<InspectionResult<F>> {
  return (await readWithinBudget(extension, file)).facts;
}
