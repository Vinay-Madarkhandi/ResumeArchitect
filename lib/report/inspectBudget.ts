import { Worker } from "node:worker_threads";
import type { FileInspectionFailure, ResumeFileFacts } from "./report";
import { INSPECTION_TIMEOUT_MS, MAX_UPLOAD_BYTES } from "./inspectLimits";

type FileFormat = FileInspectionFailure["extension"];
export type InspectionResult<F extends FileFormat> = Extract<ResumeFileFacts, { format: F }> | FileInspectionFailure;

export async function inspectWithinBudget<F extends FileFormat>(
  extension: F,
  file: ArrayBuffer | Uint8Array,
): Promise<InspectionResult<F>> {
  const failure = (reason: FileInspectionFailure["reason"]): FileInspectionFailure => ({ format: "invalid", extension, reason });
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
