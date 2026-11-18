import { parentPort, workerData } from "node:worker_threads";
import { InspectionLimit } from "./inspectLimits.ts";
import { readDocxLayout } from "./docxLayout.ts";
import { readPdfLayout } from "./pdfLayout.ts";
import type { FileInspectionFailure } from "./report";

async function inspect() {
  const { extension, bytes }: { extension: FileInspectionFailure["extension"]; bytes: Uint8Array } = workerData;
  try {
    return await (extension === "docx" ? readDocxLayout(bytes) : readPdfLayout(bytes));
  } catch (error) {
    const reason = error instanceof InspectionLimit ? "too-large" : "unreadable";
    return { format: "invalid", extension, reason } satisfies FileInspectionFailure;
  }
}

void inspect().then((facts) => parentPort?.postMessage(facts));
