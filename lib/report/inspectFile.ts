import { inspectDocx } from "./inspectDocx";
import { inspectPdf } from "./inspectPdf";
import type { ResumeFileFacts } from "./report";

/** Layout facts for an uploaded resume; other formats only report their extension, which the file-type check grades. */
export async function inspectResumeFile(fileName: string, bytes: ArrayBuffer | Uint8Array): Promise<ResumeFileFacts> {
  const extension = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase() ?? "";
  if (extension === "docx") return inspectDocx(bytes);
  if (extension === "pdf") return inspectPdf(bytes);
  return { format: "other", extension };
}
